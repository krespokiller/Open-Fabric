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
import { DEFAULT_ARMS, armApplies, armSeesPublicTests, buildMessages, expandArm, isKnownArm, kitFeedbackText, kitSelectionProblem, parseArm } from './prompts.mjs';
import { chat } from './model.mjs';
import { parseAnswer } from './protocol.mjs';
import { startApp } from './runner.mjs';
import { NOT_JUDGED, judge, judgeAttempt, runLevelJudgement, suiteHashes, experimentHash } from './judge.mjs';
import { startPsp } from './psp.mjs';
import { bothSuitesPerfect, writeReport } from './report.mjs';

// One line per finished attempt. The loop is stateless, so without this the model cannot tell
// that it is sending the same answer again or going back and forth between two answers.
export function historyLine({ attempt, applied, app, visible, repeated }) {
  const files = applied.written.length ? `wrote ${applied.written.length} file(s)` : 'wrote no files';
  let outcome;
  if (!app.ok) outcome = `${app.phase} failed (${String(app.reason).split('\n')[0].slice(0, 120)})`;
  else {
    const failed = visible.filter((r) => !r.pass).map((r) => r.id);
    outcome = `built, checks ${visible.length - failed.length}/${visible.length} passed${failed.length ? ` (failed: ${failed.join(', ')})` : ''}`;
  }
  return `- Attempt ${attempt}: ${files}; ${outcome}${repeated ? '; same answer as the attempt before' : ''}`;
}

