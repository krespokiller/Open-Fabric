// Fast checks for bench/controls/unfilled-slots.mjs. They need no Docker and no model.
// Run from bench/:  node --test test/controls.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from '../src/util.mjs';
import {
  CSV_HEADER, ControlArgError, ControlResumeError, controlProblems, countsFromResults, formatTable, parseControlArgs, parseCsv, resumeState, toCsv, toCsvRow,
} from '../controls/unfilled-slots.mjs';

const SCRIPT = path.join(ROOT, 'controls', 'unfilled-slots.mjs');
const CATALOG = { all: ['nextjs', 'django', 'spring'], slots: { nextjs: ['discount', 'cart'], django: ['discount', 'cart'], spring: [] } };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ofb-controls-test-'));
test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

const row = (over = {}) => ({
  stack: 'nextjs', slot: 'cart', built: true, smoke_passed: 3, smoke_total: 4, public_passed: 0, public_total: 8,
  hidden_passed: 2, hidden_total: 21, hidden2_passed: 5, hidden2_total: 26, hash: 'abc', ...over,
});

test('the CSV header is the one the record documents', () => {
  assert.equal(CSV_HEADER, 'stack,slot,built,smoke_passed,smoke_total,public_passed,public_total,hidden_passed,hidden_total,hidden2_passed,hidden2_total,hash');
  const lines = toCsv([row(), row({ slot: 'discount', built: false })]).trimEnd().split('\n');
  assert.equal(lines[0], CSV_HEADER);
  assert.equal(lines[1], 'nextjs,cart,true,3,4,0,8,2,21,5,26,abc');
  assert.equal(lines[2].split(',')[2], 'false');
  assert.equal(lines.length, 3);
});

test('arguments: defaults are every stack that has slots, with all their slots', () => {
  const a = parseControlArgs([], CATALOG);
  assert.deepEqual(a.plan, [
    { stack: 'nextjs', slot: 'discount' }, { stack: 'nextjs', slot: 'cart' },
    { stack: 'django', slot: 'discount' }, { stack: 'django', slot: 'cart' },
  ]);
  assert.equal(a.runtime, 'docker');
});

test('arguments: --stacks and --slots narrow the plan', () => {
  const a = parseControlArgs(['--stacks', 'django', '--slots', 'cart', '--out', path.join(tmp, 'o')], CATALOG);
  assert.deepEqual(a.plan, [{ stack: 'django', slot: 'cart' }]);
  assert.equal(a.out, path.join(tmp, 'o'));
});

test('arguments: an unknown stack, a stack without slots, an unknown slot and an unknown option are refused', () => {
  assert.throws(() => parseControlArgs(['--stacks', 'nosuch'], CATALOG), (e) => e instanceof ControlArgError && /unknown stack "nosuch"/.test(e.message));
  assert.throws(() => parseControlArgs(['--stacks', 'spring'], CATALOG), (e) => e instanceof ControlArgError && /no slots/.test(e.message));
  assert.throws(() => parseControlArgs(['--slots', 'nosuch'], CATALOG), (e) => e instanceof ControlArgError && /unknown slot "nosuch"/.test(e.message));
  assert.throws(() => parseControlArgs(['--bogus'], CATALOG), ControlArgError);
  assert.throws(() => parseControlArgs(['--runtime', 'native'], CATALOG), (e) => e instanceof ControlArgError && /docker/.test(e.message));
});

test('arguments: an output folder inside a hashed folder is refused, so the hash cannot change', () => {
  for (const d of ['task', 'arms', 'suites', 'src', 'stacks']) {
    assert.throws(() => parseControlArgs(['--out', path.join(ROOT, d, 'x')], CATALOG), (e) => e instanceof ControlArgError && /experiment hash/.test(e.message), d);
  }
  assert.doesNotThrow(() => parseControlArgs(['--out', path.join(ROOT, 'results', 'x')], CATALOG));
});

