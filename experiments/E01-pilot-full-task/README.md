# E01: Pilot, the full task with a small model

**T1, T2 and T3 are `undecidable`.** All 18 runs scored 0 of 21 and 0 of 26 hidden tests, in every arm and both stacks. That is a floor effect: there is nothing to compare, so the pilot says neither that the piece helps nor that it does not. T4 never ran. What the pilot does show is that a 7B local model cannot build the full task in this loop.

| Field | Value |
| --- | --- |
| Status | `reported` |
| Kind | confirmatory, stopped early |
| Dates | 2026-11-09, 21:29 UTC, to 2026-11-10, 00:13 UTC |
| Theses | T1, T2, T3, T4, defined in [`docs/theses.md`](../../docs/theses.md) |
| Research questions | RQ2 Assembly (T1, T2, T3); RQ5 Stack (T4) |
| Scope | Next.js and Django; Qwen2.5-Coder 7B (Q4_K_M) on a local GPU; the checkout task; a loop of at most 6 calls |
| Tag and hash | Tag `piloto-preregistro-2` on commit `c90c80a`; harness hash `e3cd4befe3a7b2e4c966107b72777d492143bf0483b4c0e51eb6b2f467107c88` |
| Data | [`data/runs.csv`](data/runs.csv), [`data/report.md`](data/report.md), [`data/attempts.csv`](data/attempts.csv), [`data/aborted-attempt.csv`](data/aborted-attempt.csv) |

## 1. Verdict per thesis

The criteria were fixed on 2026-11-09, before any model result, and are quoted from [`docs/context.md`](../../docs/context.md) as it stood at the tag.

| Thesis | Claim | Primary comparison and criterion | Verdict | Reason |
| --- | --- | --- | --- | --- |
| T1 | With the piece, a small model reaches correct software spending less | In each stack, `of-spec` passes more hidden tests (`hidden`, mean per run) than `tests` and spends at least 30% fewer tokens per passed test | `undecidable` | Both arms passed 0 tests. "Tokens per passed test" has no denominator |
| T2 | With the piece it comes out correct the first time | In each stack, `of-spec` has more fully correct runs than `tests` | `undecidable` | 0 of 2 against 0 of 2 in each stack |
| T3 | The judge is not biased in favour of the piece | In each stack, `of-spec` also beats `tests` on the mean of `hidden2` | `undecidable` | 0 of 26 in every run of both arms |
| T4 | It works in any stack, including legacy | T1 also holds in Spring Boot and Laravel (full matrix) | None | It never ran on Spring Boot or Laravel |

Scope of the verdicts: the 7B model, Next.js and Django, one task, this loop, 18 of 27 planned runs.

T4 is superseded by T20. T20 was proposed by the assistant on 2026-11-17 and the owner has not confirmed it.

## 2. Design as preregistered

| Item | Value |
| --- | --- |
| Arms | `bare`, `docs`, `tests`, `of-spec`, `of-code` (table below) |
| Stacks | Next.js and Django, both on PostgreSQL, in Docker |
| Model and settings | `hf.co/bartowski/Qwen2.5-Coder-7B-Instruct-GGUF:Q4_K_M`, temperature 0.2, at most 8,192 output tokens per call, context 32,768 |
| Task | A checkout service: discount with half-to-even rounding and a cap, idempotency, stock under concurrency, a signed payment webhook, a balanced ledger, authorization. See [`bench/README.md`](../../bench/README.md) |
| Runs per cell and call budget | 3 runs per cell, 9 cells, 27 runs; at most 6 calls per run |
| Primary metric | T1: hidden tests passed (mean per run) and tokens per passed test. T2: fully correct runs. T3: mean of `hidden2` |
| Secondary comparison | `of-spec` against `docs` |
| Analysis | Per stack. No test and no pooling rule were written |
| Stopping rule | Per run: stop when every check the arm can see passes, or when the budget runs out. For the experiment: none was written |
| Tag, commit and hash | Tag `piloto-preregistro-2`, commit `c90c80a`, created 9 seconds before the first run. Hash above. The tag name predates the `prereg/E<nn>` convention |

| Arm | What the model gets besides the task | Feedback after each attempt |
| --- | --- | --- |
| `bare` | Nothing | Build and start, plus 4 smoke checks |
| `docs` | Library and framework documentation for the stack | Build and start, plus smoke |
| `tests` | The list of public tests | Build and start, smoke, 8 public tests |
| `of-spec` | The piece: rules, examples, invariants, reference design | Build and start, smoke, 8 public tests |
| `of-code` | The piece installed as read-only code; the model mounts it and fills the discount slot. Next.js only | Build and start, smoke, 8 public tests |

The judge is two hidden suites of black-box HTTP tests: `hidden` (21 tests) and `hidden2` (26 tests, written from the task alone). Their SHA-256 hashes are in [`data/report.md`](data/report.md).

Machine: Windows on x64, 12 logical CPUs, 16 GB of RAM, an 8 GB GPU, Node 22.19.

## 3. Controls and the exploratory run

