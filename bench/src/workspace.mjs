import fs from 'node:fs';
import path from 'node:path';
import { ROOT, copyDir, readJson } from './util.mjs';

export function loadStack(name) {
  const dir = path.join(ROOT, 'stacks', name);
  const file = path.join(dir, 'stack.json');
  if (!fs.existsSync(file)) throw new Error(`unknown stack "${name}" (no ${file})`);
  return { ...readJson(file), name, dir };
}

export function listStacks() {
  return fs.readdirSync(path.join(ROOT, 'stacks')).filter((d) => fs.existsSync(path.join(ROOT, 'stacks', d, 'stack.json')));
}

// Builds a fresh project directory for one run.
//   overlay: 'gold' (reference implementation) or a directory of piece code to install, or null.
export function createWorkspace(stack, dest, { overlay = null } = {}) {
  fs.rmSync(dest, { recursive: true, force: true });
  copyDir(path.join(stack.dir, 'skeleton'), dest);
  if (overlay === 'gold') copyDir(path.join(stack.dir, 'gold'), dest);
  else if (overlay) copyDir(overlay, dest);
  return dest;
}

const TEXT_EXT = new Set([
  '.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.md', '.py', '.txt', '.java', '.properties', '.xml', '.php',
  '.yml', '.yaml', '.toml', '.cfg', '.ini', '.sql', '.env', '.example', '.html', '.css', '.gradle', '.kts', '.sh', '.lock',
]);

function isIgnored(rel, ignore) {
  const parts = rel.split('/');
  return ignore.some((pat) => {
    if (pat.endsWith('/')) return parts.slice(0, -1).includes(pat.slice(0, -1)) || rel.startsWith(pat);
    return rel === pat || parts.includes(pat) || parts.at(-1) === pat;
  });
}

export function listFiles(dir, ignore = []) {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const abs = path.join(d, e.name);
      const rel = path.relative(dir, abs).split(path.sep).join('/');
      if (isIgnored(rel + (e.isDirectory() ? '/' : ''), ignore) || isIgnored(rel, ignore)) continue;
      if (e.isDirectory()) walk(abs);
      else out.push(rel);
    }
  };
  walk(dir);
  return out.sort();
}

// The project snapshot every arm sees: a file tree plus the contents of text files.
// `hidden` paths are listed in the tree but their contents are omitted (used for installed piece code).
export function snapshot(dir, { ignore = [], hidden = [], maxFileBytes = 60_000 } = {}) {
  const files = listFiles(dir, ignore);
  const tree = files.map((f) => `- ${f}${hidden.some((h) => f.startsWith(h)) ? '   (installed piece code, contents omitted)' : ''}`).join('\n');
  const blocks = [];
  for (const f of files) {
    if (hidden.some((h) => f.startsWith(h))) continue;
    const ext = path.extname(f) || path.basename(f);
    if (!TEXT_EXT.has(ext) && !['Dockerfile', '.dockerignore', 'manage.py', 'artisan'].includes(path.basename(f))) continue;
    const buf = fs.readFileSync(path.join(dir, f));
    if (buf.length > maxFileBytes) {
      blocks.push(`=== ${f} ===\n(${buf.length} bytes, too large to show)`);
      continue;
    }
    blocks.push(`=== ${f} ===\n${buf.toString('utf8')}`);
  }
  return { tree, contents: blocks.join('\n\n'), files };
}

// Applies parsed model output to the workspace with path safety and read-only enforcement.
// Never throws: anything that cannot be applied is reported in `rejected` and fed back to the model.
export function applyChanges(dir, { files, deletes }, { readOnly = [] } = {}) {
  const written = [];
  const deleted = [];
  const rejected = [];
  const ro = readOnly.map((p) => p.toLowerCase());
  const isReadOnly = (norm) => ro.some((p) => norm.toLowerCase() === p || p.startsWith(norm.toLowerCase() + '/'));
  const safe = (p) => {
    const raw = String(p || '').trim().replace(/\\/g, '/');
    if (!raw || /\s/.test(raw) || raw.length > 200) return { ok: false, why: 'invalid path (empty, contains spaces or too long)' };
    const norm = path.posix.normalize(raw).replace(/^\.\//, '').replace(/\/+$/, '');
    if (!norm || norm === '.' || norm.startsWith('/') || norm.startsWith('..') || /^[a-zA-Z]:/.test(norm)) {
      return { ok: false, why: 'path outside the project or the project root itself' };
    }
    if (norm.split('/').some((part) => Buffer.byteLength(part) > 120)) return { ok: false, why: 'path segment too long' };
    if (isReadOnly(norm)) return { ok: false, why: 'read-only file' };
    return { ok: true, norm };
  };
  for (const f of files) {
    const s = safe(f.path);
    if (!s.ok) { rejected.push({ path: f.path, why: s.why }); continue; }
    try {
      const abs = path.join(dir, s.norm);
      if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) throw new Error('a directory exists at that path');
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, f.content);
      written.push(s.norm);
    } catch (e) {
      rejected.push({ path: f.path, why: `could not write (${e.code || e.message})` });
    }
  }
  for (const p of deletes) {
    const s = safe(p);
    if (!s.ok) { rejected.push({ path: p, why: s.why }); continue; }
    try {
      const abs = path.join(dir, s.norm);
      if (!fs.existsSync(abs)) continue;
      if (fs.statSync(abs).isDirectory()) throw new Error('only files can be deleted');
      fs.rmSync(abs, { force: true });
      deleted.push(s.norm);
    } catch (e) {
      rejected.push({ path: p, why: `could not delete (${e.code || e.message})` });
    }
  }
  return { written, deleted, rejected };
}
