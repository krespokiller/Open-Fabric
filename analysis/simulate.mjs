// Seeded simulator for the decision rule of stats.mjs: operating characteristics of a plan
// (false support, power, expected runs, early stopping), calibration of the refutation
// constant, and the supporting checks (interval coverage, cost interval, product law).
// Plain Node 22, no dependencies. Every result is a function of its seed.
import {
  Z95,
  rng,
  normalCdf,
  normalQuantile,
  spendingThresholds,
  planThresholds,
  hypergeometric,
  wilson,
  clopperPearson,
  newcombe,
  interactionFlag,
  costPerCorrect,
  productLaw,
} from './stats.mjs';

// The plans of the design table: d* and the complete blocks (runs per cell) at each look.
export const DEFAULT_PLANS = [
  { dStar: 0.5, looks: [2] },
  { dStar: 0.4, looks: [3] },
  { dStar: 0.3, looks: [5] },
  { dStar: 0.3, looks: [3, 6] },
  { dStar: 0.2, looks: [10] },
  { dStar: 0.2, looks: [6, 12] },
];

const sizeOf = (value, fallback) => (Array.isArray(value) ? value.length : Number.isInteger(value) ? value : fallback);

// ---------------------------------------------------------------- one look, fast

// Upper tail of the exact stratified test for a balanced design, without allocating.
// Same arithmetic, in the same order, as exactCmh in stats.mjs.
const engines = new Map();
function cmhEngine(n, strata) {
  const key = n * 65536 + strata;
  let engine = engines.get(key);
  if (engine) return engine;
  const tables = [];
  for (let r = 0; r <= 2 * n; r++) tables.push(hypergeometric(n, n, r));
  let current = new Float64Array(strata * n + 1);
  let next = new Float64Array(strata * n + 1);
  engine = (xT, xC) => {
    let length = 1;
    let offset = 0;
    let observed = 0;
    let informative = 0;
    current[0] = 1;
    for (let h = 0; h < strata; h++) {
      const r = xT[h] + xC[h];
      if (r === 0 || r === 2 * n) continue;
      const { low, pmf } = tables[r];
      const size = pmf.length;
      const nextLength = length + size - 1;
      next.fill(0, 0, nextLength);
      for (let i = 0; i < length; i++) {
        const weight = current[i];
        if (weight === 0) continue;
        for (let j = 0; j < size; j++) next[i + j] += weight * pmf[j];
      }
      const swap = current;
      current = next;
      next = swap;
      length = nextLength;
      offset += low;
      observed += xT[h];
      informative++;
    }
    if (informative === 0) return 1;
    let p = 0;
    for (let i = length - 1; i >= observed - offset; i--) p += current[i];
    return Math.min(1, p);
  };
  engines.set(key, engine);
  return engine;
}

// Everything a look needs except the refutation constant.
function lookFacts(xT, xC, k, s, n, alpha) {
  const strata = k * s;
  const perStack = s * n;
  let sumT = 0;
  let sumC = 0;
  let allPositive = true;
  let anyPositive = false;
  let anyNegative = false;
  const stackT = new Array(k);
  const stackC = new Array(k);
  for (let i = 0; i < k; i++) {
    let a = 0;
    let b = 0;
    for (let j = 0; j < s; j++) {
      a += xT[i * s + j];
      b += xC[i * s + j];
    }
    stackT[i] = a;
    stackC[i] = b;
    sumT += a;
    sumC += b;
    if (a > b) anyPositive = true;
    else allPositive = false;
    if (a < b) anyNegative = true;
  }
  const perArm = strata * n;
  if (sumT + sumC === 0) return { edge: 'floor' };
  if (sumT + sumC === 2 * perArm) return { edge: 'ceiling' };
  let interaction = false;
  if (anyPositive && anyNegative) {
    interaction = interactionFlag(stackT.map((a, i) => ({ stack: i, xT: a, nT: perStack, xC: stackC[i], nC: perStack })));
  }
  // With equal runs per arm the null distribution is symmetric, so the p-value is at least
  // one half whenever the treatment does not lead: no need to compute it.
  const p = sumT > sumC ? cmhEngine(n, strata)(xT, xC) : 1;
  return { edge: null, sumT, sumC, perArm, interaction, allPositive, significant: p <= alpha * (1 + 1e-9) };
}