test('the script refuses bad arguments with exit code 1 before building anything', () => {
  const out = path.join(tmp, 'never');
  for (const [args, re] of [
    [['--stacks', 'nosuch'], /unknown stack/],
    [['--stacks', 'nextjs', '--slots', 'nosuch'], /unknown slot/],
    [['--stacks', 'spring'], /no slots/],
  ]) {
    const r = spawnSync(process.execPath, [SCRIPT, ...args, '--out', out], { cwd: ROOT, encoding: 'utf8', timeout: 20000 });
    assert.equal(r.status, 1, `${args.join(' ')}: ${r.stderr}`);
    assert.match(r.stderr, re);
    assert.equal(r.stdout, '', 'nothing is printed to stdout before the arguments are accepted');
    assert.equal(fs.existsSync(out), false, 'no output folder is created');
  }
});

test('the rule of the exit code: a control is a problem when it did not run or is correct by construction', () => {
  assert.deepEqual(controlProblems(row()), []);
  assert.deepEqual(controlProblems(row({ hidden_passed: 20, hidden2_passed: 0 })), []);
  const notBuilt = controlProblems(row({ built: false, hidden_passed: 0, hidden2_passed: 0 }));
  assert.equal(notBuilt.length, 1);
  assert.match(notBuilt[0], /nextjs\/cart.*did not build or start/);
  const full1 = controlProblems(row({ hidden_passed: 21 }));
  assert.equal(full1.length, 1);
  assert.match(full1[0], /nextjs\/cart.*hidden.*correct by construction/);
  const full2 = controlProblems(row({ hidden2_passed: 26 }));
  assert.equal(full2.length, 1);
  assert.match(full2[0], /hidden2/);
  assert.equal(controlProblems(row({ hidden_passed: 21, hidden2_passed: 26 })).length, 2);
  // A suite that ran no test proves nothing.
  assert.equal(controlProblems(row({ hidden_total: 0, hidden_passed: 0 })).length, 1);
});

test('counts are read from the results, with their real totals and no test ids', () => {
  const results = [
    { suite: 'smoke', id: 'S1', name: 'n', pass: true }, { suite: 'smoke', id: 'S2', name: 'n', pass: false, error: 'x' },
    { suite: 'public', id: 'P1', name: 'n', pass: true },
    { suite: 'hidden', id: 'H1', name: 'n', pass: false, error: 'x' }, { suite: 'hidden', id: 'H2', name: 'n', pass: true },
    { suite: 'hidden2', id: 'X1', name: 'n', pass: true },
  ];
  assert.deepEqual(countsFromResults(results), {
    smoke_passed: 1, smoke_total: 2, public_passed: 1, public_total: 1, hidden_passed: 1, hidden_total: 2, hidden2_passed: 1, hidden2_total: 1,
  });
});

test('the table shows one row per stack and slot with x/total counts and nothing else', () => {
  const text = formatTable([row(), row({ stack: 'django', slot: 'discount', built: false, smoke_passed: 0, public_passed: 0, hidden_passed: 0, hidden2_passed: 0 })]);
  const lines = text.trimEnd().split('\n');
  assert.equal(lines.length, 3);
  assert.match(lines[0], /stack\s+slot\s+smoke\s+public\s+hidden\s+hidden2/);
  assert.match(lines[1], /nextjs\s+cart\s+3\/4\s+0\/8\s+2\/21\s+5\/26/);
  assert.match(lines[2], /django\s+discount\s+0\/4\s+0\/8\s+0\/21\s+0\/26\s+NOT BUILT/);
});

// Resume: a kill must not lose the cells already judged, and two instruments must never mix in one CSV.
const PLAN = [
  { stack: 'nextjs', slot: 'discount' }, { stack: 'nextjs', slot: 'cart' },
  { stack: 'django', slot: 'discount' }, { stack: 'django', slot: 'cart' },
];
const cells = (items) => items.map((i) => `${i.stack}/${i.slot}`);

