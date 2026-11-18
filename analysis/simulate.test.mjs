// Tests for simulate.mjs. References: exact enumeration of every path of a small plan with
// the pure rule of stats.mjs as the oracle, closed forms, and outcomes that are certain.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import * as S from './stats.mjs';
import * as M from './simulate.mjs';

function near(actual, expected, tolerance, label = '') {
  assert.ok(
    typeof actual === 'number' && Math.abs(actual - expected) <= tolerance,
    `${label} expected ${expected} within ${tolerance}, got ${actual}`,
  );
}

const choose = (n, k) => {
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
};
const binomial = (n, k, p) => choose(n, k) * p ** k * (1 - p) ** (n - k);
const names = (prefix, count) => Array.from({ length: count }, (_, i) => `${prefix}${i}`);

// Exact verdict probabilities and expected runs of a plan: every path is listed with its
// probability and judged by S.decide. Only feasible for very small designs.
function exactPlan(plan, pT, pC) {
  const k = pT.length;
  const s = pT[0].length;
  const cellCount = 2 * k * s;
  const rates = [];
  for (let i = 0; i < k; i++) for (let j = 0; j < s; j++) rates.push(pT[i][j]);
  for (let i = 0; i < k; i++) for (let j = 0; j < s; j++) rates.push(pC[i][j]);
  const out = { supported: 0, refuted: 0, undecidable: 0, meanRuns: 0 };
  const walk = (lookIndex, counts, probability) => {
    const blocks = plan.looks[lookIndex];
    const add = blocks - (lookIndex === 0 ? 0 : plan.looks[lookIndex - 1]);
    const fillCell = (cell, current, weight) => {
      if (weight === 0) return;
      if (cell === cellCount) {
        const cells = [];
        for (let i = 0; i < k; i++) {
          for (let j = 0; j < s; j++) {
            const h = i * s + j;
            cells.push({ stack: plan.stacks[i], slot: plan.slots[j], xT: current[h], nT: blocks, xC: current[k * s + h], nC: blocks });
          }
        }
        const result = S.decide(cells, plan, { index: lookIndex + 1 });
        if (result.verdict === 'continue') walk(lookIndex + 1, current, weight);
        else {
          out[result.verdict] += weight;
          out.meanRuns += weight * cellCount * blocks;
        }
        return;
      }
      for (let x = 0; x <= add; x++) {
        const next = current.slice();
        next[cell] += x;
        fillCell(cell + 1, next, weight * binomial(add, x, rates[cell]));
      }
    };
    fillCell(0, counts, probability);
  };
  walk(0, new Array(cellCount).fill(0), 1);
  return out;
}

function assertMatchesExact(plan, scenario, reps, seed) {
  const exact = exactPlan(plan, scenario.pT, scenario.pC);
  const sim = M.simulatePlan(plan, scenario, reps, seed);
  for (const verdict of ['supported', 'refuted', 'undecidable']) {
    const p = exact[verdict];
    near(sim[verdict], p, 4 * Math.sqrt((p * (1 - p)) / reps) + 1e-9, verdict);
  }
  near(sim.meanRuns, exact.meanRuns, 0.02 * exact.meanRuns, 'mean runs');
  return { exact, sim };
}

