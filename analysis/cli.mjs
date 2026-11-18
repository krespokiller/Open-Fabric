#!/usr/bin/env node
// Command line for the analysis: design tables and the analysis of a runs.csv.
// Everything is printed as Markdown, so a table in README.md is the output of one command.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import * as S from './stats.mjs';
import * as M from './simulate.mjs';

export const DEFAULT_SEED = 20261118;

const USAGE = `Usage: node analysis/cli.mjs <command> [options]

Commands
  sizes            Runs per arm for a fixed sample: normal approximation and exact Fisher test.
  design           Calibrate the plans and print their operating characteristics.
                   --reps N (100000)  --seed N  --stacks N (2)  --slots N (5)  --step X (0.01)
                   --d-star POINTS --looks M[,M]   one plan instead of the default six
  analyze FILE...  Analyze one or more runs.csv ("-" reads standard input).
                   --treatment ARM --control ARM   compare two arms
                   --d-star POINTS --looks M[,M] --delta X | --z-r Z[,Z]   apply the decision rule
                   --stacks A,B --slots X,Y,Z   the planned design: a planned stratum with no runs makes the
                                   verdict undecidable (use --slots all for a file with no slot column)
                   --look N  --hash H --plan-hash H  --seed N  --resamples N (10000)
                   --attempts FILE   attempts.csv of the same run: adds the gauge against the judge per
                                   attempt (sensitivity, specificity, false confidence, bootstrap by run).
                                   Takes one runs file. With --treatment and --control, a runs.csv that
                                   has first_correct also gives the comparison at the first attempt
                                   (calls held equal). Both are secondary results: no verdict.
  coverage         Exact coverage of the Wilson, Clopper-Pearson and Newcombe intervals.
                   --sizes N[,N] (10,20,30,50)
  cost-coverage    Coverage of the cost-per-correct-run limits with capped heavy-tailed tokens.
                   --reps N (2000)  --resamples N (2000)  --seed N
  product-law      How often the composition check rejects, when the law holds and when it fails.
                   --reps N (10000)  --seed N
  help             This text.
`;

const OPTIONS = {
  sizes: [],
  design: ['reps', 'seed', 'stacks', 'slots', 'step', 'd-star', 'looks'],
  analyze: ['treatment', 'control', 'd-star', 'looks', 'delta', 'z-r', 'look', 'hash', 'plan-hash', 'stacks', 'slots', 'seed', 'resamples', 'attempts'],
  coverage: ['sizes'],
  'cost-coverage': ['reps', 'resamples', 'seed'],
  'product-law': ['reps', 'seed'],
  help: [],
};

export function parseArgs(argv) {
  const [command, ...rest] = argv;
  const positional = [];
  const options = {};
  for (let i = 0; i < rest.length; i++) {
    const token = rest[i];
    if (token.startsWith('--')) {
      const equals = token.indexOf('=');
      if (equals > 0) options[token.slice(2, equals)] = token.slice(equals + 1);
      else options[token.slice(2)] = rest[++i];
    } else positional.push(token);
  }
  return { command, positional, options };
}

// ---------------------------------------------------------------- formatting

