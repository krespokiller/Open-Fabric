// A fake OpenAI-compatible model for `selftest`. It never calls a real model.
// Scenario per arm:
//   attempt 1: the reference implementation with one deliberately broken file (exercises build-failure feedback)
//   attempt 2+: the reference implementation, except for the `bare` arm, which gets a plausible bug
//               (stack.json "selftestBug") that passes the smoke checks but fails hidden tests.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { listFiles, loadStack } from './workspace.mjs';
import { ROOT } from './util.mjs';
import { estimateTokens } from './model.mjs';

function goldFiles(stack, arm) {
  const dir = path.join(stack.dir, 'gold');
  let files = listFiles(dir).map((p) => ({ path: p, content: fs.readFileSync(path.join(dir, p), 'utf8') }));
  if (arm === 'of-code') {
    const installed = new Set(listFiles(path.join(ROOT, stack.codePiece.dir)));
    files = files.filter((f) => !installed.has(f.path) || f.path === stack.codePiece.slotFile);
  }
  return files;
}

function render(files) {
  return 'Here are the files.\n\n' + files.map((f) => `<<<FILE ${f.path}\n${f.content}>>>FILE`).join('\n\n');
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