describe('simulatePlan', () => {
  const stacks = names('stack', 2);
  const slots = names('slot', 5);
  const plan = { dStar: 0.3, looks: [3, 6], delta: 0.16, stacks, slots };
  const flat = (value) => stacks.map(() => slots.map(() => value));

  test('same seed, same result; another seed or stream, another result', () => {
    const scenario = { pT: flat(0.6), pC: flat(0.4) };
    const a = M.simulatePlan(plan, scenario, 500, 7);
    assert.deepEqual(a, M.simulatePlan(plan, scenario, 500, 7));
    assert.notDeepEqual(a, M.simulatePlan(plan, scenario, 500, 8));
    assert.notDeepEqual(a, M.simulatePlan(plan, scenario, 500, 7, 1));
    near(a.supported + a.refuted + a.undecidable, 1, 1e-12);
    const causes = Object.values(a.causes).reduce((x, y) => x + y, 0);
    near(causes, a.undecidable, 1e-12);
    near(a.stopAtLook.reduce((x, y) => x + y, 0), 1, 1e-12);
    assert.equal(a.maxRuns, 120);
  });

  test('every run fails: floor at the first look, with the runs of the first look only', () => {
    const r = M.simulatePlan(plan, { pT: flat(0), pC: flat(0) }, 200, 1);
    assert.equal(r.undecidable, 1);
    assert.equal(r.causes.floor, 1);
    assert.equal(r.meanRuns, 60);
    assert.deepEqual(r.stopAtLook, [1, 0]);
  });

  test('every run passes: ceiling at the first look', () => {
    const r = M.simulatePlan(plan, { pT: flat(1), pC: flat(1) }, 200, 1);
    assert.equal(r.causes.ceiling, 1);
    assert.equal(r.meanRuns, 60);
  });

  test('treatment always passes, control always fails: supported at the first look', () => {
    const r = M.simulatePlan(plan, { pT: flat(1), pC: flat(0) }, 200, 1);
    assert.equal(r.supported, 1);
    assert.equal(r.meanRuns, 60);
  });

  test('control always passes, treatment always fails: refuted at the first look', () => {
    const r = M.simulatePlan(plan, { pT: flat(0), pC: flat(1) }, 200, 1);
    assert.equal(r.refuted, 1);
    assert.equal(r.meanRuns, 60);
  });

  test('a perfect reversal between stacks is never refuted: the interaction flag blocks it', () => {
    const r = M.simulatePlan(plan, { pT: [slots.map(() => 1), slots.map(() => 0)], pC: [slots.map(() => 0), slots.map(() => 1)] }, 200, 1);
    assert.equal(r.refuted, 0);
    assert.equal(r.supported, 0);
    assert.equal(r.causes.interaction, 1);
    assert.equal(r.meanRuns, 120);
    assert.deepEqual(r.stopAtLook, [0, 1]);
  });

  test('one stratum, two looks: rates and expected runs equal the exact enumeration', () => {
    const small = { dStar: 0.5, looks: [3, 6], delta: 0.3, stacks: ['a'], slots: ['x'] };
    const { exact } = assertMatchesExact(small, { pT: [[0.7]], pC: [[0.3]] }, 40000, 11);
    assert.ok(exact.supported > 0.05 && exact.refuted > 0.001 && exact.meanRuns < 12, JSON.stringify(exact));
    assertMatchesExact(small, { pT: [[0.2]], pC: [[0.6]] }, 40000, 12);
  });

  test('two stacks, two looks: rates and expected runs equal the exact enumeration', () => {
    const small = { dStar: 0.5, looks: [2, 4], delta: 0.2, stacks: ['a', 'b'], slots: ['x'] };
    assertMatchesExact(small, { pT: [[0.8], [0.6]], pC: [[0.2], [0.5]] }, 40000, 13);
    assertMatchesExact(small, { pT: [[0.9], [0.1]], pC: [[0.1], [0.9]] }, 40000, 14);
    assertMatchesExact(small, { pT: [[0.5], [0.5]], pC: [[0.5], [0.5]] }, 40000, 15);
  });

  test('false support stays near or below 2.5% with no effect', () => {
    const r = M.simulatePlan(plan, { pT: flat(0.5), pC: flat(0.5) }, 4000, 21);
    assert.ok(r.supported <= 0.025 + 4 * Math.sqrt((0.025 * 0.975) / 4000), `supported ${r.supported}`);
    assert.ok(r.refuted > 0.6, `refuted ${r.refuted}`);
    assert.ok(r.meanRuns < 120 && r.meanRuns > 60);
  });

  test('rejects a scenario that does not fit the plan', () => {
    assert.throws(() => M.simulatePlan(plan, { pT: [[0.5]], pC: [[0.5]] }, 10, 1), RangeError);
    assert.throws(() => M.simulatePlan(plan, { pT: flat(1.2), pC: flat(0.5) }, 10, 1), RangeError);
  });
});

