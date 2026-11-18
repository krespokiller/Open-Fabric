// The hidden suites are the judge, so no arm may carry the values they assert. This check compares
// the amounts the hidden suites assert with every file under arms/. It reads the suites only to
// build the list of amounts and never prints one: a failure names the arm file and line.
// Run from bench/:  node --test test/arms-leak.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../src/util.mjs';

// An amount is an integer written with at least four digits, with or without _ or , separators.
const AMOUNT = /(?<![\w.])\d[\d_,]*\d(?![\w])/g;
const MIN_DIGITS = 4;
// A line of a suite that asserts something. The numbers on it are expected values.
const ASSERTION = /\b(eq|ok|expectStatus|fail)\(/;

const amountsIn = (text) => [...text.matchAll(AMOUNT)].map((m) => m[0].replace(/[_,]/g, '')).filter((n) => n.length >= MIN_DIGITS);

// Allow-list, two parts.
// 1. Every amount written in task/task.md. The task is shown to every arm, so those amounts (catalogue prices
//    such as the mug, the 10,000,000 threshold, the 3,000,000 cap, the 13,500,000 of the webhook example, the
//    ports and the other numbers of its examples) are public by design.
// 2. EXTRA_ALLOWED: numbers that are not amounts. 1000 is the milliseconds-per-second factor that any code reading
//    a webhook timestamp contains (`Date.now() / 1000`), and a hidden test uses it as a number of seconds of clock skew.
const EXTRA_ALLOWED = ['1000'];
export function allowedAmounts(taskText) {
  return new Set([...amountsIn(taskText), ...EXTRA_ALLOWED]);
}

// The amounts asserted by a suite, minus the allow-list.
export function assertedAmounts(suiteTexts, allowed) {
  const found = new Set();
  for (const text of suiteTexts) {
    for (const line of text.split('\n')) {
      if (!ASSERTION.test(line)) continue;
      for (const n of amountsIn(line)) if (!allowed.has(n)) found.add(n);
    }
  }
  return found;
}

// `file:line` of every line that carries one of the amounts. Only locations are returned.
export function leaks(files, amounts) {
  const out = [];
  for (const [file, text] of files) {
    text.split('\n').forEach((line, i) => {
      if (amountsIn(line).some((n) => amounts.has(n))) out.push(`${file}:${i + 1}`);
    });
  }
  return out;
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}

test('the leak check finds an asserted amount in an arm file and reports its location only', () => {
  const allowed = allowedAmounts('A mug costs 5,000,000.');
  const amounts = assertedAmounts(["eq(o.total, 7654321, 'x');", "await c.createProduct({ price: 5000000 });", "const r = fetch('/a', { timeout: 20000 });"], allowed);
  assert.deepEqual([...amounts], ['7654321'], 'allow-listed amounts and numbers outside assertions are not counted');
  const found = leaks([['arms/a.md', 'nothing\n| yes | 7,654,321 | 1 |'], ['arms/b.md', 'the mug costs 5,000,000']], amounts);
  assert.deepEqual(found, ['arms/a.md:2']);
});

test('no file under arms/ carries an amount that a hidden suite asserts', () => {
  const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const allowed = allowedAmounts(read('task/task.md'));
  const amounts = assertedAmounts([read('suites/hidden.mjs'), read('suites/hidden2.mjs')], allowed);
  assert.ok(amounts.size > 10, 'the check found the amounts of the hidden suites (a count, not the values)');
  const armsDir = path.join(ROOT, 'arms');
  const files = walk(armsDir).map((f) => [`arms/${path.relative(armsDir, f).split(path.sep).join('/')}`, fs.readFileSync(f, 'utf8')]);
  assert.ok(files.length > 10, 'the check read the arm files');
  const found = leaks(files, amounts);
  // The message holds locations only. Open the arm file at each location and change the example.
  assert.equal(found.length, 0, `arm files that carry a hidden-suite amount (change the example at each location): ${found.join(', ')}`);
});
