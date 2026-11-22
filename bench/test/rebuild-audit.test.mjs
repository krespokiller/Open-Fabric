// Fast checks for bench/controls/rebuild-audit.mjs. They need no Docker and no model: the build is a fake.
// Run from bench/:  node --test test/rebuild-audit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { InfraError, ROOT } from '../src/util.mjs';
import { CSV_HEADER, auditRuns, cleanReason, makeBuildAndStart, main, selectRuns } from '../controls/rebuild-audit.mjs';

const SCRIPT = path.join(ROOT, 'controls', 'rebuild-audit.mjs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ofb-rebuild-audit-test-'));
test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

let counter = 0;
// Makes <tmp>/case-N/runs with the given run folders: { name: metrics | null }. null means no metrics.json.
function makeRuns(spec) {
  const base = path.join(tmp, `case-${++counter}`);
  const runs = path.join(base, 'runs');
  for (const [name, metrics] of Object.entries(spec)) {
    const dir = path.join(runs, name);
    fs.mkdirSync(path.join(dir, 'workspace', 'src'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'app'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'workspace', 'src', 'index.js'), 'console.log(1)\n');
    fs.writeFileSync(path.join(dir, 'transcript.jsonl'), '{}\n');
    if (metrics) fs.writeFileSync(path.join(dir, 'metrics.json'), JSON.stringify(metrics));
  }
  return { base, runs };
}

const failed = (over = {}) => ({ builtFinal: false, attempts: [{ built: true }, { built: true }, { built: false }], finalBuildError: 'docker compose up failed', ...over });
const listing = (dir) => {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { out.push(`${path.relative(dir, p)}/`); walk(p); } else out.push(`${path.relative(dir, p)} ${fs.statSync(p).size}`);
    }
  };
  walk(dir);
  return out;
};
const quiet = { log: () => {}, error: () => {} };
const BUILT = async () => ({ ok: true });
const BROKEN = async () => ({ ok: false, output: 'Error: Cannot find module x' });

test('only runs with builtFinal === false are audited; a folder without metrics.json is skipped and the rest are counted', () => {
  const { runs } = makeRuns({
    'nextjs__kit-tests.signature__1': failed(),
    'nextjs__bare__2': { builtFinal: true, attempts: [{ built: true }] },
    'nextjs__bare__3': { attempts: [] },
    'django__bare__1': null,
    'django__bare__2': failed(),
  });
  const sel = selectRuns(runs);
  assert.deepEqual(sel.audit.map((r) => r.name), ['django__bare__2', 'nextjs__kit-tests.signature__1']);
  assert.equal(sel.skipped, 2);
});

test('arm and slot are split from the arm name, and built_per_attempt has one digit per attempt', async () => {
  const { runs } = makeRuns({ 'nextjs__kit-tests.signature__4': failed(), 'django__bare__1': failed({ attempts: [{ built: true }, { built: true }, { built: true }, { built: true }, { built: true }, { built: false }] }) });
  const rows = await auditRuns(selectRuns(runs).audit, BROKEN, { hash: 'h1' });
  const a = rows.find((r) => r.stack === 'nextjs');
  assert.deepEqual([a.stack, a.arm, a.slot, a.run, a.attempts, a.built_per_attempt, a.recorded_error, a.hash], ['nextjs', 'kit-tests', 'signature', '4', 3, '110', 'docker compose up failed', 'h1']);
  const b = rows.find((r) => r.stack === 'django');
  assert.deepEqual([b.arm, b.slot, b.built_per_attempt], ['bare', '', '111110']);
});

test('a fake that builds reads machine failure with exit code 1', async () => {
  const { runs, base } = makeRuns({ 'nextjs__bare__1': failed() });
  const rows = await auditRuns(selectRuns(runs).audit, BUILT, { hash: 'h' });
  assert.equal(rows[0].audit_built, true);
  assert.equal(rows[0].audit_reason, '');
  assert.equal(rows[0].reading, 'machine failure');
  const code = await main(['--runs', runs], { buildAndStart: BUILT, hash: 'h', ...quiet });
  assert.equal(code, 1);
  assert.equal(fs.existsSync(path.join(base, 'rebuild-audit.csv')), true);
});

test('a fake that fails reads model error with exit code 0, and the CSV has the documented header and one row', async () => {
  const { runs, base } = makeRuns({ 'nextjs__bare__1': failed(), 'nextjs__bare__2': { builtFinal: true, attempts: [] } });
  const lines = [];
  const code = await main(['--runs', runs], { buildAndStart: BROKEN, hash: 'h', log: (s) => lines.push(s), error: () => {} });
  assert.equal(code, 0);
  const csv = fs.readFileSync(path.join(base, 'rebuild-audit.csv'), 'utf8').trimEnd().split('\n');
  assert.equal(csv[0], 'stack,arm,slot,run,attempts,built_per_attempt,recorded_error,audit_built,audit_reason,reading,hash');
  assert.equal(csv[0], CSV_HEADER);
  assert.equal(csv.length, 2);
  assert.equal(csv[1], 'nextjs,bare,,1,3,110,docker compose up failed,false,Error: Cannot find module x,model error,h');
  assert.equal(lines.at(-1), 'audited 1, machine failures 0, model errors 1, skipped 1');
});