describe('lookOutcome', () => {
  test('agrees with the pure rule on random tables', () => {
    const g = S.rng(2026);
    const seen = new Set();
    for (let trial = 0; trial < 5000; trial++) {
      const k = 1 + Math.floor(g() * 3);
      const s = 1 + Math.floor(g() * 5);
      const n = 1 + Math.floor(g() * 10);
      const dStar = [0.2, 0.3, 0.4, 0.5][Math.floor(g() * 4)];
      const alpha = [0.025, 0.003125, 0.021875][Math.floor(g() * 3)];
      const zR = 1.9 + g() * 1.2;
      const stacks = names('stack', k);
      const slots = names('slot', s);
      // Rates built to reach every branch: floors, ceilings, strong effects and reversals.
      const mode = Math.floor(g() * 6);
      const xT = [];
      const xC = [];
      const cells = [];
      for (let i = 0; i < k; i++) {
        const sign = mode === 4 && i % 2 === 1 ? -1 : 1;
        for (let j = 0; j < s; j++) {
          let pT = g();
          let pC = g();
          if (mode === 0) pT = pC = 0.02;
          if (mode === 1) pT = pC = 0.98;
          if (mode === 2) pC = pT;
          if (mode === 3 || mode === 4) {
            const effect = 0.25 + 0.7 * g();
            const base = g() * (1 - effect);
            pT = sign > 0 ? base + effect : base;
            pC = sign > 0 ? base : base + effect;
          }
          let a = 0;
          let b = 0;
          for (let r = 0; r < n; r++) {
            if (g() < pT) a++;
            if (g() < pC) b++;
          }
          xT.push(a);
          xC.push(b);
          cells.push({ stack: stacks[i], slot: slots[j], xT: a, nT: n, xC: b, nC: n });
        }
      }
      const result = S.decide(cells, { dStar, looks: [n], zR: [zR], alpha, stacks, slots }, { index: 1 });
      let expected = result.verdict;
      if (expected === 'undecidable') {
        if (/floor/.test(result.cause)) expected = 'floor';
        else if (/ceiling/.test(result.cause)) expected = 'ceiling';
        else if (/interaction/.test(result.cause)) expected = 'interaction';
        else if (/every stack/.test(result.cause)) expected = 'stackSign';
        else expected = 'none';
      }
      assert.equal(M.lookOutcome(xT, xC, k, s, n, dStar, alpha, zR), expected, JSON.stringify({ cells, dStar, alpha, zR }));
      seen.add(expected);
    }
    assert.deepEqual([...seen].sort(), ['ceiling', 'floor', 'interaction', 'none', 'refuted', 'stackSign', 'supported']);
  });
});

describe('scenarioGrid', () => {
  const meanDifference = (scenario) => {
    let total = 0;
    let count = 0;
    scenario.pT.forEach((row, i) => row.forEach((p, j) => {
      total += p - scenario.pC[i][j];
      count++;
    }));
    return total / count;
  };

  test('every scenario has the difference its kind promises, and valid rates', () => {
    for (const dStar of [0.2, 0.3, 0.4, 0.5]) {
      const grid = M.scenarioGrid(dStar, 2, 5);
      const expected = { null: 0, dStar, half: dStar / 2, oneStack: dStar / 2, reversal: 0 };
      assert.deepEqual([...new Set(grid.map((g) => g.kind))].sort(), Object.keys(expected).sort());
      assert.equal(new Set(grid.map((g) => g.name)).size, grid.length);
      for (const scenario of grid) {
        assert.equal(scenario.pT.length, 2);
        assert.equal(scenario.pT[0].length, 5);
        near(meanDifference(scenario), expected[scenario.kind], 1e-12, scenario.name);
        for (const row of [...scenario.pT, ...scenario.pC]) for (const p of row) assert.ok(p >= 0 && p <= 1, scenario.name);
      }
      assert.ok(grid.filter((g) => g.kind === 'null').length >= 9);
      assert.ok(grid.filter((g) => g.kind === 'dStar').length >= 8);
    }
  });

  test('the reversal has +d* in one stack and -d* in the other; one stack only has d* in the first', () => {
    const grid = M.scenarioGrid(0.4, 2, 5);
    const reversal = grid.find((g) => g.kind === 'reversal');
    near(reversal.pT[0][0] - reversal.pC[0][0], 0.4, 1e-12);
    near(reversal.pT[1][0] - reversal.pC[1][0], -0.4, 1e-12);
    const one = grid.find((g) => g.kind === 'oneStack');
    near(one.pT[0][2] - one.pC[0][2], 0.4, 1e-12);
    near(one.pT[1][2] - one.pC[1][2], 0, 1e-12);
  });

  test('works with one stack and one slot', () => {
    const grid = M.scenarioGrid(0.5, 1, 1);
    assert.ok(grid.every((g) => g.pT.length === 1 && g.pT[0].length === 1));
    assert.ok(!grid.some((g) => g.kind === 'reversal' || g.kind === 'oneStack'));
  });
});

