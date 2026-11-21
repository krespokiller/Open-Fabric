// Tests for describe.mjs: each section rule through the public functions, plus the command line.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as S from './stats.mjs';
import { pairTable, agreement, detection, loop, render, main } from './describe.mjs';

const script = fileURLToPath(new URL('./describe.mjs', import.meta.url));
const fixture = (name) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));

const run = (arm, stack, slot, { correct, gauge, built = true, tokens = 100 }) => ({
  arm, stack, slot, correct, gaugePass: gauge, tokens, raw: { built_final: built ? 'true' : 'false' },
});
const att = (arm, stack, slot, runNo, attempt, { gauge, judge, tin = 10, tout = 5 }) => ({
  arm, stack, slot, run: runNo, attempt, gaugePass: gauge, judgeCorrect: judge, tokensIn: tin, tokensOut: tout,
});

async function cli(args) {
  let out = '';
  let err = '';
  const code = await main(args, { write: (t) => { out += t; }, writeError: (t) => { err += t; } });
  return { code, out, err };
}

describe('pairTable', () => {
  test('counts correct, gauge pass and right decisions per arm for each stack and slot', () => {
    const runs = [
      run('a', 's1', 'x', { correct: true, gauge: true }),
      run('a', 's1', 'x', { correct: false, gauge: true }),
      run('b', 's1', 'x', { correct: false, gauge: false }),
    ];
    const t = pairTable(runs);
    assert.deepEqual(t.arms, ['a', 'b']);
    assert.equal(t.rows.length, 1);
    assert.deepEqual(t.rows[0].cells.a, { n: 2, correct: 1, gaugePass: 2, right: 1 });
    assert.deepEqual(t.rows[0].cells.b, { n: 1, correct: 0, gaugePass: 0, right: 1 });
  });
});

describe('agreement', () => {
  test('a mixed cell is listed with its k of n correct', () => {
    const runs = [
      run('a', 's', 'x', { correct: true, gauge: true }),
      run('a', 's', 'x', { correct: false, gauge: true }),
      run('a', 's', 'y', { correct: true, gauge: true }),
      run('a', 's', 'y', { correct: true, gauge: false }),
    ];
    const a = agreement(runs).arms.find((x) => x.arm === 'a');
    assert.equal(a.cells, 2);
    assert.equal(a.multi, 2);
    assert.equal(a.sameCorrect, 1);
    assert.equal(a.sameGauge, 1);
    assert.deepEqual(a.mixed, [{ stack: 's', slot: 'x', correct: 1, n: 2 }]);
    assert.match(render(runs, null), /1 of 2 correct/);
  });
  test('one run per cell is not estimable, not zeros', () => {
    const runs = [run('a', 's', 'x', { correct: true, gauge: true }), run('a', 's', 'y', { correct: false, gauge: true })];
    assert.equal(agreement(runs).arms[0].multi, 0);
    assert.match(render(runs, null), /not estimable with one run per cell/);
  });
});

describe('detection', () => {
  test('splits never built from built and rejected, counts silent defects, and gives a Wilson interval', () => {
    const runs = [
      run('a', 's', 'x', { correct: false, gauge: false, built: false }),
      run('a', 's', 'y', { correct: false, gauge: false, built: true }),
      run('a', 's', 'z', { correct: false, gauge: true }),
      run('a', 's', 'w', { correct: true, gauge: true }),
    ];
    const d = detection(runs).find((x) => x.arm === 'a');
    assert.equal(d.wrong, 3);
    assert.equal(d.neverBuilt, 1);
    assert.equal(d.rejected, 1);
    assert.equal(d.silent, 1);
    assert.equal(d.detected, 2);
    const w = S.wilson(2, 3);
    assert.equal(d.rate.lower, w.lower);
    assert.equal(d.rate.upper, w.upper);
  });
  test('an arm with no wrong run is not estimable', () => {
    const runs = [run('a', 's', 'x', { correct: true, gauge: true })];
    assert.equal(detection(runs)[0].rate, null);
    assert.match(render(runs, null), /not estimable/);
  });
});

describe('loop', () => {
  const attempts = [
    att('a', 's', 'x', 1, 1, { gauge: false, judge: false, tin: 100, tout: 20 }),
    att('a', 's', 'x', 1, 2, { gauge: true, judge: true, tin: 200, tout: 30 }),
    att('a', 's', 'y', 1, 1, { gauge: true, judge: true, tin: 50, tout: 10 }),
  ];
  test('counts runs, attempts, changes after the first attempt and the token share', () => {
    const l = loop(attempts).find((x) => x.arm === 'a');
    assert.equal(l.runs, 2);
    assert.equal(l.attempts, 3);
    assert.equal(l.multi, 1);
    assert.equal(l.gaugeChanged, 1);
    assert.equal(l.judgeChanged, 1);
    assert.equal(l.tokensFirst, 180);
    assert.equal(l.tokensAll, 410);
    assert.equal(l.afterShare, 230 / 410);
  });
  test('without an attempts file the section says it needs one', () => {
    const text = render([run('a', 's', 'x', { correct: true, gauge: true })], null);
    assert.match(text, /needs the attempts file/);
  });
  test('thousands comma above 9,999', () => {
    const big = [att('a', 's', 'x', 1, 1, { gauge: true, judge: true, tin: 20000, tout: 5 })];
    assert.match(render([run('a', 's', 'x', { correct: true, gauge: true })], big), /20,005/);
  });
});

describe('command line', () => {
  test('prints the report for a fixture file with exit code 0', () => {
    const r = spawnSync('node', [script, fixture('describe-runs.csv'), '--attempts', fixture('describe-attempts.csv')], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Detection per run/);
    assert.match(r.stdout, /The loop/);
  });
  test('a missing file gives exit code 2 and a one-line usage message', async () => {
    const r = await cli(['no-such-file.csv']);
    assert.equal(r.code, 2);
    assert.match(r.err, /Usage: node analysis\/describe\.mjs/);
    assert.equal(r.err.trim().split('\n').length, 1);
  });
  test('bad arguments give exit code 2', async () => {
    assert.equal((await cli([])).code, 2);
    assert.equal((await cli([fixture('describe-runs.csv'), '--bogus'])).code, 2);
    assert.equal((await cli([fixture('describe-runs.csv'), '--attempts'])).code, 2);
  });
  test('a missing attempts file gives exit code 2', async () => {
    assert.equal((await cli([fixture('describe-runs.csv'), '--attempts', 'nope.csv'])).code, 2);
  });
});