export function formatFeedback({ applied, parsed, app, visible, logs, repeated }) {
  const out = [];
  if (repeated) out.push('WARNING: your previous answer was identical to the one before it, so the result did not change. Do not send the same files again: read the error below and change the code that causes it.');
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
  const kit = parseArm(arm);
  const overlay = arm === 'of-code' ? path.join(ROOT, stack.codePiece.dir) : kit.kit ? 'gold' : null;
  createWorkspace(stack, workspace, { overlay });
  const slotFile = kit.kit ? stack.kit.slots[kit.slot] : null;
  // Kit arms: the reference is installed and the slot file is replaced by its unfilled stub.
  if (slotFile) fs.copyFileSync(path.join(ROOT, 'arms', 'kit', stack.name, slotFile), path.join(workspace, slotFile));
  // In a kit run the installed code stays hidden, so build and runtime output reaches the model without quotes of it.
  const forModel = (text) => (slotFile ? kitFeedbackText(text, slotFile) : text);
  const transcript = path.join(runDir, 'transcript.jsonl');
  const visibleSuites = armSeesPublicTests(arm) ? ['smoke', 'public'] : ['smoke'];
  const readOnly = readOnlyFor(stack, arm);
  const appOpts = { runtime: opts.runtime, workDir: path.join(runDir, 'app'), pgAdminUrl: opts.pgAdminUrl, localPsp };
  const metrics = {
    stack: stack.name, arm, run: runIndex, params,
    calls: 0, promptTokens: 0, completionTokens: 0, promptEstimate: 0, tokensEstimated: false, suspiciousUsageCalls: 0,
    modelMs: 0, buildMs: 0, attempts: [], stopReason: 'budget', builtFinal: false, hidden: [], hidden2: [], startedAt: new Date().toISOString(),
  };
  const started = Date.now();
  let feedback = '';
  const history = [];
  let lastContent = null;
  for (let attempt = 1; attempt <= opts.budget; attempt++) {
    const messages = buildMessages({ stack, arm, workspace, feedback, attempt, budget: opts.budget, history });
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
    const applied = applyChanges(workspace, parsed, { readOnly, writable: slotFile ? [slotFile] : null });
    const app = await startApp(stack, workspace, appOpts); // throws InfraError
    metrics.buildMs += app.buildMs || 0;
    let visible = [];
    let logs = '';
    let judgement = { ...NOT_JUDGED }; // an app that did not build or start has nothing to judge
    if (app.ok) {
      try {
        await app.psp.reset();
        visible = await judge(app.baseUrl, app.psp, visibleSuites);
        if (visible.some((r) => !r.pass)) logs = forModel(await app.logs());
        // Only now, with the logs for the model already read, the hidden suites run. The result goes to metrics.json
        // and nowhere else: nothing below hands `judgement` to the text the model reads.
        judgement = await judgeAttempt(app);
      } finally {
        await app.stop();
      }
    }
    const passed = visible.filter((r) => r.pass).length;
    const repeated = lastContent !== null && answer.content === lastContent;
    lastContent = answer.content;
    history.push(historyLine({ attempt, applied, app, visible, repeated }));
    metrics.attempts.push({
      repeated,
      attempt, promptTokens: answer.promptTokens, completionTokens: answer.completionTokens, promptEstimate: answer.promptEstimate,
      finishReason: answer.finishReason, filesWritten: applied.written.length, rejected: applied.rejected.length,
      truncated: parsed.truncated, malformed: parsed.malformed.length, built: app.ok, visiblePassed: passed, visibleTotal: visible.length,
      ...judgement,
    });
    process.stdout.write(`    attempt ${attempt}: ${answer.promptTokens}+${answer.completionTokens} tok, ${applied.written.length} files, ${app.ok ? `checks ${passed}/${visible.length}` : `${app.phase} failed`}\n`);
    if (app.ok && passed === visible.length) {
      metrics.stopReason = 'visible_checks_pass';
      break;
    }
    feedback = formatFeedback({ applied, parsed, app: slotFile ? { ...app, output: forModel(app.output) } : app, visible, logs, repeated });
  }

  // Final judgement: fresh build, empty database, hidden suites only (hidden first, then hidden2).
  const app = await startApp(stack, workspace, appOpts); // throws InfraError
  if (app.ok) {
    metrics.builtFinal = true;
    try {
      await app.psp.reset();
      const results = await judge(app.baseUrl, app.psp, ['hidden', 'hidden2']);
      metrics.hidden = results.filter((r) => r.suite === 'hidden');
      metrics.hidden2 = results.filter((r) => r.suite === 'hidden2');
    } finally {
      await app.stop();
    }
  } else {
    metrics.finalBuildError = `${app.phase}: ${app.reason}`;
    const { SUITES } = await import('./judge.mjs');
    const notBuilt = (suite) => SUITES[suite].map((t) => ({ suite, id: t.id, name: t.name, pass: false, error: 'app did not build or start' }));
    metrics.hidden = notBuilt('hidden');
    metrics.hidden2 = notBuilt('hidden2');
  }
  metrics.hiddenPassed = metrics.hidden.filter((r) => r.pass).length;
  metrics.hiddenTotal = metrics.hidden.length;
  metrics.hidden2Passed = metrics.hidden2.filter((r) => r.pass).length;
  metrics.hidden2Total = metrics.hidden2.length;
  Object.assign(metrics, runLevelJudgement(metrics.attempts, bothSuitesPerfect(metrics)));
  metrics.wallMs = Date.now() - started;
  // Keep the produced code, drop heavy build folders.
  for (const heavy of ['node_modules', '.next', 'vendor', 'target', '.venv', '__pycache__']) fs.rmSync(path.join(workspace, heavy), { recursive: true, force: true });
  writeJson(path.join(runDir, 'metrics.json'), metrics); // written last: a run without it is retried on resume
  return metrics;
}

// Settings a resume must repeat. `slots` is the --slots list (sorted), or null for every slot of the stack;
// `kitArms` is every kit arm with its slot that the selected stacks will run (for example kit-bare.cart).
const COMPARED = ['model', 'baseUrl', 'temperature', 'maxTokens', 'budget', 'runtime', 'slots', 'kitArms', 'experimentHash'];