// One look of the rule for a balanced design, from flat count arrays (stack by stack, slot
// by slot). Returns 'supported', 'refuted', 'floor', 'ceiling', or the reason nothing was
// decided: 'interaction', 'stackSign' or 'none'. It must agree with decide() in stats.mjs.
export function lookOutcome(xT, xC, k, s, n, dStar, alpha, zR) {
  const facts = lookFacts(xT, xC, k, s, n, alpha);
  if (facts.edge) return facts.edge;
  const below = newcombe(facts.sumT, facts.perArm, facts.sumC, facts.perArm, zR).upper < dStar;
  if (below && !facts.interaction) return 'refuted';
  if (facts.significant && facts.allPositive) return 'supported';
  if (below) return 'interaction';
  if (facts.significant) return 'stackSign';
  return 'none';
}

// ---------------------------------------------------------------- one plan, many replicates

function prepare(plan, scenario) {
  const k = scenario.pT.length;
  const s = scenario.pT[0].length;
  if (scenario.pC.length !== k) throw new RangeError('scenario.pT and scenario.pC need the same shape');
  if (sizeOf(plan.stacks, k) !== k || sizeOf(plan.slots, s) !== s) {
    throw new RangeError(`the scenario has ${k} stack(s) and ${s} slot(s), the plan has ${sizeOf(plan.stacks, k)} and ${sizeOf(plan.slots, s)}`);
  }
  const flatten = (matrix) => {
    const flat = new Float64Array(k * s);
    matrix.forEach((row, i) => {
      if (row.length !== s) throw new RangeError('every stack of a scenario needs one rate per slot');
      row.forEach((p, j) => {
        if (!(p >= 0 && p <= 1)) throw new RangeError(`a rate must be between 0 and 1, got ${p}`);
        flat[i * s + j] = p;
      });
    });
    return flat;
  };
  return { k, s, strata: k * s, pT: flatten(scenario.pT), pC: flatten(scenario.pC), looks: plan.looks, dStar: plan.dStar };
}

// Cumulative counts at every look. The whole path is always drawn, also when the plan
// stops early, so that a seed gives the same data whatever the thresholds are.
function drawPath(design, next, xT, xC) {
  const { strata, looks, pT, pC } = design;
  for (let j = 0; j < looks.length; j++) {
    const add = looks[j] - (j === 0 ? 0 : looks[j - 1]);
    for (let h = 0; h < strata; h++) {
      let x = j === 0 ? 0 : xT[j - 1][h];
      const p = pT[h];
      for (let r = 0; r < add; r++) if (next() < p) x++;
      xT[j][h] = x;
    }
    for (let h = 0; h < strata; h++) {
      let x = j === 0 ? 0 : xC[j - 1][h];
      const p = pC[h];
      for (let r = 0; r < add; r++) if (next() < p) x++;
      xC[j][h] = x;
    }
  }
}

const TERMINAL = new Set(['supported', 'refuted', 'floor', 'ceiling']);

// Verdict rates and expected runs of a plan under a scenario.
//   plan: { dStar, looks, delta | zR, alpha?, stacks?, slots? } (stacks and slots: names or counts).
//   scenario: { pT, pC }, one row per stack and one rate per slot.
export function simulatePlan(plan, scenario, reps = 10000, seed = 1, stream = 0) {
  const design = prepare(plan, scenario);
  const thresholds = planThresholds(plan);
  const { k, s, strata, looks, dStar } = design;
  const lookCount = looks.length;
  const next = rng(seed, stream);
  const xT = looks.map(() => new Int32Array(strata));
  const xC = looks.map(() => new Int32Array(strata));
  const counts = { supported: 0, refuted: 0, floor: 0, ceiling: 0, interaction: 0, stackSign: 0, none: 0 };
  const stops = new Array(lookCount).fill(0);
  let runs = 0;
  for (let rep = 0; rep < reps; rep++) {
    drawPath(design, next, xT, xC);
    let j = 0;
    let outcome;
    for (;;) {
      outcome = lookOutcome(xT[j], xC[j], k, s, looks[j], dStar, thresholds.alphaSpent[j], thresholds.zR[j]);
      if (TERMINAL.has(outcome) || j === lookCount - 1) break;
      j++;
    }
    counts[outcome]++;
    stops[j]++;
    runs += 2 * strata * looks[j];
  }
  const undecidable = counts.floor + counts.ceiling + counts.interaction + counts.stackSign + counts.none;
  return {
    reps,
    supported: counts.supported / reps,
    refuted: counts.refuted / reps,
    undecidable: undecidable / reps,
    causes: {
      floor: counts.floor / reps,
      ceiling: counts.ceiling / reps,
      interaction: counts.interaction / reps,
      stackSign: counts.stackSign / reps,
      noBoundary: counts.none / reps,
    },
    meanRuns: runs / reps,
    stopAtLook: stops.map((c) => c / reps),
    maxRuns: 2 * strata * looks[lookCount - 1],
  };
}