const whole = (value) => Math.round(value).toLocaleString('en-US');
const percent = (value, digits = 1) => `${(100 * value).toFixed(digits)}%`;
const share = (value) => value.toFixed(2);
// Monte Carlo standard error of a simulated rate: sqrt(p(1 - p) / reps).
const mcError = (value, reps) => Math.sqrt((value * (1 - value)) / reps);
const shareSe = (value, reps) => `${share(value)} (se ${mcError(value, reps).toFixed(3)})`;
const percentSe = (value, reps) => `${percent(value)} (se ${(100 * mcError(value, reps)).toFixed(2)})`;
const points = (value) => {
  const rounded = Math.abs(100 * value) < 0.05 ? 0 : 100 * value;
  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}`;
};
const pValue = (p) => (p < 0.0001 ? p.toExponential(1) : p.toFixed(4));
const range = (interval, format = percent) => `${format(interval.lower)} to ${format(interval.upper)}`;

function table(headers, rows) {
  const line = (cells) => `| ${cells.join(' | ')} |`;
  return [line(headers), line(headers.map(() => '---')), ...rows.map(line)].join('\n');
}

const unique = (values) => [...new Set(values)];

function number(options, name, fallback) {
  if (options[name] === undefined) return fallback;
  const value = Number(options[name]);
  if (!Number.isFinite(value)) throw new UsageError(`--${name} needs a number, got "${options[name]}"`);
  return value;
}

function list(options, name) {
  if (options[name] === undefined) return undefined;
  const values = String(options[name]).split(',').map(Number);
  if (values.length === 0 || values.some((v) => !Number.isFinite(v))) throw new UsageError(`--${name} needs numbers separated by commas, got "${options[name]}"`);
  return values;
}

// d* is given in points (30) or as a fraction (0.3).
function dStarOf(options) {
  const value = number(options, 'd-star', undefined);
  if (value === undefined) return undefined;
  const fraction = value > 1 ? value / 100 : value;
  if (!(fraction > 0 && fraction <= 1)) throw new UsageError(`--d-star must be between 0 and 100 points, got "${options['d-star']}"`);
  return fraction;
}

// A list of names (stacks, slots), kept as text.
function names(options, name) {
  if (options[name] === undefined) return undefined;
  const values = String(options[name]).split(',').map((v) => v.trim());
  if (values.some((v) => v === '')) throw new UsageError(`--${name} needs names separated by commas, got "${options[name]}"`);
  return values;
}

class UsageError extends Error {}

// ---------------------------------------------------------------- analysis of runs

function summarizeArm(label, runs, seed, resamples) {
  const n = runs.length;
  const correct = runs.filter((r) => r.correct).length;
  const tokens = runs.reduce((sum, r) => sum + r.tokens, 0);
  const mean = (values) => (values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null);
  const minutes = runs.map((r) => Number(r.raw?.wall_ms)).filter((v) => Number.isFinite(v) && v > 0).map((v) => v / 60000);
  return {
    arm: label,
    n,
    correct,
    wilson: S.wilson(correct, n),
    clopperPearson: S.clopperPearson(correct, n),
    zeroBound: n > 0 && correct === 0 ? S.zeroSuccessBound(n) : null,
    tokens,
    meanTokens: n > 0 ? tokens / n : null,
    cost: S.costPerCorrect(runs, seed, { resamples }),
    hiddenFraction: S.bootstrapMean(runs.map((r) => r.hiddenFraction).filter((v) => v !== null), seed, resamples),
    meanCalls: mean(runs.map((r) => r.calls).filter((v) => v !== null)),
    meanMinutes: mean(minutes),
  };
}

// The comparison with every run scored at its first attempt (calls held equal). null when no run of the two
// arms has a first-attempt result (an older file): the section is then left out. When only some runs have
// one, the result is "not available" and says how many are missing, never zeros.
function firstAttemptOf(runs, treatment, control) {
  const compared = runs.filter((r) => r.arm === treatment || r.arm === control);
  const known = compared.filter((r) => r.firstCorrect === true || r.firstCorrect === false).length;
  if (known === 0) return null;
  const cells = S.firstAttemptCells(runs, treatment, control);
  if (cells === null) return { available: false, runs: compared.length, missing: compared.length - known };
  const summary = S.summarizeCells(cells);
  return { available: true, cells, perStack: summary.perStack, pooled: summary.pooled };
}

// Everything the report of one set of runs needs, as plain data.
//   options: { seed, resamples, treatment, control, dStar, plan, look, hash, attempts }
//   attempts: the rows of an attempts.csv (S.readAttempts), for the gauge against the judge per attempt.
export function analyzeRuns(runs, options = {}) {
  const seed = options.seed ?? DEFAULT_SEED;
  const resamples = options.resamples ?? 10000;
  const arms = unique(runs.map((r) => r.arm));
  const stacks = unique(runs.map((r) => r.stack));
  const slots = unique(runs.map((r) => r.slot).filter((slot) => slot !== null));
  const missingColumns = [];
  if (runs.length > 0) {
    if (runs.every((r) => r.slot === null)) missingColumns.push('slot');
    if (runs.every((r) => r.seed === null)) missingColumns.push('seed');
    if (runs.every((r) => r.gaugePass === null)) missingColumns.push('gauge result');
  }
  const report = {
    runs: runs.length,
    arms,
    stacks,
    slots,
    missingColumns,
    perArm: arms.map((arm) => summarizeArm(arm, runs.filter((r) => r.arm === arm), seed, resamples)),
    all: summarizeArm('all arms', runs, seed, resamples),
    perStack: [],
    gauge: missingColumns.includes('gauge result') || runs.length === 0 ? null : S.gaugeTables(runs),
    judgeDisagreements: runs.filter((r) => r.judgeAgrees === false).length,
    attemptGauge: options.attempts ? S.attemptGaugeTables(options.attempts, { seed, resamples }) : null,
    attemptSettings: { seed, resamples },
    comparison: null,
  };
  for (const arm of arms) {
    for (const stack of stacks) {
      const subset = runs.filter((r) => r.arm === arm && r.stack === stack);
      if (subset.length === 0) continue;
      const correct = subset.filter((r) => r.correct).length;
      report.perStack.push({ arm, stack, n: subset.length, correct, wilson: S.wilson(correct, subset.length) });
    }
  }

  const { treatment, control } = options;
  if (treatment !== undefined || control !== undefined) {
    for (const [role, arm] of [['treatment', treatment], ['control', control]]) {
      if (!arms.includes(arm)) throw new UsageError(`the ${role} arm "${arm}" is not in the runs; arms: ${arms.join(', ')}`);
    }
    const cells = S.cellsFromRuns(runs, treatment, control);
    const plan = options.plan ?? null;
    const dStar = plan?.dStar ?? options.dStar ?? null;
    let decision = null;
    let pooledZ = S.Z95;
    if (plan) {
      const sizes = unique(cells.flatMap((cell) => [cell.nT, cell.nC]));
      const matching = sizes.length === 1 ? plan.looks.indexOf(sizes[0]) + 1 : 0;
      const index = options.look ?? (matching > 0 ? matching : plan.looks.length);
      decision = S.decide(cells, plan, { index, hash: options.hash });
      if (decision.statistics) pooledZ = decision.statistics.zR;
    }
    const summary = S.summarizeCells(cells, { pooledZ });
    const pooled = summary.pooled;
    const failures = pooled.nT + pooled.nC - pooled.xT - pooled.xC;
    report.comparison = {
      treatment,
      control,
      dStar,
      cells,
      perStack: summary.perStack,
      perSlot: slots.length > 0 ? summary.perSlot : [],
      opposingSlots: slots.length > 0 ? summary.opposingSlots : [],
      pooled,
      designPlanned: Boolean(plan?.stacks && plan?.slots),
      edge: pooled.xT + pooled.xC === 0 ? 'floor' : failures === 0 ? 'ceiling' : null,
      test: S.exactCmh(cells),
      contrasts: S.stackContrasts(summary.perStack),
      posterior: S.posteriorDifference(cells, dStar ?? 0),
      costRatio: S.costRatio(runs.filter((r) => r.arm === treatment), runs.filter((r) => r.arm === control), seed, { resamples }),
      firstAttempt: firstAttemptOf(runs, treatment, control),
      decision,
    };
  }
  return report;
}

function costCell(cost) {
  if (cost.wording === 'not estimable') return 'not estimable';
  if (cost.wording === 'at least') return `no correct runs: at least ${whole(cost.lower)} tokens per correct run`;
  return `${whole(cost.estimate)} (limits ${whole(cost.lower)} to ${whole(cost.upper)})`;
}

function renderComparison(c) {
  const out = [];
  const counts = (x, n) => `${x} of ${n}`;
  const rowOf = (label, r, note = '') => [label, counts(r.xT, r.nT), counts(r.xC, r.nC), r.difference === null ? 'not estimable' : points(r.difference), r.difference === null ? 'not estimable' : `${range(r.interval, points)}${note}`];
  const rows = [];
  for (const s of c.perStack) rows.push(rowOf(`stack ${s.stack}`, s));
  for (const s of c.perSlot) rows.push(rowOf(`slot ${s.slot}`, s, s.opposing ? ' (against the pooled direction)' : ''));
  const z = c.pooled.intervalZ;
  rows.push(rowOf('pooled', c.pooled, Math.abs(z - S.Z95) > 1e-9 ? ` (z_R = ${z.toFixed(2)})` : ''));
  out.push(`### ${c.treatment} against ${c.control}`, '');
  out.push(table(['Stratum', `Correct, ${c.treatment}`, `Correct, ${c.control}`, 'Difference (points)', 'Newcombe interval (points)'], rows), '');
  out.push('Stack and slot rows use 95% intervals. A slot against the pooled direction is a flag, never a gate.', '');

  if (c.edge === 'floor') out.push('- Every run failed in both arms (floor): no difference can be read from these runs.');
  if (c.edge === 'ceiling') out.push('- Every run passed in both arms (ceiling): no difference can be read from these runs.');
  out.push(`- Exact stratified test (Cochran-Mantel-Haenszel, ${c.test.informativeStrata} informative strata of ${c.cells.length}): one-sided p = ${pValue(c.test.pUpper)}, two-sided p = ${pValue(c.test.pTwoSided)}.`);
  const flagged = c.contrasts.pairs.filter((pair) => pair.flagged);
  if (c.contrasts.pairs.length === 0) out.push('- Interaction between stacks: not applicable with fewer than two stacks.');
  else if (flagged.length === 0) out.push('- Interaction between stacks: none flagged.');
  else {
    for (const pair of flagged) {
      out.push(`- Interaction between stacks: ${pair.stacks[0]} and ${pair.stacks[1]} have opposite signs, contrast ${points(pair.contrast)} points (${range(pair, points)}).`);
    }
  }
  const posterior = [`P(D > 0) = ${percent(c.posterior.pGreaterZero)}`];
  if (c.dStar !== null) posterior.push(`P(D >= d*) = ${percent(c.posterior.pAtLeastDStar)}`);
  out.push(`- Secondary, no verdict: posterior ${posterior.join(', ')} (uniform prior per stack and arm).`);
  const ratio = c.costRatio;
  if (ratio.wording === 'estimate') {
    out.push(`- Cost per correct run, ${c.treatment} over ${c.control}: ${ratio.estimate.toPrecision(3)} (limits ${ratio.lower.toPrecision(3)} to ${ratio.upper.toPrecision(3)}); log ratio ${Math.log(ratio.estimate).toFixed(2)} = structural ${ratio.structural.toFixed(2)} + retry ${ratio.retry.toFixed(2)}.`);
  } else if (ratio.wording === 'at most') {
    out.push(`- Cost per correct run, ${c.treatment} over ${c.control}: ${c.control} has no correct runs, so the ratio has no estimate; it is at most ${ratio.upper.toPrecision(3)}.`);
  } else if (ratio.wording === 'at least') {
    out.push(`- Cost per correct run, ${c.treatment} over ${c.control}: ${c.treatment} has no correct runs, so the ratio has no estimate; it is at least ${ratio.lower.toPrecision(3)}.`);
  } else {
    out.push('- Cost per correct run, ratio between the arms: not estimable, no arm has a correct run.');
  }
  out.push('');

  const d = c.decision;
  if (!d) {
    out.push('No verdict: a verdict needs the preregistered plan (--d-star, --looks, and --delta or --z-r).');
  } else {
    out.push(`**Verdict: ${d.verdict}.** ${d.cause ? `Cause: ${d.cause}.` : 'No boundary crossed at this look; the plan continues.'}`);
    if (!c.designPlanned) out.push('', 'The incomplete-block check was not applied: no planned design was given (--stacks and --slots), so a stack or slot with no runs is not detected.');
    const st = d.statistics;
    if (st) {
      out.push('', `Look ${st.look} of ${st.looks}, ${st.runsPerCell} runs per cell, ${st.runs} runs. d* = ${points(st.dStar)} points, a = ${st.alphaSpent}, z_R = ${st.zR.toFixed(2)}.`);
      out.push(`Upper limit of the difference: ${points(st.upperLimit)} points. Exact one-sided p: ${pValue(st.pS)}. Positive in every stack: ${st.positiveInEveryStack ? 'yes' : 'no'}.`);
      out.push(`Estimate at least d*: ${st.estimateAtLeastDStar ? 'yes' : 'no'} (reported, never required).`);
      if (st.estimateBias) out.push(`The plan stopped early: the estimate of the difference is biased ${st.estimateBias}.`);
      if (d.verdict === 'supported') out.push('`supported` means the difference is above 0 and d* is not excluded. It does not mean the difference is at least d*.');
    }
  }
  return out.join('\n');
}

