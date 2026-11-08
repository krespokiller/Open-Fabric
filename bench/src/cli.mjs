#!/usr/bin/env node
import path from 'node:path';
import { parseArgs } from 'node:util';
import { ROOT } from './util.mjs';
import { listStacks } from './workspace.mjs';

const HELP = `openfabric-bench

Usage:
  node src/cli.mjs validate-gold [--stacks a,b] [--runtime docker|native] [--pg-admin-url URL]
  node src/cli.mjs run --model NAME [--base-url URL] [--api-key KEY] [--stacks a,b] [--arms a,b]
                       [--runs N] [--budget N] [--temperature T] [--max-tokens N]
                       [--runtime docker|native] [--pg-admin-url URL] [--out DIR] [--label TEXT]
  node src/cli.mjs report DIR
  node src/cli.mjs selftest [--stacks a,b] [--runtime docker|native] [--pg-admin-url URL]

Stacks: ${'%STACKS%'}
Arms:   bare, docs, tests, of-spec, of-code (all by default; tests is the control for the piece)
        of-code runs only where the stack has a code piece (nextjs)
`;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    stacks: { type: 'string' },
    arms: { type: 'string' },
    runs: { type: 'string', default: '5' },
    budget: { type: 'string', default: '8' },
    model: { type: 'string' },
    'base-url': { type: 'string', default: process.env.OF_BASE_URL || 'http://localhost:12434/engines/v1' },
    'api-key': { type: 'string', default: process.env.OF_API_KEY || '' },
    temperature: { type: 'string', default: '0.2' },
    'max-tokens': { type: 'string', default: '8192' },
    runtime: { type: 'string', default: 'docker' },
    'pg-admin-url': { type: 'string', default: process.env.OF_PG_ADMIN_URL },
    out: { type: 'string' },
    label: { type: 'string', default: '' },
    help: { type: 'boolean', short: 'h' },
  },
});

const cmd = positionals[0];
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const stacks = values.stacks ? values.stacks.split(',').map((s) => s.trim()) : listStacks();

if (!cmd || values.help) {
  console.log(HELP.replace('%STACKS%', listStacks().join(', ')));
  process.exit(0);
}

try {
if (cmd === 'validate-gold') {
  const { validateGold } = await import('./gold.mjs');
  const ok = await validateGold({
    stacks,
    runtime: values.runtime,
    pgAdminUrl: values['pg-admin-url'],
    outDir: values.out || path.join(ROOT, 'results', `gold-${stamp}`),
  });
  process.exit(ok ? 0 : 1);
} else if (cmd === 'run' || cmd === 'selftest') {
  const { runMatrix } = await import('./matrix.mjs');
  await runMatrix({ cmd, values, stacks, stamp });
} else if (cmd === 'report') {
  const { writeReport } = await import('./report.mjs');
  const dir = positionals[1];
  if (!dir) throw new Error('usage: report DIR');
  const file = writeReport(path.resolve(dir));
  console.log(`report written to ${file}`);
} else {
  console.error(`unknown command "${cmd}"\n`);
  console.log(HELP.replace('%STACKS%', listStacks().join(', ')));
  process.exit(2);
}
} catch (e) {
  console.error(`\nError: ${e.message}`);
  process.exit(1);
}