// ---------------------------------------------------------------- scenarios

// The grid a plan is judged on. kind is 'null' (no effect), 'dStar' (true difference d*),
// 'half' (d*/2), 'oneStack' (d* in the first stack only) or 'reversal' (+d* and -d*).
export function scenarioGrid(dStar, stacks = 2, slots = 5) {
  const fill = (fn) => Array.from({ length: stacks }, (_, i) => Array.from({ length: slots }, (_, j) => fn(i, j)));
  const spread = (from, to, index, count) => (count === 1 ? (from + to) / 2 : from + ((to - from) * index) / (count - 1));
  const percent = (p) => `${Math.round(p * 1000) / 10}%`;
  const grid = [];
  const add = (id, kind, name, pT, pC) => grid.push({ id, kind, name, pT, pC });

  for (const p of [0.05, 0.1, 0.3, 0.5, 0.7, 0.9, 0.95]) {
    add(`null-${p}`, 'null', `no effect, every cell at ${percent(p)}`, fill(() => p), fill(() => p));
  }
  if (slots > 1) {
    const mixed = fill((i, j) => spread(0.1, 0.9, j, slots));
    add('null-mixed', 'null', 'no effect, slots from 10% to 90%', mixed, mixed);
  }
  if (stacks > 1) {
    const unequal = fill((i) => spread(0.2, 0.8, i, stacks));
    add('null-stacks', 'null', 'no effect, stacks from 20% to 80%', unequal, unequal);
  }

  add('dStar-centred', 'dStar', 'difference d*, centred on 50%', fill(() => 0.5 + dStar / 2), fill(() => 0.5 - dStar / 2));
  const low = Math.min(0.1, 1 - dStar);
  add('dStar-fromTen', 'dStar', `difference d*, control at ${percent(low)}`, fill(() => low + dStar), fill(() => low));
  if (slots > 1) {
    const base = (j) => spread(0.05, 0.95 - dStar, j, slots);
    add('dStar-mixed', 'dStar', 'difference d*, slots of mixed difficulty', fill((i, j) => base(j) + dStar), fill((i, j) => base(j)));
  }
  const seen = new Set([low.toFixed(4)]);
  for (const candidate of [0, 0.02, 0.05, 0.2, 1 - dStar - 0.05, 1 - dStar - 0.02, 1 - dStar]) {
    const q = Math.min(1 - dStar, Math.max(0, candidate));
    const key = q.toFixed(4);
    if (seen.has(key)) continue;
    seen.add(key);
    add(`dStar-control-${key}`, 'dStar', `difference d*, control at ${percent(q)}`, fill(() => Math.min(1, q + dStar)), fill(() => q));
  }

  add('half', 'half', 'half the difference (d*/2), centred on 50%', fill(() => 0.5 + dStar / 4), fill(() => 0.5 - dStar / 4));
  if (stacks > 1) {
    // The first stack carries the whole effect: its difference is d* times the number of
    // stacks over that number, so the mean over stacks is d* / stacks; with two stacks, d*/2.
    add('oneStack', 'oneStack', 'difference d* in the first stack only', fill((i) => (i === 0 ? 0.5 + dStar / 2 : 0.5)), fill((i) => (i === 0 ? 0.5 - dStar / 2 : 0.5)));
  }
  if (stacks === 2) {
    const sign = (i) => (i === 0 ? 1 : -1);
    add('reversal', 'reversal', 'reversal: +d* in one stack, -d* in the other', fill((i) => 0.5 + (sign(i) * dStar) / 2), fill((i) => 0.5 - (sign(i) * dStar) / 2));
  }
  return grid;
}

