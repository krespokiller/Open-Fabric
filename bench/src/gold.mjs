// validate-gold: proves the judge is fair. For each stack, the reference implementation
// must pass 100% of smoke, public and hidden tests before any model run is meaningful.
import path from 'node:path';
import { createWorkspace, loadStack } from './workspace.mjs';
import { startApp } from './runner.mjs';
import { judge } from './judge.mjs';
import { startPsp } from './psp.mjs';
import { writeJson } from './util.mjs';

export async function validateGold({ stacks, runtime, pgAdminUrl, outDir }) {
  const localPsp = runtime === 'native' ? await startPsp() : null;
  const summary = [];
  try {
    for (const name of stacks) {
      const stack = loadStack(name);
      const ws = createWorkspace(stack, path.join(outDir, name, 'workspace'), { overlay: 'gold' });
      process.stdout.write(`\n[${name}] building and starting the reference implementation (${runtime})...\n`);
      let app;
      try {
        app = await startApp(stack, ws, { runtime, workDir: path.join(outDir, name), pgAdminUrl, localPsp });
      } catch (e) {
        console.log(`[${name}] ENVIRONMENT ERROR (${e.kind || 'unknown'}): ${e.message}`);
        summary.push({ stack: name, ok: false, reason: `environment: ${e.message.split('\n')[0]}` });
        continue;
      }
      if (!app.ok) {
        console.log(`[${name}] FAILED to ${app.phase}: ${app.reason}\n${app.output}`);
        summary.push({ stack: name, ok: false, reason: `${app.phase}: ${app.reason}` });
        continue;
      }
      await app.psp.reset();
      const results = await judge(app.baseUrl, app.psp, ['smoke', 'public', 'hidden']);
      const pspStats = await app.psp.stats();
      await app.stop();
      const failed = results.filter((r) => !r.pass);
      for (const r of results) console.log(`  ${r.pass ? 'PASS' : 'FAIL'} ${r.id.padEnd(4)} ${r.name}${r.pass ? '' : `\n         ${r.error}`}`);
      if (pspStats.requests === 0) {
        console.log(`  !! The app never reached the payment provider mock. Check that the app container can reach the "psp" service.`);
      }
      console.log(`[${name}] ${results.length - failed.length}/${results.length} passed, build ${(app.buildMs / 1000).toFixed(0)} s, ${pspStats.requests} charge requests`);
      summary.push({ stack: name, ok: failed.length === 0 && pspStats.requests > 0, passed: results.length - failed.length, total: results.length, failed: failed.map((f) => f.id) });
      writeJson(path.join(outDir, name, 'results.json'), results);
    }
  } finally {
    await localPsp?.close();
  }
  console.log('\nSummary:');
  for (const s of summary) console.log(`  ${s.ok ? 'OK  ' : 'FAIL'} ${s.stack}${s.total ? ` ${s.passed}/${s.total}` : ` (${s.reason})`}${s.failed?.length ? ` failed: ${s.failed.join(', ')}` : ''}`);
  return summary.every((s) => s.ok);
}