test('a row written with toCsvRow is read back by parseCsv with its types', () => {
  const rows = [row({ hash: 'h1' }), row({ slot: 'discount', built: false, hash: 'h1' })];
  assert.equal(toCsv(rows), `${CSV_HEADER}\n${rows.map(toCsvRow).join('\n')}\n`);
  assert.deepEqual(parseCsv(toCsv(rows)), rows);
});

test('resume: no file or an empty file means every cell runs and the header must be written', () => {
  for (const text of [null, '', '\n']) {
    const s = resumeState(PLAN, text, 'h1');
    assert.deepEqual(s.todo, PLAN);
    assert.deepEqual(s.skipped, []);
    assert.deepEqual(s.rows, []);
    assert.equal(s.needsHeader, true);
  }
});

test('resume: a header-only file means nothing is skipped and no second header is written', () => {
  const s = resumeState(PLAN, `${CSV_HEADER}\n`, 'h1');
  assert.deepEqual(s.todo, PLAN);
  assert.deepEqual(s.skipped, []);
  assert.equal(s.needsHeader, false);
});

test('resume: cells already in the file are kept and skipped, the others are left to run in plan order', () => {
  const done = [row({ hash: 'h1' }), row({ stack: 'django', slot: 'discount', hash: 'h1' })];
  const s = resumeState(PLAN, toCsv(done), 'h1');
  assert.deepEqual(cells(s.todo), ['nextjs/discount', 'django/cart']);
  assert.deepEqual(cells(s.skipped), ['nextjs/cart', 'django/discount']);
  assert.deepEqual(s.rows, done);
  assert.equal(s.needsHeader, false);
});

test('resume: a finished file leaves nothing to run, and rows outside the plan are kept in the result', () => {
  const done = PLAN.map((p) => row({ ...p, hash: 'h1' }));
  assert.deepEqual(resumeState(PLAN, toCsv(done), 'h1').todo, []);
  const extra = row({ stack: 'django', slot: 'ledger', hash: 'h1' });
  const s = resumeState(PLAN.slice(0, 2), toCsv([extra]), 'h1');
  assert.deepEqual(s.rows, [extra]);
  assert.deepEqual(s.todo, PLAN.slice(0, 2));
});

test('resume: a row recorded with another experiment hash is refused, even when only one row differs', () => {
  const text = toCsv([row({ hash: 'h1' }), row({ slot: 'discount', hash: 'OLD' })]);
  assert.throws(() => resumeState(PLAN, text, 'h1'), (e) => e instanceof ControlResumeError && /different experiment hash/.test(e.message) && /nextjs\/discount/.test(e.message));
});

test('resume: a file that is not this control\'s CSV, or a damaged row, is refused with a clear message', () => {
  assert.throws(() => resumeState(PLAN, 'a,b,c\n1,2,3\n', 'h1'), (e) => e instanceof ControlResumeError && /header/.test(e.message));
  assert.throws(() => resumeState(PLAN, `${CSV_HEADER}\nnextjs,cart,true,3\n`, 'h1'), (e) => e instanceof ControlResumeError && /line 2/.test(e.message));
  assert.throws(() => resumeState(PLAN, `${CSV_HEADER}\nnextjs,cart,maybe,3,4,0,8,2,21,5,26,h1\n`, 'h1'), (e) => e instanceof ControlResumeError && /line 2/.test(e.message));
});

test('resume: a file without the final newline is read, and a later row for the same cell replaces the earlier one', () => {
  const first = row({ hash: 'h1', hidden_passed: 2 });
  const again = row({ hash: 'h1', hidden_passed: 3 });
  const s = resumeState(PLAN, `${CSV_HEADER}\n${toCsvRow(first)}\n${toCsvRow(again)}`, 'h1');
  assert.deepEqual(s.rows, [again]);
  assert.equal(s.endsWithNewline, false);
});