export function centredScenario(difference, stacks = 2, slots = 5) {
  const fill = (p) => Array.from({ length: stacks }, () => new Array(slots).fill(p));
  return { pT: fill(0.5 + difference / 2), pC: fill(0.5 - difference / 2) };
}

// ---------------------------------------------------------------- calibration of z_R

// Largest z at which the Newcombe upper limit is still below d*, searched from `from`.
// -Infinity when the limit is not below d* at `from`; Infinity when it stays below.
function criticalZ(sumT, sumC, perArm, dStar, from) {
  const upper = (z) => newcombe(sumT, perArm, sumC, perArm, z).upper;
  if (!(upper(from) < dStar)) return -Infinity;
  let low = from;
  let high = from + 8;
  if (upper(high) < dStar) return Infinity;
  for (let i = 0; i < 48; i++) {
    const middle = 0.5 * (low + high);
    if (upper(middle) < dStar) low = middle;
    else high = middle;
  }
  return low;
}

// For every replicate, the delta below which the plan would call it "refuted". Sorted.
function criticalDeltas(plan, scenario, reps, seed, stream) {
  const design = prepare(plan, scenario);
  const { k, s, strata, looks, dStar } = design;
  const alpha = spendingThresholds(looks, plan.alpha ?? 0.025);
  const nominal = alpha.map((a) => normalQuantile(1 - a));
  const next = rng(seed, stream);
  const xT = looks.map(() => new Int32Array(strata));
  const xC = looks.map(() => new Int32Array(strata));
  const critical = [];
  for (let rep = 0; rep < reps; rep++) {
    drawPath(design, next, xT, xC);
    let worst = -Infinity;
    for (let j = 0; j < looks.length; j++) {
      const facts = lookFacts(xT[j], xC[j], k, s, looks[j], alpha[j]);
      if (facts.edge) break;
      if (!facts.interaction) {
        const z = criticalZ(facts.sumT, facts.sumC, facts.perArm, dStar, nominal[j]);
        if (z - nominal[j] > worst) worst = z - nominal[j];
      }
      if (facts.significant && facts.allPositive) break;
    }
    if (worst > 0) critical.push(worst);
  }
  return critical.sort((a, b) => a - b);
}

const withMargin = (rate, reps, margin) => rate + margin * Math.sqrt((rate * (1 - rate)) / reps);

