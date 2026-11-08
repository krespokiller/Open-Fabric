// Builds and starts the app under test, either with Docker Compose (default, isolated)
// or natively on the host (useful without Docker; requires a local PostgreSQL).
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { InfraError, ROOT, freePort, onExit, sh, sleep, spawnLong, tail, waitForHttp } from './util.mjs';
import { pspClient } from './psp.mjs';

export const SECRETS = {
  ADMIN_KEY: 'admin-' + 'k3y-bench',
  WEBHOOK_SECRET: 'whsec_bench_secret',
};

function dbEnv({ host, port, name, user, password }) {
  const auth = password ? `${user}:${password}` : user;
  return {
    DATABASE_URL: `postgres://${auth}@${host}:${port}/${name}`,
    DB_HOST: host,
    DB_PORT: String(port),
    DB_NAME: name,
    DB_USER: user,
    DB_PASSWORD: password || '',
  };
}

// Returns { ok: true, baseUrl, psp, logs(), stop() } or { ok: false, phase, reason, output }.
// Throws InfraError when the environment, not the code, is at fault.
export async function startApp(stack, workspace, { runtime, workDir, pgAdminUrl, localPsp }) {
  fs.mkdirSync(workDir, { recursive: true });
  return runtime === 'native'
    ? startNative(stack, workspace, { workDir, pgAdminUrl, localPsp })
    : startDocker(stack, workspace, { workDir });
}

async function startDocker(stack, workspace, { workDir }) {
  const project = `ofb${randomBytes(4).toString('hex')}`;
  const hostPort = await freePort();
  const pspPort = await freePort();
  const compose = path.join(workDir, `compose-${project}.yml`);
  const env = {
    ...dbEnv({ host: 'db', port: 5432, name: 'bench', user: 'bench', password: 'bench' }),
    ...SECRETS,
    PSP_URL: 'http://psp:7070',
    PORT: '8080',
    ...(stack.docker?.env || {}),
  };
  const yaml = [
    'services:',
    '  db:',
    '    image: postgres:16-alpine',
    '    environment:',
    '      POSTGRES_USER: bench',
    '      POSTGRES_PASSWORD: bench',
    '      POSTGRES_DB: bench',
    '    tmpfs:',
    '      - /var/lib/postgresql/data',
    '    healthcheck:',
    // -h 127.0.0.1 forces TCP: during initdb the image runs a socket-only temporary server.
    '      test: ["CMD-SHELL", "pg_isready -h 127.0.0.1 -U bench -d bench"]',
    '      interval: 2s',
    '      timeout: 3s',
    '      retries: 60',
    '      start_period: 5s',
    '  psp:',
    '    image: node:22-alpine',
    '    command: ["node", "/psp/psp-server.mjs"]',
    '    volumes:',
    `      - ${JSON.stringify(`${path.join(ROOT, 'src', 'psp.mjs')}:/psp/psp.mjs:ro`)}`,
    `      - ${JSON.stringify(`${path.join(ROOT, 'src', 'psp-server.mjs')}:/psp/psp-server.mjs:ro`)}`,
    '    ports:',
    `      - "127.0.0.1:${pspPort}:7070"`,
    '  app:',
    '    build:',
    `      context: ${JSON.stringify(path.resolve(workspace))}`,
    '      dockerfile: Dockerfile',
    '    environment:',
    ...Object.entries(env).map(([k, v]) => `      ${k}: ${JSON.stringify(v)}`),
    '    ports:',
    `      - "127.0.0.1:${hostPort}:8080"`,
    '    depends_on:',
    '      db:',
    '        condition: service_healthy',
    '      psp:',
    '        condition: service_started',
    '',
  ].join('\n');
  fs.writeFileSync(compose, yaml);
  const dc = `docker compose -p ${project} -f ${JSON.stringify(compose)}`;
  // Always remove the project's image: each attempt has its own project, and leftovers fill the disk.
  const down = () => sh(`${dc} down -v --remove-orphans --rmi local`, { timeoutMs: 300000 });
  const unregister = onExit(down);
  const stop = async () => {
    await down();
    unregister();
  };
  const logs = async () => (await sh(`${dc} logs --no-color --tail 300 app`, { timeoutMs: 60000 })).out;

  const started = Date.now();
  const up = await sh(`${dc} up -d --build`, { timeoutMs: (stack.buildTimeoutSec || 900) * 1000 });
  const buildMs = Date.now() - started;
  if (up.code !== 0) {
    const appLogs = await logs();
    await stop();
    if (/Cannot connect to the Docker daemon|error during connect|no space left on device|pull access denied for (postgres|node)|TLS handshake timeout|failed to resolve source metadata for docker\.io\/library\/(postgres|node)/i.test(up.out)) {
      throw new InfraError('docker', `docker compose up failed for infrastructure reasons:\n${tail(up.out, 30)}`);
    }
    return { ok: false, phase: 'build', reason: 'docker compose up failed', output: tail(up.out, 120) + '\n' + tail(appLogs, 60), buildMs };
  }

  const psp = pspClient(`http://127.0.0.1:${pspPort}`);
  // The webhook check compares timestamps, so the containers' clock must match the host's.
  try {
    let stats = null;
    for (let i = 0; i < 30 && !stats; i++) {
      try { stats = await psp.stats(); } catch { await sleep(1000); }
    }
    if (!stats) throw new Error('the PSP container did not answer');
    const skew = Math.abs(stats.now - Date.now() / 1000);
    if (skew > 60) throw new Error(`container clock is ${Math.round(skew)} s away from the host clock (restart Docker Desktop to resync)`);
  } catch (e) {
    await stop();
    throw new InfraError('docker', e.message);
  }

  let polls = 0;
  const isDead = async () => {
    if (++polls % 5) return false;
    const ps = await sh(`${dc} ps -a --format "{{.Service}} {{.State}}"`, { timeoutMs: 30000 });
    return /app (exited|dead)/.test(ps.out);
  };
  const health = await waitForHttp(`http://127.0.0.1:${hostPort}${stack.healthPath || '/health'}`, {
    timeoutMs: (stack.startTimeoutSec || 180) * 1000,
    isDead,
  });
  if (!health.ok) {
    const appLogs = await logs();
    await stop();
    return { ok: false, phase: 'start', reason: health.reason, output: tail(appLogs, 120), buildMs };
  }
  return { ok: true, baseUrl: `http://127.0.0.1:${hostPort}`, psp, logs, stop, buildMs };
}