describe('calibrate', () => {
  const plan = { dStar: 0.5, looks: [2], stacks: names('stack', 2), slots: names('slot', 5) };
  const reps = 3000;
  const seed = 5;
  const options = { step: 0.02 };
  const result = M.calibrate(plan, undefined, reps, seed, options);
  const exceeds = (rate) => rate + 2 * Math.sqrt((rate * (1 - rate)) / reps) > 0.025;

  test('z_R is the normal quantile of 1 - a_j plus a delta on the grid', () => {
    assert.ok(result.delta >= 0);
    near(result.delta / 0.02, Math.round(result.delta / 0.02), 1e-9);
    assert.equal(result.zR.length, 1);
    near(result.zR[0], S.Z95 + result.delta, 1e-9);
    assert.equal(result.plan.delta, result.delta);
    assert.equal(result.maxRuns, 40);
  });

  test('false refutation at D = d* passes the criterion in every scenario of the grid', () => {
    const rows = result.rows.filter((row) => row.kind === 'dStar');
    assert.ok(rows.length >= 8);
    for (const row of rows) assert.ok(!exceeds(row.refuted), `${row.name}: ${row.refuted}`);
    near(result.worstFalseRefutation, Math.max(...rows.map((row) => row.refuted)), 1e-12);
  });

  test('the delta is the smallest: one step less fails the criterion somewhere', () => {
    assert.ok(result.delta > 0, 'the nominal constant is not enough for this plan');
    const lower = { ...plan, delta: result.delta - 0.02 };
    const rates = result.rows.filter((row) => row.kind === 'dStar').map((row) => M.simulatePlan(lower, row.scenario, reps, seed, row.stream).refuted);
    assert.ok(rates.some(exceeds), `rates one step below: ${rates.join(', ')}`);
  });

  test('every row is what simulatePlan gives for the calibrated plan, seed and stream', () => {
    for (const row of result.rows) {
      const again = M.simulatePlan(result.plan, row.scenario, reps, seed, row.stream);
      assert.equal(row.refuted, again.refuted, row.name);
      assert.equal(row.supported, again.supported, row.name);
      assert.equal(row.meanRuns, again.meanRuns, row.name);
    }
  });

  test('the summary reports the worst cases and the named scenarios', () => {
    const nulls = result.rows.filter((row) => row.kind === 'null');
    near(result.worstFalseSupport, Math.max(...nulls.map((row) => row.supported)), 1e-12);
    assert.ok(result.worstFalseSupport <= 0.025 + 4 * Math.sqrt((0.025 * 0.975) / reps));
    for (const key of ['centred', 'fromTen', 'mixed']) assert.ok(result.summary.supportedAtDStar[key] > 0.5, key);
    assert.ok(result.summary.refutedAtNoEffect > 0.5);
    assert.ok(result.summary.meanRunsAtNoEffect <= 40);
    for (const key of ['half', 'oneStack', 'reversal']) {
      const o = result.summary[key];
      near(o.supported + o.refuted + o.undecidable, 1, 1e-12, key);
    }
  });

  test('two looks share one delta and calibration is reproducible', () => {
    const two = { dStar: 0.5, looks: [1, 2], stacks: names('stack', 2), slots: names('slot', 5) };
    const a = M.calibrate(two, undefined, 1500, 9, options);
    const b = M.calibrate(two, undefined, 1500, 9, options);
    assert.deepEqual(a.zR, b.zR);
    assert.equal(a.zR.length, 2);
    near(a.zR[0] - S.normalQuantile(1 - 0.003125), a.delta, 1e-9);
    near(a.zR[1] - S.normalQuantile(1 - 0.021875), a.delta, 1e-9);
    for (const row of a.rows.filter((r) => r.kind === 'dStar')) {
      assert.ok(row.refuted + 2 * Math.sqrt((row.refuted * (1 - row.refuted)) / 1500) <= 0.025, row.name);
      assert.equal(row.refuted, M.simulatePlan(a.plan, row.scenario, 1500, 9, row.stream).refuted, row.name);
    }
  });
});