// Finds delta, the margin added to the normal quantile of every look: the smallest value on
// a grid of `step` for which the simulated P(refuted | D = d*), plus `margin` standard errors,
// stays at or below `target` in every scenario of kind 'dStar'. Then simulates the whole grid
// with the calibrated plan. Returns z_R per look and the rows of the plan table.
export function calibrate(plan, grid, reps = 100000, seed = 1, { step = 0.01, margin = 2, target = 0.025, maxDelta = 4 } = {}) {
  const stacks = grid ? grid[0].pT.length : sizeOf(plan.stacks, 2);
  const slots = grid ? grid[0].pT[0].length : sizeOf(plan.slots, 5);
  const scenarios = grid ?? scenarioGrid(plan.dStar, stacks, slots);
  const base = { ...plan };
  delete base.zR;
  delete base.delta;
  const alpha = spendingThresholds(plan.looks, plan.alpha ?? 0.025);
  const passes = (rate) => withMargin(rate, reps, margin) <= target;

  const critical = [];
  scenarios.forEach((scenario, stream) => {
    if (scenario.kind === 'dStar') critical.push(criticalDeltas(base, scenario, reps, seed, stream));
  });
  const rateAbove = (sorted, delta) => {
    let low = 0;
    let high = sorted.length;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (sorted[middle] > delta) high = middle;
      else low = middle + 1;
    }
    return (sorted.length - low) / reps;
  };
  let index = 0;
  const deltaAt = (i) => Math.round(i * step * 1e9) / 1e9;
  while (deltaAt(index) < maxDelta && !critical.every((sorted) => passes(rateAbove(sorted, deltaAt(index))))) index++;

  let calibrated;
  let rows;
  for (;;) {
    calibrated = { ...base, delta: deltaAt(index) };
    rows = scenarios.map((scenario, stream) => ({
      id: scenario.id,
      kind: scenario.kind,
      name: scenario.name,
      stream,
      scenario: { pT: scenario.pT, pC: scenario.pC },
      ...simulatePlan(calibrated, scenario, reps, seed, stream),
    }));
    // The search above works on critical values; this is the rule itself. They can differ
    // only by a tie at the grid value, and then one more step settles it.
    if (deltaAt(index) >= maxDelta || rows.every((row) => row.kind !== 'dStar' || passes(row.refuted))) break;
    index++;
  }

  const thresholds = planThresholds(calibrated);
  const worst = (kind, field) => {
    let best = null;
    for (const row of rows) if (row.kind === kind && (best === null || row[field] > best[field])) best = row;
    return best;
  };
  const byId = (id) => rows.find((row) => row.id === id) ?? null;
  const verdicts = (row) => (row ? { supported: row.supported, refuted: row.refuted, undecidable: row.undecidable } : null);
  const falseSupport = worst('null', 'supported');
  const falseRefutation = worst('dStar', 'refuted');

  // The same worst case on fresh replicates, which played no part in choosing delta.
  let validation = null;
  for (const row of rows) {
    if (row.kind !== 'dStar') continue;
    const fresh = simulatePlan(calibrated, row.scenario, reps, seed + 1, row.stream).refuted;
    if (validation === null || fresh > validation.worstFalseRefutation) validation = { seed: seed + 1, worstFalseRefutation: fresh, scenario: row.name };
  }

  return {
    plan: calibrated,
    dStar: plan.dStar,
    looks: [...plan.looks],
    stacks,
    slots,
    reps,
    seed,
    delta: calibrated.delta,
    alphaSpent: alpha,
    zR: thresholds.zR,
    maxRuns: 2 * stacks * slots * plan.looks[plan.looks.length - 1],
    worstFalseSupport: falseSupport ? falseSupport.supported : null,
    worstFalseSupportScenario: falseSupport ? falseSupport.name : null,
    worstFalseRefutation: falseRefutation ? falseRefutation.refuted : null,
    worstFalseRefutationScenario: falseRefutation ? falseRefutation.name : null,
    validation,
    summary: {
      supportedAtDStar: {
        centred: byId('dStar-centred')?.supported ?? null,
        fromTen: byId('dStar-fromTen')?.supported ?? null,
        mixed: byId('dStar-mixed')?.supported ?? null,
      },
      refutedAtNoEffect: byId('null-0.5')?.refuted ?? null,
      supportedAtNoEffect: byId('null-0.5')?.supported ?? null,
      meanRunsAtNoEffect: byId('null-0.5')?.meanRuns ?? null,
      meanRunsAtDStar: byId('dStar-centred')?.meanRuns ?? null,
      half: verdicts(byId('half')),
      oneStack: verdicts(byId('oneStack')),
      reversal: verdicts(byId('reversal')),
    },
    rows,
  };
}

// ---------------------------------------------------------------- operating characteristics

// What a calibrated plan does: worst false support over the no-effect scenarios, the
// verdict rates at each true difference (centred on 50%), and the expected number of runs.
export function operatingCharacteristics(plan, reps = 100000, seed = 1, { differences = [0.2, 0.3, 0.4, 0.5] } = {}) {
  const stacks = sizeOf(plan.stacks, 2);
  const slots = sizeOf(plan.slots, 5);
  const compact = (r) => ({ supported: r.supported, refuted: r.refuted, undecidable: r.undecidable, meanRuns: r.meanRuns });
  const nullRows = scenarioGrid(plan.dStar, stacks, slots)
    .filter((scenario) => scenario.kind === 'null')
    .map((scenario, i) => ({ id: scenario.id, name: scenario.name, ...compact(simulatePlan(plan, scenario, reps, seed, 1000 + i)) }));
  let worst = nullRows[0];
  for (const row of nullRows) if (row.supported > worst.supported) worst = row;
  const power = differences.map((difference, i) => ({
    difference,
    ...compact(simulatePlan(plan, centredScenario(difference, stacks, slots), reps, seed, 2000 + i)),
  }));
  const atDStar = simulatePlan(plan, centredScenario(plan.dStar, stacks, slots), reps, seed, 3000);
  return {
    dStar: plan.dStar,
    looks: [...plan.looks],
    reps,
    seed,
    maxRuns: 2 * stacks * slots * plan.looks[plan.looks.length - 1],
    falseSupport: { worst: worst.supported, scenario: worst.name, rows: nullRows },
    power,
    expectedRuns: { noEffect: nullRows.find((row) => row.id === 'null-0.5').meanRuns, atDStar: atDStar.meanRuns },
  };
}

