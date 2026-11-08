// Runs the experiment matrix: stacks x arms x runs. One run = one stateless agent loop
// with a fixed maximum budget of model calls, followed by the hidden suite on a fresh start.
//
// Stop rule (identical for every arm): a run stops when every check the arm can see passes,
// or when the budget is used up. Arms that see more checks (tests, of-spec, of-code) can
// therefore use more calls; the `tests` arm isolates that effect from the effect of the piece.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { InfraError, ROOT, readJson, sh, tail, writeJson } from './util.mjs';
import { loadStack, createWorkspace, applyChanges, listFiles } from './workspace.mjs';
import { ARMS, DEFAULT_ARMS, armApplies, armSeesPublicTests, buildMessages } from './prompts.mjs';
import { chat } from './model.mjs';
import { parseAnswer } from './protocol.mjs';
import { startApp } from './runner.mjs';
import { judge, suiteHashes, experimentHash } from './judge.mjs';
import { startPsp } from './psp.mjs';
import { writeReport } from './report.mjs';

function formatFeedback({ applied, parsed, app, visible, logs }) {
  const out = [];
  if (parsed.truncated) out.push(`WARNING: your answer ended inside the file "${parsed.truncated}". That file was not written. Write fewer or shorter files per answer.`);
  if (parsed.malformed.length) out.push(`WARNING: these blocks were not closed with >>>FILE before the next <<<FILE: ${parsed.malformed.join(', ')}. Close every block.`);
  if (applied.rejected.length) out.push(`Rejected changes: ${applied.rejected.map((r) => `${r.path} (${r.why})`).join(', ')}.`);
  if (!applied.written.length && !applied.deleted.length) out.push('Your previous answer changed no files. Use the exact <<<FILE ... >>>FILE format.');
  else out.push(`Files written in the previous attempt: ${applied.written.join(', ') || 'none'}${applied.deleted.length ? `; deleted: ${applied.deleted.join(', ')}` : ''}.`);
  if (!app.ok) {
    out.push(`BUILD/START: failed during ${app.phase}: ${app.reason}\nOutput (last lines):\n${app.output}`);
    return out.join('\n\n');
  }
  const failed = visible.filter((r) => !r.pass);
  out.push(`BUILD/START: ok\nChecks: ${visible.length - failed.length}/${visible.length} passed`);
  for (const r of visible) out.push(`- ${r.pass ? 'PASS' : 'FAIL'} ${r.id} ${r.name}${r.pass ? '' : `\n    ${r.error}`}`);
  if (failed.length && logs) out.push(`App log (last lines):\n${tail(logs, 60)}`);
  return out.join('\n');
}

function readOnlyFor(stack, arm) {
  const ro = [...(stack.readOnly || [])];
  if (arm === 'of-code') {
    // The installed piece is verified code: the agent may only fill the slot.
    for (const f of listFiles(path.join(ROOT, stack.codePiece.dir))) if (f !== stack.codePiece.slotFile) ro.push(f);
  }
  return ro;
}

