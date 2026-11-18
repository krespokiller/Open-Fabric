// Fast checks for the kit arms (kit-bare, kit-tests). They need no Docker and no model.
// Run from bench/:  node --test test/kit.test.mjs
// The whole loop of a kit arm (build, checks, hidden suites) is covered by `selftest`.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from '../src/util.mjs';
import { applyChanges, createWorkspace, listFiles, loadStack } from '../src/workspace.mjs';
import { armSeesPublicTests, buildMessages, expandArm } from '../src/prompts.mjs';

const STACKS = ['nextjs', 'django'];
const SLOTS = ['discount', 'cart', 'signature', 'webhook', 'ledger'];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ofb-kit-test-'));
test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

// The project a kit run starts from: the skeleton, the reference on top, and the slot replaced by its stub.
function kitWorkspace(stack, slot) {
  const dir = fs.mkdtempSync(path.join(tmp, `${stack.name}-${slot}-`));
  createWorkspace(stack, dir, { overlay: 'gold' });
  const file = stack.kit.slots[slot];
  fs.copyFileSync(path.join(ROOT, 'arms', 'kit', stack.name, file), path.join(dir, file));
  return dir;
}

// Every command below must be refused before the first model call. The address is one nothing
// listens on, and the time limit ends the command, so a regression fails here without reaching a model.
const cli = (...args) =>
  spawnSync(process.execPath, [path.join(ROOT, 'src', 'cli.mjs'), ...args, '--runs', '1', '--base-url', 'http://127.0.0.1:9/v1'], {
    encoding: 'utf8',
    timeout: 20_000,
  });

test('every stack with a kit has a stub and a reference file for each of the five slots', () => {
  for (const name of STACKS) {
    const stack = loadStack(name);
    assert.deepEqual(Object.keys(stack.kit.slots), SLOTS);
    for (const file of Object.values(stack.kit.slots)) {
      assert.ok(fs.existsSync(path.join(stack.dir, 'gold', file)), `${name}: reference ${file}`);
      const stub = fs.readFileSync(path.join(ROOT, 'arms', 'kit', name, file), 'utf8');
      assert.match(stub, /SLOT: implement this function/, `${name}: stub ${file}`);
      assert.match(stub, /is not implemented/, `${name}: stub ${file} must fail until it is filled`);
    }
  }
});

test('kit-bare and kit-tests expand to one arm per slot, and --slots limits the slots', () => {
  const stack = loadStack('django');
  assert.deepEqual(expandArm(stack, 'kit-bare'), SLOTS.map((s) => `kit-bare.${s}`));
  assert.deepEqual(expandArm(stack, 'kit-tests', ['cart', 'discount']), ['kit-tests.discount', 'kit-tests.cart']);
  assert.deepEqual(expandArm(stack, 'kit-tests.ledger', ['cart']), ['kit-tests.ledger']);
  assert.deepEqual(expandArm(loadStack('spring'), 'kit-bare'), []);
});

test('arms that are not kit arms expand to themselves', () => {
  const stack = loadStack('nextjs');
  for (const arm of ['bare', 'docs', 'tests', 'of-spec', 'of-code']) assert.deepEqual(expandArm(stack, arm, ['cart']), [arm]);
});

test('only kit-tests sees the public tests', () => {
  assert.equal(armSeesPublicTests('kit-tests.cart'), true);
  assert.equal(armSeesPublicTests('kit-bare.cart'), false);
});