export async function runMatrix({ cmd, values, stacks, stamp }) {
  const selftest = cmd === 'selftest';
  let fake = null;
  let kitSelftestProblems = null;
  let judgeSelftestProblems = null;
  if (selftest) {
    const fakeModel = await import('./fakemodel.mjs');
    fake = await fakeModel.startFakeModel();
    kitSelftestProblems = fakeModel.kitSelftestProblems;
    judgeSelftestProblems = fakeModel.judgeSelftestProblems;
  }
  // The selftest also exercises one cell of each kit arm, so the slot path is covered without tokens.
  // Stacks without slots keep the selftest they had: the kit cells are added only where they can run.
  const hasSlots = (name) => fs.existsSync(path.join(ROOT, 'stacks', name, 'stack.json')) && Boolean(loadStack(name).kit);
  const selftestArms = () => [...DEFAULT_ARMS, ...(stacks.some(hasSlots) ? ['kit-bare.cart', 'kit-tests.discount'] : [])];
  const arms = values.arms ? values.arms.split(',').map((a) => a.trim()) : selftest ? selftestArms() : DEFAULT_ARMS;
  for (const a of arms) if (!isKnownArm(a)) throw new Error(`unknown arm ${a}`);
  const slots = values.slots === undefined ? null : values.slots.split(',').map((s) => s.trim());
  if (slots || arms.some((a) => parseArm(a).kit)) {
    const problem = kitSelectionProblem(stacks.map((name) => loadStack(name)), arms, slots);
    if (problem) throw new Error(problem);
  }
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
  const kitArms = [...new Set(stacks.flatMap((name) => {
    const stack = loadStack(name);
    return arms.flatMap((a) => expandArm(stack, a, slots)).filter((a) => parseArm(a).kit && armApplies(stack, a));
  }))].sort();
  const params = {
    model, baseUrl: selftest ? 'fake' : opts.modelConfig.baseUrl, temperature: opts.modelConfig.temperature,
    maxTokens: opts.modelConfig.maxTokens, budget: opts.budget, runtime: opts.runtime,
    slots: slots && [...slots].sort(), kitArms, experimentHash: experimentHash(),
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
  const selftestProblems = [];
  try {
    for (let r = 1; r <= runs; r++) {
      for (const name of stacks) {
        const stack = loadStack(name);
        for (const arm of arms.flatMap((a) => expandArm(stack, a, slots))) {
          if (!armApplies(stack, arm)) continue;
          const runDir = path.join(outDir, 'runs', `${name}__${arm}__${r}`);
          if (fs.existsSync(path.join(runDir, 'metrics.json'))) {
            console.log(`  skip ${name} / ${arm} / run ${r} (already done)`);
            continue;
          }
          console.log(`\n[${name} / ${arm} / run ${r}/${runs}]`);
          if (fake) fake.setScenario({ stack: name, arm });
          let finished = null;
          try {
            const m = await runOne({ stack, arm, runIndex: r, opts, localPsp, runDir, params });
            console.log(`  => hidden ${m.hiddenPassed}/${m.hiddenTotal}, ${m.calls} calls, ${m.promptTokens + m.completionTokens} tokens${m.tokensEstimated ? ' (estimated)' : ''}, ${m.stopReason}`);
            finished = m;
          } catch (e) {
            const kind = e instanceof InfraError ? e.kind : 'harness';
            infraErrors.push({ stack: name, arm, run: r, kind, message: e.message });
            writeJson(path.join(runDir, 'error.json'), { kind, message: e.message, stack: e.stack, at: new Date().toISOString() });
            console.log(`  !! ${kind} error, run not counted (it will be retried on resume): ${e.message.split('\n')[0]}`);
            if (kind === 'context' || kind === 'config') throw e;
          }
          // Selftest only: every finished cell must show that the per-attempt hidden judge answered as the fake model's states require.
          if (finished && judgeSelftestProblems) {
            for (const problem of judgeSelftestProblems({ stack, arm, metrics: finished })) {
              console.log(`  !! selftest: ${problem}`);
              selftestProblems.push(`${name} / ${arm}: ${problem}`);
            }
          }
          // Selftest only: a finished kit cell must show that the slot rules held (see fakemodel.mjs).
          if (finished && kitSelftestProblems && parseArm(arm).kit) {
            for (const problem of kitSelftestProblems({ stack, arm, runDir, metrics: finished })) {
              console.log(`  !! selftest: ${problem}`);
              selftestProblems.push(`${name} / ${arm}: ${problem}`);
            }
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
  if (selftestProblems.length) throw new Error(`the selftest found ${selftestProblems.length} problem(s):\n- ${selftestProblems.join('\n- ')}`);
}