| Control | Result |
| --- | --- |
| Reference | [`bench/README.md`](../../bench/README.md) records 59 of 59 tests on all four stacks in Docker on 2026-11-09. The validation output kept with the raw results is older: 33 of 33 per stack, from before `hidden2` existed |
| Empty | Not run before the pilot. Done afterwards in [E02](../E02-no-model-controls/README.md) |
| Can it fail | Not checked |
| Denominator | Not checked. T1 divides tokens by tests passed, which is undefined when an arm passes none. That is what happened |
| Exploratory run | None. The pilot was the first contact between the model and the task |

## 4. Results per stack, then pooled

The numbers below are recounted from [`data/runs.csv`](data/runs.csv) and [`data/attempts.csv`](data/attempts.csv). Four facts come from the raw per-run data instead, which stays outside git: which visible check passed, how runs ended, the migration files, and the files each `of-code` attempt wrote. A correct run passes every test of both hidden suites. "Compiled" means the project built and started after the attempt.

### Django

| Arm | Runs | Correct runs | `hidden` passed | `hidden2` passed | Tokens | Attempts compiled |
| --- | --- | --- | --- | --- | --- | --- |
| `bare` | 2 | 0 | 0 of 42 | 0 of 52 | 102,601 | 0 of 12 |
| `docs` | 2 | 0 | 0 of 42 | 0 of 52 | 105,182 | 7 of 12 |
| `tests` | 2 | 0 | 0 of 42 | 0 of 52 | 105,297 | 6 of 12 |
| `of-spec` | 2 | 0 | 0 of 42 | 0 of 52 | 119,552 | 7 of 12 |
| Total | 8 | 0 | 0 of 168 | 0 of 208 | 432,632 | 20 of 48 |

### Next.js

| Arm | Runs | Correct runs | `hidden` passed | `hidden2` passed | Tokens | Attempts compiled |
| --- | --- | --- | --- | --- | --- | --- |
| `bare` | 2 | 0 | 0 of 42 | 0 of 52 | 108,494 | 0 of 12 |
| `docs` | 2 | 0 | 0 of 42 | 0 of 52 | 111,556 | 0 of 12 |
| `tests` | 2 | 0 | 0 of 42 | 0 of 52 | 98,299 | 0 of 12 |
| `of-spec` | 2 | 0 | 0 of 42 | 0 of 52 | 131,539 | 0 of 12 |
| `of-code` | 2 | 0 | 0 of 42 | 0 of 52 | 71,298 | 5 of 12 |
| Total | 10 | 0 | 0 of 210 | 0 of 260 | 521,186 | 5 of 60 |

### Pooled

| Measure | Value |
| --- | --- |
| Runs counted | 18 of 27 planned |
| Correct runs | 0 of 18. 95% Wilson interval: 0% to 17.6% |
| Primary comparison, `of-spec` against `tests` | 0 of 4 against 0 of 4 (each 0% to 49.0%). Per stack, 0 of 2 against 0 of 2 (each 0% to 65.8%) |
| Hidden tests passed | 0 of 378 in `hidden`, 0 of 468 in `hidden2` |
| Tokens | 953,818: 735,203 input and 218,615 output |
| Calls | 108. Every run used its full budget of 6 |
| Attempts compiled | 25 of 108. In 3 of the 25 the answer applied no file, so the earlier files compiled again |
| Next.js, the four from-scratch arms | 0 of 48 attempts compiled |
| Visible checks | Every compiled attempt passed exactly one visible check, the health check |
| Retries identical to the previous answer | 24 of 90, in 14 of the 18 runs |
| Attempts that hit the output cap | 8 of 108 |
| How runs ended | Next.js: the final build failed in 10 of 10 runs. Django: the final build or start failed in 5 of 8; in the other 3 every test of `hidden` failed on an HTTP 500 |

### Why the model failed

The causes below were read in the transcripts and recorded in [`docs/context.md`](../../docs/context.md). The transcripts stay outside git. The counts are recomputed.

1. **It was asked to manufacture, not to assemble.** In `bare`, `docs`, `tests` and `of-spec` the model writes the whole service from scratch. In Next.js no attempt compiled; `docs/context.md` attributes this to TypeScript errors. In Django the model wrote models but no migrations, because it cannot run `makemigrations`: 7 of the 8 final workspaces hold no migration file.
2. **With the piece installed, it failed at mounting.** In `of-code` the model had to create 7 routes, nearly copied from an example, and the discount function: 8 files with 6 calls. 11 of the 12 attempts wrote exactly one file. In both runs the first attempt wrote the discount function and it compiled. The build broke when the model wrote `app/products/route.ts` with a handler for `GET /products/{sku}`, which belongs in `app/products/[sku]/route.ts`. From that attempt on nothing compiled: the last 4 attempts of one run and the last 3 of the other. The weak point was plugging the piece into the framework, not the hard logic.
3. **The loop gave the model no history.** Several runs repeated the same answer: 24 of 90 retries were identical to the previous one.

### Corrections

