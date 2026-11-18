// Entry point for `node --test analysis/` from the repository root.
// Node 22 runs a directory argument as one test file, through "main" in package.json;
// this file loads every *.test.mjs next to it, so that one command runs them all.
import { readdirSync } from 'node:fs';

const here = new URL('.', import.meta.url);
for (const name of readdirSync(here).filter((file) => file.endsWith('.test.mjs')).sort()) {
  await import(new URL(name, here));
}
