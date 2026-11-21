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

**The judge** is a hidden suite of 21 black-box HTTP tests ([suites/hidden.mjs](suites/hidden.mjs)) that no model ever sees. It runs at the end of each run on a fresh start with an empty database. A second hidden suite of 26 tests ([suites/hidden2.mjs](suites/hidden2.mjs)) was written by an agent that read only the task and the suite helpers, never the piece or the first suite; its score is reported separately to check that results do not depend on who wrote the judge. Its values differ from those in the task, the piece and the public tests.

**Stacks:** Next.js 16 + Postgres (primary; the only one with a code piece), Django 5.2, Spring Boot 3.5 and Laravel 12, all on PostgreSQL.

**Per-run metrics:** input and output tokens, calls, attempts, hidden tests passed, wall time and stop reason. **Headline metric:** total tokens per passed hidden test.

## What has been validated

| Stack | Reference implementation | Validated |
| --- | --- | --- |
| Next.js | 59/59 tests (smoke, public, both hidden suites) | Docker (2026-11-09) |
| Django | 59/59 | Docker (2026-11-09) |
| Spring Boot | 59/59 | Docker (2026-11-09) |
| Laravel | 59/59 | Docker (2026-11-09) |

Mutation checks confirmed that the judge catches a stock race (H15), a missing signature check (H16), a replay that creates a second order (H09, H10) and a discount without cap or half-even rounding (H05 to H07). An independent review looked for bias and bugs; its findings are fixed. Docker mode has been validated on all four stacks, but step 1 below is still mandatory on every new machine.

## Quick start

```bash
# 1. The judge must be fair on your machine: all four stacks must report 59/59 and some charge requests.
node src/cli.mjs validate-gold

# 2. The harness end to end with a fake model (no tokens spent).
node src/cli.mjs selftest --stacks nextjs,django

# 3. A model in Docker Model Runner (Docker Desktop: Settings > AI > enable Model Runner and host-side TCP on 12434).
docker model pull hf.co/bartowski/Qwen2.5-Coder-7B-Instruct-GGUF:Q4_K_M
docker model configure --context-size 32768 hf.co/bartowski/Qwen2.5-Coder-7B-Instruct-GGUF:Q4_K_M

# 4. A pilot: 9 cells x 3 runs.
node src/cli.mjs run --model hf.co/bartowski/Qwen2.5-Coder-7B-Instruct-GGUF:Q4_K_M --stacks nextjs,django --runs 3 --budget 6 --label "pilot"

# 5. The full matrix: 17 cells x 5 runs.
node src/cli.mjs run --model hf.co/bartowski/Qwen2.5-Coder-7B-Instruct-GGUF:Q4_K_M --runs 5 --budget 8
```

The default `--base-url` is `http://localhost:12434/engines/v1`; any OpenAI-compatible endpoint works (`--base-url`, `--api-key`). `ai/qwen2.5-coder` is no longer on Docker Hub. Use a **single-file** GGUF: multi-file (split) GGUFs such as the official `Qwen/Qwen2.5-Coder-7B-Instruct-GGUF` fail to load in Docker Model Runner with `invalid split file name`. A 7B model on CPU is not viable for the pilot: on a 12-core machine we measured ~2 output tokens/s, about 40 minutes per call, so enable GPU inference. The llama.cpp default context of 4,096 tokens is too small: first prompts are 2,400 to 4,300 tokens and later ones include the code written so far. A context overflow stops the matrix with a clear message instead of being scored as a model failure.

Re-running with the same `--out` directory resumes: finished runs are skipped, and runs that hit environment errors (model server down, Docker out of disk, container clock skew) are retried; they are never counted. The harness refuses to resume if the model, temperature, budget, slot list or any experiment file changed.

Results land in `results/<dir>/`: `report.md` (tables per stack and arm with mean ± sd, per-test pass rates, correct at the first attempt, stop reasons, uncounted runs, hashes, machine), `runs.csv`, `attempts.csv`, and `runs/*/` with `metrics.json`, `transcript.jsonl` and the produced `workspace/`.

### The hidden suites after every attempt

