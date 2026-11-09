# OpenFabric: instructions for Claude Code

Read `docs/context.md` first: it has the thesis, the decisions made, what was discarded and the open questions. The owner works in Spanish; write internal docs in Spanish and keep public READMEs in English with a Spanish version.

## What this repo is right now

A research repo. The only code is `bench/`, an experiment that measures whether verified OpenFabric pieces let a small model build correct software with fewer tokens. There is no product code yet. Do not start building the product until the experiment says it is worth it.

## bench/ in one paragraph

Every arm (`bare`, `docs`, `tests`, `of-spec`, `of-code`) gets the same task (`bench/task/task.md`, a checkout service) and builds it in one of four stacks (`bench/stacks/{nextjs,django,spring,laravel}`). A run is a stateless loop of model calls with build/test feedback. At the end, the hidden suite `bench/suites/hidden.mjs` (21 black-box HTTP tests, never shown to models) judges it; `bench/suites/hidden2.mjs` (26 tests, written independently from `task.md` only) is reported as a separate score. The harness is plain Node 22 with no npm dependencies (`bench/src`).

## Commands (run from bench/)

```bash
node src/cli.mjs validate-gold                 # references must pass 59/59 per stack (Docker)
node src/cli.mjs selftest --stacks nextjs,django   # whole loop with a fake model, no tokens
node src/cli.mjs run --model <name> --stacks nextjs,django --runs 3 --budget 6
node src/cli.mjs report results/<dir>
```

For harness work without Docker: `--runtime native --pg-admin-url postgres://...` (needs a local PostgreSQL; the app binds port 8080; Laravel has no native mode).

## Rules

- **The hidden suites are the judge.** Never show `bench/suites/hidden.mjs` or `bench/suites/hidden2.mjs` (or their values) to a model under test, and never put its contents in any arm's context.
- **After changing anything in `bench/stacks/`**, run `validate-gold` for that stack; the reference must stay at 59/59.
- **After changing anything in `bench/src/` or `bench/suites/`**, run `selftest --stacks nextjs,django` (native is fine for development).
- **Do not change experiment files during or after a results run you intend to compare.** The harness hashes `task/`, `arms/`, `suites/`, `src/` and `stacks/` (except `gold/`) and refuses to resume when the hash changes. New changes mean a new results directory.
- **Keep the arms comparable.** If you add context to one arm, check that the change is the intended treatment and not an accidental advantage (the `docs` and `of-spec` contexts are both about 1,600 tokens on purpose).
- `results/` is gitignored. Publishing results is a separate decision.

## Known gaps (from the last review)

- The piece and the first hidden suite were written by the same author. `hidden2` was written by an agent that never saw the piece; a suite by an independent person would be stronger.
- A 7B model on CPU is too slow for the pilot (~2 output tokens/s measured); use GPU inference.
- Versions are not fully pinned (Laravel `^12.0`, minor image tags).