describe('operatingCharacteristics', () => {
  const plan = { dStar: 0.5, looks: [2], delta: 0.48, stacks: names('stack', 2), slots: names('slot', 5) };

  test('reports false support, power per difference and expected runs', () => {
    const oc = M.operatingCharacteristics(plan, 2000, 3);
    assert.deepEqual(oc.power.map((row) => row.difference), [0.2, 0.3, 0.4, 0.5]);
    assert.ok(oc.falseSupport.worst <= 0.025 + 4 * Math.sqrt((0.025 * 0.975) / 2000), `false support ${oc.falseSupport.worst}`);
    assert.ok(oc.falseSupport.rows.length >= 9);
    const supported = oc.power.map((row) => row.supported);
    assert.ok(supported[0] < supported[1] && supported[1] < supported[2] && supported[2] < supported[3], supported.join(', '));
    assert.ok(supported[3] > 0.7);
    assert.equal(oc.maxRuns, 40);
    assert.equal(oc.expectedRuns.noEffect, 40);
    assert.deepEqual(oc, M.operatingCharacteristics(plan, 2000, 3));
  });

  test('a certain difference is always supported', () => {
    const oc = M.operatingCharacteristics(plan, 100, 3, { differences: [1] });
    assert.equal(oc.power[0].supported, 1);
    assert.equal(oc.power[0].meanRuns, 40);
  });
});

describe('interval coverage by enumeration', () => {
  test('Wilson: closed forms for n = 1 and for a rare event with n = 10', () => {
    near(M.coverageOneProportion('wilson', 1, 0.5), 1, 1e-12);
    near(M.coverageOneProportion('wilson', 1, 0.1), 0.9, 1e-12);
    // n = 10, p = 0.01: only x = 0 gives an interval that reaches down to 0.01.
    near(M.coverageOneProportion('wilson', 10, 0.01), 0.99 ** 10, 1e-12);
  });

  test('Clopper-Pearson never covers less than its level', () => {
    for (const n of [10, 25, 50]) {
      for (let i = 1; i < 100; i++) {
        const coverage = M.coverageOneProportion('clopperPearson', n, i / 100);
        assert.ok(coverage >= 0.95 - 1e-12, `n=${n} p=${i / 100}: ${coverage}`);
      }
    }
  });

  test('Newcombe: closed forms for one run per arm', () => {
    near(M.coverageDifference(1, 1, 0.5, 0.5), 1, 1e-12);
    // True difference 0.8: only "treatment passes, control fails" gives an interval that holds it.
    near(M.coverageDifference(1, 1, 0.9, 0.1), 0.81, 1e-12);
    near(M.coverageDifference(7, 9, 0, 0), 1, 1e-12);
  });

  test('the table has one row per n with minimum and mean coverage', () => {
    const table = M.coverageTable([10, 20]);
    assert.deepEqual(table.map((row) => row.n), [10, 20]);
    for (const row of table) {
      assert.ok(row.clopperPearson.min >= 0.95 - 1e-12);
      assert.ok(row.wilson.min < 0.95 && row.wilson.mean > 0.94 && row.wilson.mean < 0.97);
      assert.ok(row.newcombe.min > 0.85 && row.newcombe.mean > 0.94);
      assert.ok(row.wilson.min <= row.wilson.mean && row.newcombe.min <= row.newcombe.mean);
    }
  });
});

