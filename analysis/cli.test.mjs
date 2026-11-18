// Tests for cli.mjs: the numbers it prints against closed forms and against stats.mjs, and
// the two existing run files, where every arm has zero correct runs.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as S from './stats.mjs';
import { main, analyzeRuns, renderAnalysis, parseArgs } from './cli.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
const cliPath = fileURLToPath(new URL('./cli.mjs', import.meta.url));
const e01 = fileURLToPath(new URL('./fixtures/E01-runs.csv', import.meta.url));
const e03 = fileURLToPath(new URL('./fixtures/E03-runs.csv', import.meta.url));
const NEVER = /NaN|undefined|Infinity|null|\[object/;

async function run(args) {
  let out = '';
  let err = '';
  const code = await main(args, { write: (text) => { out += text; }, writeError: (text) => { err += text; } });
  return { code, out, err };
}

// Rows of a markdown table whose first cell is `label`.
const row = (text, label) => text.split('\n').filter((line) => line.startsWith(`| ${label} |`)).map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()));

function syntheticCsv() {
  // 2 stacks x 2 slots x 2 arms x 3 runs. kit: 11 of 12 correct, bare: 2 of 12.
  const lines = ['stack,arm,slot,seed,run,calls,prompt_tokens,completion_tokens,total_tokens,hidden_passed,hidden_total,hidden2_passed,hidden2_total,gauge_pass'];
  let seed = 100;
  for (const stack of ['django', 'nextjs']) {
    for (const slot of ['cart', 'ledger']) {
      for (let i = 1; i <= 3; i++) {
        const kitFails = stack === 'nextjs' && slot === 'ledger' && i === 3;
        lines.push([stack, 'kit', slot, seed++, i, 2, 700, 300, 1000, kitFails ? 20 : 21, 21, 26, 26, 'true'].join(','));
        const bareWins = slot === 'cart' && i === 1;
        lines.push([stack, 'bare', slot, seed++, i, 6, 2000, 1000, 3000, bareWins ? 21 : 3, 21, bareWins ? 26 : 5, 26, i === 2 ? 'false' : 'true'].join(','));
      }
    }
  }
  return lines.join('\n');
}

describe('parseArgs', () => {
  test('splits the command, the files and the options', () => {
    const parsed = parseArgs(['analyze', 'a.csv', '--treatment', 'kit', 'b.csv', '--looks=3,6', '--d-star', '30']);
    assert.equal(parsed.command, 'analyze');
    assert.deepEqual(parsed.positional, ['a.csv', 'b.csv']);
    assert.deepEqual(parsed.options, { treatment: 'kit', looks: '3,6', 'd-star': '30' });
  });
});