// Secondary result, no verdict: every run scored at its first attempt, so the arms get the same calls.
function renderFirstAttempt(c, first) {
  const out = ['### At the first attempt (calls held equal)', ''];
  if (!first.available) {
    out.push(`Not available: ${first.missing} of ${first.runs} runs of these two arms have no first-attempt result (first_correct), so no count is formed.`);
    return out.join('\n');
  }
  const rowOf = (label, r) => [label, `${r.xT} of ${r.nT}`, `${r.xC} of ${r.nC}`, r.difference === null ? 'not estimable' : points(r.difference), r.difference === null ? 'not estimable' : range(r.interval, points)];
  const rows = [...first.perStack.map((s) => rowOf(`stack ${s.stack}`, s)), rowOf('pooled', first.pooled)];
  out.push('Every run is scored at its first attempt (first_correct), so both arms are compared with the same number of calls.', '');
  out.push(table(['Stratum', `Correct, ${c.treatment}`, `Correct, ${c.control}`, 'Difference (points)', 'Newcombe interval (points)'], rows), '');
  out.push('All rows use 95% intervals. Secondary result: no verdict.');
  return out.join('\n');
}

// Secondary result, no verdict: the gauge against the judge on every attempt, one table per arm.
function renderAttemptGauge(tables, settings) {
  const out = ['### Gauge against judge, per attempt', ''];
  if (tables.length === 0) {
    out.push('No attempts in the file.');
    return out.join('\n');
  }
  const rateCell = (r) => {
    if (!r.estimable) return 'not estimable';
    const interval = r.lower === null ? 'no interval' : `bootstrap ${range(r)}`;
    return `${r.x} of ${r.n}, ${percent(r.estimate)} (${interval})`;
  };
  const arms = unique(tables.map((t) => t.arm));
  for (const arm of arms) {
    out.push(`#### ${arm}`, '');
    out.push(table(
      ['Slot', 'a: gauge passes, judge correct', 'b: gauge passes, judge incorrect', 'c: gauge fails, judge correct', 'd: gauge fails, judge incorrect', 'Sensitivity', 'Specificity', 'False confidence', 'Runs', 'Attempts', 'Unjudged', 'Resamples skipped (sensitivity / specificity / false confidence)'],
      tables.filter((t) => t.arm === arm).map((t) => [t.slot, t.a, t.b, t.c, t.d, rateCell(t.sensitivity), rateCell(t.specificity), rateCell(t.falseConfidence), t.runs, t.attempts, t.unjudged, `${t.sensitivity.skipped} / ${t.specificity.skipped} / ${t.falseConfidence.skipped}`]),
    ), '');
  }
  out.push(`Positive means the judge fails. Sensitivity is d / (b + d), specificity a / (a + c), false confidence b / (a + b). Limits are 95% percentile bootstrap limits that resample whole runs (${whole(settings.resamples)} resamples, seed ${settings.seed}); a resample whose denominator is empty is skipped and counted. A rate of 0% or 100% gets limits of zero width from the bootstrap: that says the sample showed no variation, not that the rate is known. Attempts with no judge result are left out and counted as unjudged. Tables are never pooled across arms. Secondary result: no verdict.`);
  return out.join('\n');
}