test('a kit run may write only its slot: every other write or delete is rejected', () => {
  for (const name of STACKS) {
    const stack = loadStack(name);
    const slot = stack.kit.slots.cart;
    const other = stack.kit.slots.ledger;
    const manifest = name === 'nextjs' ? 'package.json' : 'requirements.txt';
    const dir = kitWorkspace(stack, 'cart');
    const before = Object.fromEntries(listFiles(dir).map((f) => [f, fs.readFileSync(path.join(dir, f), 'utf8')]));
    const applied = applyChanges(
      dir,
      {
        files: [slot, other, manifest, 'notes/new.txt', slot.toUpperCase()].map((p) => ({ path: p, content: `filled ${p}\n` })),
        deletes: [other, 'README.md'],
      },
      { readOnly: stack.readOnly, writable: [slot] },
    );
    assert.deepEqual(applied.written, [slot], `${name}: only the slot is written`);
    assert.deepEqual(applied.deleted, []);
    assert.deepEqual(
      applied.rejected,
      // The slot path in another letter case is another file on a case-sensitive disk, so it is refused too.
      [other, manifest, 'notes/new.txt', slot.toUpperCase(), other, 'README.md'].map((p) => ({ path: p, why: 'read-only file' })),
    );
    const after = Object.fromEntries(listFiles(dir).map((f) => [f, fs.readFileSync(path.join(dir, f), 'utf8')]));
    assert.deepEqual(Object.keys(after), Object.keys(before), `${name}: no file added or removed`);
    for (const f of Object.keys(before)) assert.equal(after[f], f === slot ? `filled ${slot}\n` : before[f], `${name}: ${f}`);
  }
});

test('without an allow-list, writes behave as before: only the listed read-only files are rejected', () => {
  const stack = loadStack('django');
  const dir = fs.mkdtempSync(path.join(tmp, 'plain-'));
  createWorkspace(stack, dir);
  const applied = applyChanges(
    dir,
    { files: ['core/views.py', 'requirements.txt', 'notes/new.txt', 'Dockerfile'].map((p) => ({ path: p, content: 'x\n' })), deletes: ['README.md'] },
    { readOnly: stack.readOnly },
  );
  assert.deepEqual(applied.written, ['core/views.py', 'requirements.txt', 'notes/new.txt']);
  assert.deepEqual(applied.deleted, ['README.md']);
  assert.deepEqual(applied.rejected, [{ path: 'Dockerfile', why: 'read-only file' }]);
});

test('the kit prompt shows the slot contract and hides the installed code', () => {
  for (const name of STACKS) {
    const stack = loadStack(name);
    for (const slot of SLOTS) {
      const file = stack.kit.slots[slot];
      const dir = kitWorkspace(stack, slot);
      const stub = fs.readFileSync(path.join(dir, file), 'utf8');
      for (const base of ['kit-bare', 'kit-tests']) {
        const arm = `${base}.${slot}`;
        const [system, user] = buildMessages({ stack, arm, workspace: dir, feedback: '', attempt: 1, budget: 6 }).map((m) => m.content);
        assert.ok(user.includes(`=== ${file} ===\n${stub}`), `${name} ${arm}: the stub with its contract is shown`);
        assert.ok(user.includes(fs.readFileSync(path.join(ROOT, 'task', 'task.md'), 'utf8')), `${name} ${arm}: the task is shown`);
        for (const installed of listFiles(path.join(stack.dir, 'gold'))) {
          const reference = fs.readFileSync(path.join(stack.dir, 'gold', installed), 'utf8');
          if (reference.trim().length < 40) continue; // empty package markers say nothing
          assert.ok(!user.includes(reference.trim()), `${name} ${arm}: the reference ${installed} must not be in the prompt`);
          if (installed !== file) assert.ok(!user.includes(`=== ${installed} ===`), `${name} ${arm}: ${installed} must be listed without contents`);
        }
        assert.equal(user.includes('# Automatic tests'), base === 'kit-tests', `${name} ${arm}: public tests only in kit-tests`);
        // Every write outside the slot is rejected, so the prompt must not invite any.
        assert.ok(system.includes(`Read-only files (do not write them): every file except ${file}.`), `${name} ${arm}: read-only rule`);
        assert.ok(!system.includes('You may change dependency manifests'), `${name} ${arm}: no invitation to change manifests`);
      }
    }
  }
});