async function runOne({ stack, arm, runIndex, opts, localPsp, runDir, params }) {
  fs.rmSync(runDir, { recursive: true, force: true });
  const workspace = path.join(runDir, 'workspace');
  const overlay = arm === 'of-code' ? path.join(ROOT, stack.codePiece.dir) : null;
  createWorkspace(stack, workspace, { overlay });
  const transcript = path.join(runDir, 'transcript.jsonl');
  const visibleSuites = armSeesPublicTests(arm) ? ['smoke', 'public'] : ['smoke'];
  const readOnly = readOnlyFor(stack, arm);
  const appOpts = { runtime: opts.runtime, workDir: path.join(runDir, 'app'), pgAdminUrl: opts.pgAdminUrl, localPsp };
  const metrics = {
    stack: stack.name, arm, run: runIndex, params,
    calls: 0, promptTokens: 0, completionTokens: 0, promptEstimate: 0, tokensEstimated: false, suspiciousUsageCalls: 0,
    modelMs: 0, buildMs: 0, attempts: [], stopReason: 'budget', builtFinal: false, hidden: [], startedAt: new Date().toISOString(),
  };
  const started = Date.now();
  let feedback = '';
  for (let attempt = 1; attempt <= opts.budget; attempt++) {
    const messages = buildMessages({ stack, arm, workspace, feedback, attempt, budget: opts.budget });
    const answer = await chat({ ...opts.modelConfig, messages, seed: runIndex * 1000 + attempt }); // throws InfraError
    metrics.calls++;
    metrics.promptTokens += answer.promptTokens;
    metrics.completionTokens += answer.completionTokens;
    metrics.promptEstimate += answer.promptEstimate;
    metrics.tokensEstimated ||= answer.estimated;
    if (answer.suspicious) metrics.suspiciousUsageCalls++;
    metrics.modelMs += answer.ms;
    fs.appendFileSync(transcript, JSON.stringify({ attempt, messages, answer }) + '\n');

    const parsed = parseAnswer(answer.content);
    const applied = applyChanges(workspace, parsed, { readOnly });
    const app = await startApp(stack, workspace, appOpts); // throws InfraError
    metrics.buildMs += app.buildMs || 0;
    let visible = [];
    let logs = '';
    if (app.ok) {
      try {
        await app.psp.reset();
        visible = await judge(app.baseUrl, app.psp, visibleSuites);
        if (visible.some((r) => !r.pass)) logs = await app.logs();
      } finally {
        await app.stop();
      }
    }
    const passed = visible.filter((r) => r.pass).length;
    metrics.attempts.push({
      attempt, promptTokens: answer.promptTokens, completionTokens: answer.completionTokens, promptEstimate: answer.promptEstimate,
      finishReason: answer.finishReason, filesWritten: applied.written.length, rejected: applied.rejected.length,
      truncated: parsed.truncated, malformed: parsed.malformed.length, built: app.ok, visiblePassed: passed, visibleTotal: visible.length,
    });
    process.stdout.write(`    attempt ${attempt}: ${answer.promptTokens}+${answer.completionTokens} tok, ${applied.written.length} files, ${app.ok ? `checks ${passed}/${visible.length}` : `${app.phase} failed`}\n`);
    if (app.ok && passed === visible.length) {
      metrics.stopReason = 'visible_checks_pass';
      break;
    }
    feedback = formatFeedback({ applied, parsed, app, visible, logs });
  }

  // Final judgement: fresh build, empty database, hidden suite only.
  const app = await startApp(stack, workspace, appOpts); // throws InfraError
  if (app.ok) {
    metrics.builtFinal = true;
    try {
      await app.psp.reset();
      metrics.hidden = await judge(app.baseUrl, app.psp, ['hidden']);
    } finally {
      await app.stop();
    }
  } else {
    metrics.finalBuildError = `${app.phase}: ${app.reason}`;
    const { tests } = await import('../suites/hidden.mjs');
    metrics.hidden = tests.map((t) => ({ suite: 'hidden', id: t.id, name: t.name, pass: false, error: 'app did not build or start' }));
  }
  metrics.hiddenPassed = metrics.hidden.filter((r) => r.pass).length;
  metrics.hiddenTotal = metrics.hidden.length;
  metrics.wallMs = Date.now() - started;
  // Keep the produced code, drop heavy build folders.
  for (const heavy of ['node_modules', '.next', 'vendor', 'target', '.venv', '__pycache__']) fs.rmSync(path.join(workspace, heavy), { recursive: true, force: true });
  writeJson(path.join(runDir, 'metrics.json'), metrics); // written last: a run without it is retried on resume
  return metrics;
}

const COMPARED = ['model', 'baseUrl', 'temperature', 'maxTokens', 'budget', 'runtime', 'experimentHash'];