function portInUse(port) {
  return new Promise((resolve) => {
    const s = net.connect({ port, host: '127.0.0.1' }, () => { s.destroy(); resolve(true); });
    s.on('error', () => resolve(false));
    s.setTimeout(1000, () => { s.destroy(); resolve(false); });
  });
}

async function startNative(stack, workspace, { workDir, pgAdminUrl, localPsp }) {
  if (!stack.native) return { ok: false, phase: 'build', reason: `stack ${stack.name} has no native commands`, output: '' };
  if (!pgAdminUrl) throw new InfraError('config', 'native runtime needs --pg-admin-url (e.g. postgres://postgres@127.0.0.1:5432/postgres)');
  if (await portInUse(8080)) throw new InfraError('port', 'port 8080 is already in use; native runtime needs it free');
  const admin = new URL(pgAdminUrl);
  const dbName = `ofb_${randomBytes(4).toString('hex')}`;
  const created = await sh(`psql ${JSON.stringify(pgAdminUrl)} -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${dbName}"`, { timeoutMs: 60000 });
  if (created.code !== 0) throw new InfraError('database', `could not create database: ${tail(created.out, 10)}`);
  const dropDb = () => sh(`psql ${JSON.stringify(pgAdminUrl)} -c "DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)"`, { timeoutMs: 60000 });
  const unregisterDb = onExit(dropDb);
  const env = {
    ...dbEnv({
      host: admin.hostname,
      port: admin.port || 5432,
      name: dbName,
      user: decodeURIComponent(admin.username || 'postgres'),
      password: decodeURIComponent(admin.password || ''),
    }),
    ...SECRETS,
    PSP_URL: `http://127.0.0.1:${localPsp.port}`,
    PORT: '8080',
    ...(stack.native.env || {}),
  };
  const fail = async (phase, reason, output, buildMs) => {
    await dropDb();
    unregisterDb();
    return { ok: false, phase, reason, output, buildMs };
  };
  const started = Date.now();
  // Re-run install only when dependency manifests change.
  const manifests = (stack.native.manifests || []).filter((m) => fs.existsSync(path.join(workspace, m)));
  const hash = createHash('sha256');
  for (const m of manifests) hash.update(fs.readFileSync(path.join(workspace, m)));
  const digest = hash.digest('hex');
  const stamp = path.join(workspace, '.bench-install');
  let out = '';
  if (stack.native.install && (!fs.existsSync(stamp) || fs.readFileSync(stamp, 'utf8') !== digest)) {
    const r = await sh(stack.native.install, { cwd: workspace, env, timeoutMs: 1200000 });
    out += r.out;
    if (r.code !== 0) return fail('build', 'install failed', tail(out, 120), Date.now() - started);
    fs.writeFileSync(stamp, digest);
  }
  if (stack.native.build) {
    const r = await sh(stack.native.build, { cwd: workspace, env, timeoutMs: 1200000 });
    out += r.out;
    if (r.code !== 0) return fail('build', 'build failed', tail(out, 120), Date.now() - started);
  }
  const buildMs = Date.now() - started;
  const proc = spawnLong(stack.native.start, { cwd: workspace, env, logFile: path.join(workDir, 'app.log') });
  const unregisterProc = onExit(() => proc.stop());
  const health = await waitForHttp(`http://127.0.0.1:8080${stack.healthPath || '/health'}`, {
    timeoutMs: (stack.startTimeoutSec || 180) * 1000,
    isDead: async () => proc.exited() !== null,
  });
  const stop = async () => {
    await proc.stop();
    unregisterProc();
    await sleep(300);
    await dropDb();
    unregisterDb();
  };
  if (!health.ok) {
    const logs = proc.logs();
    await stop();
    return { ok: false, phase: 'start', reason: health.reason, output: tail(out, 40) + '\n' + tail(logs, 120), buildMs };
  }
  return { ok: true, baseUrl: 'http://127.0.0.1:8080', psp: localPsp.client, logs: async () => proc.logs(), stop, buildMs };
}