export function renderAnalysis(report, title) {
  const out = [`## ${title}`, ''];
  if (report.runs === 0) {
    out.push('No runs.');
    return `${out.join('\n')}\n`;
  }
  if (report.judgeDisagreements > 0) {
    out.push(`Warning: ${report.judgeDisagreements} of ${report.runs} runs have judge_agrees = 0: the hidden judge on the last attempt did not agree with the final judgement. The instrument must be checked before the result is used.`, '');
  }
  const facts = [`${report.runs} runs`, `arms: ${report.arms.join(', ')}`, `stacks: ${report.stacks.join(', ')}`];
  if (report.slots.length > 0) facts.push(`slots: ${report.slots.join(', ')}`);
  out.push(`${facts.join('; ')}.`);
  if (report.all.meanMinutes !== null) out.push(`Mean wall time per run: ${report.all.meanMinutes.toFixed(1)} min.`);
  if (report.missingColumns.length > 0) {
    out.push(`Not in this file: ${report.missingColumns.join(', ')}.${report.missingColumns.includes('slot') ? ' Without a slot column each stack is one stratum.' : ''}`);
  }
  out.push('');

  const rows = [...report.perArm, report.all];
  out.push('### Correct runs', '');
  out.push(table(
    ['Arm', 'Runs', 'Correct', 'Rate', '95% Wilson', '95% Clopper-Pearson', 'With no correct run (one-sided 95%)'],
    rows.map((a) => [a.arm, a.n, a.correct, percent(a.correct / a.n), range(a.wilson), range(a.clopperPearson), a.zeroBound === null ? '' : `at most ${percent(a.zeroBound)}`]),
  ), '');

  out.push('### Tokens and cost per correct run', '');
  out.push(table(
    ['Arm', 'Tokens', 'Mean tokens per run', 'Cost per correct run'],
    rows.map((a) => [a.arm, whole(a.tokens), whole(a.meanTokens), costCell(a.cost)]),
  ), '');
  out.push('Each limit holds with 95% confidence on its own; with few runs the bootstrap part of it is approximate. An arm with no correct runs has no estimate, no upper limit and no ratio against another arm.', '');

  out.push('### Hidden pass fraction (secondary, no verdict)', '');
  out.push(table(
    ['Arm', 'Mean', '95% bootstrap interval'],
    rows.map((a) => [a.arm, a.hiddenFraction.mean === null ? 'not estimable' : percent(a.hiddenFraction.mean), a.hiddenFraction.mean === null ? 'not estimable' : range(a.hiddenFraction)]),
  ), '');

  if (report.stacks.length > 1) {
    out.push('### Correct runs per stack', '');
    out.push(table(
      ['Arm', 'Stack', 'Runs', 'Correct', '95% Wilson'],
      report.perStack.map((s) => [s.arm, s.stack, s.n, s.correct, range(s.wilson)]),
    ), '');
  }

  out.push('### Gauge against judge', '');
  if (report.gauge === null) {
    out.push('Not available: the file has no gauge result per run.', '');
  } else {
    const rateCell = (r) => (r.estimable ? `${r.x} of ${r.n}, ${percent(r.estimate)} (Wilson ${range(r.wilson)}; Clopper-Pearson ${range(r.clopperPearson)})` : 'not estimable');
    out.push(table(
      ['Arm', 'Slot', 'Both pass', 'Gauge passes, judge fails', 'Gauge fails, judge passes', 'Both fail', 'False confidence', 'At least half'],
      report.gauge.map((g) => [g.arm, g.slot, g.a, g.b, g.c, g.d, rateCell(g.falseConfidence), g.falseConfidence.estimable ? (S.rateAtLeast(g.falseConfidence, 0.5) ? 'yes' : 'not shown') : 'not estimable']),
    ), '');
    out.push('False confidence is the share of gauge passes that the judge fails. These are final-state tables: the loop stops when the gauge passes, so they do not give sensitivity or specificity, and a rate is never moved from one arm to another.', '');
  }

  if (report.comparison) out.push(renderComparison(report.comparison), '');
  if (report.comparison?.firstAttempt) out.push(renderFirstAttempt(report.comparison, report.comparison.firstAttempt), '');
  if (report.attemptGauge) out.push(renderAttemptGauge(report.attemptGauge, report.attemptSettings), '');
  return `${out.join('\n')}\n`;
}

