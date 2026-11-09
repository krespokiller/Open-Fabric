// Minimal OpenAI-compatible chat client. Works with Docker Model Runner, Ollama, vLLM,
// LM Studio, llama.cpp server and hosted APIs that expose /chat/completions.
import http from 'node:http';
import https from 'node:https';
import { InfraError, sleep } from './util.mjs';

// POST with an inactivity timeout of timeoutMs. fetch() is not used on purpose: its built-in
// 300 s headers timeout cuts slow local servers (CPU inference) long before timeoutMs.
function postJson(url, headers, payload, timeoutMs) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = (u.protocol === 'https:' ? https : http).request(
      u,
      { method: 'POST', headers: { ...headers, 'Content-Length': Buffer.byteLength(payload) } },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, text: Buffer.concat(chunks).toString('utf8') }));
        res.on('error', reject);
      },
    );
    req.setTimeout(timeoutMs, () => req.destroy(new Error(`no response within ${Math.round(timeoutMs / 1000)} s`)));
    req.on('error', reject);
    req.end(payload);
  });
}

export function estimateTokens(text) {
  return Math.ceil(String(text || '').length / 4);
}

const CONTEXT_ERROR = /context|too long|exceed|maximum.*tokens|n_ctx|prompt is too/i;

export async function chat({ baseUrl, apiKey, model, messages, temperature, maxTokens, seed, timeoutMs = 20 * 60 * 1000 }) {
  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const body = { model, messages, temperature, max_tokens: maxTokens, stream: false };
  if (seed !== undefined) body.seed = seed;
  const promptText = messages.map((m) => m.content).join('\n');
  const promptEstimate = estimateTokens(promptText);
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const started = Date.now();
    let res;
    let text;
    try {
      res = await postJson(
        url,
        { 'Content-Type': 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
        JSON.stringify(body),
        timeoutMs,
      );
      text = res.text;
    } catch (e) {
      lastError = `request failed: ${e.message}`;
      if (attempt < 3) await sleep(5000 * attempt);
      continue;
    }
    if (!res.ok) {
      if (res.status === 400 && CONTEXT_ERROR.test(text)) {
        throw new InfraError('context', `the prompt (~${promptEstimate} tokens) does not fit the model's context. Increase it (docker model configure --context-size ...). Server said: ${text.slice(0, 300)}`);
      }
      lastError = `HTTP ${res.status}: ${text.slice(0, 500)}`;
      if (res.status >= 400 && res.status < 500 && res.status !== 429) break;
      if (attempt < 3) await sleep(5000 * attempt);
      continue;
    }
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      lastError = `invalid JSON from the model server: ${text.slice(0, 200)}`;
      continue;
    }
    const choice = data.choices?.[0];
    const content = choice?.message?.content ?? '';
    const usage = data.usage || {};
    const reported = Number.isFinite(usage.prompt_tokens) && Number.isFinite(usage.completion_tokens);
    const promptTokens = reported ? usage.prompt_tokens : promptEstimate;
    // llama.cpp-based servers may report only non-cached prompt tokens, or truncate silently.
    // Flag counts that are far below a characters/4 estimate so the report can warn about them.
    const suspicious = reported && usage.prompt_tokens < 0.5 * promptEstimate;
    return {
      content,
      finishReason: choice?.finish_reason ?? null,
      promptTokens,
      completionTokens: reported ? usage.completion_tokens : estimateTokens(content),
      estimated: !reported,
      promptEstimate,
      suspicious,
      ms: Date.now() - started,
      attempts: attempt,
      raw: { model: data.model ?? null, usage: data.usage ?? null },
    };
  }
  throw new InfraError('model', `model call failed: ${lastError}`);
}