describe('analyzeRuns', () => {
  const runs = S.readRuns(syntheticCsv());

  test('per arm: counts, intervals, cost and hidden fraction', () => {
    const report = analyzeRuns(runs, { seed: 1 });
    assert.deepEqual(report.arms, ['kit', 'bare']);
    assert.deepEqual(report.stacks, ['django', 'nextjs']);
    assert.deepEqual(report.slots, ['cart', 'ledger']);
    assert.deepEqual(report.missingColumns, []);
    const [kit, bare] = report.perArm;
    assert.deepEqual([kit.n, kit.correct, bare.n, bare.correct], [12, 11, 12, 2]);
    assert.deepEqual(kit.wilson, S.wilson(11, 12));
    assert.deepEqual(bare.clopperPearson, S.clopperPearson(2, 12));
    assert.equal(kit.zeroBound, null);
    assert.equal(kit.cost.estimate, 12000 / 11);
    assert.equal(bare.cost.estimate, 36000 / 2);
    assert.equal(bare.meanTokens, 3000);
    // 11 runs at 47/47 and one at 46/47; 2 runs at 47/47 and ten at 8/47.
    assert.ok(Math.abs(kit.hiddenFraction.mean - (11 + 46 / 47) / 12) < 1e-12);
    assert.ok(Math.abs(bare.hiddenFraction.mean - (2 + (10 * 8) / 47) / 12) < 1e-12);
    assert.equal(report.all.n, 24);
    assert.equal(report.all.correct, 13);
  });

  test('comparison: strata, exact test, posterior and verdict', () => {
    const plan = { dStar: 0.5, looks: [3], delta: 0.3, stacks: ['django', 'nextjs'], slots: ['cart', 'ledger'] };
    const report = analyzeRuns(runs, { seed: 1, treatment: 'kit', control: 'bare', plan });
    const c = report.comparison;
    const cells = S.cellsFromRuns(runs, 'kit', 'bare');
    assert.equal(cells.length, 4);
    assert.deepEqual([c.pooled.xT, c.pooled.nT, c.pooled.xC, c.pooled.nC], [11, 12, 2, 12]);
    assert.equal(c.test.pUpper, S.exactCmh(cells).pUpper);
    assert.equal(c.posterior.pGreaterZero, S.posteriorDifference(cells, 0.5).pGreaterZero);
    assert.equal(c.decision.verdict, S.decide(cells, plan, { index: 1 }).verdict);
    assert.equal(c.decision.verdict, 'supported');
    assert.equal(c.costRatio.wording, 'estimate');
    assert.ok(Math.abs(c.costRatio.estimate - 12000 / 11 / 18000) < 1e-12);
    assert.throws(() => analyzeRuns(runs, { treatment: 'kit', control: 'missing-arm' }), /missing-arm/);
  });

  test('gauge tables per arm and slot, never pooled', () => {
    const report = analyzeRuns(runs, { seed: 1 });
    assert.equal(report.gauge.length, 4);
    const bareCart = report.gauge.find((g) => g.arm === 'bare' && g.slot === 'cart');
    // 6 runs: gauge fails on run 2 of each stack; the judge passes run 1 of each stack.
    assert.deepEqual([bareCart.a, bareCart.b, bareCart.c, bareCart.d], [2, 2, 0, 2]);
    assert.equal(bareCart.falseConfidence.estimate, 0.5);
  });

  test('an arm with zero correct runs gets the bound, not a division', () => {
    const zero = runs.filter((r) => r.arm === 'bare').map((r) => ({ ...r, correct: false }));
    const report = analyzeRuns(zero, { seed: 1 });
    const [bare] = report.perArm;
    assert.equal(bare.correct, 0);
    assert.ok(Math.abs(bare.zeroBound - (1 - 0.05 ** (1 / 12))) < 1e-12);
    assert.equal(bare.cost.estimate, null);
    assert.equal(bare.cost.wording, 'at least');
    assert.ok(Math.abs(bare.cost.lower - 3000 / (1 - 0.025 ** (1 / 12))) < 1e-6);
    const text = renderAnalysis(report, 'zero.csv');
    assert.doesNotMatch(text, NEVER);
    assert.match(text, /at most 22\.1%/);
    assert.match(text, /no correct runs/);
  });
});

