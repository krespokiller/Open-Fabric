import fs from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import path from 'node:path';
import { makeCtx, runSuite } from '../suites/lib.mjs';
import { tests as smoke } from '../suites/smoke.mjs';
import { tests as pub } from '../suites/public.mjs';
import { tests as hidden } from '../suites/hidden.mjs';
import { ROOT, sha256File } from './util.mjs';
import { SECRETS } from './runner.mjs';

export const SUITES = { smoke, public: pub, hidden };

export function suiteHashes() {
  return Object.fromEntries(['lib', 'smoke', 'public', 'hidden'].map((n) => [n, sha256File(path.join(ROOT, 'suites', `${n}.mjs`))]));
}

// One hash over everything that can change results: task, arm contexts, suites, harness and starting projects.
// The reference implementations (stacks/*/gold) are excluded: model runs never see them.
export function experimentHash() {
  const h = createHash('sha256');
  const files = [];
  const walk = (rel) => {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) return;
    if (fs.statSync(abs).isDirectory()) {
      for (const e of fs.readdirSync(abs).sort()) {
        if (['node_modules', '.venv', '__pycache__', '.next', 'target', 'vendor', 'gold'].includes(e)) continue;
        walk(path.join(rel, e));
      }
    } else files.push(rel);
  };
  for (const d of ['task', 'arms', 'suites', 'src', 'stacks']) walk(d);
  for (const f of files) {
    h.update(f.split(path.sep).join('/'));
    h.update(fs.readFileSync(path.join(ROOT, f)));
  }
  return h.digest('hex');
}

export async function judge(baseUrl, psp, suiteNames) {
  const run = randomBytes(3).toString('hex').toUpperCase();
  const results = [];
  for (const name of suiteNames) {
    const r = await runSuite(name, SUITES[name], (testId, signal) =>
      makeCtx({ base: baseUrl, adminKey: SECRETS.ADMIN_KEY, webhookSecret: SECRETS.WEBHOOK_SECRET, psp, prefix: `T${run}${testId}`, signal }),
    );
    results.push(...r);
  }
  return results;
}