function renderPooled(report, files) {
  const all = report.all;
  const out = ['## All files together', '', `${all.n} runs, ${whole(all.tokens)} tokens, ${all.correct} correct runs, from ${files} files.`, ''];
  if (all.correct === 0) {
    out.push(`- Rate of correct runs: at most ${percent(all.zeroBound)} (one-sided 95%). The 95% Wilson interval ends at ${percent(all.wilson.upper)}.`);
    out.push(`- Cost: no correct runs, so at least ${whole(all.cost.lower)} tokens per correct run (one-sided 95%). There is no estimate and no upper limit.`);
  } else {
    out.push(`- Rate of correct runs: ${percent(all.correct / all.n)} (95% Wilson ${range(all.wilson)}).`);
    out.push(`- Cost per correct run: ${costCell(all.cost)}.`);
  }
  out.push('', 'These runs come from different experiments and arms. This line describes them; it is not confirmatory data and not a prior.');
  return `${out.join('\n')}\n`;
}

function planOf(options) {
  const dStar = dStarOf(options);
  const looks = list(options, 'looks');
  const zR = list(options, 'z-r');
  const delta = number(options, 'delta', undefined);
  const stacks = names(options, 'stacks');
  const slots = names(options, 'slots');
  if ((stacks === undefined) !== (slots === undefined)) throw new UsageError('the planned design needs both --stacks and --slots');
  if (looks === undefined && zR === undefined && delta === undefined) {
    if (stacks !== undefined) throw new UsageError('--stacks and --slots belong to the decision rule, which needs --d-star, --looks, and --delta or --z-r');
    return { dStar, plan: null };
  }
  if (dStar === undefined || looks === undefined || (zR === undefined && delta === undefined)) {
    throw new UsageError('the decision rule needs --d-star, --looks, and --delta or --z-r');
  }
  const plan = { dStar, looks };
  if (zR !== undefined) plan.zR = zR;
  else plan.delta = delta;
  if (options['plan-hash'] !== undefined) plan.hash = options['plan-hash'];
  if (stacks !== undefined) Object.assign(plan, { stacks, slots });
  return { dStar, plan };
}

