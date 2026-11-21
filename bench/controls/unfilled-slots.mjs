#!/usr/bin/env node
// Control "Empty" of the kit arms: the reference service with ONE slot left as its unfilled stub.
// It answers: what does an unfilled solution score, and is any slot correct by construction?
//
// This folder is outside the experiment hash on purpose (the hash covers task/, arms/, suites/, src/ and stacks/),
// so a control can be added or changed without changing the instrument. The script prints the hash before and after
// and exits 1 if it moved.
//
// From bench/:  node controls/unfilled-slots.mjs --stacks nextjs,django [--slots a,b] [--out results/<dir>] [--runtime docker]
// Exit code: 0 every control built, started and failed at least one test in each hidden suite;
//            1 a control is correct by construction, did not build or start, the hash moved, or the arguments are wrong;
//            2 an environment error (Docker, database).
// No hidden test id, name or expected value is printed or written: only counts.
// Each row is appended to <out>/unfilled-slots.csv as soon as its cell is judged. Running again with the same --out
// keeps those rows and skips their cells, but only if all of them carry the current experiment hash.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { InfraError, ROOT, writeJson } from '../src/util.mjs';
import { createWorkspace, listStacks, loadStack } from '../src/workspace.mjs';
import { startApp } from '../src/runner.mjs';
import { SUITES, experimentHash, judge } from '../src/judge.mjs';

export const SUITE_NAMES = ['smoke', 'public', 'hidden', 'hidden2']; // the order validate-gold uses
const HASHED_DIRS = ['task', 'arms', 'suites', 'src', 'stacks'];
export const CSV_HEADER = 'stack,slot,built,smoke_passed,smoke_total,public_passed,public_total,hidden_passed,hidden_total,hidden2_passed,hidden2_total,hash';
const CSV_COLUMNS = CSV_HEADER.split(',');

export class ControlArgError extends Error {}
export class ControlResumeError extends Error {}

const USAGE = `Usage: node controls/unfilled-slots.mjs [--stacks a,b] [--slots a,b] [--out DIR] [--runtime docker]
Default stacks: every stack that has slots. Default slots: every slot of the stack.`;

// What the stacks offer: every stack name and the slots of each (a stack without "kit" has none).
export function defaultCatalog() {
  const all = listStacks();
  return { all, slots: Object.fromEntries(all.map((s) => [s, Object.keys(loadStack(s).kit?.slots || {})])) };
}

const csvList = (text) => text.split(',').map((s) => s.trim()).filter(Boolean);

// Validates the command line before anything is built. Throws ControlArgError.
export function parseControlArgs(argv, catalog = defaultCatalog()) {
  let values;
  try {
    ({ values } = parseArgs({
      args: argv,
      options: {
        stacks: { type: 'string' }, slots: { type: 'string' }, out: { type: 'string' },
        runtime: { type: 'string', default: 'docker' }, help: { type: 'boolean', short: 'h' },
      },
    }));
  } catch (e) {
    throw new ControlArgError(`${e.message}\n${USAGE}`);
  }
  if (values.help) return { help: true };
  if (values.runtime !== 'docker') throw new ControlArgError(`unsupported --runtime "${values.runtime}": only docker is supported`);
  const withSlots = catalog.all.filter((s) => catalog.slots[s].length);
  const stacks = values.stacks === undefined ? withSlots : csvList(values.stacks);
  if (!stacks.length) throw new ControlArgError('no stacks selected');
  for (const s of stacks) {
    if (!catalog.all.includes(s)) throw new ControlArgError(`unknown stack "${s}" (known: ${catalog.all.join(', ')})`);
    if (!catalog.slots[s].length) throw new ControlArgError(`stack "${s}" has no slots, so it has no unfilled-slot control (stacks with slots: ${withSlots.join(', ')})`);
  }
  const wanted = values.slots === undefined ? null : csvList(values.slots);
  if (wanted) {
    if (!wanted.length) throw new ControlArgError('no slots selected');
    for (const slot of wanted) {
      if (!stacks.some((s) => catalog.slots[s].includes(slot))) {
        throw new ControlArgError(`unknown slot "${slot}" (slots of the selected stacks: ${[...new Set(stacks.flatMap((s) => catalog.slots[s]))].join(', ')})`);
      }
    }
  }
  const plan = stacks.flatMap((stack) => catalog.slots[stack].filter((slot) => !wanted || wanted.includes(slot)).map((slot) => ({ stack, slot })));
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const out = path.resolve(values.out ?? path.join(ROOT, 'results', `unfilled-slots-${stamp}`));
  for (const d of HASHED_DIRS) {
    const rel = path.relative(path.join(ROOT, d), out);
    if (rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))) {
      throw new ControlArgError(`--out is inside bench/${d}/, which is part of the experiment hash: use a folder under results/`);
    }
  }
  return { plan, out, runtime: values.runtime };
}