test('--csv chooses the file, and the CSV is rewritten whole each execution', async () => {
  const { runs, base } = makeRuns({ 'nextjs__bare__1': failed() });
  const file = path.join(base, 'custom.csv');
  fs.writeFileSync(file, 'old junk\n'.repeat(5));
  await main(['--runs', runs, '--csv', file], { buildAndStart: BROKEN, hash: 'h', ...quiet });
  await main(['--runs', runs, '--csv', file], { buildAndStart: BROKEN, hash: 'h', ...quiet });
  assert.equal(fs.readFileSync(file, 'utf8').trimEnd().split('\n').length, 2);
});

test('audit_reason loses absolute paths, commas and line breaks, and is cut to 160 characters', () => {
  const r = cleanReason('\n  \nError: cannot open C:\\Users\\someone\\proj\\file.js, then /var/lib/app/x.js\r\nsecond line');
  assert.equal(r, 'Error: cannot open <path> then <path>');
  assert.ok(!/[,\r\n]/.test(r));
  assert.equal(cleanReason('E'.repeat(500)).length, 160);
  assert.equal(cleanReason('a,b\nc'), 'ab');
  assert.equal(cleanReason(''), '');
});

test('the first meaningful error line is chosen from the failure output', async () => {
  const { runs } = makeRuns({ 'nextjs__bare__1': failed() });
  const fake = async () => ({ ok: false, output: ' \n#1 [internal] load build definition\nnpm ERR! code E404, not found\nmore' });
  const [row] = await auditRuns(selectRuns(runs).audit, fake, { hash: 'h' });
  assert.equal(row.audit_reason, 'npm ERR! code E404 not found');
});

test('the run folder is byte-identical after the audit', async () => {
  const { runs } = makeRuns({ 'nextjs__bare__1': failed(), 'django__bare__1': failed() });
  const before = listing(runs);
  await main(['--runs', runs], { buildAndStart: BUILT, hash: 'h', ...quiet });
  await main(['--runs', runs], { buildAndStart: BROKEN, hash: 'h', ...quiet });
  assert.deepEqual(listing(runs), before);
});

test('an InfraError stops the whole audit with exit code 2 and one message line, and writes no CSV', async () => {
  const { runs, base } = makeRuns({ 'nextjs__bare__1': failed(), 'django__bare__1': failed() });
  let calls = 0;
  const errs = [];
  const infra = async () => { calls += 1; throw new InfraError('docker', 'out of memory\nsecond line'); };
  const code = await main(['--runs', runs], { buildAndStart: infra, hash: 'h', log: () => {}, error: (s) => errs.push(s) });
  assert.equal(code, 2);
  assert.equal(calls, 1);
  assert.equal(errs.length, 1);
  assert.ok(!errs[0].includes('\n'));
  assert.match(errs[0], /docker/);
  assert.equal(fs.existsSync(path.join(base, 'rebuild-audit.csv')), false);
});

test('missing --runs, an unknown option or a missing directory give exit code 2 with a usage line', async () => {
  const errs = [];
  const opts = { buildAndStart: BUILT, hash: 'h', log: () => {}, error: (s) => errs.push(s) };
  assert.equal(await main([], opts), 2);
  assert.match(errs.join('\n'), /Usage: node controls\/rebuild-audit\.mjs --runs/);
  assert.equal(await main(['--bogus'], opts), 2);
  assert.equal(await main(['--runs', path.join(tmp, 'nope')], opts), 2);
});

test('the real wrapper copies the workspace to a temp directory, passes temp paths to the runner, stops the app and cleans up', async () => {
  const { runs } = makeRuns({ 'nextjs__bare__1': failed() });
  const seen = {};
  let stopped = 0;
  const fakeStart = async (stack, workspace, o) => {
    Object.assign(seen, { stack: stack.name, workspace, workDir: o.workDir, runtime: o.runtime, copied: fs.existsSync(path.join(workspace, 'src', 'index.js')) });
    return { ok: true, stop: async () => { stopped += 1; } };
  };
  const build = makeBuildAndStart({ startApp: fakeStart, loadStack: (name) => ({ name }) });
  const before = listing(runs);
  const [run] = selectRuns(runs).audit;
  const res = await build(run);
  assert.equal(res.ok, true);
  assert.equal(stopped, 1);
  assert.equal(seen.stack, 'nextjs');
  assert.equal(seen.runtime, 'docker');
  assert.equal(seen.copied, true);
  for (const p of [seen.workspace, seen.workDir]) assert.ok(path.resolve(p).startsWith(path.resolve(os.tmpdir()) + path.sep), p);
  assert.ok(!path.resolve(seen.workspace).startsWith(path.resolve(runs)));
  assert.equal(fs.existsSync(seen.workspace), false, 'temp directory removed');
  assert.deepEqual(listing(runs), before);
  // On failure the temp directory is removed as well, and a failed start is reported, not thrown.
  const failing = makeBuildAndStart({ startApp: async (s, w, o) => { seen.ws2 = w; return { ok: false, phase: 'build', reason: 'x', output: 'boom' }; }, loadStack: (name) => ({ name }) });
  const bad = await failing(run);
  assert.equal(bad.ok, false);
  assert.equal(fs.existsSync(seen.ws2), false);
});

test('the script without arguments prints the usage line and exits 2', () => {
  const r = spawnSync(process.execPath, [SCRIPT], { cwd: ROOT, encoding: 'utf8', timeout: 20000 });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Usage: node controls\/rebuild-audit\.mjs --runs/);
});