// One row per plan: calibration first, then the operating characteristics of the result.
export function designTable(plans = DEFAULT_PLANS, { reps = 100000, seed = 20261118, stacks = 2, slots = 5, step = 0.01, margin = 2, differences } = {}) {
  return plans.map((plan) => {
    const calibration = calibrate({ ...plan, stacks, slots }, undefined, reps, seed, { step, margin });
    const characteristics = operatingCharacteristics(calibration.plan, reps, seed, differences ? { differences } : undefined);
    return {
      dStar: plan.dStar,
      looks: [...plan.looks],
      maxRuns: calibration.maxRuns,
      delta: calibration.delta,
      zR: calibration.zR,
      calibration,
      falseSupport: characteristics.falseSupport,
      power: characteristics.power,
      expectedRuns: characteristics.expectedRuns,
    };
  });
}

// ---------------------------------------------------------------- interval coverage, exact

function binomialPmf(n, p) {
  const pmf = new Array(n + 1).fill(0);
  if (p <= 0) pmf[0] = 1;
  else if (p >= 1) pmf[n] = 1;
  else {
    const logP = Math.log(p);
    const logQ = Math.log1p(-p);
    let logChoose = 0;
    for (let x = 0; x <= n; x++) {
      pmf[x] = Math.exp(logChoose + x * logP + (n - x) * logQ);
      logChoose += Math.log(n - x) - Math.log(x + 1);
    }
  }
  return pmf;
}

const intervalCache = new Map();
function intervals(method, n, level) {
  const key = `${method}:${n}:${level}`;
  if (!intervalCache.has(key)) {
    const z = normalQuantile(1 - (1 - level) / 2);
    const list = [];
    for (let x = 0; x <= n; x++) list.push(method === 'wilson' ? wilson(x, n, z) : clopperPearson(x, n, level));
    intervalCache.set(key, list);
  }
  return intervalCache.get(key);
}

// Exact probability that the interval of one proportion contains the true rate p.
export function coverageOneProportion(method, n, p, level = 0.95) {
  if (method !== 'wilson' && method !== 'clopperPearson') throw new RangeError(`unknown interval method: ${method}`);
  const list = intervals(method, n, level);
  const pmf = binomialPmf(n, p);
  let coverage = 0;
  for (let x = 0; x <= n; x++) if (list[x].lower <= p && p <= list[x].upper) coverage += pmf[x];
  return Math.min(1, coverage);
}

// Exact probability that the Newcombe interval contains the true difference p1 - p2.
export function coverageDifference(n1, n2, p1, p2, z = Z95) {
  const first = binomialPmf(n1, p1);
  const second = binomialPmf(n2, p2);
  const truth = p1 - p2;
  let coverage = 0;
  for (let x1 = 0; x1 <= n1; x1++) {
    if (first[x1] === 0) continue;
    for (let x2 = 0; x2 <= n2; x2++) {
      if (second[x2] === 0) continue;
      const interval = newcombe(x1, n1, x2, n2, z);
      if (interval.lower <= truth + 1e-12 && truth <= interval.upper + 1e-12) coverage += first[x1] * second[x2];
    }
  }
  return Math.min(1, coverage);
}

// Minimum and mean coverage over a grid of true rates: 1% to 99% in steps of 1% for one
// proportion, 5% to 95% in steps of 5% for each arm of a difference (n runs per arm).
export function coverageTable(sizes = [10, 20, 30, 50]) {
  const summarize = (values) => ({ min: Math.min(...values), mean: values.reduce((a, b) => a + b, 0) / values.length });
  return sizes.map((n) => {
    const one = { wilson: [], clopperPearson: [] };
    for (let i = 1; i < 100; i++) {
      for (const method of Object.keys(one)) one[method].push(coverageOneProportion(method, n, i / 100));
    }
    const two = [];
    for (let i = 1; i < 20; i++) for (let j = 1; j < 20; j++) two.push(coverageDifference(n, n, i / 20, j / 20));
    return { n, wilson: summarize(one.wilson), clopperPearson: summarize(one.clopperPearson), newcombe: summarize(two) };
  });
}

