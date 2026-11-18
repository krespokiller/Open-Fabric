// The hidden suites also run after every attempt, only to be recorded (never shown to the model).
// These checks need no Docker and no model. They never print a hidden test name or value: results are
// compared with the suites' own ids and counts read from the suite modules.
// Run from bench/:  node --test test/
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runSuite } from '../suites/lib.mjs';
import { judge, judgeAttempt, runLevelJudgement, SUITES } from '../src/judge.mjs';
import { formatFeedback, historyLine } from '../src/matrix.mjs';
import { writeReport, bothSuitesPerfect } from '../src/report.mjs';
import { judgeSelftestProblems, referenceAttempt } from '../src/fakemodel.mjs';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ofb-attempt-judge-test-'));
test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
let counter = 0;
const fresh = (name) => {
  const dir = path.join(tmp, `${name}-${++counter}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

// ---- S3: runSuite and judge accept stopAtFirstFailure ------------------------------------------

const syntheticTests = [
  { id: 'A1', name: 'first', fn: async () => {} },
  { id: 'A2', name: 'second', fn: async () => { throw new Error('boom'); } },
  { id: 'A3', name: 'third', fn: async () => {} },
  { id: 'A4', name: 'fourth', fn: async () => { throw new Error('boom again'); } },
];
const noCtx = () => ({});

test('runSuite with stopAtFirstFailure ends after the first failing test and reports the tests it ran', async () => {
  const results = await runSuite('s', syntheticTests, noCtx, { stopAtFirstFailure: true });
  assert.deepEqual(results.map((r) => [r.id, r.pass]), [['A1', true], ['A2', false]]);
});

test('runSuite without the option, or with it false, runs every test', async () => {
  for (const options of [undefined, {}, { stopAtFirstFailure: false }]) {
    const results = await runSuite('s', syntheticTests, noCtx, options);
    assert.deepEqual(results.map((r) => r.pass), [true, false, true, false]);
  }
});

test('runSuite with stopAtFirstFailure runs every test when none fails', async () => {
  const results = await runSuite('s', [syntheticTests[0], syntheticTests[2]], noCtx, { stopAtFirstFailure: true });
  assert.equal(results.length, 2);
});

// A server that answers every request with an error: every hidden test fails, quickly.
async function failingServer() {
  const server = http.createServer((req, res) => {
    req.resume();
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end('{"error":"x"}');
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    close: async () => { server.closeAllConnections(); await new Promise((r) => server.close(r)); },
  };
}
const fakePsp = () => ({ resets: 0, reset: async function reset() { this.resets++; } });

test('judge passes stopAtFirstFailure through, and without it still runs every test of every suite', async () => {
  const srv = await failingServer();
  try {
    const everything = await judge(srv.baseUrl, fakePsp(), ['hidden', 'hidden2']);
    assert.equal(everything.length, SUITES.hidden.length + SUITES.hidden2.length);
    const stopped = await judge(srv.baseUrl, fakePsp(), ['hidden', 'hidden2'], { stopAtFirstFailure: true });
    assert.equal(stopped.length, 1, 'the first failure ends both suites, not only the first one');
    assert.ok(stopped[0].suite === 'hidden' && stopped[0].id === SUITES.hidden[0].id);
  } finally {
    await srv.close();
  }
});

// ---- S1: the judgement of one attempt ----------------------------------------------------------

test('judgeAttempt of an app that did not build or start is a failed judgement with no tests run and no time', async () => {
  const psp = fakePsp();
  const r = await judgeAttempt({ ok: false, phase: 'build', psp });
  assert.deepEqual(r, { judgeCorrect: false, judgeTestsRun: 0, judgeFirstFail: null, judgeMs: 0 });
  assert.equal(psp.resets, 0, 'nothing runs against an app that is not there');
});

test('judgeAttempt resets the PSP, stops at the first failure and says which suite and test failed', async () => {
  const srv = await failingServer();
  try {
    const psp = fakePsp();
    const r = await judgeAttempt({ ok: true, baseUrl: srv.baseUrl, psp });
    assert.equal(psp.resets, 1);
    assert.equal(r.judgeCorrect, false);
    assert.equal(r.judgeTestsRun, 1);
    assert.deepEqual(Object.keys(r.judgeFirstFail).sort(), ['id', 'suite']);
    assert.ok(r.judgeFirstFail.suite === 'hidden' && r.judgeFirstFail.id === SUITES.hidden[0].id);
    assert.ok(Number.isInteger(r.judgeMs) && r.judgeMs >= 0);
    assert.deepEqual(Object.keys(r).sort(), ['judgeCorrect', 'judgeFirstFail', 'judgeMs', 'judgeTestsRun']);
  } finally {
    await srv.close();
  }
});

// ---- S2: nothing of the hidden result reaches the model ----------------------------------------

const applied = { written: ['a.ts'], deleted: [], rejected: [] };
const parsed = { truncated: null, malformed: [] };
const visible = [{ id: 'S1', name: 'health', pass: true }, { id: 'S2', name: 'create', pass: false, error: 'expected 201' }];
const DECOY = { judgeCorrect: true, judgeTestsRun: 31337, judgeFirstFail: { suite: 'DECOY_SUITE', id: 'DECOY_ID' }, judgeMs: 424242 };

test('the feedback and the history line are the same text whatever the hidden result of the attempt is', () => {
  const base = { applied, parsed, app: { ok: true }, visible, logs: 'log line', repeated: false };
  const history = { attempt: 2, applied, app: { ok: true }, visible, repeated: false };
  for (const extra of [{}, DECOY, { judgement: DECOY }, { judgeCorrect: false }]) {
    assert.equal(formatFeedback({ ...base, ...extra }), formatFeedback(base));
    assert.equal(historyLine({ ...history, ...extra }), historyLine(history));
  }
  const text = formatFeedback({ ...base, ...DECOY, judgement: DECOY }) + historyLine({ ...history, ...DECOY, judgement: DECOY });
  for (const marker of ['DECOY', '31337', '424242', 'judge', 'hidden']) assert.ok(!text.toLowerCase().includes(marker.toLowerCase()), 'no trace of the hidden result');
});

test('the functions that build what the model reads do not know about the judgement, and the logs are read before it runs', () => {
  assert.doesNotMatch(String(formatFeedback), /judge|hidden/i);
  assert.doesNotMatch(String(historyLine), /judge|hidden/i);
  const src = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'matrix.mjs'), 'utf8');
  for (const line of src.split('\n').filter((l) => /\b(historyLine|formatFeedback)\(/.test(l) && !/^\s*(export )?function /.test(l))) {
    assert.doesNotMatch(line, /judg/i, 'the call that builds model-facing text is given no judgement');
  }
  const logsReads = [...src.matchAll(/\.logs\(\)/g)].map((m) => m.index);
  assert.equal(logsReads.length, 1, 'the app logs are read in one place only');
  assert.ok(logsReads[0] < src.indexOf('judgeAttempt(app'), 'the logs for the model are read before the hidden judge starts');
  // The stop rule reads the visible checks only.
  assert.match(src, /if \(app\.ok && passed === visible\.length\)/);
});

// ---- S4: run-level fields ----------------------------------------------------------------------

const att = (n, judgeCorrect) => ({ attempt: n, judgeCorrect });

test('run-level fields: first attempt, first correct attempt and agreement of the last attempt with the final judgement', () => {
  assert.deepEqual(runLevelJudgement([att(1, true), att(2, true)], true), { firstAttemptCorrect: true, firstCorrectAttempt: 1, lastAttemptAgreesWithFinal: true });
  assert.deepEqual(runLevelJudgement([att(1, false), att(2, false), att(3, true)], true), { firstAttemptCorrect: false, firstCorrectAttempt: 3, lastAttemptAgreesWithFinal: true });
  assert.deepEqual(runLevelJudgement([att(1, false), att(2, false)], false), { firstAttemptCorrect: false, firstCorrectAttempt: null, lastAttemptAgreesWithFinal: true });
  assert.deepEqual(runLevelJudgement([att(1, false), att(2, true)], false), { firstAttemptCorrect: false, firstCorrectAttempt: 2, lastAttemptAgreesWithFinal: false });
  assert.deepEqual(runLevelJudgement([att(1, true)], false), { firstAttemptCorrect: true, firstCorrectAttempt: 1, lastAttemptAgreesWithFinal: false });
  assert.deepEqual(runLevelJudgement([att(1, false)], true), { firstAttemptCorrect: false, firstCorrectAttempt: null, lastAttemptAgreesWithFinal: false });
});

test('run-level fields of a run with no attempt', () => {
  assert.deepEqual(runLevelJudgement([], false), { firstAttemptCorrect: false, firstCorrectAttempt: null, lastAttemptAgreesWithFinal: null });
});

test('the final judgement counts as correct by the same rule as the report', () => {
  assert.equal(bothSuitesPerfect({ hiddenTotal: 2, hiddenPassed: 2, hidden2Total: 3, hidden2Passed: 3 }), true);
  assert.equal(bothSuitesPerfect({ hiddenTotal: 2, hiddenPassed: 2, hidden2Total: 3, hidden2Passed: 2 }), false);
});

// ---- S5, S6, S7: runs.csv, attempts.csv and the report -----------------------------------------

const hiddenAll = { hiddenPassed: 21, hiddenTotal: 21, hidden2Passed: 26, hidden2Total: 26 };
function attemptEntry(n, { built = true, visiblePassed = 4, visibleTotal = 4, judgeCorrect } = {}) {
  const e = { attempt: n, promptTokens: 100 * n, completionTokens: 10 * n, built, visiblePassed, visibleTotal };
  if (judgeCorrect !== undefined) Object.assign(e, { judgeCorrect, judgeTestsRun: judgeCorrect ? 47 : 3, judgeFirstFail: judgeCorrect ? null : { suite: 'hidden', id: 'X' }, judgeMs: 1000 });
  return e;
}
function metrics(stack, arm, run, over = {}) {
  return {
    stack, arm, run, calls: 2, promptTokens: 1000, completionTokens: 200, tokensEstimated: false,
    ...hiddenAll, stopReason: 'visible_checks_pass', builtFinal: true, wallMs: 60000, modelMs: 1000, buildMs: 2000,
    hidden: [], hidden2: [], attempts: [attemptEntry(1, { built: false, visiblePassed: 0, visibleTotal: 0, judgeCorrect: false }), attemptEntry(2, { judgeCorrect: true })],
    firstAttemptCorrect: false, firstCorrectAttempt: 2, lastAttemptAgreesWithFinal: true, ...over,
  };
}
function resultsDir(list) {
  const dir = fresh('results');
  for (const m of list) {
    const d = path.join(dir, 'runs', `${m.stack}__${m.arm}__${m.run}`);
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, 'metrics.json'), JSON.stringify(m));
  }
  return dir;
}
const readCsv = (dir, file) => {
  const [header, ...rows] = fs.readFileSync(path.join(dir, file), 'utf8').trim().split('\n');
  const cols = header.split(',');
  return { header, cols, rows: rows.map((r) => Object.fromEntries(r.split(',').map((v, i) => [cols[i], v]))) };
};

test('runs.csv adds first_correct, first_correct_attempt and judge_agrees after correct, and keeps the columns before them', () => {
  const dir = resultsDir([
    metrics('django', 'bare', 1),
    metrics('django', 'tests', 1, { attempts: [attemptEntry(1, { judgeCorrect: true })], firstAttemptCorrect: true, firstCorrectAttempt: 1 }),
    metrics('nextjs', 'kit-bare.cart', 1, { stopReason: 'budget', attempts: [attemptEntry(1, { judgeCorrect: false })], firstAttemptCorrect: false, firstCorrectAttempt: null, lastAttemptAgreesWithFinal: false }),
  ]);
  writeReport(dir);
  const { cols, rows } = readCsv(dir, 'runs.csv');
  const original = 'stack,arm,run,calls,prompt_tokens,completion_tokens,total_tokens,tokens_estimated,hidden_passed,hidden_total,stop_reason,built_final,wall_ms,model_ms,build_ms,hidden2_passed,hidden2_total,slot,gauge_pass,correct'.split(',');
  assert.equal(original.length, 20);
  assert.deepEqual(cols, [...original, 'first_correct', 'first_correct_attempt', 'judge_agrees']);
  const by = Object.fromEntries(rows.map((r) => [`${r.stack}/${r.arm}`, r]));
  const get = (k) => [by[k].first_correct, by[k].first_correct_attempt, by[k].judge_agrees];
  assert.deepEqual(get('django/bare'), ['0', '2', '1']);
  assert.deepEqual(get('django/tests'), ['1', '1', '1']);
  assert.deepEqual(get('nextjs/kit-bare.cart'), ['0', '', '0'], 'no correct attempt leaves the number empty');
  assert.equal(by['nextjs/kit-bare.cart'].slot, 'cart');
});

test('attempts.csv has exactly the agreed header and one row per attempt', () => {
  const dir = resultsDir([
    metrics('django', 'bare', 1),
    metrics('nextjs', 'kit-tests.discount', 2, { attempts: [attemptEntry(1, { visiblePassed: 3, visibleTotal: 4, judgeCorrect: false })] }),
  ]);
  writeReport(dir);
  const { header, rows } = readCsv(dir, 'attempts.csv');
  assert.equal(header, 'stack,arm,slot,run,attempt,built,visible_passed,visible_total,gauge_pass,judge_correct,prompt_tokens,completion_tokens');
  assert.equal(rows.length, 3);
  const [a1, a2, k1] = [rows.find((r) => r.stack === 'django' && r.attempt === '1'), rows.find((r) => r.stack === 'django' && r.attempt === '2'), rows.find((r) => r.stack === 'nextjs')];
  assert.deepEqual([a1.built, a1.visible_passed, a1.visible_total, a1.gauge_pass, a1.judge_correct, a1.prompt_tokens, a1.completion_tokens], ['0', '0', '0', '0', '0', '100', '10']);
  assert.deepEqual([a2.built, a2.visible_passed, a2.visible_total, a2.gauge_pass, a2.judge_correct, a2.prompt_tokens, a2.completion_tokens], ['1', '4', '4', '1', '1', '200', '20']);
  assert.deepEqual([k1.arm, k1.slot, k1.run, k1.built, k1.gauge_pass, k1.judge_correct], ['kit-tests.discount', 'discount', '2', '1', '0', '0']);
  assert.equal(a1.slot, '');
});

test('neither CSV holds a hidden test id or name', () => {
  const ids = Object.values(SUITES).filter((s) => s !== SUITES.smoke && s !== SUITES.public).flatMap((s) => s.map((t) => t.id));
  const names = Object.values(SUITES).filter((s) => s !== SUITES.smoke && s !== SUITES.public).flatMap((s) => s.map((t) => t.name));
  const dir = resultsDir([
    // The metrics carry the id of the first failure; the CSVs must not.
    metrics('django', 'bare', 1, { attempts: [{ ...attemptEntry(1, { judgeCorrect: false }), judgeFirstFail: { suite: 'hidden', id: SUITES.hidden[0].id } }] }),
  ]);
  writeReport(dir);
  for (const file of ['runs.csv', 'attempts.csv']) {
    const text = fs.readFileSync(path.join(dir, file), 'utf8');
    const fields = new Set(text.split(/[\n,]/));
    assert.ok(!ids.some((id) => fields.has(id)), `${file} holds no hidden test id`);
    assert.ok(!names.some((n) => text.includes(n)), `${file} holds no hidden test name`);
  }
});

test('a results directory from before this change still produces a report, with empty new columns', () => {
  const old = (stack, arm, run) => {
    const m = metrics(stack, arm, run);
    delete m.firstAttemptCorrect; delete m.firstCorrectAttempt; delete m.lastAttemptAgreesWithFinal;
    m.attempts = [attemptEntry(1), attemptEntry(2)];
    return m;
  };
  const dir = resultsDir([old('django', 'bare', 1), old('django', 'tests', 1), old('nextjs', 'kit-bare.cart', 1)]);
  const report = fs.readFileSync(writeReport(dir), 'utf8');
  assert.match(report, /\| bare \(task only\) \| 1 \|/);
  assert.doesNotMatch(report.split('\n').filter((l) => l.startsWith('|')).join('\n'), /undefined|NaN/, 'no table breaks');
  assert.doesNotMatch(report, /\*\*Correct at the first attempt\*\*/,'nothing was judged per attempt, so there is no such table');
  const { rows } = readCsv(dir, 'runs.csv');
  for (const r of rows) assert.deepEqual([r.first_correct, r.first_correct_attempt, r.judge_agrees], ['', '', '']);
  const attempts = readCsv(dir, 'attempts.csv');
  assert.equal(attempts.rows.length, 6);
  for (const r of attempts.rows) assert.equal(r.judge_correct, '');
  assert.doesNotMatch(report, /two different answers/);
});

test('a run with no attempts at all still produces both CSVs and a report', () => {
  const dir = resultsDir([metrics('django', 'bare', 1, { attempts: undefined })]);
  assert.doesNotThrow(() => writeReport(dir));
  assert.equal(readCsv(dir, 'attempts.csv').rows.length, 0);
});

test('the report shows, per stack, how many runs of each arm were correct at the first attempt', () => {
  const dir = resultsDir([
    metrics('django', 'bare', 1),
    metrics('django', 'bare', 2, { firstAttemptCorrect: true, firstCorrectAttempt: 1 }),
    metrics('django', 'bare', 3, { firstAttemptCorrect: true, firstCorrectAttempt: 1 }),
    metrics('django', 'tests', 1),
    metrics('nextjs', 'bare', 1),
  ]);
  const report = fs.readFileSync(writeReport(dir), 'utf8');
  assert.match(report, /Correct at the first attempt/);
  const django = report.split('\n## ').find((s) => s.startsWith('django'));
  assert.match(django, /\| bare \(task only\) \| 2 of 3 \|/);
  assert.match(django, /\| tests \(task \+ public test feedback, no piece\) \| 0 of 1 \|/);
});

test('the report warns, with the count, when the judge disagreed with itself, and only then', () => {
  const clean = fs.readFileSync(writeReport(resultsDir([metrics('django', 'bare', 1)])), 'utf8');
  assert.doesNotMatch(clean, /two different answers/);
  const dirty = fs.readFileSync(writeReport(resultsDir([
    metrics('django', 'bare', 1),
    metrics('django', 'bare', 2, { lastAttemptAgreesWithFinal: false }),
    metrics('django', 'bare', 3, { lastAttemptAgreesWithFinal: false }),
  ])), 'utf8');
  const warning = dirty.split('\n').filter((l) => /two different answers/.test(l));
  assert.equal(warning.length, 1);
  assert.match(warning[0], /\b2 run\(s\)/);
});

// ---- S8: the selftest expectations -------------------------------------------------------------

const withBreak = { selftestBreak: { file: 'x' }, selftestBug: { file: 'y' } };
const noBreak = { selftestBreak: null, selftestBug: null };
const cell = (list) => ({ attempts: list.map((c, i) => ({ attempt: i + 1, judgeCorrect: c })), lastAttemptAgreesWithFinal: true });

test('the attempt at which the fake model delivers the reference', () => {
  assert.equal(referenceAttempt(withBreak, 'docs'), 2);
  assert.equal(referenceAttempt(withBreak, 'of-code'), 2);
  assert.equal(referenceAttempt(withBreak, 'bare'), null, 'bare gets a plausible bug from attempt 2');
  assert.equal(referenceAttempt(withBreak, 'kit-bare.cart'), 1, 'the broken installed file is rejected, so the reference slot works at once');
  assert.equal(referenceAttempt(noBreak, 'docs'), 1);
  assert.equal(referenceAttempt(noBreak, 'bare'), 1, 'no bug and no broken file: the reference at once');
  assert.equal(referenceAttempt({ selftestBreak: null, selftestBug: { file: 'y' } }, 'bare'), null);
});

test('the selftest accepts a cell whose judge is wrong exactly until the reference arrives', () => {
  assert.deepEqual(judgeSelftestProblems({ stack: withBreak, arm: 'docs', metrics: cell([false, true]) }), []);
  assert.deepEqual(judgeSelftestProblems({ stack: withBreak, arm: 'kit-tests.discount', metrics: cell([true]) }), []);
  assert.deepEqual(judgeSelftestProblems({ stack: withBreak, arm: 'bare', metrics: cell([false, false]) }), []);
});

test('the selftest reports a judge that calls the reference wrong, or a wrong state right', () => {
  assert.equal(judgeSelftestProblems({ stack: withBreak, arm: 'docs', metrics: cell([false, false]) }).length, 1, 'reference at attempt 2 not judged correct');
  assert.equal(judgeSelftestProblems({ stack: withBreak, arm: 'docs', metrics: cell([true, true]) }).length, 1, 'broken attempt 1 judged correct');
  assert.equal(judgeSelftestProblems({ stack: withBreak, arm: 'bare', metrics: cell([false, true]) }).length, 1, 'a bug judged correct');
  assert.equal(judgeSelftestProblems({ stack: withBreak, arm: 'kit-bare.cart', metrics: cell([false]) }).length, 1);
});

test('the selftest reports a run whose last attempt disagrees with the final judgement', () => {
  const m = { ...cell([false, true]), lastAttemptAgreesWithFinal: false };
  const problems = judgeSelftestProblems({ stack: withBreak, arm: 'docs', metrics: m });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /final judgement/);
});

test('a run that stopped before the reference attempt is not blamed for an attempt it never made', () => {
  assert.deepEqual(judgeSelftestProblems({ stack: withBreak, arm: 'docs', metrics: cell([false]) }), []);
});