// The text of a file, or of standard input for "-".
function readInput(file, io) {
  try {
    return file === '-' ? (io.stdin ?? readFileSync(0, 'utf8')) : readFileSync(file, 'utf8');
  } catch (error) {
    throw new UsageError(`cannot read ${file}: ${error.code ?? error.message}`);
  }
}

function commandAnalyze(positional, options, io) {
  if (positional.length === 0) throw new UsageError('analyze needs at least one runs.csv');
  if ((options.treatment === undefined) !== (options.control === undefined)) throw new UsageError('a comparison needs both --treatment and --control');
  const { dStar, plan } = planOf(options);
  if (plan && options.treatment === undefined) throw new UsageError('the decision rule needs --treatment and --control');
  const settings = {
    seed: number(options, 'seed', DEFAULT_SEED),
    resamples: number(options, 'resamples', 10000),
    treatment: options.treatment,
    control: options.control,
    dStar,
    plan,
    look: number(options, 'look', undefined),
    hash: options.hash,
  };
  if (options.attempts !== undefined) {
    if (positional.length !== 1) throw new UsageError('--attempts goes with one runs file: the attempts.csv belongs to the runs.csv of the same results directory');
    settings.attempts = S.readAttempts(readInput(options.attempts, io));
  }
  const everything = [];
  const sections = [];
  for (const file of positional) {
    const runs = S.readRuns(readInput(file, io));
    everything.push(...runs);
    sections.push(renderAnalysis(analyzeRuns(runs, settings), file === '-' ? 'standard input' : file.replaceAll('\\', '/')));
  }
  if (positional.length > 1) sections.push(renderPooled(analyzeRuns(everything, { seed: settings.seed, resamples: settings.resamples }), positional.length));
  io.write(sections.join('\n'));
}

// ---------------------------------------------------------------- design tables

function commandSizes(io) {
  const rows = [20, 30, 40, 50].map((d) => {
    const half = d / 200;
    return [`${d} points`, S.sampleSizeNormal(0.5 + half, 0.5 - half), S.sampleSizeFisher(0.5 + half, 0.5 - half), S.sampleSizeNormal(0.1 + d / 100, 0.1), S.sampleSizeFisher(0.1 + d / 100, 0.1)];
  });
  const first = S.sampleSizeFisher(0.6, 0.4);
  const stable = S.sampleSizeFisher(0.6, 0.4, { stable: 10 });
  io.write([
    '## Runs per arm for 80% power at a two-sided 5% level (fixed sample, one stratum)',
    '',
    table(['Difference to detect', 'Around 50%: normal approximation', 'Around 50%: exact Fisher test', 'From a 10% baseline: normal approximation', 'From a 10% baseline: exact Fisher test'], rows),
    '',
    `The exact column is the first size that reaches 80%. The power of an exact test is not monotone: for 20 points around 50%, ${first} runs reach 80% and the power stays at or above 80% only from ${stable}.`,
    '',
  ].join('\n'));
}

