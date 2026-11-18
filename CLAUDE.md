# OpenFabric: instructions for coding agents

Read [`docs/README.md`](docs/README.md) first, then [`docs/method.md`](docs/method.md). The method is binding: no experiment runs without its controls, and no claim goes beyond the scope of its verdict.

Documentation is in English. The root README and the bench README also have a Spanish version (`README.es.md`); keep both in step. `docs/context.md` is the archived Spanish record: do not update it.

## What this repo is right now

A research repo. The purpose: test whether an AI agent builds correct software more cheaply by assembling verified pieces than by writing from scratch. The research is the means; the end is a decision about what to build, taken with the decision map in [`docs/decisions.md`](docs/decisions.md).

There is no product code. Do not write any until a gate in the decision map is met.

| Folder | Holds |
| --- | --- |
| `docs/` | Vision, method, model, thesis registry, decisions, roadmap, instrument architecture |
| `experiments/` | One record per experiment: design, decision rule, data, verdict |
| `research/` | Literature and competitor studies |
| `bench/` | The instrument: task, arms, stacks, suites, harness. Plain Node 22, no npm dependencies |
| `analysis/` | The statistics: decision rule, simulator, analysis of `runs.csv`. Kept outside `bench/` so the frozen harness hash never changes with the analysis |

## bench/ in one paragraph

Every arm gets the same task (`bench/task/task.md`, a checkout service) in one of four stacks (`bench/stacks/{nextjs,django,spring,laravel}`). The full-task arms (`bare`, `docs`, `tests`, `of-spec`, `of-code`) build the service from the skeleton. The kit arms (`kit-bare`, `kit-tests`) install the reference service and let the model write one slot (one business rule) per run; they exist for Next.js and Django. A run is a loop of model calls with build and test feedback. At the end, the hidden suite `bench/suites/hidden.mjs` (21 black-box HTTP tests) and `bench/suites/hidden2.mjs` (26 tests, written independently from `task.md` only) judge it. See [`docs/architecture.md`](docs/architecture.md).

## Commands

```bash
# from bench/
node src/cli.mjs validate-gold --stacks nextjs,django   # references must pass 59/59 per stack (Docker)
node src/cli.mjs selftest --stacks nextjs,django        # whole loop with a fake model, no tokens
node --test test/                                       # unit tests of the kit arms
node src/cli.mjs run --model <name> --stacks nextjs,django --runs 3 --budget 6
node src/cli.mjs report results/<dir>

# from analysis/
node --test                                             # statistics tests
```

For harness work without Docker: `--runtime native --pg-admin-url postgres://...` (needs a local PostgreSQL; the app binds port 8080; Laravel has no native mode).

## Rules

- **The hidden suites are the judge.** Never show `bench/suites/hidden.mjs` or `bench/suites/hidden2.mjs`, or their values, to a model under test, and never put their contents in any arm's context, including examples inside a piece.
- **Follow the loop in `docs/method.md`**: thesis, design, controls, exploratory campaign, preregistration, confirmatory campaign, report, decision. Record every experiment under `experiments/` from `experiments/TEMPLATE.md`, and update `docs/theses.md` and `docs/roadmap.md` after each report.
- **Publish every result**, whether it helps the idea or not. Never edit a report to improve a verdict; append dated corrections.
- **After changing anything in `bench/stacks/`**, run `validate-gold` for that stack; the reference must stay at 59/59.
- **After changing anything in `bench/src/` or `bench/suites/`**, run the selftest and the unit tests.
- **After changing anything in `analysis/`**, run its tests.
- **Do not change experiment files during or after a campaign you intend to compare.** The harness hashes `task/`, `arms/`, `suites/`, `src/` and `stacks/` and refuses to resume when the hash changes. New changes mean a new results directory.
- **Keep the arms comparable.** If you add context to one arm, check that the change is the intended treatment and not an accidental advantage.
- **Say who decided what.** A criterion or a decision proposed by an assistant is recorded as proposed until the owner confirms it.
- `bench/results/` is gitignored. The data behind each record (`runs.csv`, the harness report) is copied next to the record after a scan for local paths and hidden-test names.
- No usernames, emails, absolute local paths or hostnames in anything committed.
- Work lands on `main` with conventional commits and is pushed as it lands.

## Known gaps

The open problems of the instrument and their proposed fixes are listed under "Scaling gaps" in [`docs/architecture.md`](docs/architecture.md) and under "Now" in [`docs/roadmap.md`](docs/roadmap.md).