export async function runMatrix({ cmd, values, stacks, stamp }) {
  const selftest = cmd === 'selftest';
  let fake = null;
  if (selftest) {
    const { startFakeModel } = await import('./fakemodel.mjs');
    fake = await startFakeModel();
  }
  const arms = values.arms ? values.arms.split(',').map((a) => a.trim()) : DEFAULT_ARMS;
  for (const a of arms) if (!ARMS.includes(a)) throw new Error(`unknown arm ${a}`);
  const model = selftest ? 'fake-gold' : values.model;
  if (!model) throw new Error('--model is required (for example the name shown by `docker model list`)');
  const opts = {
    model,
    runtime: values.runtime,
    pgAdminUrl: values['pg-admin-url'],
    budget: Number(values.budget),
    modelConfig: {
      baseUrl: selftest ? fake.baseUrl : values['base-url'],
      apiKey: values['api-key'],
      model,
      temperature: Number(values.temperature),
      maxTokens: Number(values['max-tokens']),
    },
  };
  const runs = selftest ? 1 : Number(values.runs);
  const outDir = values.out ? path.resolve(values.out) : path.join(ROOT, 'results', `${selftest ? 'selftest' : 'run'}-${stamp}`);
  const git = await sh('git rev-parse --short HEAD && git status --porcelain', { cwd: ROOT, timeoutMs: 10000 });
  const [commit, ...dirty] = git.code === 0 ? git.out.trim().split('\n') : ['unknown'];
  const params = {
    model, baseUrl: selftest ? 'fake' : opts.modelConfig.baseUrl, temperature: opts.modelConfig.temperature,
    maxTokens: opts.modelConfig.maxTokens, budget: opts.budget, runtime: opts.runtime, experimentHash: experimentHash(),
  };
  const metaFile = path.join(outDir, 'meta.json');
  if (fs.existsSync(metaFile)) {
    const prev = readJson(metaFile);
    const diff = COMPARED.filter((k) => JSON.stringify(prev.params?.[k]) !== JSON.stringify(params[k]));
    if (diff.length) {
      throw new Error(`refusing to resume ${outDir}: these settings differ from the original run: ${diff.join(', ')}. Use a new --out directory.`);
    }
  }
  const meta = {
    label: values.label || '', startedAt: new Date().toISOString(), params, runs, stacks, arms,
    suites: suiteHashes(), harnessCommit: commit || 'unknown', harnessDirty: dirty.filter(Boolean),
    machine: { platform: os.platform(), arch: os.arch(), cpus: os.cpus().length, cpuModel: os.cpus()[0]?.model, memGb: Math.round(os.totalmem() / 2 ** 30), node: process.version },
    selftest,
  };
  if (!fs.existsSync(metaFile)) writeJson(metaFile, meta);
  console.log(`Results in ${outDir}`);
  const localPsp = opts.runtime === 'native' ? await startPsp() : null;
  const infraErrors = [];
  try {
    for (let r = 1; r <= runs; r++) {
      for (const name of stacks) {
        const stack = loadStack(name);
        for (const arm of arms) {
          if (!armApplies(stack, arm)) continue;
          const runDir = path.join(outDir, 'runs', `${name}__${arm}__${r}`);
          if (fs.existsSync(path.join(runDir, 'metrics.json'))) {
            console.log(`  skip ${name} / ${arm} / run ${r} (already done)`);
            continue;
          }
          console.log(`\n[${name} / ${arm} / run ${r}/${runs}]`);
          if (fake) fake.setScenario({ stack: name, arm });
          try {
            const m = await runOne({ stack, arm, runIndex: r, opts, localPsp, runDir, params });
            console.log(`  => hidden ${m.hiddenPassed}/${m.hiddenTotal}, ${m.calls} calls, ${m.promptTokens + m.completionTokens} tokens${m.tokensEstimated ? ' (estimated)' : ''}, ${m.stopReason}`);
          } catch (e) {
            const kind = e instanceof InfraError ? e.kind : 'harness';
            infraErrors.push({ stack: name, arm, run: r, kind, message: e.message });
            writeJson(path.join(runDir, 'error.json'), { kind, message: e.message, stack: e.stack, at: new Date().toISOString() });
            console.log(`  !! ${kind} error, run not counted (it will be retried on resume): ${e.message.split('\n')[0]}`);
            if (kind === 'context' || kind === 'config') throw e;
          }
        }
      }
    }
  } finally {
    await localPsp?.close();
    await fake?.close();
    const report = writeReport(outDir);
    console.log(`\nReport: ${report}`);
    if (infraErrors.length) {
      console.log(`\n${infraErrors.length} run(s) hit environment errors and were not counted. Fix the cause and re-run with --out ${outDir} to retry them.`);
    }
  }
}