const looksLabel = (looks) => looks.join(' then ');

function commandDesign(options, io) {
  const reps = number(options, 'reps', 100000);
  const seed = number(options, 'seed', DEFAULT_SEED);
  const stacks = number(options, 'stacks', 2);
  const slots = number(options, 'slots', 5);
  const step = number(options, 'step', 0.01);
  const dStar = dStarOf(options);
  const looks = list(options, 'looks');
  if ((dStar === undefined) !== (looks === undefined)) throw new UsageError('one plan needs both --d-star and --looks');
  const plans = dStar === undefined ? M.DEFAULT_PLANS : [{ dStar, looks }];
  const rows = M.designTable(plans, { reps, seed, stacks, slots, step });
  const label = (row) => `${looksLabel(row.looks)} (${row.maxRuns})`;
  const three = (o) => (o ? `${shareSe(o.supported, reps)} / ${shareSe(o.refuted, reps)} / ${shareSe(o.undecidable, reps)}` : 'not applicable');
  const dStarCell = (row) => String(Math.round(row.dStar * 100));
  const out = [];
  out.push(`## Plans: ${stacks} stacks x ${slots} slots, ${whole(reps)} replicates per scenario, seed ${seed}`, '');
  out.push(table(
    ['d*', 'Runs per cell (max runs)', 'z_R', 'Supported at D = d* (centred / control at 10% / mixed slots)', 'Refuted at D = 0', 'Worst false refutation (fresh replicates)'],
    rows.map((row) => {
      const c = row.calibration;
      const s = c.summary;
      const supported = [s.supportedAtDStar.centred, s.supportedAtDStar.fromTen, s.supportedAtDStar.mixed].map((v) => (v === null ? 'not applicable' : shareSe(v, reps))).join(' / ');
      return [dStarCell(row), label(row), row.zR.map((z) => z.toFixed(2)).join(' / '), supported, shareSe(s.refutedAtNoEffect, reps), `${percentSe(c.worstFalseRefutation, reps)}; fresh ${percentSe(c.validation.worstFalseRefutation, reps)}`];
    }),
  ), '');
  out.push('d* is in points. D is the true difference; D = 0 here has every cell at 50%. The worst false refutation is the largest P(refuted) over the scenarios with D = d*, first on the replicates that chose z_R, then on fresh ones.', '');
  out.push(`Every rate is a simulated share of ${whole(reps)} replicates; "se" is its Monte Carlo standard error, sqrt(p(1 - p) / ${whole(reps)}), in percentage points for a percentage. A worst case is a maximum over scenarios, so it is slightly high. Replicates are seeded, so the numbers repeat exactly.`, '');
  out.push('## Harder cases: probability of supported / refuted / undecidable', '');
  out.push(table(
    ['d*', 'Runs per cell', 'True difference d*/2', 'd* in one stack only', 'Reversal: +d* in one stack, -d* in the other'],
    rows.map((row) => [dStarCell(row), looksLabel(row.looks), three(row.calibration.summary.half), three(row.calibration.summary.oneStack), three(row.calibration.summary.reversal)]),
  ), '');
  const differences = rows[0].power.map((p) => p.difference);
  out.push('## Operating characteristics: false support, power by true difference, expected runs', '');
  out.push(table(
    ['d*', 'Runs per cell (max runs)', 'Worst false support', ...differences.map((d) => `Supported at ${Math.round(d * 100)} points`), 'Mean runs at D = 0', 'Mean runs at D = d*'],
    rows.map((row) => [dStarCell(row), label(row), percentSe(row.falseSupport.worst, reps), ...row.power.map((p) => shareSe(p.supported, reps)), whole(row.expectedRuns.noEffect), whole(row.expectedRuns.atDStar)]),
  ), '');
  out.push('Worst false support is the largest P(supported) over the scenarios with no effect. Power is P(supported) with the arms centred on 50%. Mean runs below the maximum come from stopping at the first look.', '');
  io.write(out.join('\n'));
}

function commandCoverage(options, io) {
  const sizes = list(options, 'sizes') ?? [10, 20, 30, 50];
  const cell = (c) => `${percent(c.min)} / ${percent(c.mean)}`;
  io.write([
    '## Exact coverage of the 95% intervals: minimum / mean over the true rates',
    '',
    table(['Runs per arm', 'Wilson', 'Clopper-Pearson', 'Newcombe (difference)'], M.coverageTable(sizes).map((row) => [row.n, cell(row.wilson), cell(row.clopperPearson), cell(row.newcombe)])),
    '',
    'True rates: 1% to 99% in steps of 1% for one proportion; 5% to 95% in steps of 5% in each arm for the difference.',
    '',
  ].join('\n'));
}

