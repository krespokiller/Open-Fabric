#!/usr/bin/env node
// Audit of the runs that ended without a build: the final workspace is built and started again with the harness's own
// function (startApp), then stopped. If it builds and starts, the recorded failure was the machine's ("machine failure")
// and the run is repeated; if it fails again, it was the model's ("model error").
//
// From bench/:  node controls/rebuild-audit.mjs --runs <directory with run folders> [--csv <file>]
// Exit code: 0 no audited run reads "machine failure"; 1 at least one does; 2 bad arguments, a missing directory or an InfraError
//            (an unrecognised machine problem must not be classified).
// It never changes a run folder: each workspace is copied to a fresh temp directory and the build runs from the copy.
// Like the other controls it lives outside the experiment hash and only imports from src/.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { InfraError } from '../src/util.mjs';
import { loadStack } from '../src/workspace.mjs';
import { startApp } from '../src/runner.mjs';
import { experimentHash } from '../src/judge.mjs';

export const CSV_HEADER = 'stack,arm,slot,run,attempts,built_per_attempt,recorded_error,audit_built,audit_reason,reading,hash';
const CSV_COLUMNS = CSV_HEADER.split(',');
const USAGE = 'Usage: node controls/rebuild-audit.mjs --runs <directory that contains run folders> [--csv <file>]';
const MAX_REASON = 160;

class ArgError extends Error {}

// No commas, no line breaks, no absolute paths, one line at most MAX_REASON characters.
function tidy(text) {
  return String(text ?? '')
    .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
    .replace(/[A-Za-z]:[\\/][^\s,;"')\]]*/g, '<path>')
    .replace(/(?<![\w:/.<])\/(?:[\w.@+~-]+\/)*[\w.@+~-]+/g, '<path>')
    .replace(/[,\r\n]/g, '')
    .trim()
    .slice(0, MAX_REASON);
}

// The first meaningful error line of a failure output: the first line that names an error, else the first non-empty line.
export function cleanReason(output) {
  const lines = String(output ?? '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const line = lines.find((l) => /\b(err(or)?s?|fail(ed|ure)?|cannot|can't|not found|denied|refused|exception)\b/i.test(l)) ?? lines[0] ?? '';
  return tidy(line);
}

// Splits a run folder name "<stack>__<arm>__<n>" and an arm "<arm>.<slot>".
function parseName(name) {
  const parts = name.split('__');
  const stack = parts[0];
  const run = parts.length > 1 ? parts.at(-1) : '';
  const armFull = parts.slice(1, -1).join('__');
  const dot = armFull.indexOf('.');
  return { stack, arm: dot < 0 ? armFull : armFull.slice(0, dot), slot: dot < 0 ? '' : armFull.slice(dot + 1), run };
}

// Run folders whose final state did not build, in name order, and how many finished runs were not audited.
export function selectRuns(dir) {
  const audit = [];
  let skipped = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!e.isDirectory()) continue;
    const runDir = path.join(dir, e.name);
    const file = path.join(runDir, 'metrics.json');
    if (!fs.existsSync(file)) continue; // unfinished run
    let metrics;
    try {
      metrics = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      continue; // damaged or half-written: not a finished run
    }
    if (metrics.builtFinal === false) audit.push({ name: e.name, dir: runDir, metrics, ...parseName(e.name) });
    else skipped += 1;
  }
  return { audit, skipped };
}

// The pure core: one row per run. buildAndStart(run) resolves { ok, reason?, output? } and may throw InfraError.
export async function auditRuns(runs, buildAndStart, { hash }) {
  const rows = [];
  for (const run of runs) {
    const attempts = Array.isArray(run.metrics.attempts) ? run.metrics.attempts : [];
    const res = await buildAndStart(run);
    const ok = res.ok === true;
    rows.push({
      stack: run.stack, arm: run.arm, slot: run.slot, run: run.run,
      attempts: attempts.length,
      built_per_attempt: attempts.map((a) => (a && a.built ? '1' : '0')).join(''),
      recorded_error: tidy(run.metrics.finalBuildError),
      audit_built: ok,
      audit_reason: ok ? '' : cleanReason(res.output || res.reason),
      reading: ok ? 'machine failure' : 'model error',
      hash,
    });
  }
  return rows;
}