- **2026-11-11, cause 3.** The first write-up said that each attempt saw only the last error and not its previous answer. That was imprecise. The model does see its code in every call, because the project files are in the prompt. What it did not see was the history of attempts.
- **2026-11-11, cause 2.** "Fails at mounting" rests on 2 runs, in which the model wrote one file per call with 8 files to write and 6 calls. It is an observation, not a measured effect.
- **2026-11-17, cause 2.** `docs/context.md` says the model put the handler in `app/products/route.ts` "instead of" `app/products/[sku]/route.ts`. The files written show both: in each run the model wrote `app/products/[sku]/route.ts` first, and one or two attempts later added the same handler to `app/products/route.ts`. The build failed from that attempt on.
- **2026-11-18, independence of `hidden2`.** The record said that `hidden2` was independent of the piece. A scan of the arm contexts against the hidden suites found example values in the piece's example table that one test of `hidden2` also asserts. The overlap was already in place when the pilot ran. The `of-spec` arm receives the whole piece and `of-code` receives its first section, so for those two arms the suite was not fully independent. The values are not quoted here. The pilot's outcome is unaffected, because every run scored zero in both suites. The `bare`, `docs` and `tests` arms and the kit arms of [E04](../E04-slot-gauge/README.md) do not receive the table.

## 5. Deviations from the preregistration

| Deviation | What happened |
| --- | --- |
| A first attempt was aborted and the design was tagged again | The pilot first ran under tag `piloto-preregistro` (commit `2788b5e`, hash starting `3a6bc0f4e0870385`), from 2026-11-09 18:08 UTC. It was stopped after 4 of 27 runs, with a fifth in progress. The second tag gives two reasons: the machine ran out of memory, and the parser dropped answers that used fenced file blocks, which penalized `docs` and `of-spec` |
| What the data shows about the first attempt | [`data/aborted-attempt.csv`](data/aborted-attempt.csv): in the `docs` and `of-spec` runs all 12 attempts applied zero files, so only the untouched starting project was built. `bare` and `tests` wrote 22 and 27 files. All 4 runs scored 0 of 21 and 0 of 26 and used 182,597 tokens. They are not counted above |
| The fix | Commit `c90c80a` changed one file, `bench/src/protocol.mjs` (21 lines added, 1 removed), to accept both answer formats in every arm. Criteria T1 to T4 did not change |
| Early stop | The pilot was stopped on purpose at 18 of 27 runs: runs 1 and 2 of all nine cells. Run 3 of Next.js `bare` was in progress and is not counted. No stopping rule had been written |
| Runs per cell | 2 instead of 3 |

Under the rule now in [`docs/method.md`](../../docs/method.md), a change after the tag is a new experiment number. This record keeps both attempts under E01 because the claim, the metric and the criteria were the same, and it says so here.

## 6. Limits

- **Floor effect.** With zero correct runs in every arm, no comparison is readable.
- **Too few runs in any case.** With 2 runs per cell, or 4 per arm pooled, even a clean result could not have separated the arms. `docs/method.md` puts 5 runs per arm at a detectable difference of about 79 points.
- **One model, one task, two stacks.** The result says nothing about a larger model or a real agent.
- **A minimal loop.** The model cannot run commands, and each run has at most 6 calls. The result applies to this loop.
- **Authorship of the judge.** The piece and `hidden` have the same author. `hidden2` is independent, with one exception: the example table of the piece, given to the `of-spec` arm and, in part, to `of-code`, contains example values that one test of `hidden2` also asserts. For those two arms `hidden2` was not fully independent. The outcome of this pilot does not change, because every run scored zero. See the correction in section 4.
- **`of-code` is partly correct by construction** and exists only for Next.js.
- **The causes of failure cannot be rechecked from this repository.** Only the counts can, from `data/`.
- **No exploratory run and no empty control** came before the tag.

## 7. What changes

- **Registry:** T1, T2 and T3 are `undecidable`, with the scope above. T4 has no verdict and is superseded by T20, which is an assistant proposal.
- **Design decision recorded on 2026-11-09 in `docs/context.md`:** assembly is done by the tool, deterministically. Each piece brings an adapter per stack that is installed without the model. The model only fills the gaps that have a contract. The gauge must be within reach while the model works, not only at the end.
- **Method:** two rules in [`docs/method.md`](../../docs/method.md) were paid for here: an exploratory run before the criterion is fixed, and a selftest before every run.
- **Next:** [E02](../E02-no-model-controls/README.md) ran the missing controls, [E03](../E03-exploratory-loop-fixes/README.md) tested the loop fixes, and [E04](../E04-slot-gauge/README.md) moves the comparison to slot level. See [`docs/roadmap.md`](../../docs/roadmap.md).

## Data files

| File | Content |
| --- | --- |
| [`data/runs.csv`](data/runs.csv) | One row per counted run. Byte-identical to the harness output |
| [`data/report.md`](data/report.md) | The harness report. The endpoint URL is replaced by a description and the table of hidden test names is omitted |
| [`data/attempts.csv`](data/attempts.csv) | One row per run with attempt counts, derived by script from the per-run metrics and transcripts |
| [`data/aborted-attempt.csv`](data/aborted-attempt.csv) | The 4 completed runs of the aborted first attempt |

Raw workspaces, transcripts and per-run metrics stay outside git.