export const COST_MODEL = { budget: 6, prompt: 6500, median: 1500, sigma: 1.2, cap: 8192 };

function commandCostCoverage(options, io) {
  const reps = number(options, 'reps', 2000);
  const resamples = number(options, 'resamples', 2000);
  const seed = number(options, 'seed', DEFAULT_SEED);
  const rows = [];
  let stream = 0;
  for (const n of [20, 40, 100]) {
    for (const rate of [0.03, 0.1, 0.3, 0.6]) {
      const r = M.simulateCostCoverage({ ...COST_MODEL, rate }, n, reps, seed + 100000 * stream++, { resamples });
      rows.push([n, percent(rate, 0), whole(r.trueCost), percent(r.zeroCorrect), percent(r.lowerHolds), percent(r.upperHolds), percent(r.bothHold)]);
    }
  }
  io.write([
    `## Coverage of the cost-per-correct-run limits: ${whole(reps)} replicates per row, ${whole(resamples)} resamples, seed ${seed}`,
    '',
    table(['Runs in the arm', 'True rate', 'True cost per correct run', 'Arms with no correct run', 'Lower limit holds', 'Upper limit holds', 'Both hold'], rows),
    '',
    `Token model: ${COST_MODEL.budget} calls per run at most; each call costs ${whole(COST_MODEL.prompt)} prompt tokens plus a log-normal output (median ${whole(COST_MODEL.median)}, sigma ${COST_MODEL.sigma}) cut at ${whole(COST_MODEL.cap)}; a failed run uses every call, a correct run stops at a call drawn evenly from 1 to ${COST_MODEL.budget}. An arm with no correct run has no upper limit, which counts as holding.`,
    '',
  ].join('\n'));
}

function commandProductLaw(options, io) {
  const reps = number(options, 'reps', 10000);
  const seed = number(options, 'seed', DEFAULT_SEED);
  const gammas = [1, 0.9, 0.8, 0.7];
  const rows = [];
  let stream = 0;
  for (const [label, q] of [['five slots at 90%', [0.9, 0.9, 0.9, 0.9, 0.9]], ['five slots at 80%', [0.8, 0.8, 0.8, 0.8, 0.8]], ['95%, 90%, 80%, 70%, 60%', [0.95, 0.9, 0.8, 0.7, 0.6]]]) {
    for (const runs of [10, 20, 40]) {
      rows.push([label, runs, ...gammas.map((gamma) => percent(M.simulateProductLaw({ q, runsPerSlot: runs, runsAll: runs, gamma }, reps, seed + 1000 * stream++).rejected))]);
    }
  }
  io.write([
    `## Composition check: how often R = 1 is rejected, ${whole(reps)} replicates per cell, seed ${seed}`,
    '',
    table(['Single-slot rates', 'Runs per slot and with all slots', ...gammas.map((g) => (g === 1 ? 'gamma = 1 (the law holds)' : `gamma = ${g}`))], rows),
    '',
    'The truth in each column is P(all slots) = gamma^4 x product of the single-slot rates. The first column is the false rejection rate; the others are power.',
    '',
  ].join('\n'));
}

// ---------------------------------------------------------------- entry point

export async function main(argv, io = {}) {
  const write = io.write ?? ((text) => process.stdout.write(text));
  const writeError = io.writeError ?? ((text) => process.stderr.write(text));
  const { command, positional, options } = parseArgs(argv);
  if (command === undefined || !(command in OPTIONS)) {
    writeError(`${command === undefined ? 'No command given.' : `Unknown command "${command}".`}\n\n${USAGE}`);
    return 1;
  }
  try {
    for (const name of Object.keys(options)) {
      if (!OPTIONS[command].includes(name)) throw new UsageError(`unknown option --${name} for ${command}`);
      if (options[name] === undefined) throw new UsageError(`--${name} needs a value`);
    }
    const context = { write, stdin: io.stdin };
    if (command === 'help') write(USAGE);
    else if (command === 'sizes') commandSizes(context);
    else if (command === 'design') commandDesign(options, context);
    else if (command === 'analyze') commandAnalyze(positional, options, context);
    else if (command === 'coverage') commandCoverage(options, context);
    else if (command === 'cost-coverage') commandCostCoverage(options, context);
    else if (command === 'product-law') commandProductLaw(options, context);
    return 0;
  } catch (error) {
    if (error instanceof UsageError || error instanceof RangeError || /(runs|attempts)\.csv/.test(error.message)) {
      writeError(`Error: ${error.message}\n\n${USAGE}`);
      return 1;
    }
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
