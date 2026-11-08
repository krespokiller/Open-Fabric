import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A failure of the environment (model server, Docker, database, clock), not of the code under test.
// Runs that hit one are not recorded as finished, so a resumed matrix retries them.
export class InfraError extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind;
  }
}

// Cleanup callbacks for resources that must not outlive the process (compose projects, databases).
const cleanups = new Set();
export function onExit(fn) {
  cleanups.add(fn);
  return () => cleanups.delete(fn);
}
let exiting = false;
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => {
    if (exiting) process.exit(130);
    exiting = true;
    console.error(`\n${sig}: cleaning up ${cleanups.size} resource(s)...`);
    await Promise.allSettled([...cleanups].map((fn) => fn()));
    process.exit(130);
  });
}

// Runs a shell command and resolves with { code, out } (stdout and stderr interleaved).
export function sh(cmd, { cwd, env, timeoutMs = 30 * 60 * 1000, onData } = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, { cwd, env: { ...process.env, ...env }, shell: true, detached: process.platform !== 'win32' });
    let out = '';
    const add = (d) => {
      const s = d.toString();
      out += s;
      if (out.length > 4_000_000) out = out.slice(-2_000_000);
      onData?.(s);
    };
    child.stdout.on('data', add);
    child.stderr.on('data', add);
    const timer = setTimeout(() => {
      out += `\n[timeout after ${timeoutMs} ms]`;
      killTree(child);
    }, timeoutMs);
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, out });
    });
  });
}

// Starts a long-running process; returns a handle with logs() and stop().
export function spawnLong(cmd, { cwd, env, logFile }) {
  const child = spawn(cmd, { cwd, env: { ...process.env, ...env }, shell: true, detached: process.platform !== 'win32' });
  let log = '';
  const stream = logFile ? fs.createWriteStream(logFile, { flags: 'a' }) : null;
  const add = (d) => {
    const s = d.toString();
    log += s;
    if (log.length > 2_000_000) log = log.slice(-1_000_000);
    stream?.write(s);
  };
  child.stdout.on('data', add);
  child.stderr.on('data', add);
  let exited = null;
  child.on('close', (code) => { exited = code ?? 1; });
  return {
    logs: () => log,
    exited: () => exited,
    stop: async () => {
      if (exited === null) {
        killTree(child);
        for (let i = 0; i < 50 && exited === null; i++) await sleep(100);
        if (exited === null) killTree(child, 'SIGKILL');
      }
      stream?.end();
    },
  };
}

function killTree(child, signal = 'SIGTERM') {
  try {
    if (process.platform !== 'win32') process.kill(-child.pid, signal);
    else child.kill(signal);
  } catch {
    try { child.kill(signal); } catch { /* already gone */ }
  }
}

export async function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '0.0.0.0', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

export async function waitForHttp(url, { timeoutMs, isDead } = {}) {
  const deadline = Date.now() + timeoutMs;
  let last = 'no response';
  while (Date.now() < deadline) {
    if (isDead && (await isDead())) return { ok: false, reason: 'the app process exited' };
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (res.status === 200) return { ok: true };
      last = `HTTP ${res.status}`;
    } catch (e) {
      last = e.cause?.code || e.message;
    }
    await sleep(1000);
  }
  return { ok: false, reason: `health check did not return 200 within ${Math.round(timeoutMs / 1000)} s (last: ${last})` };
}

export function tail(text, lines) {
  const all = String(text || '').replace(/\x1b\[[0-9;]*m/g, '').split('\n');
  return all.slice(-lines).join('\n');
}

export function sha256File(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

export function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

export function writeJson(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj, null, 2));
}

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
export function sd(xs) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}