describe('analyze on the existing run files', () => {
  test('E01 and E03: every arm at zero, bounds printed, nothing divided by zero', async () => {
    const { code, out, err } = await run(['analyze', e01, e03]);
    assert.equal(code, 0, err);
    assert.doesNotMatch(out, NEVER);
    // E01: 18 runs in 5 arms. Two runs per cell: at most 1 - 0.05^(1/4) = 52.7% for a 4-run arm.
    const bare = row(out, 'bare');
    assert.equal(bare[0][1], '4');
    assert.equal(bare[0][2], '0');
    assert.match(bare[0].join(' '), /at most 52\.7%/);
    // of-code ran in one stack only: 2 runs, at most 1 - 0.05^(1/2) = 77.6%.
    assert.match(row(out, 'of-code')[0].join(' '), /at most 77\.6%/);
    // Pooled: 34 runs, 1,825,875 tokens, 0 correct, at most 8.4% (Wilson 10.2%).
    const pooled = out.slice(out.indexOf('## All files together'));
    assert.match(pooled, /34 runs/);
    assert.match(pooled, /1,825,875 tokens/);
    assert.match(pooled, /at most 8\.4%/);
    assert.match(pooled, /10\.2%/);
    const bound = Number(/at least ([\d,]+) tokens per correct run/.exec(pooled)[1].replaceAll(',', ''));
    assert.ok(bound > 490000 && bound < 500000, `cost bound ${bound}`);
    // 53,702 mean tokens over the Clopper-Pearson limit 1 - 0.025^(1/34) would be 522,301: the bound is below it.
    assert.ok(bound < 1825875 / 34 / (1 - 0.025 ** (1 / 34)));
    assert.match(out, /no gauge result/);
    assert.match(out, /9\.1 min/);
    assert.match(out, /10\.5 min/);
    const again = await run(['analyze', e01, e03]);
    assert.equal(again.out, out);
    const reseeded = await run(['analyze', e01, e03, '--seed', '7']);
    assert.notEqual(reseeded.out, out);
  });

  test('comparing two arms that both sit at zero is undecidable by floor', async () => {
    const { code, out } = await run(['analyze', e03, '--treatment', 'tests', '--control', 'bare', '--d-star', '30', '--looks', '4', '--delta', '0.1']);
    assert.equal(code, 0);
    assert.doesNotMatch(out, NEVER);
    assert.match(out, /undecidable/);
    assert.match(out, /floor: every run failed/);
    assert.match(out, /not estimable/);
  });

  test('the command line itself: exit codes and the same output as main', () => {
    const result = spawnSync(process.execPath, [cliPath, 'analyze', 'fixtures/E01-runs.csv', 'fixtures/E03-runs.csv'], { cwd: here, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /at most 8\.4%/);
    assert.match(result.stdout, /## fixtures\/E01-runs\.csv/);
    assert.doesNotMatch(result.stdout, NEVER);
    const bad = spawnSync(process.execPath, [cliPath, 'nonsense'], { cwd: here, encoding: 'utf8' });
    assert.equal(bad.status, 1);
    assert.match(bad.stderr, /Usage/);
    const missing = spawnSync(process.execPath, [cliPath, 'analyze', 'fixtures/no-such-file.csv'], { cwd: here, encoding: 'utf8' });
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /no-such-file\.csv/);
  });

  test('the fixtures are the published run files', { skip: !existsSync(new URL('../experiments/E01-pilot-full-task/data/runs.csv', import.meta.url)) }, () => {
    const published = (name) => readFileSync(new URL(`../experiments/${name}/data/runs.csv`, import.meta.url), 'utf8').replaceAll('\r\n', '\n');
    assert.equal(readFileSync(e01, 'utf8').replaceAll('\r\n', '\n'), published('E01-pilot-full-task'));
    assert.equal(readFileSync(e03, 'utf8').replaceAll('\r\n', '\n'), published('E03-exploratory-loop-fixes'));
  });
});

describe('analyze with a comparison', () => {
  test('prints strata, the exact test, the secondary posterior and the verdict', async () => {
    const { code, out, err } = await run(['analyze', '-', '--treatment', 'kit', '--control', 'bare', '--d-star', '50', '--looks', '3', '--delta', '0.3'], syntheticCsv());
    assert.equal(code, 0, err);
    assert.doesNotMatch(out, NEVER);
    assert.match(out, /Verdict: supported/);
    assert.deepEqual(row(out, 'pooled')[0].slice(1, 3), ['11 of 12', '2 of 12']);
    assert.match(out, /Gauge against judge/);
    assert.match(out, /false confidence/i);
  });

  describe('the planned design and step 1 of the rule', () => {
    const compare = ['analyze', '-', '--treatment', 'kit', '--control', 'bare', '--d-star', '50', '--looks', '3', '--delta', '0.3'];
    const design = ['--stacks', 'django,nextjs', '--slots', 'cart,ledger'];
    const withoutSlot = (slot) => syntheticCsv().split('\n').filter((line, i) => i === 0 || line.split(',')[2] !== slot).join('\n');

    test('a complete planned design decides as before', async () => {
      const { code, out, err } = await run([...compare, ...design], syntheticCsv());
      assert.equal(code, 0, err);
      assert.match(out, /Verdict: supported/);
      assert.doesNotMatch(out, /incomplete-block check was not applied/);
    });

    test('a planned slot missing from every stack is undecidable, whatever the other cells say', async () => {
      const csv = withoutSlot('ledger');
      const unplanned = await run(compare, csv);
      assert.doesNotMatch(unplanned.out, /incomplete block/);
      assert.match(unplanned.out, /incomplete-block check was not applied/);
      const planned = await run([...compare, ...design], csv);
      assert.equal(planned.code, 0, planned.err);
      assert.match(planned.out, /Verdict: undecidable/);
      assert.match(planned.out, /broken instrument: incomplete block \(no runs for django \/ ledger\)/);
    });

    test('a planned stack with no runs is undecidable; a cell outside the plan is too', async () => {
      const extra = await run([...compare, '--stacks', 'django,nextjs,rails', '--slots', 'cart,ledger'], syntheticCsv());
      assert.match(extra.out, /Verdict: undecidable/);
      assert.match(extra.out, /no runs for rails \/ cart/);
      const fewer = await run([...compare, '--stacks', 'django', '--slots', 'cart,ledger'], syntheticCsv());
      assert.match(fewer.out, /Verdict: undecidable/);
      assert.match(fewer.out, /outside the plan/);
    });

    test('without a planned design the output says the incomplete-block check was not applied', async () => {
      const { out } = await run(compare, syntheticCsv());
      assert.match(out, /incomplete-block check was not applied/);
      assert.match(out, /--stacks and --slots/);
    });

    test('--stacks and --slots come together and need the decision rule', async () => {
      const onlyStacks = await run([...compare, '--stacks', 'django,nextjs'], syntheticCsv());
      assert.equal(onlyStacks.code, 1);
      assert.match(onlyStacks.err, /--stacks and --slots/);
      const noRule = await run(['analyze', '-', '--treatment', 'kit', '--control', 'bare', ...design], syntheticCsv());
      assert.equal(noRule.code, 1);
      assert.match(noRule.err, /decision rule/);
    });
  });

  async function run(args, stdin) {
    let out = '';
    let err = '';
    const code = await main(args, { write: (text) => { out += text; }, writeError: (text) => { err += text; }, stdin });
    return { code, out, err };
  }
});

describe('design tables', () => {
  test('sizes: the normal approximation and the exact Fisher test', async () => {
    const { code, out } = await run(['sizes']);
    assert.equal(code, 0);
    assert.deepEqual(row(out, '20 points')[0].slice(1, 3), ['97', '102']);
    assert.deepEqual(row(out, '30 points')[0].slice(1, 3), ['43', '49']);
    assert.deepEqual(row(out, '40 points')[0].slice(1, 3), ['24', '29']);
    assert.deepEqual(row(out, '50 points')[0].slice(1, 3), ['15', '18']);
    assert.equal(row(out, '20 points')[0][3], '62');
  });

  test('design: one calibrated row per plan, reproducible for a seed', async () => {
    const args = ['design', '--reps', '400', '--d-star', '50', '--looks', '2', '--seed', '3'];
    const { code, out, err } = await run(args);
    assert.equal(code, 0, err);
    assert.doesNotMatch(out, NEVER);
    assert.match(out, /\| d\* \|/);
    assert.match(out, /2 \(40\)/);
    assert.match(out, /400 replicates/);
    assert.match(out, /20 points/);
    assert.equal((await run(args)).out, out);
  });

  test('design: every rate is followed by its Monte Carlo standard error, sqrt(p(1-p)/reps)', async () => {
    const reps = 400;
    const { code, out, err } = await run(['design', '--reps', String(reps), '--d-star', '50', '--looks', '2', '--seed', '3']);
    assert.equal(code, 0, err);
    // Shares such as '0.85 (se 0.018)' and percentages such as '2.0% (se 0.7)'.
    const shares = [...out.matchAll(/\b([01]\.\d\d) \(se (\d\.\d{3})\)/g)];
    const percents = [...out.matchAll(/(\d+\.\d)% \(se (\d+\.\d\d)\)/g)];
    assert.ok(shares.length >= 12, 'shares found: ' + shares.length);
    assert.ok(percents.length >= 3, 'percentages found: ' + percents.length);
    for (const [, p, se] of shares) {
      const truth = Math.sqrt(Number(p) * (1 - Number(p)) / reps);
      assert.ok(Math.abs(Number(se) - truth) <= 0.003, p + ' has se ' + se + ', expected about ' + truth.toFixed(3));
    }
    for (const [, p, se] of percents) {
      const q = Number(p) / 100;
      const truth = 100 * Math.sqrt(q * (1 - q) / reps);
      assert.ok(Math.abs(Number(se) - truth) <= 0.1, p + '% has se ' + se + ', expected about ' + truth.toFixed(1));
    }
    assert.match(out, /standard error/);
    // No rate is left bare.
    const tableLines = out.split('\n').filter((line) => line.startsWith('| ') && !line.startsWith('| d*') && !line.startsWith('| ---')).map((line) => line.replace(/ \(se [\d.]+\)/g, ' (se)'));
    const bare = tableLines.flatMap((line) => [...line.matchAll(/\b[01]\.\d\d\b(?! \(se)/g)].map((m) => m[0]));
    assert.deepEqual(bare, []);
    const barePercent = tableLines.flatMap((line) => [...line.matchAll(/\d+\.\d%(?! \(se)/g)].map((m) => m[0]));
    assert.deepEqual(barePercent, []);
  });

  test('coverage, cost-coverage and product-law print their tables', async () => {
    const coverage = await run(['coverage', '--sizes', '10']);
    assert.equal(coverage.code, 0);
    assert.match(coverage.out, /Clopper-Pearson/);
    const cost = await run(['cost-coverage', '--reps', '40', '--resamples', '200']);
    assert.equal(cost.code, 0, cost.err);
    assert.doesNotMatch(cost.out, NEVER);
    assert.match(cost.out, /Lower limit holds/);
    const law = await run(['product-law', '--reps', '200']);
    assert.equal(law.code, 0, law.err);
    assert.match(law.out, /gamma/);
  });

  test('help lists every command; an unknown command or option fails', async () => {
    const help = await run(['help']);
    assert.equal(help.code, 0);
    for (const command of ['design', 'sizes', 'analyze', 'coverage', 'cost-coverage', 'product-law']) assert.match(help.out, new RegExp(`\\b${command}\\b`));
    assert.equal((await run(['nonsense'])).code, 1);
    assert.equal((await run([])).code, 1);
    const bad = await run(['analyze', e01, '--no-such-option', '1']);
    assert.equal(bad.code, 1);
    assert.match(bad.err, /no-such-option/);
    assert.equal((await run(['analyze'])).code, 1);
  });
});

// ---- per-attempt results: the first-attempt comparison and the per-attempt gauge (A5) ----

describe('analyze with first-attempt and per-attempt results', () => {
  const runsFile = fileURLToPath(new URL('./fixtures/runs-attempts-synthetic.csv', import.meta.url));
  const attemptsFile = fileURLToPath(new URL('./fixtures/attempts-synthetic.csv', import.meta.url));
  const compare = ['--treatment', 'kit-tests', '--control', 'kit-bare'];
  const section = (text, heading) => {
    const start = text.indexOf(`### ${heading}`);
    if (start < 0) return null;
    const rest = text.slice(start + 4);
    const end = rest.search(/\n#{2,3} /);
    return end < 0 ? rest : rest.slice(0, end);
  };
  async function runWith(args, stdin) {
    let out = '';
    let err = '';
    const code = await main(args, { write: (text) => { out += text; }, writeError: (text) => { err += text; }, stdin });
    return { code, out, err };
  }

  test('the first-attempt section: counts, difference and Newcombe interval, by hand, and no verdict', async () => {
    // First attempt (fixture): kit-tests 3 of 3 in cart and 1 of 3 in ledger, so 4 of 6; kit-bare 1 of 3 and 2 of 3, so 3 of 6.
    // Difference 4/6 - 3/6 = +1/6 = +16.7 points; the one stack holds every run, so the stack row and the pooled row agree.
    const { code, out, err } = await runWith(['analyze', runsFile, ...compare]);
    assert.equal(code, 0, err);
    assert.doesNotMatch(out, NEVER);
    const text = section(out, 'At the first attempt (calls held equal)');
    assert.ok(text, 'section present');
    const interval = S.newcombe(4, 6, 3, 6);
    const pts = (v) => `${100 * v > 0 ? '+' : ''}${(100 * v).toFixed(1)}`;
    const expected = ['4 of 6', '3 of 6', '+16.7', `${pts(interval.lower)} to ${pts(interval.upper)}`];
    assert.deepEqual(row(text, 'stack nextjs')[0].slice(1), expected);
    assert.deepEqual(row(text, 'pooled')[0].slice(1), expected);
    assert.match(text, /Secondary result: no verdict\./);
    assert.doesNotMatch(text, /supported|refuted/i);
    // The final results of the same runs are 4 of 6 against 4 of 6: the main table is not changed by the new section.
    assert.deepEqual(row(out, 'pooled')[0].slice(1, 3), ['4 of 6', '4 of 6']);
  });

  test('a file without first_correct has no such section; some runs without it say not available', async () => {
    const old = await runWith(['analyze', e03, '--treatment', 'tests', '--control', 'bare']);
    assert.equal(old.code, 0, old.err);
    assert.doesNotMatch(old.out, /first attempt/i);
    const lines = readFileSync(runsFile, 'utf8').trim().split('\n');
    const header = lines[0].split(',');
    const at = header.indexOf('first_correct');
    const partial = lines.map((line, i) => (i === 1 ? line.split(',').map((v, j) => (j === at ? '' : v)).join(',') : line)).join('\n');
    const { code, out, err } = await runWith(['analyze', '-', ...compare], partial);
    assert.equal(code, 0, err);
    const text = section(out, 'At the first attempt (calls held equal)');
    assert.match(text, /Not available: 1 of 12 runs of these two arms have no first-attempt result/);
    assert.doesNotMatch(text, /\| pooled \|/);
  });

  test('--attempts adds one table per arm: the four cells, the three rates with their intervals, runs, attempts and unjudged', async () => {
    const { code, out, err } = await runWith(['analyze', runsFile, ...compare, '--attempts', attemptsFile, '--resamples', '2000']);
    assert.equal(code, 0, err);
    assert.doesNotMatch(out, NEVER);
    const text = section(out, 'Gauge against judge, per attempt');
    assert.ok(text, 'section present');
    assert.match(text, /#### kit-bare/);
    assert.match(text, /#### kit-tests/);
    // kit-bare over all slots, by hand: a 4, b 1, c 1, d 5; sensitivity 5 of 6, specificity 4 of 5, false confidence 1 of 5; 6 runs, 11 attempts.
    const bare = row(text, 'all')[0];
    assert.deepEqual(bare.slice(1, 5), ['4', '1', '1', '5']);
    assert.match(bare[5], /^5 of 6, 83\.3% \(bootstrap [\d.]+% to [\d.]+%\)/);
    assert.match(bare[6], /^4 of 5, 80\.0%/);
    assert.match(bare[7], /^1 of 5, 20\.0%/);
    assert.deepEqual(bare.slice(8, 11), ['6', '11', '0']);
    // kit-tests over all slots: a 4, b 1, c 0, d 3.
    const tests = row(text, 'all')[1];
    assert.deepEqual(tests.slice(1, 5), ['4', '1', '0', '3']);
    // Per slot rows exist for each arm that has slots.
    assert.equal(row(text, 'cart').length, 2);
    assert.equal(row(text, 'ledger').length, 2);
    assert.doesNotMatch(text, /supported|refuted/i);
    // Same seed, same output.
    const again = await runWith(['analyze', runsFile, ...compare, '--attempts', attemptsFile, '--resamples', '2000']);
    assert.equal(again.out, out);
  });

  test('a table with an empty denominator says not estimable', async () => {
    // Only the three attempts (0,0) of kit-tests ledger run 2: d = 3, so specificity and false confidence have an empty denominator.
    const only = readFileSync(attemptsFile, 'utf8').split('\n').filter((l, i) => i === 0 || /^nextjs,kit-tests\.ledger,ledger,2,/.test(l)).join('\n');
    const { code, out, err } = await runWith(['analyze', runsFile, '--attempts', '-', '--resamples', '200'], only);
    assert.equal(code, 0, err);
    assert.doesNotMatch(out, NEVER);
    const text = section(out, 'Gauge against judge, per attempt');
    const all = row(text, 'all')[0];
    assert.deepEqual(all.slice(1, 5), ['0', '0', '0', '3']);
    assert.match(all[5], /^3 of 3, 100\.0%/);
    assert.equal(all[6], 'not estimable');
    assert.equal(all[7], 'not estimable');
  });

  test('judge_agrees = 0 puts a warning first: the count, and the instrument must be checked', async () => {
    const lines = readFileSync(runsFile, 'utf8').trim().split('\n');
    lines[2] = lines[2].replace(/,1$/, ',0');
    lines[5] = lines[5].replace(/,1$/, ',0');
    const { code, out, err } = await runWith(['analyze', '-', ...compare], lines.join('\n'));
    assert.equal(code, 0, err);
    const body = out.split('\n');
    assert.match(body[0], /^## /);
    assert.equal(body[1], '');
    assert.match(body[2], /^Warning: 2 of 12 runs have judge_agrees = 0/);
    assert.match(body[2], /instrument must be checked before the result is used/);
    const clean = await runWith(['analyze', runsFile, ...compare]);
    assert.doesNotMatch(clean.out, /Warning|judge_agrees/);
  });

  test('analyzeRuns carries the same data the text prints', () => {
    const runs = S.readRuns(readFileSync(runsFile, 'utf8'));
    const report = analyzeRuns(runs, { seed: 1, resamples: 100, treatment: 'kit-tests', control: 'kit-bare', attempts: S.readAttempts(readFileSync(attemptsFile, 'utf8')) });
    assert.equal(report.judgeDisagreements, 0);
    assert.deepEqual([report.comparison.firstAttempt.pooled.xT, report.comparison.firstAttempt.pooled.nT, report.comparison.firstAttempt.pooled.xC, report.comparison.firstAttempt.pooled.nC], [4, 6, 3, 6]);
    assert.equal(report.attemptGauge.length, 6);
    const old = analyzeRuns(S.readRuns(readFileSync(e03, 'utf8')), { treatment: 'tests', control: 'bare' });
    assert.equal(old.comparison.firstAttempt, null);
    assert.equal(old.attemptGauge, null);
  });

  test('--attempts goes with one runs file, an unreadable file or missing columns are errors, and the help lists it', async () => {
    const two = await runWith(['analyze', runsFile, runsFile, '--attempts', attemptsFile]);
    assert.equal(two.code, 1);
    assert.match(two.err, /--attempts goes with one runs file/);
    const missing = await runWith(['analyze', runsFile, '--attempts', 'no-such-file.csv']);
    assert.equal(missing.code, 1);
    assert.match(missing.err, /cannot read no-such-file\.csv/);
    const bad = await runWith(['analyze', runsFile, '--attempts', '-'], 'stack,arm,run\nd,a,1');
    assert.equal(bad.code, 1);
    assert.match(bad.err, /attempts\.csv is missing the column\(s\): attempt, gauge_pass, judge_correct/);
    const help = await runWith(['help']);
    assert.match(help.out, /--attempts/);
  });
});
