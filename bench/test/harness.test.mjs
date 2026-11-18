// Fast checks for the harness itself: the judge's HTTP client, the experiment hash, the report,
// runs.csv and the resume rules. They need no Docker and no model.
// Run from bench/:  node --test test/
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, readJson } from '../src/util.mjs';
import { experimentHash } from '../src/judge.mjs';
import { kitFeedbackText } from '../src/prompts.mjs';
import { writeReport } from '../src/report.mjs';
import { makeCtx } from '../suites/lib.mjs';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ofb-harness-test-'));
test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
let counter = 0;
const fresh = (name) => {
  const dir = path.join(tmp, `${name}-${++counter}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

// ---- Item 1: the judge's client never reuses a connection -------------------------------------

test('the judge sends Connection: close on every request, so a server that drops idle connections cannot fail a test', async () => {
  const seen = [];
  const server = http.createServer((req, res) => {
    seen.push(req.headers.connection);
    res.setHeader('Content-Type', 'application/json');
    res.end('{"ok":true}');
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  try {
    const ctx = makeCtx({ base: `http://127.0.0.1:${server.address().port}`, adminKey: 'k', webhookSecret: 's', psp: null, prefix: 'T' });
    await ctx.req('GET', '/a', { key: 'k' });
    await ctx.req('POST', '/b', { key: 'k', body: { x: 1 } });
    await ctx.req('POST', '/c', { raw: '{}', headers: { 'X-Test': '1' } });
    assert.deepEqual(seen, ['close', 'close', 'close']);
  } finally {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
  }
});

// ---- Item 2: the experiment hash --------------------------------------------------------------

function miniRoot(eol = '\n') {
  const root = fresh('root');
  const files = {
    'task/task.md': `# Task${eol}line two${eol}`,
    'arms/docs/a.md': `docs${eol}`,
    'suites/s.mjs': `export const a = 1;${eol}`,
    'src/x.mjs': `export const b = 2;${eol}`,
    'stacks/demo/stack.json': `{${eol}"label": "Demo"${eol}}${eol}`,
    'stacks/demo/skeleton/app.txt': `skeleton${eol}`,
    'stacks/demo/gold/service.txt': `reference code${eol}`,
    'stacks/demo/gold/node_modules/dep.js': `ignored${eol}`,
  };
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), text);
  }
  return root;
}

test('the experiment hash covers the reference in stacks/*/gold, which the kit arms install', () => {
  const root = miniRoot();
  const before = experimentHash(root);
  fs.writeFileSync(path.join(root, 'stacks/demo/gold/service.txt'), 'reference code, changed\n');
  assert.notEqual(experimentHash(root), before);
});

test('the experiment hash still ignores dependency and build folders', () => {
  const root = miniRoot();
  const before = experimentHash(root);
  fs.writeFileSync(path.join(root, 'stacks/demo/gold/node_modules/dep.js'), 'changed\n');
  fs.mkdirSync(path.join(root, 'stacks/demo/skeleton/.next'), { recursive: true });
  fs.writeFileSync(path.join(root, 'stacks/demo/skeleton/.next/cache.txt'), 'x\n');
  assert.equal(experimentHash(root), before);
});

test('the experiment hash is the same for LF and CRLF checkouts of the same commit', () => {
  assert.equal(experimentHash(miniRoot('\r\n')), experimentHash(miniRoot('\n')));
});

test('the experiment hash still changes with the content of a text file and with its path', () => {
  const root = miniRoot();
  const before = experimentHash(root);
  fs.appendFileSync(path.join(root, 'task/task.md'), 'one more line\n');
  const edited = experimentHash(root);
  assert.notEqual(edited, before);
  fs.renameSync(path.join(root, 'arms/docs/a.md'), path.join(root, 'arms/docs/b.md'));
  assert.notEqual(experimentHash(root), edited);
});

test('a binary file is hashed byte for byte: only text files are normalized', () => {
  const root = miniRoot();
  const file = path.join(root, 'stacks/demo/skeleton/logo.bin');
  fs.writeFileSync(file, Buffer.from([0, 1, 13, 10, 2]));
  const a = experimentHash(root);
  fs.writeFileSync(file, Buffer.from([0, 1, 10, 2]));
  assert.notEqual(experimentHash(root), a);
});

// ---- Items 3 and 6: the report and runs.csv ---------------------------------------------------

