// Descriptive tables for one runs.csv (and optionally its attempts.csv), in Markdown. No verdict.
// It complements `node analysis/cli.mjs analyze` and reuses the readers and the interval of stats.mjs.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { readRuns, readAttempts, wilson } from './stats.mjs';

const USAGE = 'Usage: node analysis/describe.mjs <runs.csv> [--attempts <attempts.csv>]';

const byName = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const sorted = (values) => [...new Set(values)].sort(byName);
const whole = (value) => Math.round(value).toLocaleString('en-US');
const percent = (value) => `${(100 * value).toFixed(1)}%`;
const kOfN = (k, n) => `${whole(k)} of ${whole(n)}`;
const slotOf = (run) => run.slot ?? '(none)';
const built = (run) => !/^(false|0)$/i.test(String(run.raw?.built_final ?? 'true').trim());

function groupBy(items, keyOf) {
  const groups = new Map();
  for (const item of items) {
    const key = keyOf(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return groups;
}

// Section 1: one row per (stack, slot); per arm the runs, correct runs, gauge passes and right decisions.
export function pairTable(runs) {
  const arms = sorted(runs.map((r) => r.arm));
  const pairs = sorted(runs.map((r) => JSON.stringify([r.stack, slotOf(r)]))).map((p) => JSON.parse(p));
  const rows = pairs.map(([stack, slot]) => {
    const cells = {};
    for (const arm of arms) {
      const mine = runs.filter((r) => r.arm === arm && r.stack === stack && slotOf(r) === slot);
      cells[arm] = {
        n: mine.length,
        correct: mine.filter((r) => r.correct).length,
        gaugePass: mine.filter((r) => r.gaugePass === true).length,
        right: mine.filter((r) => r.gaugePass === r.correct).length,
      };
    }
    return { stack, slot, cells };
  });
  return { arms, rows };
}

// Section 2: agreement inside a cell (arm, stack, slot).
export function agreement(runs) {
  const arms = sorted(runs.map((r) => r.arm)).map((arm) => {
    const cells = groupBy(runs.filter((r) => r.arm === arm), (r) => JSON.stringify([r.stack, slotOf(r)]));
    const result = { arm, cells: cells.size, multi: 0, sameCorrect: 0, sameGauge: 0, mixed: [] };
    for (const [key, mine] of [...cells].sort((a, b) => byName(a[0], b[0]))) {
      if (mine.length < 2) continue;
      result.multi += 1;
      const correct = mine.filter((r) => r.correct).length;
      if (correct === 0 || correct === mine.length) result.sameCorrect += 1;
      else {
        const [stack, slot] = JSON.parse(key);
        result.mixed.push({ stack, slot, correct, n: mine.length });
      }
      if (new Set(mine.map((r) => r.gaugePass)).size === 1) result.sameGauge += 1;
    }
    return result;
  });
  return { arms };
}

// Section 3: of the wrong runs, how many ended without the gauge passing.
export function detection(runs) {
  return sorted(runs.map((r) => r.arm)).map((arm) => {
    const wrong = runs.filter((r) => r.arm === arm && !r.correct);
    const noPass = wrong.filter((r) => r.gaugePass === false);
    const neverBuilt = noPass.filter((r) => !built(r)).length;
    const silent = wrong.filter((r) => r.gaugePass === true).length;
    return {
      arm,
      wrong: wrong.length,
      neverBuilt,
      rejected: noPass.length - neverBuilt,
      silent,
      detected: noPass.length,
      rate: wrong.length === 0 ? null : wilson(noPass.length, wrong.length),
    };
  });
}

// Section 4: the loop, from the attempts.
export function loop(attempts) {
  return sorted(attempts.map((a) => a.arm)).map((arm) => {
    const perRun = groupBy(attempts.filter((a) => a.arm === arm), (a) => JSON.stringify([a.stack, a.slot, a.run]));
    const result = { arm, runs: perRun.size, attempts: 0, multi: 0, gaugeChanged: 0, judgeChanged: 0, tokensFirst: 0, tokensAll: 0, afterShare: null };
    const tokens = (a) => (a.tokensIn ?? 0) + (a.tokensOut ?? 0);
    for (const list of perRun.values()) {
      list.sort((a, b) => a.attempt - b.attempt);
      const first = list[0];
      const last = list[list.length - 1];
      result.attempts += list.length;
      result.tokensFirst += tokens(first);
      for (const a of list) result.tokensAll += tokens(a);
      if (list.length > 1) {
        result.multi += 1;
        if (first.gaugePass !== last.gaugePass) result.gaugeChanged += 1;
        if (first.judgeCorrect !== last.judgeCorrect) result.judgeChanged += 1;
      }
    }
    if (result.tokensAll > 0) result.afterShare = (result.tokensAll - result.tokensFirst) / result.tokensAll;
    return result;
  });
}

const table = (head, rows) => [`| ${head.join(' | ')} |`, `|${head.map(() => ' --- ').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)];

export function render(runs, attempts = null) {
  const out = ['# Description of the runs', ''];

  out.push('## Per pair of stack and slot', '');
  const pt = pairTable(runs);
  const head = ['Stack', 'Slot'];
  for (const arm of pt.arms) head.push(`${arm} correct`, `${arm} gauge passed`, `${arm} decision right`);
  out.push(...table(head, pt.rows.map((row) => {
    const cells = [row.stack, row.slot];
    for (const arm of pt.arms) {
      const c = row.cells[arm];
      cells.push(kOfN(c.correct, c.n), kOfN(c.gaugePass, c.n), kOfN(c.right, c.n));
    }
    return cells;
  })));
  out.push('', 'Each entry is a count of runs out of the runs in that pair. The decision is right when the gauge result equals the judge result.', '');

  out.push('## Agreement inside a cell', '');
  const ag = agreement(runs);
  out.push(...table(['Arm', 'Cells', 'Cells with 2 or more runs', 'Same correct result', 'Same gauge result'],
    ag.arms.map((a) => (a.multi === 0
      ? [a.arm, whole(a.cells), '0', 'not estimable with one run per cell', 'not estimable with one run per cell']
      : [a.arm, whole(a.cells), whole(a.multi), whole(a.sameCorrect), whole(a.sameGauge)]))));
  for (const a of ag.arms) {
    if (a.mixed.length === 0) continue;
    out.push('', `Mixed cells of ${a.arm}:`, '');
    for (const m of a.mixed) out.push(`- ${m.stack} / ${m.slot}: ${kOfN(m.correct, m.n)} correct`);
  }
  out.push('', 'A cell is one arm in one stack and slot. A mixed cell has runs that disagree on correct or wrong, so the same recipe gave different results.', '');

  out.push('## Detection per run', '');
  out.push(...table(['Arm', 'Wrong runs', 'Never built', 'Built and rejected', 'Silent defects', 'Detection rate', '95% Wilson'],
    detection(runs).map((d) => (d.rate === null
      ? [d.arm, '0', '0', '0', '0', 'not estimable', 'not estimable']
      : [d.arm, whole(d.wrong), whole(d.neverBuilt), whole(d.rejected), whole(d.silent),
        `${kOfN(d.detected, d.wrong)} (${percent(d.rate.estimate)})`, `${percent(d.rate.lower)} to ${percent(d.rate.upper)}`]))));
  out.push('', 'A wrong run is one that fails the hidden judge. It is detected when the run ended without the gauge passing, and it is a silent defect when the gauge passed anyway. The rate is detected runs over wrong runs.', '');

  out.push('## The loop', '');
  if (attempts === null) {
    out.push('This section needs the attempts file: pass `--attempts <attempts.csv>`.');
  } else {
    out.push(...table(['Arm', 'Runs', 'Attempts', 'Runs with more than one attempt', 'Gauge result changed', 'Judge result changed', 'Tokens of first attempts', 'Tokens of all attempts', 'Share after the first attempt'],
      loop(attempts).map((l) => [l.arm, whole(l.runs), whole(l.attempts), whole(l.multi), whole(l.gaugeChanged), whole(l.judgeChanged),
        whole(l.tokensFirst), whole(l.tokensAll), l.afterShare === null ? 'not estimable' : percent(l.afterShare)])));
    out.push('', 'Changed means the first and the last attempt of a run gave different results. Tokens are prompt plus completion. The share is the part of all tokens spent after the first attempt.');
  }
  out.push('');
  return out.join('\n');
}

export async function main(args, io = {}) {
  const write = io.write ?? ((text) => process.stdout.write(text));
  const writeError = io.writeError ?? ((text) => process.stderr.write(text));
  const usage = () => {
    writeError(`${USAGE}\n`);
    return 2;
  };
  let runsFile = null;
  let attemptsFile = null;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--attempts') {
      attemptsFile = args[++i];
      if (!attemptsFile) return usage();
    } else if (args[i].startsWith('--') || runsFile !== null) return usage();
    else runsFile = args[i];
  }
  if (runsFile === null) return usage();
  let runs;
  let attempts = null;
  try {
    runs = readRuns(readFileSync(runsFile, 'utf8'));
    if (attemptsFile !== null) attempts = readAttempts(readFileSync(attemptsFile, 'utf8'));
  } catch {
    return usage();
  }
  write(render(runs, attempts));
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
