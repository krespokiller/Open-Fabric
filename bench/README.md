# openfabric-bench

An experiment that measures one thing: **does a small model build correct software with fewer tokens when it works from verified OpenFabric pieces, instead of writing everything from scratch or from documentation?**

[Español](README.es.md)

## Design

Every arm gets the same task ([task/task.md](task/task.md)): a checkout service with a new-customer discount (half-to-even rounding and a cap), idempotency, stock that never goes negative under concurrency, an HMAC-signed payment webhook, a balanced ledger and authorization. Same model, same maximum number of calls, same starting project per stack.

| Arm | What the model gets besides the task | Feedback after each attempt |
| --- | --- | --- |
| `bare` | nothing | build/start + 4 smoke checks |
| `docs` | library and framework documentation for the stack, Context7-style ([arms/docs](arms/docs)) | build/start + smoke |
| `tests` | the list of public tests | build/start + smoke + 8 public tests |
| `of-spec` | the OpenFabric piece `commerce.checkout`: rules, examples, invariants, reference design ([piece.md](arms/openfabric/piece.md)) | build/start + smoke + 8 public tests |
| `of-code` | the piece **already installed as read-only code**; the model mounts it and fills the discount slot | build/start + smoke + 8 public tests |

**Stop rule (same for every arm):** a run stops when every check its arm can see passes, or when the budget runs out, so arms that see more checks may use more calls. **`tests` is the control:** it has the same feedback and stop rule as `of-spec`, without the piece, so `of-spec` versus `tests` measures the value of the piece rather than the value of having tests.

**The judge** is a hidden suite of 21 black-box HTTP tests ([suites/hidden.mjs](suites/hidden.mjs)) that no model ever sees. It runs at the end of each run on a fresh start with an empty database. Its values differ from those in the task, the piece and the public tests.

**Stacks:** Next.js 16 + Postgres (primary; the only one with a code piece), Django 5.2, Spring Boot 3.5 and Laravel 12, all on PostgreSQL.

**Per-run metrics:** input and output tokens, calls, attempts, hidden tests passed, wall time and stop reason. **Headline metric:** total tokens per passed hidden test.

## What has been validated

| Stack | Reference implementation | Validated by the authors |
| --- | --- | --- |
| Next.js | 33/33 tests (smoke, public, hidden) | Yes, native runtime with a local PostgreSQL |
| Django | 33/33 | Yes, native runtime with a local PostgreSQL |
| Spring Boot | written and reviewed | **No**: no Maven Central access in the authoring environment |
| Laravel | written, reviewed, syntax-checked | **No**: no Packagist access in the authoring environment |

Mutation checks confirmed that the judge catches a stock race (H15), a missing signature check (H16), a replay that creates a second order (H09, H10) and a discount without cap or half-even rounding (H05 to H07). An independent review looked for bias and bugs; its findings are fixed. The Docker runtime was not exercised in the authoring environment, so step 1 below is mandatory.

## Quick start

```bash
# 1. The judge must be fair on your machine: all four stacks must report 33/33 and some charge requests.
node src/cli.mjs validate-gold

# 2. The harness end to end with a fake model (no tokens spent).
node src/cli.mjs selftest --stacks nextjs,django

# 3. A model in Docker Model Runner (Docker Desktop: Settings > AI > enable Model Runner and host-side TCP on 12434).
docker model pull ai/qwen2.5-coder
docker model configure --context-size 32768 ai/qwen2.5-coder

# 4. A pilot: 9 cells x 3 runs.
node src/cli.mjs run --model ai/qwen2.5-coder --stacks nextjs,django --runs 3 --budget 6 --label "pilot"

# 5. The full matrix: 17 cells x 5 runs.
node src/cli.mjs run --model ai/qwen2.5-coder --runs 5 --budget 8
```

The default `--base-url` is `http://localhost:12434/engines/v1`; any OpenAI-compatible endpoint works (`--base-url`, `--api-key`). The llama.cpp default context of 4,096 tokens is too small: first prompts are 2,400 to 4,300 tokens and later ones include the code written so far. A context overflow stops the matrix with a clear message instead of being scored as a model failure.

Re-running with the same `--out` directory resumes: finished runs are skipped, and runs that hit environment errors (model server down, Docker out of disk, container clock skew) are retried; they are never counted. The harness refuses to resume if the model, temperature, budget or any experiment file changed.

Results land in `results/<dir>/`: `report.md` (tables per stack and arm with mean ± sd, per-test pass rates, stop reasons, uncounted runs, hashes, machine), `runs.csv`, and `runs/*/` with `metrics.json`, `transcript.jsonl` and the produced `workspace/`.

## Rules for a credible result

1. Fix the success criterion before running and publish it before the numbers. Suggested: OpenFabric wins if, on every stack, `of-spec` passes more hidden tests than `tests` and spends at least 30% fewer tokens per passed test. Secondary comparison: `of-spec` versus `docs`.
2. Never edit experiment files after seeing results. The report prints the experiment hash and each suite's SHA-256.
3. Publish everything, including runs where OpenFabric loses.
4. At least 3 runs per cell, ideally 5: the same task can vary up to 30x in tokens between runs.
5. Check the report's token-usage warning: some llama.cpp-based servers report only non-cached prompt tokens.

## Limitations

- One piece only (checkout), not a catalog.
- The same author wrote the piece and the judge. Hidden values differ, every arm's task states the same rules and the references pass 100%, but a second hidden suite written by someone who has not seen the piece would be better.
- `of-code` is partly correct by construction: its installed code is the reference validated against the judge, so its result measures mounting and slot-filling, not the piece's correctness.
- The `docs` bundle was curated by us, deliberately generous (it covers PostgreSQL concurrency and rounding) so the alternative competes at its best.
- The agent loop is minimal: each call gets the task, the arm's context, the current files and the last feedback; the model cannot run commands. Results apply to this loop, not to every coding agent.
- `of-code` exists only for Next.js. On the other stacks OpenFabric contributes the spec and tests, not code: the layer that has to work on any stack.
- Versions are not fully pinned (Laravel via `laravel/laravel:^12.0`, minor-version image tags). Compare cells run on the same machine in the same days.
- If the model server reports no token usage, tokens are estimated as characters / 4 and the report says so.

## Native mode

For harness development without Docker. Needs a local PostgreSQL and each stack's toolchain; Laravel has no native mode. The app binds host port 8080. Native runs do not replace Docker validation.

```bash
node src/cli.mjs validate-gold --runtime native --stacks nextjs,django --pg-admin-url postgres://postgres@127.0.0.1:5432/postgres
```

## Layout

```
task/task.md                 the task, identical for every arm
arms/docs/                   per-stack documentation (docs arm)
arms/openfabric/piece.md     the commerce.checkout piece (tests, of-spec, of-code arms)
arms/openfabric/code/nextjs  the piece as installable code (of-code arm)
stacks/<stack>/skeleton      the starting project
stacks/<stack>/gold          the reference implementation (validate-gold and selftest only)
stacks/<stack>/stack.json    how to build, start and show the project
suites/                      smoke, public and hidden tests (the judge)
src/                         the harness; src/psp.mjs is the mock payment provider
```

In Docker each attempt starts three containers (PostgreSQL, the mock payment provider and the app) and removes them, including the app image, when it ends. Ctrl+C cleans up open containers and databases before exiting.

License: Apache 2.0 (see [LICENSE](../LICENSE)).