test('the prompt of an arm that is not a kit arm still shows every project file and the usual read-only rule', () => {
  for (const name of STACKS) {
    const stack = loadStack(name);
    const dir = fs.mkdtempSync(path.join(tmp, `${name}-plain-`));
    createWorkspace(stack, dir);
    const [system, user] = buildMessages({ stack, arm: 'tests', workspace: dir, feedback: '', attempt: 1, budget: 6 }).map((m) => m.content);
    assert.ok(system.includes('Read-only files (do not write them): Dockerfile, .dockerignore. You may change dependency manifests if you need a library.'));
    assert.ok(!user.includes('contents omitted'));
    assert.ok(!user.includes('# Your job: one function'));
    for (const f of listFiles(dir, stack.snapshotIgnore)) assert.ok(user.includes(`- ${f}`), `${name}: ${f} is in the tree`);
  }
});

test('--slots with a slot no selected stack has is refused before anything is written', () => {
  const out = path.join(tmp, 'out-unknown-slot');
  const r = cli('run', '--model', 'x', '--stacks', 'nextjs,django', '--arms', 'kit-bare,kit-tests', '--slots', 'discount,nope', '--out', out);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Error: unknown slot nope \(slots in the selected stacks: discount, cart, signature, webhook, ledger\)/);
  assert.equal(fs.existsSync(out), false, 'no results directory');
});

test('a kit arm that names a slot no selected stack has is refused', () => {
  const out = path.join(tmp, 'out-unknown-arm-slot');
  const r = cli('run', '--model', 'x', '--stacks', 'django', '--arms', 'bare,kit-tests.nope', '--out', out);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Error: unknown slot nope \(slots in the selected stacks: discount, cart, signature, webhook, ledger\)/);
  assert.equal(fs.existsSync(out), false, 'no results directory');
});

test('--slots without kit-bare or kit-tests is refused instead of being ignored', () => {
  for (const arms of ['bare,tests', 'kit-tests.discount']) {
    const out = path.join(tmp, `out-slots-${arms.replace(/\W/g, '-')}`);
    const r = cli('run', '--model', 'x', '--stacks', 'django', '--arms', arms, '--slots', 'discount', '--out', out);
    assert.equal(r.status, 1, arms);
    assert.match(r.stderr, /Error: --slots only applies to the arms kit-bare and kit-tests given without a slot/, arms);
    assert.equal(fs.existsSync(out), false, 'no results directory');
  }
});

test('kit arms on stacks without slots are refused', () => {
  const out = path.join(tmp, 'out-no-kit');
  const r = cli('run', '--model', 'x', '--stacks', 'spring,laravel', '--arms', 'kit-bare', '--out', out);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Error: none of the selected stacks \(spring, laravel\) has kit slots/);
  assert.equal(fs.existsSync(out), false, 'no results directory');
});

test('the selftest still starts on a stack without slots', () => {
  // The native runtime without a database address stops at the first build, which is past the arm checks
  // and needs neither Docker nor a model.
  const env = { ...process.env };
  delete env.OF_PG_ADMIN_URL;
  const r = spawnSync(process.execPath, [path.join(ROOT, 'src', 'cli.mjs'), 'selftest', '--stacks', 'spring', '--runtime', 'native', '--out', path.join(tmp, 'out-selftest-spring')], {
    encoding: 'utf8',
    env,
    timeout: 20_000,
  });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Error: native runtime needs --pg-admin-url/);
  assert.match(r.stdout, /\[spring \/ bare \/ run 1\/1\]/);
});

test('an unknown arm is still refused, kit or not', () => {
  for (const arm of ['kit', 'kit-code.discount', 'bare.discount', 'nope']) {
    const r = cli('run', '--model', 'x', '--stacks', 'django', '--arms', arm, '--out', path.join(tmp, 'out-unknown-arm'));
    assert.equal(r.status, 1, arm);
    assert.match(r.stderr, new RegExp(`Error: unknown arm ${arm.replace('.', '\\.')}`), arm);
  }
});