// Pass and total per suite, taken from the results of one judge call. Test ids and names are dropped here.
export function countsFromResults(results) {
  const counts = {};
  for (const name of SUITE_NAMES) {
    const own = results.filter((r) => r.suite === name);
    counts[`${name}_passed`] = own.filter((r) => r.pass).length;
    counts[`${name}_total`] = own.length;
  }
  return counts;
}

// A control that did not build or start ran nothing: every test counts as failed, with the suite's real total.
export function notBuiltCounts() {
  const counts = {};
  for (const name of SUITE_NAMES) {
    counts[`${name}_passed`] = 0;
    counts[`${name}_total`] = SUITES[name].length;
  }
  return counts;
}

// The rule of the exit code. Returns one line per problem (empty: the control says what it should).
export function controlProblems(row) {
  const who = `${row.stack}/${row.slot}`;
  if (!row.built) return [`${who}: did not build or start, so the control says nothing`];
  const problems = [];
  for (const name of ['hidden', 'hidden2']) {
    const passed = row[`${name}_passed`];
    const total = row[`${name}_total`];
    if (!total) problems.push(`${who}: no ${name} test ran, so the control says nothing`);
    else if (passed === total) problems.push(`${who}: passes ${name} in full (${passed}/${total}): the slot is correct by construction`);
  }
  return problems;
}

export const toCsvRow = (r) => CSV_COLUMNS.map((c) => String(r[c])).join(',');

export function toCsv(rows) {
  return [CSV_HEADER, ...rows.map(toCsvRow)].join('\n') + '\n';
}

const TEXT_COLUMNS = new Set(['stack', 'slot', 'hash']);

// Reads the CSV this script writes. Throws ControlResumeError on another header or a damaged row.
export function parseCsv(text) {
  const lines = text.split(/\r?\n/);
  while (lines.length && !lines.at(-1).trim()) lines.pop();
  if (!lines.length) return [];
  if (lines[0].trim() !== CSV_HEADER) throw new ControlResumeError('the existing CSV has another header, so it is not the output of this control');
  return lines.slice(1).map((line, i) => {
    const fail = (why) => new ControlResumeError(`the existing CSV has a damaged row at line ${i + 2} (${why})`);
    const parts = line.trim().split(',');
    if (parts.length !== CSV_COLUMNS.length) throw fail(`${parts.length} columns, expected ${CSV_COLUMNS.length}`);
    const out = {};
    CSV_COLUMNS.forEach((c, j) => {
      if (TEXT_COLUMNS.has(c)) out[c] = parts[j];
      else if (c === 'built') {
        if (parts[j] !== 'true' && parts[j] !== 'false') throw fail('built is not true or false');
        out[c] = parts[j] === 'true';
      } else {
        out[c] = Number(parts[j]);
        if (parts[j] === '' || !Number.isInteger(out[c]) || out[c] < 0) throw fail(`${c} is not a count`);
      }
    });
    return out;
  });
}

// The resume decision, pure: given the cells to run and the text of an existing CSV (null when there is none), says
// which rows are kept, which cells are skipped, which are left to run and whether the header must still be written.
// A row from another experiment hash is refused: a control cannot mix two instruments.
export function resumeState(plan, csvText, hash) {
  const parsed = csvText ? parseCsv(csvText) : [];
  const key = (r) => `${r.stack}/${r.slot}`;
  const other = parsed.filter((r) => r.hash !== hash);
  if (other.length) {
    throw new ControlResumeError(`the existing CSV holds rows with a different experiment hash (${[...new Set(other.map(key))].join(', ')}), so a control cannot mix two instruments. Use a new --out folder.`);
  }
  const latest = new Map(parsed.map((r) => [key(r), r])); // a later row for the same cell replaces an earlier one
  return {
    rows: [...latest.values()],
    skipped: plan.filter((p) => latest.has(key(p))),
    todo: plan.filter((p) => !latest.has(key(p))),
    needsHeader: !csvText || !csvText.trim(),
    endsWithNewline: !csvText || csvText.endsWith('\n'),
  };
}

export function formatTable(rows) {
  const cell = (r, name) => `${r[`${name}_passed`]}/${r[`${name}_total`]}`;
  const lines = rows.map((r) => [r.stack, r.slot, ...SUITE_NAMES.map((n) => cell(r, n)), r.built ? '' : 'NOT BUILT']);
  const head = ['stack', 'slot', ...SUITE_NAMES];
  const width = head.map((h, i) => Math.max(h.length, ...lines.map((l) => l[i].length)));
  const fmt = (cols) => cols.map((c, i) => (i < 2 ? c.padEnd(width[i]) : (c ?? '').padStart(width[i] ?? 0))).join('  ').trimEnd();
  return [fmt(head), ...lines.map(fmt)].join('\n') + '\n';
}