// The real build: copy the workspace to a temp directory, build and start from the copy with the harness function,
// stop it, and remove the temp directory, also on failure. startApp writes only to workDir, which is inside the temp directory.
export function makeBuildAndStart({ startApp: start = startApp, loadStack: load = loadStack } = {}) {
  return async (run) => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ofb-rebuild-audit-'));
    try {
      const workspace = path.join(tmp, 'workspace');
      fs.cpSync(path.join(run.dir, 'workspace'), workspace, { recursive: true });
      const app = await start(load(run.stack), workspace, { runtime: 'docker', workDir: path.join(tmp, 'app') }); // throws InfraError
      if (!app.ok) return { ok: false, reason: app.reason, output: app.output };
      await app.stop();
      return { ok: true };
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  };
}

export const toCsvRow = (r) => CSV_COLUMNS.map((c) => String(r[c])).join(',');
export const toCsv = (rows) => [CSV_HEADER, ...rows.map(toCsvRow)].join('\n') + '\n';

export function formatTable(rows) {
  const head = ['stack', 'arm', 'slot', 'run', 'attempts', 'built_per_attempt', 'audit_built', 'reading'];
  const lines = rows.map((r) => [r.stack, r.arm, r.slot, r.run, String(r.attempts), r.built_per_attempt, String(r.audit_built), r.reading]);
  const width = head.map((h, i) => Math.max(h.length, ...lines.map((l) => l[i].length)));
  const fmt = (cols) => cols.map((c, i) => c.padEnd(width[i])).join('  ').trimEnd();
  return [fmt(head), ...lines.map(fmt)].join('\n');
}

function parseCliArgs(argv) {
  let values;
  try {
    ({ values } = parseArgs({ args: argv, options: { runs: { type: 'string' }, csv: { type: 'string' } } }));
  } catch (e) {
    throw new ArgError(`${e.message}\n${USAGE}`);
  }
  if (!values.runs) throw new ArgError(`--runs is required\n${USAGE}`);
  const runs = path.resolve(values.runs);
  if (!fs.existsSync(runs) || !fs.statSync(runs).isDirectory()) throw new ArgError(`--runs ${values.runs} is not a directory\n${USAGE}`);
  return { runs, csv: path.resolve(values.csv ?? path.join(path.dirname(runs), 'rebuild-audit.csv')) };
}

export async function main(argv, { buildAndStart = makeBuildAndStart(), hash, log = console.log, error = console.error } = {}) {
  let args;
  try {
    args = parseCliArgs(argv);
  } catch (e) {
    if (!(e instanceof ArgError)) throw e;
    error(`Error: ${e.message}`);
    return 2;
  }
  const { audit, skipped } = selectRuns(args.runs);
  let rows;
  try {
    rows = await auditRuns(audit, buildAndStart, { hash: hash ?? await experimentHash() });
  } catch (e) {
    if (!(e instanceof InfraError)) throw e;
    error(`environment error (${e.kind}): ${String(e.message).split(/\r?\n/)[0]}; the audit stopped and classified nothing more`);
    return 2;
  }
  fs.writeFileSync(args.csv, toCsv(rows));
  const machine = rows.filter((r) => r.reading === 'machine failure').length;
  if (rows.length) log(formatTable(rows));
  log(`audited ${rows.length}, machine failures ${machine}, model errors ${rows.length - machine}, skipped ${skipped}`);
  return machine ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then((code) => process.exit(code), (e) => { console.error(`Error: ${e.message}`); process.exit(2); });
}
