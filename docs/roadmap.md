# Roadmap

The instrument for E04 is landed on `main` and was hardened on 2026-11-18: the four problems that blocked the preregistration are closed. The judge result of each attempt has been recorded since 2026-11-18. The E04 exploratory campaign ran on 2026-11-18 on the local 7B model: both arms had 4 of 10 runs correct, with no verdict. The owner confirmed the E04 criteria, and E04 was preregistered on 2026-11-21 with the tag `prereg/E04`. The next step is the confirmatory campaign of 100 runs and its analysis. Nothing of the product is built, and no product code is written before a gate in the [decision map](decisions.md#decision-map) is met.

| Horizon | Work | Theses | Waits for |
| --- | --- | --- | --- |
| [Now](#now) | The E04 confirmatory campaign of 100 runs and its analysis (preregistered on 2026-11-21; the exploratory campaign ran on 2026-11-18) | T11, T12, T13, T22 | Nothing. The tag `prereg/E04` is set |
| [Next](#next) | E05 local variant (7B), if the owner chooses it, then E07, E06, E08 | T14 and T20 for the E05 local variant, then T18, T17, T19 | The report of E04, and the exploratory run of each experiment |
| [Later](#later) | Stronger models, the full E05 (T15 and T16 included), Go as a fifth stack, the frontend gauge | T6, T15, T16, T21, T7 | The owner's decision on model and budget. T14 supported |

This roadmap was proposed by the assistant on 2026-11-17, from the owner's statement of the same day: research first, several theses on several stacks, and decide from the results. The instrument state and the order of the "Now" steps were updated on 2026-11-18. The order of those steps is a proposal of the assistant. The owner's standing instruction of 2026-11-17 is to start testing the theses once the path is clear.

## Where things stand (2026-11-18)

| Item | State |
| --- | --- |
| Phase | Validate the thesis before building |
| Instrument | Validated in Docker in the four stacks. Each reference passes 59 of 59 tests: 4 smoke checks, 8 public tests, and the two hidden suites of 21 and 26. The slot instrument for E04 was committed on `main` in `759051f`, and hardened on 2026-11-18. After the judge client fix, `validate-gold` passed 59 of 59 on Next.js and Django three times in a row, and on Spring Boot and Laravel once. The five problems found after the landing are closed, the fifth (per-attempt judge results) on 2026-11-18. Every attempt that builds and starts is judged since 2026-11-18 (see section 3) |
| Model | Qwen2.5-Coder 7B Instruct, Q4_K_M quantization, on GPU: about 1,400 tokens per second reading and about 55 writing. The exact identifier is in [`../bench/README.md`](../bench/README.md) |
| Machine | One local RTX 2070 with 8 GB. It only loads the 7B |
| Whole task with the 7B | 34 runs between the pilot and the exploratory run, about 1.83 million tokens, 0 hidden tests passed. The 7B does not work as the instrument for the whole task |
| Theses | None supported or refuted. See [`theses.md`](theses.md) |

## Now

### 1. Land the instrument work (done)

Done on 2026-11-17. The work is on `main` in four commits, pushed to origin:

- `7d84d61`, **loop fixes.** The prompt carries one line per earlier attempt and a warning when an answer repeats the previous one. In Django the startup runs the migrations, so the model no longer writes them by hand.
- `c20ca1c`, **references split into slots.** Five pure functions in Next.js and in Django: `discount`, `cart`, `signature`, `webhook` and `ledger`.
- `bafdac5`, **the arms `kit-bare` and `kit-tests`**, which fill one slot per run.
- `759051f`, **slot checks before a run**, with both kit arms covered by the selftest.

`validate-gold` passed 59 of 59 on Next.js and on Django, and `node --test test/kit.test.mjs` passed 14 of 14. The instrument is described in [`architecture.md`](architecture.md) and [`../bench/README.md`](../bench/README.md).

### 2. The analysis library

`analysis/` holds the statistics library with its tests (194 on 2026-11-18, run with `node --test analysis/` from the repository root). It sits outside `bench/`, so changing the analysis never changes the frozen harness hash. [`model.md`](model.md) is the mathematical model of the claim. The command `analyze` reads a `runs.csv` and applies the decision rule of [`method.md`](method.md):

- A kit arm written as `kit-bare.cart` is read as arm `kit-bare` with slot `cart`, so `--treatment kit-tests --control kit-bare` compares the two arms slot by slot.
- `--stacks` and `--slots` give the planned design, and a planned cell with no runs returns `undecidable`.

The harness report does not compute the verdicts of `method.md`; the analysis tool does.

### 3. The instrument problems

Five problems were found after the instrument landed. They belong to the instrument, not to a thesis. All five were closed on 2026-11-18, and the record of each is in the open items of [E04](../experiments/E04-slot-gauge/README.md#7-what-changes).

| # | Problem | State |
| --- | --- | --- |
| 1 | **The Django judge was unstable.** On Django the reference judgement failed hidden test X15 with "fetch failed" in 5 of 13 runs | Closed on 2026-11-18. The judge client (`req()` in `bench/suites/lib.mjs`) now sends `Connection: close`. Cause: gunicorn closes an idle keep-alive connection after 2 s and Node fetch reused it. With 16 clients over 90 s on Django, 46 of 1,734 requests failed before and 0 of 1,734 after |
| 2 | **The harness hash skipped the gold reference.** The kit arms install the reference and the judge scores it | Closed on 2026-11-18. `experimentHash` includes `stacks/*/gold` and hashes text with CRLF turned into LF, so one commit gives one hash on any checkout. Results directories created before this change refuse to resume |
| 3 | **The piece shared example values with one hidden test.** The piece given to the `of-spec` and `of-code` arms (`bench/arms/openfabric/piece.md`) had example values that one test of the independent suite `hidden2` also asserts. It was recorded as a limit in [E01](../experiments/E01-pilot-full-task/README.md#6-limits) and [E05](../experiments/E05-line-vs-workshop/README.md#6-limits) | Closed on 2026-11-18. The two example rows now use other amounts, and `bench/test/arms-leak.test.mjs` fails if any amount asserted by a hidden suite appears in a file under `bench/arms/`. The new hash must be recorded before a run gives the piece to a model |
| 4 | **The report counted "fully correct" on one hidden suite** | Closed on 2026-11-18. `bench/src/report.mjs` counts a run as correct only when it passes both suites ("Runs passing both suites"). `runs.csv` gained the columns `slot`, `gauge_pass` and `correct` |
| 5 | **Per-attempt judge results.** The hidden suites ran only at the end of a run, so no arm could be scored at its first attempt (the "calls held equal" rule of [`method.md`](method.md)) and the sensitivity and specificity of the gauge could not be estimated | Closed on 2026-11-18. Both hidden suites run after every attempt that builds and starts, on the same app instance, and the result goes to `metrics.json` only. `runs.csv` and the new `attempts.csv` record it |

Other changes of 2026-11-18, none of them a problem found by an experiment:

- **Resume check.** `--slots` and the list of kit arms with their slots are stored in `meta.json` and compared on resume. A resume with another slot list is refused.
- **Kit feedback.** In a kit run, build output and app logs go through `kitFeedbackText` (`bench/src/prompts.mjs`) before they reach the model. Lines that quote files other than the slot file are removed and replaced by one note. Reason: when a slot does not export the name an installed file imports, Next.js prints a code frame of the installed file, and Python tracebacks quote installed source lines.
- **The `of-code` arm bug.** The `of-code` prompt was built with `piece.split('## 1.')`, which also matches inside `### 1.1`, so the arm never received the business rules. It was in place when [E01](../experiments/E01-pilot-full-task/README.md) ran (2 `of-code` runs, Next.js). Fixed by cutting the piece by position, with a unit test. The outcome of E01 does not change; a dated correction is in its record.
- **Unit tests.** `bench/test/` holds 56 tests (`kit.test.mjs`, `harness.test.mjs`, `arms-leak.test.mjs`, and `attempt-judge.test.mjs`, added on 2026-11-18). The command is `node --test "test/*.test.mjs"` from `bench/`; the form `node --test test/` fails on Node 22 on Windows.

### 4. Run E04

[E04](../experiments/E04-slot-gauge/README.md) tests the gauge at slot level (T11 to T13) on the local 7B, in Next.js and Django. The per-attempt judge result (item 5) is done, and the exploratory campaign ran on 2026-11-18: 4 of 10 correct runs in each arm, the gauge in view detected wrong code far more often, and no run was repaired after its first attempt. T22 was proposed from it. The numbers are in the record.

| Step | What happens | State |
| --- | --- | --- |
| Controls | The reference with one slot left unfilled, per slot and per stack. The reference alone, three times in a row on both stacks | Done on 2026-11-11 and 2026-11-18 |
| Per-attempt judge results | The instrument judges every attempt, so every arm can be scored at its first attempt and the gauge's sensitivity and specificity can be estimated | Done on 2026-11-18 |
| Exploratory campaign | One run per cell, 20 runs, 10 per arm, in its own results directory. It measures the time per run and looks for a floor or a ceiling. Redesign if `kit-bare` is correct in 9 or more of its 10 runs, or if both arms have zero correct runs at the unfilled-slot level | Done on 2026-11-18. 4 of 10 correct in each arm; the redesign rule did not trigger |
| Revise the criterion | T11 asked for 20 points with 25 runs per arm, which cannot be detected. The assistant proposed on 2026-11-18 d* = 30 points, a stratified exact test, and 100 or 120 runs. See [`theses.md`](theses.md#t11-was-revised-on-2026-11-18) | Proposed on 2026-11-18. Confirmed by the owner on 2026-11-21 |
| Confirm | The owner confirms the criteria of T11 to T13 and T22, the plan of 100 runs, and the slot list | Done on 2026-11-21 |
| Preregister | The tag `prereg/E04` and the harness hash freeze the design | Done on 2026-11-21: tag `prereg/E04`, harness hash `3b3adef503d66d97` |
| Confirmatory run | On the local 7B | To do |
| Report | Published whatever the outcome. The registry and this roadmap are updated | To do |

## Next

### E05 local variant (7B), if the owner chooses it

[E05](../experiments/E05-line-vs-workshop/README.md) tests T14, T15, T16 and T20. Its local variant uses the 7B and the existing bench. It can read only T14 and T20: `workshop-gauge` is not specified for it, and T16 cannot be measured when `workshop` has no correct runs. The full E05 needs a stronger agent, so the model and budget decision gates it. The owner has not chosen the local variant.

| Element | Design |
| --- | --- |
| Arms, all inside the same stack | `workshop` writes from scratch. `workshop-gauge` writes from scratch with the visible gauge. `line` gets the pieces installed deterministically and the model fills the gaps |
| Stacks | Next.js and Django, at least |
| What `line` does | It fills all five slots in one run |
| What `workshop` does | It writes the whole service. So far it has 0 correct runs in 34 |
| Primary metric | Correct run: every test of both hidden suites passes |

**Why "correct run" is the metric.** Round 2 was discarded because its criterion was met by construction: it asked for 90% of the hidden tests, and only 7 of the 21 depend on the discount slot. "Correct run" asks for every test. A run with one wrong slot does not count, so `line` can fail.

**A point to settle before preregistering.** With the 7B, `workshop` sits at the floor. [`method.md`](method.md#exploratory-campaign) redesigns an experiment when the exploratory run shows an arm at 0% or 100%. T16 compares cost per correct run, which is undefined for an arm with no correct runs. The exploratory run of E05 shows whether the 7B scope can be preregistered or whether E05 waits for a stronger model.

### Then E07, E06 and E08

| Order | Experiment | Thesis | What it answers | Note |
| --- | --- | --- | --- | --- |
| 2 | [E07](../experiments/E07-independent-gauge/README.md) | T18 | Does a gauge written by someone else detect more than one written by the same model? | It adds the arm that E04 lacks, where the model writes its own tests. That is the strongest objection to E04 |
| 3 | [E06](../experiments/E06-piece-questions/README.md) | T17 | Do the piece's questions recover the rules the client did not say? | It tests promise 2 with a simulated client |
| 4 | [E08](../experiments/E08-composition/README.md) | T19 | Do pieces that pass separately pass together? | It is the first experiment beyond the checkout task: a live-sales mix |

### E09 and E10, proposed on 2026-11-21

Both were proposed by the assistant on 2026-11-21, after the owner's request of that day. Neither is designed or confirmed, and neither needs a paid model. See [`product.md`](product.md#deterministic-first).

- [E09](../experiments/E09-finding-the-piece/README.md) (T23) comes first: it needs no verdict, no Docker and no paid model.
- [E10](../experiments/E10-lessons-from-the-gauge/README.md) (T24) comes after the E04 analysis, because its lessons come from the attempts of E04.

## Later

| Item | Thesis | Condition | What it involves |
| --- | --- | --- | --- |
| Stronger models | T6, and a repeat of the theses that matter for the product | The owner decides the model and the budget. Today only the local RTX 2070 with the 7B is available | A real agent in non-interactive mode, with its cost measured. A variant of the checkout task with rules the piece does not carry. An exploratory run of one run per cell before any criterion is fixed |
| Go as a fifth stack | T21 | Only if T14 is supported | The checkout reference in Go with PostgreSQL, split into pieces with a gauge and questions, plus deterministic scaffolding. It enters the bench when it passes 59 of 59 with the current suites, which are black-box HTTP, and its no-model controls have run |
| The frontend gauge | T7 | Not set | A UI piece with end-to-end tests. The criterion is fixed before the piece is written |

The Go stack is code for the experiment, not for the product. It lives in `bench/`.

## Gates

### Before any confirmatory run

Every experiment passes these, in this order. They come from [`method.md`](method.md).

1. The no-model controls pass.
2. The exploratory run shows no floor and no ceiling.
3. The planned runs can detect the criterion.
4. The owner confirms the criterion.
5. The tag `prereg/E<nn>` and the harness hash freeze the design.

### Before building anything

Each gate is a row of the [decision map](decisions.md#decision-map). The map is a proposal that the owner has not confirmed.

The approaches behind these gates, and the rungs each one climbs, are in [`product.md`](product.md).

| Gate | Fed by | Opens |
| --- | --- | --- |
| G1 | E04 (T11) or E07 (T18) | Gauge tooling for existing stacks |
| G2 | E05 (T14 and T15) | The catalog and the deterministic assembler |
| G3 | E05 (T20) | Multi-stack, or a focus on the stacks where the advantage holds |
| G4 | The experiment for T21, not assigned yet | A stack of its own |
| G5 | E06 (T17) | Pieces that carry business questions |
| G6 | E08 (T19) | Blueprints composed from the catalog |
| G7 | E05 (T14 refuted) | Stop the assembly line, publish the benchmark and the negative result, keep only what RQ1 supports |
| G8 | E09 (T23) | The catalog index and its query interface, or else pieces taken from an approved manifest |
| G9 | E10 (T24) | The lesson store of the line |

### Decisions that only the owner can make

They are listed in [`decisions.md`](decisions.md#open-questions). One of them blocks work on this roadmap: the model or agent and the budget, which the full E05 and every "Later" item with a stronger model need.

## What replaced the plan of 2026-11-16

The earlier record had a plan in eight phases. Every phase has a place in this roadmap.

| Phase | Plan of 2026-11-16 | Exit condition then | Where it is now |
| --- | --- | --- | --- |
| 0 | The owner confirms the open and recommended decisions | Language, frontend, piece delivery, agent and budget confirmed | [Open questions](decisions.md#open-questions). Only the model and the budget block work |
| 1 | Round 3 as designed, with the 7B | T11 to T13 decided or reported as undecidable | Now: E04. The instrument is landed |
| 2 | A minimal line inside `bench/`: the checkout reference in Go with PostgreSQL, split into pieces with a gauge and questions, and deterministic scaffolding | The Go reference passes 59 of 59 with the current suites. No-model controls run | Later: Go as a fifth stack, only if T14 is supported. The `line` arm is built first in the existing stacks |
| 3 | A real agent in non-interactive mode, with its cost measured. A variant task. An exploratory run of one run per cell | No floor and no ceiling. The criteria of T14 to T16 fixed with a preregistration tag | Later: stronger models. The E05 local variant (7B) may run first, if the owner chooses it |
| 4 | Experiment A: T14 to T16 | The report is published, whether the criteria are met or not | Next: the E05 local variant, if chosen, with T20 added. The full E05 waits for a stronger model |
| 5 | Experiment B: T17 and T18 | The report is published, whether the criteria are met or not | Next: E06 and E07, as two experiments |
| 6 | Experiment C: T19, with the live-sales mix | The report is published, whether the criteria are met or not | Next: E08 |
| 7 | The decision to build | Proposal: the product is built only if T14 and T17 are met. If T15 is not met, the verification layer is built on top of existing frameworks | The [decision map](decisions.md#decision-map) |

## Limits the plan carries

- **Same author.** The line, the pieces and `hidden` have the same author. `hidden2` is independent. One test shared example values with the piece until 2026-11-18 (problem 3 under "Now", closed), so E01 carries a limit for the two arms that received the piece.
- **One base task.** Everything uses the checkout until E08.
- **Simulated client.** T17 says nothing about a real business person.
- **One small model.** Every result so far has the scope of one 7B model. A result with a 7B says nothing about a frontier agent.
- **Cost and drift.** Runs with a real agent cost money, and the model changes between runs that are months apart.
- **Shrinking benefit.** The measured benefit of aids for agents shrinks with each model generation. A result in favour today may not hold.
- **Research figures.** Several figures in the research come from a vendor or from a single run. The report marks which. See [`../research/README.md`](../research/README.md).