async function runControl({ stack: stackName, slot }, { out, runtime, hash }) {
  const stack = loadStack(stackName);
  const slotFile = stack.kit.slots[slot];
  const dir = path.join(out, stackName, slot);
  // Exactly what a kit run builds: reference installed, the slot file replaced by its unfilled stub.
  try {
    const workspace = createWorkspace(stack, path.join(dir, 'workspace'), { overlay: 'gold' });
    fs.copyFileSync(path.join(ROOT, 'arms', 'kit', stackName, slotFile), path.join(workspace, slotFile));
    process.stdout.write(`[${stackName}/${slot}] building and starting (${runtime})...\n`);
    const app = await startApp(stack, workspace, { runtime, workDir: path.join(dir, 'app') }); // throws InfraError
    const base = { stack: stackName, slot, hash };
    if (!app.ok) {
      process.stdout.write(`[${stackName}/${slot}] did not ${app.phase}: ${app.reason}\n`);
      fs.writeFileSync(path.join(dir, 'build-output.txt'), String(app.output || ''));
      return { ...base, built: false, ...notBuiltCounts() };
    }
    try {
      await app.psp.reset();
      const results = await judge(app.baseUrl, app.psp, SUITE_NAMES);
      return { ...base, built: true, ...countsFromResults(results) };
    } finally {
      await app.stop();
    }
  } finally {
    // The cell is judged (or failed): its workspace and app folder are not needed again, and a long control must not grow.
    for (const d of ['workspace', 'app']) fs.rmSync(path.join(dir, d), { recursive: true, force: true });
  }
}

export async function main(argv) {
  let args;
  try {
    args = parseControlArgs(argv);
  } catch (e) {
    if (!(e instanceof ControlArgError)) throw e;
    console.error(`Error: ${e.message}`);
    return 1;
  }
  if (args.help) {
    console.log(USAGE);
    return 0;
  }
  const hashBefore = experimentHash();
  console.log(`experiment hash before: ${hashBefore}`);
  const csvFile = path.join(args.out, 'unfilled-slots.csv');
  let state;
  try {
    state = resumeState(args.plan, fs.existsSync(csvFile) ? fs.readFileSync(csvFile, 'utf8') : null, hashBefore);
  } catch (e) {
    if (!(e instanceof ControlResumeError)) throw e;
    console.error(`Error: ${csvFile}: ${e.message}`);
    return 1;
  }
  fs.mkdirSync(args.out, { recursive: true });
  if (state.needsHeader) fs.writeFileSync(csvFile, `${CSV_HEADER}\n`);
  else if (!state.endsWithNewline) fs.appendFileSync(csvFile, '\n');
  for (const item of state.skipped) console.log(`[${item.stack}/${item.slot}] taken from the earlier run (already in unfilled-slots.csv)`);
  const rows = [...state.rows];
  let envError = null;
  try {
    for (const item of state.todo) {
      const r = await runControl(item, { out: args.out, runtime: args.runtime, hash: hashBefore });
      fs.appendFileSync(csvFile, `${toCsvRow(r)}\n`); // one row as soon as the cell is judged: a kill loses at most the cell in progress
      rows.push(r);
    }
  } catch (e) {
    envError = e;
  }
  if (rows.length) writeJson(path.join(args.out, 'meta.json'), { control: 'unfilled-slots', date: new Date().toISOString(), runtime: args.runtime, hash: hashBefore, rows: rows.length });
  console.log(`\n${rows.length ? formatTable(rows) : '(no control finished)\n'}`);
  const hashAfter = experimentHash();
  let code = 0;
  if (envError) {
    const kind = envError instanceof InfraError ? `environment error (${envError.kind})` : 'unexpected error';
    console.error(`${kind}: ${envError.message}`);
    code = 2;
  } else {
    const problems = rows.flatMap(controlProblems);
    for (const p of problems) console.error(`PROBLEM ${p}`);
    if (problems.length) code = 1;
  }
  if (hashAfter !== hashBefore) {
    console.error(`PROBLEM the experiment hash changed during the control (before ${hashBefore}, after ${hashAfter}): something wrote into a hashed folder`);
    if (!code) code = 1;
  }
  console.log(`experiment hash after:  ${hashAfter}${hashAfter === hashBefore ? ' (unchanged)' : ' (CHANGED)'}`);
  return code;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then((code) => process.exit(code), (e) => { console.error(`Error: ${e.message}`); process.exit(2); });
}