Both hidden suites also run after every attempt, on the same running app that the visible checks just used, and the result is recorded (`judgeCorrect`, `judgeTestsRun`, `judgeFirstFail` and `judgeMs` in the attempt's entry of `metrics.json`). It exists so that arms can be compared with the calls held equal (every arm scored at its first attempt) and so that the sensitivity and specificity of the gauge can be estimated per attempt. The model never sees any of it: the judgement runs after the logs for the model were read, it stops at the first failing test, it is not part of the feedback, the history or the transcript, and the stop rule still reads the visible checks only, so the prompts and the number of calls do not change. The final judgement on a fresh build with an empty database, which runs every test, remains the primary metric. If the last attempt and the final judgement ever disagree on the same code, the report warns and the selftest fails.

### `runs.csv` columns

One row per run, in the order of `runs/`. The first 20 columns are fixed for compatibility; new columns are only appended.

| Column | Meaning |
| --- | --- |
| `stack`, `arm`, `run` | The cell and the run index (1-based). A kit arm is `kit-bare.<slot>` or `kit-tests.<slot>` |
| `calls` | Model calls used |
| `prompt_tokens`, `completion_tokens`, `total_tokens` | Input, output and total tokens, summed over the calls. `tokens_estimated` is `true` when the server reported no usage and they are characters / 4 |
| `hidden_passed`, `hidden_total` | Tests passed and run in the first hidden suite |
| `hidden2_passed`, `hidden2_total` | The same for the second hidden suite |
| `stop_reason` | `visible_checks_pass` or `budget` |
| `built_final` | The final fresh build started |
| `wall_ms`, `model_ms`, `build_ms` | Wall time, time in model calls and time building |
| `slot` | The slot a kit run fills (`discount`, `cart`, ...). Empty for the full-task arms |
| `gauge_pass` | `1` when every check visible to that arm (smoke, plus the public tests for `tests`, `of-spec`, `of-code` and `kit-tests`) passed in the last attempt, else `0`. It is the stop rule: `1` exactly when `stop_reason` is `visible_checks_pass` |
| `correct` | `1` when the run passes every test of both hidden suites (and both suites ran), else `0`. The report's "Runs passing both suites" counts these |
| `first_correct` | `1` when the hidden suites passed in full on the state after attempt 1, else `0`. Empty for results recorded before the per-attempt judgement |
| `first_correct_attempt` | The number of the first attempt whose state passed both hidden suites in full. Empty when no attempt did, and for older results |
| `judge_agrees` | `1` when the hidden judgement of the last attempt equals the final judgement (both say correct, or both say not), else `0`. A `0` means the judge gave two answers on the same code and the instrument must be checked. Empty for older results |

### `attempts.csv` columns

One row per attempt of every run, next to `runs.csv`. It holds counts and flags only, never a hidden test id or name.

| Column | Meaning |
| --- | --- |
| `stack`, `arm`, `slot`, `run` | As in `runs.csv` (a kit arm is `kit-bare.<slot>`) |
| `attempt` | The attempt number, from 1 |
| `built` | `1` when the app built and started |
| `visible_passed`, `visible_total` | Visible checks passed and run in that attempt |
| `gauge_pass` | `1` when the app built and every visible check passed in that attempt |
| `judge_correct` | `1` when the hidden suites passed in full on that attempt's state, else `0`. Empty for results recorded before the per-attempt judgement |
| `prompt_tokens`, `completion_tokens` | Tokens of that attempt's model call |

### Controls

A control answers a question the method asks before any experiment runs (`docs/method.md`). `controls/unfilled-slots.mjs` is the control "Empty" of the kit arms: for each slot of each stack it installs the reference, leaves that one slot as its unfilled stub (exactly what a kit run starts from), starts the app on an empty database, resets the payment mock and runs `smoke`, `public`, `hidden` and `hidden2` on that instance. It prints one row per stack and slot with the counts of each suite, writes the same rows to `<out>/unfilled-slots.csv` and never prints or writes a hidden test id, name or value.

```bash
node controls/unfilled-slots.mjs --stacks nextjs,django [--slots cart,ledger] [--out results/<dir>]
```

It needs Docker and takes roughly 15 to 25 minutes for two stacks and five slots. Read the exit code: `0` means every control built, started and failed at least one test in each hidden suite, so no unfilled slot is correct by construction; `1` means a control passed a hidden suite in full, or did not build or start (it then says nothing), or the arguments were wrong, with one line per problem on stderr; `2` means an environment error (Docker, database). The first and last lines of stdout are the experiment hash before and after; the script exits `1` if they differ.

`controls/` is outside the experiment hash on purpose (the hash covers `task/`, `arms/`, `suites/`, `src/` and `stacks/`), so a control can be added or changed without changing the instrument. The script only imports from `src/`; it refuses an `--out` folder inside a hashed folder. The control can be interrupted and run again with the same `--out`; it continues where it stopped (each row is appended to the CSV as soon as its cell is judged, finished cells are skipped, and a CSV recorded under another experiment hash is refused).

## Rules for a credible result

1. Fix the success criterion before running and publish it before the numbers: use the decision rule in [`docs/method.md`](../docs/method.md) (section "The decision rule"), with its smallest difference that matters preregistered.
2. Never edit experiment files after seeing results. The report prints the experiment hash and each suite's SHA-256.
3. Publish everything, including runs where OpenFabric loses.
4. At least 3 runs per cell, ideally 5: the same task can vary up to 30x in tokens between runs.
5. Check the report's token-usage warning: some llama.cpp-based servers report only non-cached prompt tokens.

## Limitations

- One piece only (checkout), not a catalog.
- The same author wrote the piece and the first hidden suite. Hidden values differ, every arm's task states the same rules and the references pass 100%. A second hidden suite (`hidden2`) was written by an agent that never saw the piece or the first suite; a suite written by an independent person would be stronger still.
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
controls/                    controls run before an experiment; outside the experiment hash
```

In Docker each attempt starts three containers (PostgreSQL, the mock payment provider and the app) and removes them, including the app image, when it ends. Ctrl+C cleans up open containers and databases before exiting.

License: Apache 2.0 (see [LICENSE](../LICENSE)).
