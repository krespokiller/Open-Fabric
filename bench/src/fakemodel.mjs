// A fake OpenAI-compatible model for `selftest`. It never calls a real model.
// Scenario per arm:
//   attempt 1: the reference implementation with one deliberately broken file (exercises build-failure feedback)
//   attempt 2+: the reference implementation, except for the `bare` arm, which gets a plausible bug
//               (stack.json "selftestBug") that passes the smoke checks but fails hidden tests.
// Kit arms: the answer holds the reference for the slot and that same broken file, which is installed
//           code there. The harness must reject it, so the first attempt already builds and passes.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { listFiles, loadStack } from './workspace.mjs';
import { ROOT } from './util.mjs';
import { estimateTokens } from './model.mjs';

function goldFiles(stack, arm) {
  const dir = path.join(stack.dir, 'gold');
  let files = listFiles(dir).map((p) => ({ path: p, content: fs.readFileSync(path.join(dir, p), 'utf8') }));
  const [base, slot] = String(arm).split('.');
  if (base.startsWith('kit-')) return files.filter((f) => f.path === stack.kit.slots[slot] || f.path === stack.selftestBreak?.file);
  if (arm === 'of-code') {
    const installed = new Set(listFiles(path.join(ROOT, stack.codePiece.dir)));
    files = files.filter((f) => !installed.has(f.path) || f.path === stack.codePiece.slotFile);
  }
  return files;
}

function render(files) {
  return 'Here are the files.\n\n' + files.map((f) => `<<<FILE ${f.path}\n${f.content}>>>FILE`).join('\n\n');
}

// What a finished kit cell of the selftest must show, as a list of problems (empty when it holds).
// Only facts that do not depend on timing are checked: once the slot holds the reference and nothing
// else changed, the project is the reference, and its hidden score is what validate-gold measures.
export function kitSelftestProblems({ stack, arm, runDir, metrics }) {
  const problems = [];
  const slotFile = stack.kit.slots[arm.split('.')[1]];
  const gold = path.join(stack.dir, 'gold');
  const first = metrics.attempts[0] || {};
  if (first.filesWritten !== 1 || first.rejected !== 1) {
    problems.push(`attempt 1 had to write the slot and reject the write to installed code, but wrote ${first.filesWritten} file(s) and rejected ${first.rejected}`);
  }
  if (!first.built || !metrics.builtFinal || !metrics.hiddenTotal) problems.push('the project with the reference slot did not build, or the hidden suites did not run');
  // Answers are applied with LF line endings, so text is compared without regard to line endings.
  const text = (file) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').trim() : null);
  for (const f of listFiles(gold)) {
    const produced = path.join(runDir, 'workspace', f);
    if (f === slotFile) {
      if (text(produced) !== text(path.join(gold, f))) problems.push(`the slot ${f} does not hold what the model wrote`);
    } else if (!fs.existsSync(produced) || !fs.readFileSync(produced).equals(fs.readFileSync(path.join(gold, f)))) {
      problems.push(`the installed file ${f} was changed`);
    }
  }
  const prompts = fs.readFileSync(path.join(runDir, 'transcript.jsonl'), 'utf8').trim().split('\n')
    .map((line) => JSON.parse(line).messages.map((m) => m.content).join('\n').replace(/\r\n/g, '\n'));
  if (!prompts[0].includes(text(path.join(ROOT, 'arms', 'kit', stack.name, slotFile)))) problems.push('the first prompt does not show the unfilled slot');
  for (const f of listFiles(gold)) {
    const code = text(path.join(gold, f));
    if (code.length < 40) continue; // empty package markers say nothing
    // After the first attempt the slot holds what the model wrote, so only the first prompt is checked for it.
    if ((f === slotFile ? prompts.slice(0, 1) : prompts).some((p) => p.includes(code))) problems.push(`the reference code of ${f} appears in a prompt`);
  }
  return problems;
}

// The attempt at which the fake model sends the reference (null when it never does). It mirrors the server below:
// attempt 1 carries the broken file when the stack has one, and `bare` gets its plausible bug from then on. In a kit
// arm the broken file is installed code that the harness rejects, so the reference slot already works at attempt 1.
export function referenceAttempt(stack, arm) {
  if (String(arm).startsWith('kit-')) return 1;
  if (arm === 'bare' && stack.selftestBug) return null;
  return stack.selftestBreak ? 2 : 1;
}

// What the per-attempt hidden judgement must show in any finished cell of the selftest, as a list of problems.
// The fake model's states are known, so the judge's answer on each is known: wrong until the reference arrives,
// right at that attempt, and always wrong for a plausible bug. The last attempt must also agree with the final judgement.
export function judgeSelftestProblems({ stack, arm, metrics }) {
  const problems = [];
  const attempts = metrics.attempts || [];
  const reference = referenceAttempt(stack, arm);
  for (const a of attempts) {
    if (reference === null && a.judgeCorrect) problems.push(`attempt ${a.attempt} holds a plausible bug but the hidden judge called it correct`);
    else if (reference !== null && a.attempt < reference && a.judgeCorrect) problems.push(`attempt ${a.attempt} came before the reference but the hidden judge called it correct`);
    else if (reference !== null && a.attempt === reference && !a.judgeCorrect) problems.push(`attempt ${a.attempt} holds the reference but the hidden judge did not call it correct`);
  }
  if (metrics.lastAttemptAgreesWithFinal === false) problems.push('the hidden judge gave two different answers on the same code: the last attempt and the final judgement disagree');
  return problems;
}

export async function startFakeModel() {
  let scenario = { stack: null, arm: null };
  const attempts = new Map();
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (d) => { body += d; });
    req.on('end', () => {
      const parsed = JSON.parse(body || '{}');
      const key = `${scenario.stack}/${scenario.arm}`;
      const attempt = (attempts.get(key) || 0) + 1;
      attempts.set(key, attempt);
      const stack = loadStack(scenario.stack);
      let files = goldFiles(stack, scenario.arm);
      const bug = stack.selftestBug;
      if (attempt === 1 && stack.selftestBreak) {
        files = files.map((f) => (f.path === stack.selftestBreak.file ? { ...f, content: f.content + '\n' + stack.selftestBreak.append + '\n' } : f));
      } else if (scenario.arm === 'bare' && bug) {
        files = files.map((f) => (f.path === bug.file ? { ...f, content: bug.content } : f));
      }
      const content = render(files);
      const prompt = (parsed.messages || []).map((m) => m.content).join('\n');
      const out = {
        id: `fake-${Date.now()}`,
        object: 'chat.completion',
        model: parsed.model,
        choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content } }],
        usage: { prompt_tokens: estimateTokens(prompt), completion_tokens: estimateTokens(content), total_tokens: estimateTokens(prompt) + estimateTokens(content) },
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(out));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return {
    baseUrl: `http://127.0.0.1:${server.address().port}/v1`,
    setScenario: (s) => { scenario = s; attempts.delete(`${s.stack}/${s.arm}`); },
    close: () => new Promise((r) => server.close(r)),
  };
}