// ---------------------------------------------------------------- cost interval coverage

// E[min(X, cap)] for X log-normal with the given median and log-scale sigma.
export function cappedLogNormalMean(median, sigma, cap) {
  const mu = Math.log(median);
  const mean = Math.exp(mu + (sigma * sigma) / 2);
  if (cap === Infinity) return mean;
  const logCap = Math.log(cap);
  return mean * normalCdf((logCap - mu - sigma * sigma) / sigma) + cap * (1 - normalCdf((logCap - mu) / sigma));
}

// A token model with the features of the real runs: every call costs a fixed prompt plus a
// log-normal output cut at the output cap; a failed run uses the whole call budget; a correct
// run stops at a call drawn evenly between 1 and the budget. Tokens and success are dependent.
//   model: { rate, budget, median, sigma, cap, prompt? }
export function costModelTruth({ rate, budget, median, sigma, cap, prompt = 0 }) {
  const callMean = prompt + cappedLogNormalMean(median, sigma, cap);
  const m1 = ((budget + 1) / 2) * callMean;
  const m0 = budget * callMean;
  const meanTokens = rate * m1 + (1 - rate) * m0;
  return { callMean, m1, m0, meanTokens, costPerCorrect: rate > 0 ? meanTokens / rate : Infinity };
}

export function drawCostRuns({ rate, budget, median, sigma, cap, prompt = 0 }, n, next) {
  const runs = [];
  for (let i = 0; i < n; i++) {
    const correct = next() < rate;
    const calls = correct ? 1 + Math.floor(next() * budget) : budget;
    let tokens = 0;
    for (let c = 0; c < calls; c++) {
      const z = Math.sqrt(-2 * Math.log(1 - next())) * Math.cos(2 * Math.PI * next());
      tokens += prompt + Math.min(cap, median * Math.exp(sigma * z));
    }
    runs.push({ tokens, correct });
  }
  return runs;
}

// How often the limits of costPerCorrect hold the true cost per correct run, for arms of n runs.
export function simulateCostCoverage(model, n, reps = 2000, seed = 1, { resamples = 2000, error = 0.05 } = {}) {
  const truth = costModelTruth(model).costPerCorrect;
  const next = rng(seed);
  let lowerHolds = 0;
  let upperHolds = 0;
  let bothHold = 0;
  let zeroCorrect = 0;
  for (let rep = 0; rep < reps; rep++) {
    const result = costPerCorrect(drawCostRuns(model, n, next), seed + 1 + rep, { resamples, error });
    const lower = result.lower <= truth;
    const upper = result.upper >= truth;
    if (lower) lowerHolds++;
    if (upper) upperHolds++;
    if (lower && upper) bothHold++;
    if (result.correct === 0) zeroCorrect++;
  }
  return { n, reps, trueCost: truth, lowerHolds: lowerHolds / reps, upperHolds: upperHolds / reps, bothHold: bothHold / reps, zeroCorrect: zeroCorrect / reps };
}

// ---------------------------------------------------------------- product law power

// How often the composition check rejects, when the truth is
// P(all slots correct) = gamma^(|S| - 1) * product of q. gamma = 1 is the product law itself.
//   config: { q: single-slot rates, runsPerSlot, runsAll, gamma }
export function simulateProductLaw({ q, runsPerSlot, runsAll, gamma = 1 }, reps = 10000, seed = 1) {
  const pAll = gamma ** (q.length - 1) * q.reduce((a, b) => a * b, 1);
  const next = rng(seed);
  const draw = (n, p) => {
    let x = 0;
    for (let i = 0; i < n; i++) if (next() < p) x++;
    return x;
  };
  let rejected = 0;
  let below = 0;
  let above = 0;
  for (let rep = 0; rep < reps; rep++) {
    const result = productLaw(q.map((rate) => ({ x: draw(runsPerSlot, rate), n: runsPerSlot })), draw(runsAll, pAll), runsAll);
    if (!result.rejected) continue;
    rejected++;
    if (result.upper < 1) below++;
    else above++;
  }
  return { reps, pAll, rejected: rejected / reps, rejectedBelow: below / reps, rejectedAbove: above / reps };
}