describe('cost interval coverage', () => {
  test('mean of a capped log-normal: closed form against its limits and a seeded draw', () => {
    near(M.cappedLogNormalMean(1000, 0.8, Infinity), 1000 * Math.exp(0.32), 1e-9);
    near(M.cappedLogNormalMean(1000, 1e-9, 5000), 1000, 1e-3);
    near(M.cappedLogNormalMean(1000, 1e-9, 400), 400, 1e-3);
    const g = S.rng(31);
    let total = 0;
    const draws = 200000;
    for (let i = 0; i < draws; i++) {
      const z = Math.sqrt(-2 * Math.log(1 - g())) * Math.cos(2 * Math.PI * g());
      total += Math.min(8192, 2500 * Math.exp(1.1 * z));
    }
    near(M.cappedLogNormalMean(2500, 1.1, 8192), total / draws, 25);
  });

  test('the true cost per correct run of the model equals a large seeded sample', () => {
    const model = { rate: 0.4, budget: 6, median: 2500, sigma: 1.1, cap: 8192 };
    const truth = M.costModelTruth(model);
    near(truth.m0, 6 * M.cappedLogNormalMean(2500, 1.1, 8192), 1e-9);
    near(truth.m1, 3.5 * M.cappedLogNormalMean(2500, 1.1, 8192), 1e-9);
    near(truth.costPerCorrect, truth.m1 + (truth.m0 * 0.6) / 0.4, 1e-9);
    const runs = M.drawCostRuns(model, 60000, S.rng(8));
    const tokens = runs.reduce((sum, r) => sum + r.tokens, 0);
    const correct = runs.filter((r) => r.correct).length;
    near(tokens / correct, truth.costPerCorrect, 0.02 * truth.costPerCorrect);
    assert.ok(runs.every((r) => r.tokens <= 6 * 8192));
  });

  test('coverage is reproducible and each limit holds at least about 95% of the time', () => {
    const model = { rate: 0.5, budget: 6, median: 2500, sigma: 1.1, cap: 8192 };
    const a = M.simulateCostCoverage(model, 30, 300, 17, { resamples: 400 });
    assert.deepEqual(a, M.simulateCostCoverage(model, 30, 300, 17, { resamples: 400 }));
    assert.ok(a.lowerHolds >= 0.93, `lower ${a.lowerHolds}`);
    assert.ok(a.upperHolds >= 0.93, `upper ${a.upperHolds}`);
    assert.ok(a.bothHold <= Math.min(a.lowerHolds, a.upperHolds));
    assert.equal(a.zeroCorrect, 0);
  });

  test('a rare success: the upper limit is often infinite and the lower one still holds', () => {
    const model = { rate: 0.03, budget: 6, median: 2500, sigma: 1.1, cap: 8192 };
    const a = M.simulateCostCoverage(model, 20, 300, 18, { resamples: 400 });
    near(a.zeroCorrect, 0.97 ** 20, 0.1);
    assert.ok(a.lowerHolds >= 0.93, `lower ${a.lowerHolds}`);
    assert.ok(a.upperHolds >= 0.93);
  });
});

describe('product law power', () => {
  test('certain outcomes: all ones are never rejected, an impossible joint success always is', () => {
    const never = M.simulateProductLaw({ q: [1, 1, 1], runsPerSlot: 30, runsAll: 30, gamma: 1 }, 200, 1);
    assert.equal(never.rejected, 0);
    near(never.pAll, 1, 1e-12);
    const always = M.simulateProductLaw({ q: [1, 1, 1], runsPerSlot: 50, runsAll: 50, gamma: 0 }, 200, 1);
    assert.equal(always.rejected, 1);
    assert.equal(always.rejectedBelow, 1);
  });

  test('P(all) follows gamma^(|S|-1) times the product, and the law is rarely rejected when it holds', () => {
    const config = { q: [0.9, 0.8, 0.7], runsPerSlot: 40, runsAll: 40, gamma: 0.5 };
    near(M.simulateProductLaw(config, 10, 1).pAll, 0.25 * 0.9 * 0.8 * 0.7, 1e-12);
    const holds = M.simulateProductLaw({ ...config, gamma: 1 }, 3000, 2);
    assert.ok(holds.rejected <= 0.08, `false rejection ${holds.rejected}`);
    const fails = M.simulateProductLaw(config, 3000, 2);
    assert.ok(fails.rejected > 0.8, `power ${fails.rejected}`);
    assert.deepEqual(fails, M.simulateProductLaw(config, 3000, 2));
  });
});

describe('designTable', () => {
  test('one row per plan with its calibration and its power per difference', () => {
    const plans = [{ dStar: 0.5, looks: [2] }, { dStar: 0.4, looks: [3] }];
    const table = M.designTable(plans, { reps: 800, seed: 4, stacks: 2, slots: 5, step: 0.02 });
    assert.equal(table.length, 2);
    assert.deepEqual(table.map((row) => row.maxRuns), [40, 60]);
    for (const row of table) {
      assert.equal(row.zR.length, 1);
      assert.deepEqual(row.power.map((p) => p.difference), [0.2, 0.3, 0.4, 0.5]);
      assert.ok(row.calibration.worstFalseRefutation <= 0.025);
    }
    assert.deepEqual(M.DEFAULT_PLANS.map((p) => [p.dStar, p.looks]), [[0.5, [2]], [0.4, [3]], [0.3, [5]], [0.3, [3, 6]], [0.2, [10]], [0.2, [6, 12]]]);
  });
});
