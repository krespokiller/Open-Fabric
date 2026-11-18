import fs from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import path from 'node:path';
import { makeCtx, runSuite } from '../suites/lib.mjs';
import { tests as smoke } from '../suites/smoke.mjs';
import { tests as pub } from '../suites/public.mjs';
import { tests as hidden } from '../suites/hidden.mjs';
import { tests as hidden2 } from '../suites/hidden2.mjs';
import { ROOT, sha256File } from './util.mjs';
import { SECRETS } from './runner.mjs';

// hidden is the primary judge. hidden2 was written independently, from task/task.md only,
// without seeing the piece or hidden.mjs; it is reported as a separate score.
export const SUITES = { smoke, public: pub, hidden, hidden2 };

export function suiteHashes() {
  return Object.fromEntries(['lib', 'smoke', 'public', 'hidden', 'hidden2'].map((n) => [n, sha256File(path.join(ROOT, 'suites', `${n}.mjs`))]));
}

// A text file is hashed with CRLF turned into LF, so one commit gives one hash on a checkout with LF and on one with
// CRLF (Windows with core.autocrlf). A file with a NUL byte is binary and is hashed as it is.
function hashableBytes(buf) {
  if (buf.includes(0)) return buf;
  return Buffer.from(buf.toString('latin1').replace(/\r\n/g, '\n'), 'latin1');
}

// One hash over everything that can change results: task, arm contexts, suites, harness, starting projects and the
// reference implementations (stacks/*/gold), because the kit arms install the reference into the workspace.
// Only dependency and build folders are skipped. `root` is the bench folder; tests pass a small copy of it.
export function experimentHash(root = ROOT) {
  const h = createHash('sha256');
  const files = [];
  const walk = (rel) => {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) return;
    if (fs.statSync(abs).isDirectory()) {
      for (const e of fs.readdirSync(abs).sort()) {
        if (['node_modules', '.venv', '__pycache__', '.next', 'target', 'vendor'].includes(e)) continue;
        walk(path.join(rel, e));
      }
    } else files.push(rel);
  };
  for (const d of ['task', 'arms', 'suites', 'src', 'stacks']) walk(d);
  for (const f of files) {
    h.update(f.split(path.sep).join('/'));
    h.update(hashableBytes(fs.readFileSync(path.join(root, f))));
  }
  return h.digest('hex');
}

// With stopAtFirstFailure the judge ends at the first failing test of any suite: later suites do not run.
export async function judge(baseUrl, psp, suiteNames, { stopAtFirstFailure = false } = {}) {
  const run = randomBytes(3).toString('hex').toUpperCase();
  const results = [];
  for (const name of suiteNames) {
    const r = await runSuite(name, SUITES[name], (testId, signal) =>
      makeCtx({ base: baseUrl, adminKey: SECRETS.ADMIN_KEY, webhookSecret: SECRETS.WEBHOOK_SECRET, psp, prefix: `T${run}${testId}`, signal }),
      { stopAtFirstFailure },
    );
    results.push(...r);
    if (stopAtFirstFailure && r.some((t) => !t.pass)) break;
  }
  return results;
}

// The hidden judgement of one attempt, recorded in metrics.json and never shown to the model. It runs on the app
// instance the visible checks just used (the same order validate-gold runs, so the reference passes), after the
// logs for the model were read. A missing app is a failed judgement that ran nothing.
export const NOT_JUDGED = Object.freeze({ judgeCorrect: false, judgeTestsRun: 0, judgeFirstFail: null, judgeMs: 0 });

export async function judgeAttempt(app) {
  if (!app.ok) return { ...NOT_JUDGED };
  const started = Date.now();
  await app.psp.reset();
  const results = await judge(app.baseUrl, app.psp, ['hidden', 'hidden2'], { stopAtFirstFailure: true });
  const failed = results.find((r) => !r.pass);
  return {
    judgeCorrect: !failed,
    judgeTestsRun: results.length,
    judgeFirstFail: failed ? { suite: failed.suite, id: failed.id } : null,
    judgeMs: Date.now() - started,
  };
}

// Run-level view of the per-attempt judgement. `finalCorrect` is whether the final judgement (fresh build, empty
// database, every test) passed every test of both hidden suites; the judge gave two answers on the same code when the
// last attempt disagrees with it.
export function runLevelJudgement(attempts, finalCorrect) {
  const first = attempts.find((a) => a.judgeCorrect);
  return {
    firstAttemptCorrect: Boolean(attempts[0]?.judgeCorrect),
    firstCorrectAttempt: first ? first.attempt : null,
    lastAttemptAgreesWithFinal: attempts.length ? Boolean(attempts[attempts.length - 1].judgeCorrect) === Boolean(finalCorrect) : null,
  };
}
