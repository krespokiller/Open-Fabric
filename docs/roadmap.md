# Roadmap

The instrument work for E04 is landed on `main`. The next steps are to finish the analysis library and then to run the E04 exploratory run on the local 7B model. Nothing of the product is built, and no product code is written before a gate in the [decision map](decisions.md#decision-map) is met.

| Horizon | Work | Theses | Waits for |
| --- | --- | --- | --- |
| [Now](#now) | Finish the analysis library, then the E04 exploratory run | T11, T12, T13 | The open instrument problems below, and the owner's confirmation of the E04 criteria before the preregistration |
| [Next](#next) | E05 local variant (7B), if the owner chooses it, then E07, E06, E08 | T14 and T20 for the E05 local variant, then T18, T17, T19 | The report of E04, and the exploratory run of each experiment |
| [Later](#later) | Stronger models, the full E05 (T15 and T16 included), Go as a fifth stack, the frontend gauge | T6, T15, T16, T21, T7 | The owner's decision on model and budget. T14 supported |

This roadmap was proposed by the assistant on 2026-11-17, from the owner's statement of the same day: research first, several theses on several stacks, and decide from the results. The instrument state and the order of the "Now" steps were updated on 2026-11-18. The order of those steps is a proposal of the assistant.

## Where things stand (2026-11-18)

| Item | State |
| --- | --- |
| Phase | Validate the thesis before building |
| Instrument | Validated in Docker in the four stacks. Each reference passes 59 of 59 tests: 4 smoke checks, 8 public tests, and the two hidden suites of 21 and 26. The slot instrument for E04 is committed on `main` and pushed (`759051f`). Four problems stay open, listed under [Now](#now) |
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

### 2. Finish the analysis library

`analysis/` holds a statistics library with tests. It sits outside `bench/`, so changing the analysis never changes the frozen harness hash. [`model.md`](model.md) is the mathematical model of the claim. The harness report does not compute the verdicts of [`method.md`](method.md), so until the library is finished every verdict is calculated by hand.

### 3. Open instrument problems

These four problems were found after the instrument landed. They belong to the instrument, not to a thesis. The fix in each row is a proposal of the assistant.

| # | Problem | Proposed fix |
| --- | --- | --- |
| 1 | **The Django judge is unstable.** On Django the reference judgement failed hidden test X15 with "fetch failed" in 5 of 13 runs. A correct run needs both hidden suites in full, so E04 cannot count Django while this holds | Find the cause and fix it, or exclude the test by a rule written before the run. Repeat `validate-gold --stacks django` several times first |
| 2 | **The harness hash skips the gold reference.** The kit arms install the reference into the workspace and the judge scores it, so a change to it is not detected | Include `stacks/*/gold` in the hash for arms that install it, before the E04 tag |
| 3 | **The piece shares example values with one hidden test.** The piece given to the `of-spec` and `of-code` arms (`bench/arms/openfabric/piece.md`) contains example values that one test of the independent suite `hidden2` also asserts, so that suite was not fully independent for those arms. The kit arms do not receive those examples. It is recorded as a limit in [E01](../experiments/E01-pilot-full-task/README.md#6-limits) and [E05](../experiments/E05-line-vs-workshop/README.md#6-limits) | Before any run that gives the piece to a model, change the example values in the piece or the cases of that test, rerun `validate-gold` and record the new hash. Add a check that no literal of the hidden suites appears in an arm context |
| 4 | **The report counts "fully correct" on one hidden suite.** The harness report counts a fully correct run on `hidden` only, while [`method.md`](method.md) defines a correct run over both suites | Count both suites in the report, or have the analysis library read `runs.csv` and compute it |

### 4. Run E04

[E04](../experiments/E04-slot-gauge/README.md) tests the gauge at slot level (T11 to T13) on the local 7B, in Next.js and Django. The next step is its exploratory run, after steps 2 and 3.

| Step | What happens | State |
| --- | --- | --- |
| Controls | The reference with one slot left unfilled, per slot and per stack | Done on 2026-11-11 |
| Exploratory run | One run per cell, to look for a floor or a ceiling. If `kit-bare` already succeeds almost always, the experiment is redesigned | To do |
| Revise the criterion | T11 asks for 20 points with 25 runs per arm, which cannot be detected. See [`theses.md`](theses.md#t11-must-be-revised-before-preregistering) | To do |
| Confirm | The owner confirms the criteria of T11 to T13 | To do |
| Preregister | The tag `prereg/E04` and the harness hash freeze the design | To do |
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

**A point to settle before preregistering.** With the 7B, `workshop` sits at the floor. [`method.md`](method.md#exploratory-run) redesigns an experiment when the exploratory run shows an arm at 0% or 100%. T16 compares cost per correct run, which is undefined for an arm with no correct runs. The exploratory run of E05 shows whether the 7B scope can be preregistered or whether E05 waits for a stronger model.

### Then E07, E06 and E08

| Order | Experiment | Thesis | What it answers | Note |
| --- | --- | --- | --- | --- |
| 2 | [E07](../experiments/E07-independent-gauge/README.md) | T18 | Does a gauge written by someone else detect more than one written by the same model? | It adds the arm that E04 lacks, where the model writes its own tests. That is the strongest objection to E04 |
| 3 | [E06](../experiments/E06-piece-questions/README.md) | T17 | Do the piece's questions recover the rules the client did not say? | It tests promise 2 with a simulated client |
| 4 | [E08](../experiments/E08-composition/README.md) | T19 | Do pieces that pass separately pass together? | It is the first experiment beyond the checkout task: a live-sales mix |

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

| Gate | Fed by | Opens |
| --- | --- | --- |
| G1 | E04 (T11) or E07 (T18) | Gauge tooling for existing stacks |
| G2 | E05 (T14 and T15) | The catalog and the deterministic assembler |
| G3 | E05 (T20) | Multi-stack, or a focus on the stacks where the advantage holds |
| G4 | The experiment for T21, not assigned yet | A stack of its own |
| G5 | E06 (T17) | Pieces that carry business questions |
| G6 | E08 (T19) | Blueprints composed from the catalog |
| G7 | E05 (T14 refuted) | Stop the assembly line, publish the benchmark and the negative result, keep only what RQ1 supports |

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

- **Same author.** The line, the pieces and `hidden` have the same author. `hidden2` is independent, except for one test that shares example values with the piece (open problem 3 under "Now").
- **One base task.** Everything uses the checkout until E08.
- **Simulated client.** T17 says nothing about a real business person.
- **One small model.** Every result so far has the scope of one 7B model. A result with a 7B says nothing about a frontier agent.
- **Cost and drift.** Runs with a real agent cost money, and the model changes between runs that are months apart.
- **Shrinking benefit.** The measured benefit of aids for agents shrinks with each model generation. A result in favour today may not hold.
- **Research figures.** Several figures in the research come from a vendor or from a single run. The report marks which. See [`../research/README.md`](../research/README.md).
