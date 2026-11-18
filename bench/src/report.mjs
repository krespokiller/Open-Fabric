// Aggregates runs/*/metrics.json into report.md and runs.csv.
import fs from 'node:fs';
import path from 'node:path';
import { mean, readJson, sd } from './util.mjs';

const ARM_LABEL = {
  bare: 'bare (task only)',
  docs: 'docs (task + library docs)',
  tests: 'tests (task + public test feedback, no piece)',
  'of-spec': 'of-spec (task + OpenFabric piece spec + public tests)',
  'of-code': 'of-code (task + installed OpenFabric code, slot + mount only)',
};
const ARM_ORDER = ['bare', 'docs', 'tests', 'of-spec', 'of-code'];
// Known arms first, then any other arm id (the kit arms, one per slot) grouped by slot.
const slotKey = (arm) => arm.split('.').reverse().join('.');
const armsInOrder = (present) => [
  ...ARM_ORDER.filter((a) => present.has(a)),
  ...[...present.keys()].filter((a) => !ARM_ORDER.includes(a)).sort((a, b) => slotKey(a).localeCompare(slotKey(b))),
];
const armRank = (a) => (ARM_ORDER.includes(a) ? String(ARM_ORDER.indexOf(a)).padStart(2, '0') : `99${slotKey(a)}`);
// A run is correct only when it passes every test of both hidden suites. A run without the second suite is not correct.
export const bothSuitesPerfect = (r) => r.hiddenTotal > 0 && r.hiddenPassed === r.hiddenTotal && r.hidden2Total > 0 && r.hidden2Passed === r.hidden2Total;
// Every check the arm could see passed at the end of the run (the stop rule ends a run exactly then).
const gaugePassed = (r) => r.stopReason === 'visible_checks_pass';
// Results written before the per-attempt judgement have none of these fields; every use below leaves them empty then.
const hasAttemptJudge = (r) => typeof r.firstAttemptCorrect === 'boolean';
const slotOf = (r) => (/^kit-/.test(r.arm) ? r.arm.split('.')[1] || '' : '');

const fmt = (n, d = 0) => (Number.isFinite(n) ? n.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d }) : '—');
const pm = (xs, d = 0) => (xs.length ? `${fmt(mean(xs), d)} ± ${fmt(sd(xs), d)}` : '—');

function loadErrors(dir) {
  const runsDir = path.join(dir, 'runs');
  if (!fs.existsSync(runsDir)) return [];
  return fs
    .readdirSync(runsDir)
    .filter((d) => fs.existsSync(path.join(runsDir, d, 'error.json')) && !fs.existsSync(path.join(runsDir, d, 'metrics.json')))
    .map((d) => ({ run: d.replace(/__/g, ' / '), ...readJson(path.join(runsDir, d, 'error.json')) }));
}

export function loadRuns(dir) {
  const runsDir = path.join(dir, 'runs');
  if (!fs.existsSync(runsDir)) return [];
  return fs
    .readdirSync(runsDir)
    .map((d) => path.join(runsDir, d, 'metrics.json'))
    .filter((f) => fs.existsSync(f))
    .map(readJson);
}