const hiddenAll = { hiddenPassed: 21, hiddenTotal: 21, hidden2Passed: 26, hidden2Total: 26 };
function metrics(stack, arm, run, over = {}) {
  return {
    stack, arm, run, calls: 3, promptTokens: 1000, completionTokens: 200, tokensEstimated: false,
    ...hiddenAll, stopReason: 'visible_checks_pass', builtFinal: true, wallMs: 60000, modelMs: 1000, buildMs: 2000,
    hidden: [], hidden2: [], ...over,
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
const csvRows = (dir) => {
  const [header, ...rows] = fs.readFileSync(path.join(dir, 'runs.csv'), 'utf8').trim().split('\n');
  const cols = header.split(',');
  return { cols, rows: rows.map((r) => Object.fromEntries(r.split(',').map((v, i) => [cols[i], v]))) };
};

test('"Runs passing both suites" counts a run only when every test of both hidden suites passes', () => {
  const dir = resultsDir([
    metrics('django', 'bare', 1), // both suites perfect
    metrics('django', 'bare', 2, { hidden2Passed: 20 }), // first suite perfect, second not
    metrics('django', 'bare', 3, { hiddenPassed: 20 }), // second suite perfect, first not
    metrics('django', 'bare', 4, { hidden2Passed: 0, hidden2Total: 0 }), // second suite missing
  ]);
  const report = fs.readFileSync(writeReport(dir), 'utf8');
  assert.match(report, /\| Runs passing both suites \|/);
  assert.doesNotMatch(report, /Fully correct runs/);
  const row = report.split('\n').find((l) => l.startsWith('| bare (task only) | 4 |'));
  assert.ok(row, 'the bare row exists');
  assert.equal(row.split('|')[5].trim(), '1/4', 'only the run with both suites perfect counts');
});

test('a kit run with the second hidden suite missing is not counted as correct', () => {
  const dir = resultsDir([
    metrics('django', 'kit-bare.cart', 1),
    metrics('django', 'kit-bare.cart', 2, { hidden2Passed: 0, hidden2Total: 0 }),
  ]);
  const report = fs.readFileSync(writeReport(dir), 'utf8');
  assert.match(report, /\| django \| cart \| 1\/2 \|/);
});

test('runs.csv keeps its original columns in place and adds slot, gauge_pass, correct and the per-attempt columns', () => {
  const dir = resultsDir([
    metrics('django', 'bare', 1),
    metrics('django', 'tests', 2, { stopReason: 'budget', hidden2Passed: 25 }),
    metrics('nextjs', 'kit-tests.discount', 3),
    metrics('nextjs', 'kit-bare.cart', 1, { stopReason: 'budget', hiddenPassed: 20 }),
  ]);
  writeReport(dir);
  const { cols, rows } = csvRows(dir);
  const original = 'stack,arm,run,calls,prompt_tokens,completion_tokens,total_tokens,tokens_estimated,hidden_passed,hidden_total,stop_reason,built_final,wall_ms,model_ms,build_ms,hidden2_passed,hidden2_total'.split(',');
  assert.deepEqual(cols.slice(0, original.length), original);
  assert.deepEqual(cols.slice(original.length), ['slot', 'gauge_pass', 'correct', 'first_correct', 'first_correct_attempt', 'judge_agrees']);
  const by = Object.fromEntries(rows.map((r) => [`${r.stack}/${r.arm}/${r.run}`, r]));
  assert.deepEqual([by['django/bare/1'].slot, by['django/bare/1'].gauge_pass, by['django/bare/1'].correct], ['', '1', '1']);
  assert.deepEqual([by['django/tests/2'].slot, by['django/tests/2'].gauge_pass, by['django/tests/2'].correct], ['', '0', '0']);
  assert.deepEqual([by['nextjs/kit-tests.discount/3'].slot, by['nextjs/kit-tests.discount/3'].gauge_pass, by['nextjs/kit-tests.discount/3'].correct], ['discount', '1', '1']);
  assert.deepEqual([by['nextjs/kit-bare.cart/1'].slot, by['nextjs/kit-bare.cart/1'].gauge_pass, by['nextjs/kit-bare.cart/1'].correct], ['cart', '0', '0']);
  // The token columns the statistics need are already there, input and output apart.
  assert.equal(by['django/bare/1'].prompt_tokens, '1000');
  assert.equal(by['django/bare/1'].completion_tokens, '200');
  assert.equal(by['django/bare/1'].total_tokens, '1200');
});

// ---- Item 4: a resume with other slots is refused ---------------------------------------------

// The native runtime without a database address stops at the first build, after meta.json is written
// and before any model call, so these commands need neither Docker nor a model.
const selftest = (out, slots) => {
  const env = { ...process.env };
  delete env.OF_PG_ADMIN_URL;
  return spawnSync(process.execPath, [path.join(ROOT, 'src', 'cli.mjs'), 'selftest', '--stacks', 'django', '--arms', 'kit-bare', '--slots', slots, '--runtime', 'native', '--out', out], {
    encoding: 'utf8',
    env,
    timeout: 60_000,
  });
};

test('the slots are recorded in meta.json, with every kit arm and its slot', () => {
  const out = path.join(tmp, 'out-slots-recorded');
  const r = selftest(out, 'discount,cart');
  assert.match(r.stderr, /Error: native runtime needs --pg-admin-url/);
  const meta = readJson(path.join(out, 'meta.json'));
  assert.deepEqual(meta.params.slots, ['cart', 'discount']);
  assert.deepEqual(meta.params.kitArms, ['kit-bare.cart', 'kit-bare.discount']);
});

test('resuming a results directory with another slot list is refused', () => {
  const out = path.join(tmp, 'out-slots-resume');
  assert.match(selftest(out, 'discount').stderr, /Error: native runtime needs --pg-admin-url/);
  const same = selftest(out, 'discount');
  assert.match(same.stderr, /Error: native runtime needs --pg-admin-url/, 'the same slots resume as before');
  const other = selftest(out, 'cart');
  assert.equal(other.status, 1);
  assert.match(other.stderr, /Error: refusing to resume .*: these settings differ from the original run: slots, kitArms\./);
  const none = spawnSync(process.execPath, [path.join(ROOT, 'src', 'cli.mjs'), 'selftest', '--stacks', 'django', '--arms', 'kit-bare', '--runtime', 'native', '--out', out], { encoding: 'utf8', env: { ...process.env, OF_PG_ADMIN_URL: '' }, timeout: 60_000 });
  assert.match(none.stderr, /refusing to resume .*differ from the original run: slots, kitArms\./, 'all slots is not the same selection as one slot');
});

// ---- Item 7: the build feedback of a kit run never shows installed code ------------------------

const SLOT = 'lib/of/discount.ts';
// What `next build` printed when a slot did not export the name an installed file imports (captured from a real
// build, shortened): it holds a code frame of the installed file handlers.ts.
const NEXT_EXPORT_ERROR = [
  '#11 5.104   Creating an optimized production build ...',
  '#11 10.83 ',
  '#11 10.83 > Build error occurred',
  '#11 10.83 Error: Turbopack build failed with 1 error:',
  '#11 10.83 ./lib/of/handlers.ts:4:1',
  "#11 10.83 Error: Export computeDiscount doesn't exist in target module",
  "#11 10.83   2 | import { parseCart } from './cart';",
  "#11 10.83 > 4 | import { computeDiscount } from './discount';",
  '#11 10.83     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^',
  "#11 10.83   5 | import { ledgerEntries } from './ledger';",
  '#11 10.83 ',
  '#11 10.83 The export computeDiscount was not found in module [project]/lib/of/discount.ts [app-route] (ecmascript).',
  '#11 10.83 Did you mean to import other?',
  '#11 10.83 ',
  '#11 10.83 Import trace:',
  '#11 10.83     ./lib/of/handlers.ts',
].join('\n');

test('a code frame of an installed file is removed from the build feedback, with a one-line note', () => {
  const shown = kitFeedbackText(NEXT_EXPORT_ERROR, SLOT);
  for (const code of ['import { parseCart }', 'import { computeDiscount }', 'import { ledgerEntries }', '^^^^']) assert.ok(!shown.includes(code), `no installed code: ${code}`);
  assert.match(shown, /The export computeDiscount was not found in module \[project\]\/lib\/of\/discount\.ts/);
  assert.match(shown, /Did you mean to import other\?/);
  assert.equal(shown.split('\n').filter((l) => l.startsWith('Note:')).length, 1);
  assert.match(shown, /Note: .*other files/);
});

test('type errors in the installed files are summarized by the note and the ones in the slot stay', () => {
  const out = [
    '#11 11.49 lib/of/handlers.ts(101,38): error TS2345: Argument of type \'number\' is not assignable to parameter of type \'string\'.',
    '#11 11.49 lib/of/discount.ts(6,9): error TS2322: Type \'number\' is not assignable to type \'string\'.',
    '#11 11.55 Failed to type check.',
  ].join('\n');
  const shown = kitFeedbackText(out, SLOT);
  assert.ok(!shown.includes('handlers.ts'));
  assert.ok(shown.includes('lib/of/discount.ts(6,9): error TS2322'));
  assert.match(shown, /Note: .*other files/);
});

test('an error in the slot file keeps its message and its own code frame, and adds no note', () => {
  const out = [
    '#11 9.0 ./lib/of/discount.ts:5:3',
    '#11 9.0 Parsing ecmascript source code failed',
    '#11 9.0   4 | export function computeDiscount() {',
    '#11 9.0 > 5 |   return (;',
    '#11 9.0     |           ^',
    '#11 9.0 ',
    '#11 9.0 Expression expected',
  ].join('\n');
  assert.equal(kitFeedbackText(out, SLOT), out);
});

test('a Python traceback keeps the frame of the slot and drops the source line of installed frames', () => {
  const slot = 'core/discount.py';
  const out = [
    'Traceback (most recent call last):',
    '  File "/app/core/views.py", line 41, in checkout',
    '    discount = compute_discount(subtotal, is_new)',
    '  File "/app/core/discount.py", line 6, in compute_discount',
    '    raise NotImplementedError("slot compute_discount is not implemented")',
    'NotImplementedError: slot compute_discount is not implemented',
  ].join('\n');
  const shown = kitFeedbackText(out, slot);
  assert.ok(!shown.includes('views.py') && !shown.includes('discount = compute_discount'));
  assert.ok(shown.includes('File "/app/core/discount.py", line 6'));
  assert.ok(shown.includes('raise NotImplementedError'));
  assert.ok(shown.includes('NotImplementedError: slot compute_discount is not implemented'));
});

test('output with no location in an installed file is returned unchanged', () => {
  const out = 'Checks: 3/4 passed\n- FAIL S2 discount\n    expected 1500000, got 0';
  assert.equal(kitFeedbackText(out, SLOT), out);
  assert.equal(kitFeedbackText('', SLOT), '');
});