function group(runs, key) {
  const m = new Map();
  for (const r of runs) {
    const k = key(r);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return m;
}

function armRow(arm, rs) {
  const total = rs.map((r) => r.promptTokens + r.completionTokens);
  const passed = rs.map((r) => r.hiddenPassed);
  const rates = rs.map((r) => (r.hiddenTotal ? (100 * r.hiddenPassed) / r.hiddenTotal : 0));
  const sumPassed = passed.reduce((a, b) => a + b, 0);
  const perPass = sumPassed ? total.reduce((a, b) => a + b, 0) / sumPassed : Infinity;
  const perfect = rs.filter(bothSuitesPerfect).length;
  const rates2 = rs.filter((r) => r.hidden2Total).map((r) => (100 * r.hidden2Passed) / r.hidden2Total);
  return `| ${ARM_LABEL[arm] || arm} | ${rs.length} | ${pm(rates, 1)}% | ${rates2.length ? `${pm(rates2, 1)}%` : '—'} | ${perfect}/${rs.length} | ${pm(rs.map((r) => r.promptTokens))} | ${pm(rs.map((r) => r.completionTokens))} | ${pm(total)} | ${Number.isFinite(perPass) ? fmt(perPass) : 'no test passed'} | ${pm(rs.map((r) => r.calls), 1)} | ${pm(rs.map((r) => r.wallMs / 60000), 1)} |`;
}

// Calls held equal: every run scored at its first attempt, whatever the arm's stop rule did afterwards.
function firstAttemptTable(rs) {
  if (!rs.some(hasAttemptJudge)) return [];
  const byArm = group(rs, (r) => r.arm);
  const out = ['**Correct at the first attempt** (the hidden suites judged the state after attempt 1, so every arm is scored with the same number of calls; the model never sees this judgement)', '', '| Arm | Correct at the first attempt |', '| --- | --- |'];
  for (const arm of armsInOrder(byArm)) {
    const judged = byArm.get(arm).filter(hasAttemptJudge);
    out.push(`| ${ARM_LABEL[arm] || arm} | ${judged.length ? `${judged.filter((r) => r.firstAttemptCorrect).length} of ${judged.length}` : '—'} |`);
  }
  out.push('');
  return out;
}

const HEADER = '| Arm | Runs | Hidden tests passed | Second hidden suite passed | Runs passing both suites | Input tokens | Output tokens | Total tokens | Tokens per passed test | Model calls | Minutes |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |';

export function writeReport(dir) {
  const meta = fs.existsSync(path.join(dir, 'meta.json')) ? readJson(path.join(dir, 'meta.json')) : {};
  const runs = loadRuns(dir);
  const lines = [];
  lines.push(`# OpenFabric benchmark report${meta.label ? `: ${meta.label}` : ''}`);
  lines.push('');
  if (meta.selftest) lines.push('> **Self-test run with a fake model that returns the reference implementation. These numbers only check the harness and say nothing about any real model.**\n');
  const p = meta.params || {};
  lines.push(`Model \`${p.model}\` at \`${p.baseUrl}\`, temperature ${p.temperature}, max ${p.maxTokens} output tokens per call, at most ${p.budget} calls per run, ${meta.runs} run(s) per cell, runtime ${p.runtime}. Started ${meta.startedAt}. Harness commit \`${meta.harnessCommit}\`${meta.harnessDirty?.length ? ' (with uncommitted changes)' : ''}. Experiment hash \`${String(p.experimentHash).slice(0, 16)}\`.`);
  lines.push('');
  if (runs.some((r) => r.tokensEstimated)) lines.push('**Warning:** the model server did not report token usage for some calls; those counts are estimated as characters / 4.\n');
  const suspicious = runs.reduce((a, r) => a + (r.suspiciousUsageCalls || 0), 0);
  if (suspicious) lines.push(`**Warning:** in ${suspicious} call(s) the server reported fewer than half the prompt tokens expected from the prompt length. It may be counting only non-cached tokens or truncating the prompt; compare \`promptTokens\` and \`promptEstimate\` in \`metrics.json\` before publishing.\n`);
  const disagreeing = runs.filter((r) => r.lastAttemptAgreesWithFinal === false).length;
  if (disagreeing) lines.push(`**Warning:** in ${disagreeing} run(s) the hidden judge gave two different answers on the same code (the last attempt and the final judgement disagree). Check the instrument before using these numbers.\n`);
  lines.push('**How to read it.** Every arm gets the same task, the same model, the same maximum number of calls and the same smoke-check feedback. A run stops when every check its arm can see passes, or when the budget runs out. The `tests` arm also sees the 8 public tests; the OpenFabric arms see them plus the piece, so `of-spec` versus `tests` isolates the value of the piece. All arms are judged by the same hidden HTTP suite on a fresh start; no model ever sees it. "Tokens per passed test" is total tokens divided by hidden tests passed, summed over runs. "Runs passing both suites" counts the runs that pass every test of both hidden suites. Both hidden suites also judge the state after every attempt, only to be recorded (never shown to the model): "Correct at the first attempt" counts the runs whose state after attempt 1 passes every test of both suites. The final judgement on a fresh build stays the primary metric. "Second hidden suite passed" comes from an independent suite (tests X01 onward) written from the task alone, without seeing the piece or the primary suite; it checks that the result does not depend on who wrote the judge.');
  lines.push('');
  if (runs.some((r) => r.arm === 'of-code')) {
    lines.push('**About of-code.** Its installed code is the same as the Next.js reference implementation that was validated against the hidden suite, so its pass rate measures how well the model mounts the piece and fills the slot, and is partly correct by construction.');
    lines.push('');
  }

  const byStack = group(runs, (r) => r.stack);
  for (const [stack, rs] of [...byStack].sort()) {
    lines.push(`## ${stack}`);
    lines.push('');
    lines.push(HEADER);
    const byArm = group(rs, (r) => r.arm);
    for (const arm of armsInOrder(byArm)) lines.push(armRow(arm, byArm.get(arm)));
    lines.push('');
    lines.push(...firstAttemptTable(rs));
  }

  if (byStack.size > 1) {
    lines.push('## All stacks combined');
    lines.push('');
    lines.push(HEADER);
    const byArm = group(runs, (r) => r.arm);
    for (const arm of armsInOrder(byArm)) lines.push(armRow(arm, byArm.get(arm)));
    lines.push('');
    lines.push('of-code exists only for stacks that have a code piece, so its combined row covers fewer stacks.');
    lines.push('');
  }

  // Slot arms: the rest of the service is the reference, so a run is correct only when both hidden suites pass in full.
  const kitRuns = runs.filter((r) => /^kit-/.test(r.arm));
  if (kitRuns.length) {
    lines.push('## Slot arms: runs with every hidden test passing');
    lines.push('');
    lines.push('In the kit arms the tool installs the reference service and the model writes one function (the slot). Any hidden failure therefore comes from that function. A run counts here only when both hidden suites pass in full. `kit-bare` sees the task and the slot contract; `kit-tests` also sees the public tests and their results.');
    lines.push('');
    lines.push('| Stack | Slot | kit-bare correct | kit-tests correct | kit-bare calls | kit-tests calls | kit-bare tokens | kit-tests tokens |');
    lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
    const cell = (rs) => ({
      ok: rs.length ? `${rs.filter(bothSuitesPerfect).length}/${rs.length}` : '—',
      calls: rs.length ? fmt(mean(rs.map((r) => r.calls)), 1) : '—',
      tok: rs.length ? fmt(mean(rs.map((r) => r.promptTokens + r.completionTokens))) : '—',
    });
    const bySlot = group(kitRuns, (r) => `${r.stack} / ${r.arm.split('.')[1]}`);
    for (const [key, rs] of [...bySlot].sort(([a], [b]) => a.localeCompare(b))) {
      const [stack, slot] = key.split(' / ');
      const b = cell(rs.filter((r) => r.arm.startsWith('kit-bare.')));
      const t = cell(rs.filter((r) => r.arm.startsWith('kit-tests.')));
      lines.push(`| ${stack} | ${slot} | ${b.ok} | ${t.ok} | ${b.calls} | ${t.calls} | ${b.tok} | ${t.tok} |`);
    }
    lines.push('');
  }

  // Per-test pass rates.
  const rank = (k) => {
    const [s, a] = k.split(' / ');
    return `${s}\u0000${armRank(a)}`;
  };
  const cells = [...group(runs, (r) => `${r.stack} / ${r.arm}`)].sort(([a], [b]) => rank(a).localeCompare(rank(b)));
  if (cells.length) {
    const testIds = [...new Map(runs.flatMap((r) => [...r.hidden, ...(r.hidden2 || [])].map((h) => [h.id, h.name]))).entries()].sort();
    lines.push('## Hidden tests: pass rate per cell');
    lines.push('');
    lines.push(`| Test | ${cells.map(([k]) => k).join(' | ')} |`);
    lines.push(`| --- | ${cells.map(() => '---').join(' | ')} |`);
    for (const [id, name] of testIds) {
      const row = cells.map(([, rs]) => {
        const xs = rs.map((r) => [...r.hidden, ...(r.hidden2 || [])].find((h) => h.id === id)).filter(Boolean);
        return xs.length ? `${Math.round((100 * xs.filter((h) => h.pass).length) / xs.length)}%` : '—';
      });
      lines.push(`| ${id} ${name} | ${row.join(' | ')} |`);
    }
    lines.push('');
  }

  lines.push('## How each run ended');
  lines.push('');
  lines.push('| Cell | Visible checks passed | Budget exhausted | Model error | Final build failed |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const [k, rs] of cells) {
    const c = (p) => rs.filter(p).length;
    lines.push(`| ${k} | ${c((r) => r.stopReason === 'visible_checks_pass')} | ${c((r) => r.stopReason === 'budget')} | ${c((r) => r.stopReason === 'model_error')} | ${c((r) => !r.builtFinal)} |`);
  }
  lines.push('');

  const errors = loadErrors(dir);
  if (errors.length) {
    lines.push('## Runs not counted (environment errors)');
    lines.push('');
    lines.push('| Run | Kind | Message |');
    lines.push('| --- | --- | --- |');
    for (const e of errors) lines.push(`| ${e.run} | ${e.kind} | ${String(e.message).split('\n')[0].replace(/\|/g, '/')} |`);
    lines.push('');
  }

  lines.push('## Environment and integrity');
  lines.push('');
  lines.push(`- Machine: ${meta.machine ? `${meta.machine.platform}/${meta.machine.arch}, ${meta.machine.cpus} CPUs (${meta.machine.cpuModel}), ${meta.machine.memGb} GB RAM, Node ${meta.machine.node}` : 'unknown'}`);
  if (meta.suites) for (const [n, h] of Object.entries(meta.suites)) lines.push(`- SHA-256 of suites/${n}.mjs: \`${h}\``);
  lines.push('- The hidden suite was written before any model run and must not change between runs that are compared. Compare the hashes above across reports.');
  lines.push('- Raw data: `runs/*/metrics.json` (numbers), `runs/*/transcript.jsonl` (every prompt and answer), `runs/*/workspace` (the code each run produced).');
  lines.push('');

  const file = path.join(dir, 'report.md');
  fs.writeFileSync(file, lines.join('\n'));

  const csv = ['stack,arm,run,calls,prompt_tokens,completion_tokens,total_tokens,tokens_estimated,hidden_passed,hidden_total,stop_reason,built_final,wall_ms,model_ms,build_ms,hidden2_passed,hidden2_total,slot,gauge_pass,correct,first_correct,first_correct_attempt,judge_agrees'];
  for (const r of runs) {
    csv.push([r.stack, r.arm, r.run, r.calls, r.promptTokens, r.completionTokens, r.promptTokens + r.completionTokens, r.tokensEstimated, r.hiddenPassed, r.hiddenTotal, r.stopReason, r.builtFinal, r.wallMs, r.modelMs, r.buildMs, r.hidden2Passed ?? '', r.hidden2Total ?? '', slotOf(r), gaugePassed(r) ? 1 : 0, bothSuitesPerfect(r) ? 1 : 0,
      hasAttemptJudge(r) ? (r.firstAttemptCorrect ? 1 : 0) : '', r.firstCorrectAttempt ?? '', typeof r.lastAttemptAgreesWithFinal === 'boolean' ? (r.lastAttemptAgreesWithFinal ? 1 : 0) : ''].join(','));
  }
  fs.writeFileSync(path.join(dir, 'runs.csv'), csv.join('\n') + '\n');

  // One row per attempt: what the arm could see (gauge) next to what the hidden judge said about the same state.
  // Only counts and 0/1 flags: no hidden test id or name.
  const attemptsCsv = ['stack,arm,slot,run,attempt,built,visible_passed,visible_total,gauge_pass,judge_correct,prompt_tokens,completion_tokens'];
  for (const r of runs) {
    for (const a of r.attempts || []) {
      attemptsCsv.push([r.stack, r.arm, slotOf(r), r.run, a.attempt, a.built ? 1 : 0, a.visiblePassed, a.visibleTotal, a.built && a.visiblePassed === a.visibleTotal ? 1 : 0, typeof a.judgeCorrect === 'boolean' ? (a.judgeCorrect ? 1 : 0) : '', a.promptTokens, a.completionTokens].join(','));
    }
  }
  fs.writeFileSync(path.join(dir, 'attempts.csv'), attemptsCsv.join('\n') + '\n');
  return file;
}
