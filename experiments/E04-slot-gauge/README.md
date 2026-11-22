# E04: Gauge at slot level

**Reported. The confirmatory campaign of 100 runs finished on 2026-11-22: T11 is refuted and T22 is supported, for one 7B model, two stacks and five slots. T12 and T13 are undecidable.** Seeing the public tests did not make the model write a correct function more often (19 of 50 runs against 21 of 50). It made the pass or no-pass decision at the end of a run agree with the judge more often (37 of 50 against 27 of 50), and that whole difference comes from one slot, `signature` (section 4). No run became correct after its first attempt. The tool installs the whole reference service and leaves one slot: a pure function with one business rule. The model writes only that function, with or without the gauge in view. The exploratory campaign of 20 runs gave both arms the same 4 of 10 correct runs; with the gauge in view the model's wrong code was detected far more often and never repaired (section 3). Those runs carry no verdict. On 2026-11-18 the assistant revised the criteria of T11, T12 and T13 and, after the exploratory campaign, proposed T22 (section 1). The instrument problems listed before are closed (section 7). The owner confirmed the criteria, the plan and the slot list on 2026-11-21 (section 7). The unfilled-slot control was repeated on the frozen instrument the same day and gave the table of 2026-11-11 again (section 3).

| Field | Value |
| --- | --- |
| Status | `reported` |
| Kind | confirmatory |
| Dates | Designed on 2026-11-11. Preregistered on 2026-11-21. The confirmatory campaign ran on 2026-11-21 and 2026-11-22 |
| Theses | T11, T12, T13 and T22, defined in [`docs/theses.md`](../../docs/theses.md) |
| Research questions | RQ1 Gauge |
| Scope | Next.js and Django; Qwen2.5-Coder 7B (Q4_K_M) on a local GPU; five slots of the checkout task. Every verdict holds for this scope only |
| Tag and hash | Tag `prereg/E04`. Harness hash `3b3adef503d66d977fe99c64924513771c43d94abe4a77408a22ead031fb3b60` |
| Data | Exploratory campaign: [`data/exploratory/`](data/exploratory/). Unfilled-slot control of 2026-11-21: [`data/control-unfilled/`](data/control-unfilled/). Confirmatory campaign: [`data/confirmatory/`](data/confirmatory/), with `runs.csv`, `attempts.csv`, the output of the two frozen analysis commands, the descriptive tables, the rebuild audit, the list of runs set aside and a copy of the harness report. The control results of 2026-11-11 are kept outside the repository and carried here from [`docs/context.md`](../../docs/context.md) |

This experiment is called "Ronda 3" in `docs/context.md`. The task notes behind it are working notes kept outside the repository.

## 1. Verdict per thesis

Verdicts of 2026-11-22, from one look at 100 runs. They hold for one model (Qwen2.5-Coder 7B), two stacks and five slots. The numbers are in section 4.

The criteria below were proposed by the assistant on 2026-11-18, replacing the ones proposed on 2026-11-11. The owner confirmed them on 2026-11-21 (section 7) and the tag `prereg/E04` fixes them. The decision rule is the one in [`docs/method.md`](../../docs/method.md#the-decision-rule), implemented in [`analysis/`](../../analysis/README.md).

| Thesis | Claim | Primary comparison and proposed criterion | Verdict |
| --- | --- | --- | --- |
| T11 | A gauge in view improves correctness when filling a slot. **Primary** | `kit-tests` (treatment) against `kit-bare` (control). Exact conditional Cochran-Mantel-Haenszel test stratified by stack and slot, one-sided alpha 0.025. `supported` needs the test to pass and a positive observed difference in every stack. `refuted` when the Newcombe upper limit of the difference is below d*. d* = 30 percentage points. Runs per cell are fixed at preregistration (see section 2) | **`refuted`.** 19 of 50 against 21 of 50. Difference -4.0 points, upper limit +15.5, below d* |
| T12 | A gauge that does not cover the subtle rule gives false confidence. Secondary | Discount slot, `kit-tests` only. False confidence = runs where the gauge passes and the judge fails, divided by runs where the gauge passes. `supported` when the Clopper-Pearson lower limit (95%) is above 0.5, `refuted` when the upper limit is below 0.5, otherwise `undecidable`. "Not estimable" when no run passes the gauge. Public test P1 does not exercise half-to-even rounding | **`undecidable`.** 5 of 10 gauge passes fail the judge. Interval 18.7% to 81.3%, which contains 0.5 |
| T13 | The gauge does not make the result more expensive. Secondary | Ratio of tokens per correct run, `kit-tests` over `kit-bare`, with the interval of the statistics tool. `supported` when the upper limit is below 1, `refuted` when the lower limit is above 1, otherwise `undecidable`. If either arm has no correct run, only a one-sided statement is made and the verdict is `undecidable` | **`undecidable`.** Ratio 2.06, limits 0.43 to 9.63, which contain 1 |
| T22 | With the gauge in view, the pass or no-pass decision at the end of a run agrees with the judge more often. **Primary**, proposed on 2026-11-18 after the exploratory campaign | Outcome per run: the decision is right when `gauge_pass` equals `correct` (a correct run that passed its visible checks, or a wrong run that did not). `kit-tests` against `kit-bare`, same test, strata, alpha and d* = 30 points as T11 (`--outcome decision-right` in the statistics tool). The four classes of runs are reported per arm: delivered correct, known failure, silent defect, false rejection | **`supported`.** 37 of 50 against 27 of 50. Difference +20.0 points, exact one-sided p = 0.0018, positive in both stacks. The estimate is below d*, and all of it comes from `signature` |

**Why T22, and why it is not met by construction.** The exploratory campaign suggested it: the decision agreed with the judge in 8 of 10 runs with the gauge in view and in 5 of 10 without. Those runs are not counted; the claim is tested on new runs. A gauge that always fails would also "decide right" on every wrong run, so its rate would be one minus the correct rate: about 60% at the exploratory correct rate of 40%, which is 10 points above `kit-bare` and below the 30 points asked. T22 is therefore read next to the correct rate and the count of false rejections, and both are reported.

**Error rates are per thesis.** T11 and T22 each use a one-sided alpha of 0.025. No correction is made for testing two theses on the same runs; a reader who wants one can halve the alpha, and the exact p-values are reported for that.

**Why 30 points for T11.** In three of the five slots (`signature`, `webhook`, `ledger`) `kit-bare` gets no error signal and stops at its first attempt (section 3). If the gauge matters, the difference should be large there. 30 points is also the smallest difference that the plan table in [`analysis/README.md`](../../analysis/README.md) detects with about 100 runs: 5 runs per cell supports a true 30-point difference 81% of the time, and 3 then 6 per cell supports it 87% of the time. At a true difference of exactly 30 points the rule calls `refuted` at most 2.5% of the time (the table reports 2.4%). A true difference below 30 points is expected to end `undecidable` or `supported`, not `refuted`. This replaces "20 points with 25 runs per arm in each stack", which the runs could not detect (see [`docs/theses.md`](../../docs/theses.md#t11-was-revised-on-2026-11-18)).

**Why T12 and T13 are secondary.** They are read from the same runs and get no sample size of their own. With about 10 to 12 runs in the discount cell, T12 will often be `undecidable`; that is stated in advance. T13 is `undecidable` whenever one arm has no correct run.
## 2. Design as preregistered

Preregistered on 2026-11-21. The tag `prereg/E04` marks the commit that holds this record. A change after the tag means a new experiment number.

| Frozen item | Value |
| --- | --- |
| Tag | `prereg/E04` |
| Harness hash | `3b3adef503d66d977fe99c64924513771c43d94abe4a77408a22ead031fb3b60`, the same instrument as the exploratory campaign |
| Results directory | `bench/results/E04-slot-gauge-confirmatory`, used only for this campaign. Git ignores it; the data is copied to `data/confirmatory/` when the campaign ends |
| Launch command, from `bench/` | `node src/cli.mjs run --model "hf.co/bartowski/Qwen2.5-Coder-7B-Instruct-GGUF:Q4_K_M" --base-url http://localhost:12434/engines/v1 --stacks nextjs,django --arms kit-bare,kit-tests --slots discount,cart,signature,webhook,ledger --runs 5 --budget 6 --out results/E04-slot-gauge-confirmatory` |
| Settings | Temperature 0.2, at most 8,192 output tokens, call budget 6, Docker runtime. The harness writes them to `meta.json` and refuses to resume with other values |
| Looks | One, after the 100 runs. A campaign that stops early is resumed with the same command and directory; nothing is analysed before the 100 runs exist |
| Operation | The machine has 16 GB of memory, and the model and Docker fill it. During the campaign the file cache of the Docker virtual machine is dropped every few minutes to keep memory free. This can lengthen build times; it does not change what the model receives or what the judge scores |
| Analysis of T11, from the repository root | `node analysis/cli.mjs analyze <runs.csv> --treatment kit-tests --control kit-bare --d-star 30 --looks 5 --z-r 2.05 --stacks nextjs,django --slots discount,cart,signature,webhook,ledger --attempts <attempts.csv>` |
| Analysis of T22 | The same command with `--outcome decision-right` |
| Analysis of T12 and T13 | Read from the same output: the "Gauge against judge" row of `kit-tests` and `discount`, and the cost per correct run of `kit-tests` over `kit-bare` |

Both analysis commands were run on the exploratory files on 2026-11-21 to check that they parse. They answered `undecidable` with the cause "unplanned look", as they must for 1 run per cell.

Since everything outside the slot is the reference, any hidden test that fails is caused by the slot. This is the measurable version of "the tool assembles, the model makes the small part, the gauge judges".

| Item | Value |
| --- | --- |
| Slots | `discount`, `cart` (cart validation), `signature` (webhook signature), `webhook` (webhook decision), `ledger` (ledger entries). The same five in both stacks |
| Left installed | Idempotency and stock reservation, because they live in SQL |
| Arms | `kit-bare` and `kit-tests` (table below). One slot per run; every other slot holds the reference code |
| Stacks | Next.js and Django |
| Model | Qwen2.5-Coder 7B (Q4_K_M). The owner stated that only the local machine is available (working notes kept outside the repository) |
| Runs per cell | 5 per cell in one look: 100 runs, about 5 hours at the 178 s per run of the exploratory campaign. Cells are arm by slot by stack: 20 cells. Proposed on 2026-11-18 after the exploratory campaign and confirmed by the owner on 2026-11-21; the alternative was 3 then 6 per cell in two looks (120 runs at most). For this plan `node analysis/cli.mjs design --d-star 30 --looks 5` gives z_R = 2.05, `supported` 81% to 92% of the time at a true difference of 30 points, `refuted` 82% of the time at no difference, a worst false refutation of 2.4% and a worst false support of 1.7% |
| Call budget | 6, as in [E01](../E01-pilot-full-task/README.md) and [E03](../E03-exploratory-loop-fixes/README.md). The arms stop at different points on purpose: the gauge loop (keep working while a visible check fails) is part of the treatment, and this record says so |
| Primary metric | Correct run: every test of `hidden` and of `hidden2` passes |
| Secondary metrics | Calls and tokens per arm; runs that pass every visible check and fail a hidden test. The first-attempt comparison at equal calls (the rule "calls held equal" of [`docs/method.md`](../../docs/method.md)) is available as a secondary result, since 2026-11-18, when the instrument records per-attempt judge results. `analyze` prints "At the first attempt (calls held equal)" for two arms |
| Installed code | Read-only, and left out of the prompt |

| Arm | What the model gets | Feedback after each attempt | Stops when |
| --- | --- | --- | --- |
| `kit-bare` | The task and the contract of the slot | Build and start, plus the 4 basic checks | The 4 checks pass, or the budget ends |
| `kit-tests` | The same, plus the 8 public tests | The same, plus the results of the 8 public tests | The 12 checks pass, or the budget ends |

**One slot per run** was chosen on 2026-11-11 for two reasons: the 7B writes one file per call, and each slot gives an independent data point.

**Harness state on 2026-11-18.** The kit arms were committed on `main` before the hardening: the loop fixes in `7d84d61`, the references split into slot files in `c20ca1c`, the kit arms in `bafdac5` and the slot checks before a run, with both kit arms covered by the selftest, in `759051f`. On 2026-11-18 the instrument was hardened:

- The judge client sends `Connection: close`, which removes the Django flake (item 6 below).
- The harness hash includes the references in `stacks/*/gold` and ignores line endings (item 7).
- The piece no longer shares amounts with a hidden test, and a unit test guards it (item 8).
- The report and `runs.csv` count a correct run over both hidden suites (item 9).
- A resume with another slot list is refused.
- Every attempt that builds and starts is judged by both hidden suites, without the model seeing the result (item 10).
- In a kit run, build output and app logs lose the lines that quote installed files (`kitFeedbackText` in `bench/src/prompts.mjs`), because a code frame of an installed file would show the model code it cannot edit.
- `bench/test/` holds 56 unit tests; the command is `node --test "test/*.test.mjs"` from `bench/`. Since 2026-11-21 it holds 73, with the tests of the unfilled-slot control script.

`validate-gold` passed 59 of 59 on Next.js and Django three times in a row. The exploratory campaign of the kit arms ran on 2026-11-18 on harness hash `3b3adef503d66d97` (section 3). No instrument item is open: the judge result of each attempt is recorded (item 10, closed).

### Written before the run (2026-11-21)

Added by the assistant before the tag. Nothing here changes a criterion or the decision rule.

**What the verdicts are about.** These ten pairs of stack and slot, and this model. Stack and slot are strata of the test, not a sample of slots, so a verdict does not extend to slots in general.

**What T22 compares.** The two arms have different gauges: 4 checks in `kit-bare` and 12 in `kit-tests`. T22 compares the two treatments as wholes: what the model sees, and the size of the gauge that decides. It does not separate the two.

**Reported next to the verdicts, with no verdict of their own:**

- **Detection per run.** Of the wrong runs of each arm, how many end without the gauge passing, split into runs that never built and runs that built. The per-attempt sensitivity counts a repeated wrong answer once per attempt, so it is read next to this count.
- **Agreement inside a cell.** In how many of the 20 cells the 5 runs all have the same correct-or-wrong result. If cells are close to deterministic, the information is in the ten pairs and more runs per cell add little.
- **The loop.** How many runs change their gauge result or their judge result after the first attempt, and the tokens of the first attempt per arm.

**Expectations of the assistant. They are not results.**

- T11 is expected to end `refuted` for this model: the exploratory difference was zero in every pair.
- T22 is expected to show a difference between 20 and 30 points, most of it from `signature`, and may end `undecidable`. In the exploratory runs `kit-tests` had 6 wrong runs: the public tests rejected 2 (both `signature`), 2 never built, and 2 passed the 12 checks.
- The loop is expected to repair few runs or none.

## 3. Controls and the exploratory run

| Control | Result |
| --- | --- |
| Reference | Done. After the split into slot files the reference passes 59 of 59 in Next.js and in Django (working notes kept outside the repository; repeated on commit `759051f`). Repeated three times in a row on 2026-11-18, after the judge client fix, with 59 of 59 on both stacks each time |
| Empty | Done on 2026-11-11 and repeated on 2026-11-21 on the frozen instrument, with the same result. Table below |
| Can it fail | Yes. In the exploratory campaign each arm had 4 correct runs and 6 wrong ones, so neither arm sits at the floor or the ceiling |
| Denominator | Written in the revised criteria of 2026-11-18. T13 is `undecidable` when either arm has no correct run, and T12 is "not estimable" when no run passes the gauge |
| Exploratory campaign | Done on 2026-11-18. 1 run per cell, 20 runs, 10 per arm (the method asks for at least five per arm). Results below |

### Unfilled-slot control

The reference with one slot left unfilled, per slot and stack. Ten controls ran on 2026-11-11. They ran again on 2026-11-21 with `bench/controls/unfilled-slots.mjs`, on harness hash `3b3adef503d66d97`, and the hash was the same before and after. Both times the ten results were the ones in this table, identical in Next.js and Django. The rows of 2026-11-21 are in [`data/control-unfilled/unfilled-slots.csv`](data/control-unfilled/unfilled-slots.csv).

| Unfilled slot | Basic checks | Public tests | `hidden` | `hidden2` |
| --- | --- | --- | --- | --- |
| `discount` | 3 of 4 | 2 of 8 | 4 of 21 | 6 of 26 |
| `cart` | 3 of 4 | 0 of 8 | 2 of 21 | 5 of 26 |
| `signature` | 4 of 4 | 5 of 8 | 15 of 21 | 16 of 26 |
| `webhook` | 4 of 4 | 6 of 8 | 16 of 21 | 17 of 26 |
| `ledger` | 4 of 4 | 7 of 8 | 18 of 21 | 18 of 26 |

What the table says:

- **No slot is correct by construction.** Every unfilled slot fails tests in both hidden suites, so the floor for "correct run" is zero in every cell.
- **`kit-bare` gets no error signal in three slots.** With `signature`, `webhook` or `ledger` unfilled, the 4 basic checks still pass, so `kit-bare` stops at its first attempt. In `discount` and `cart` the purchase check fails and `kit-bare` does iterate.
- **The public tests see every slot**, but weakly for `ledger`: 7 of 8 pass with the slot unfilled.

### Exploratory campaign

Proposed by the assistant on 2026-11-18. It runs in its own results directory and is never added to the confirmatory data.

| Item | Value |
| --- | --- |
| Runs | 1 per cell, 20 runs, 10 per arm |
| What it measures | The time per run, which decides between one look and two. Floor and ceiling in each arm |
| What is read | The transcripts, to check the gauge loop and the feedback filter (`kitFeedbackText`): that the model is not shown installed code, and that errors in the slot stay visible |
| Redesign rule, written before it runs | Redesign if `kit-bare` is correct in 9 or more of its 10 runs, or if both arms have zero correct runs and their hidden pass fractions sit at the unfilled-slot level of the control table above |

### Exploratory results (2026-11-18)

**Both arms had the same 4 of 10 runs correct, in the same four cells. Every correct run was correct at its first attempt, and no run improved after its first attempt.** These 20 runs are exploratory: they carry no verdict and are never added to the confirmatory data. The data is in [`data/exploratory/`](data/exploratory/): `runs.csv`, `attempts.csv` and a copy of the harness report.

| Item | Value |
| --- | --- |
| Instrument | Harness hash `3b3adef503d66d97`, clean tree, model Qwen2.5-Coder 7B (Q4_K_M), temperature 0.2, budget 6 |
| Runs | 20 of 20. The campaign stopped once after 16 runs, when the machine ran out of memory, and was resumed with the same results directory on the same instrument. The harness skips finished runs, so no run was repeated |
| Time | 59 minutes of runs. Mean 178 s per run: 118 s for the 15 runs with one call, 359 s for the 5 runs with six calls |
| Judge check | The judge of the last attempt agreed with the final judgement in 20 of 20 runs |

Correct runs (every test of both hidden suites passes), one run per cell:

| Slot | Django, `kit-bare` | Django, `kit-tests` | Next.js, `kit-bare` | Next.js, `kit-tests` |
| --- | --- | --- | --- | --- |
| `discount` | correct | correct | wrong, gauge passed | wrong, gauge passed |
| `cart` | correct | correct | wrong, gauge passed | never built, 6 calls |
| `signature` | wrong, gauge passed | wrong, gauge failed, 6 calls | wrong, gauge passed | wrong, gauge failed, 6 calls |
| `webhook` | wrong, gauge passed | wrong, gauge passed | never built, 6 calls | never built, 6 calls |
| `ledger` | correct | correct | correct | correct |

| Measure | `kit-bare` | `kit-tests` |
| --- | --- | --- |
| Correct runs | 4 of 10 | 4 of 10 |
| Correct at the first attempt | 4 of 10 | 4 of 10 |
| Correct runs, Django | 3 of 5 | 3 of 5 |
| Correct runs, Next.js | 1 of 5 | 1 of 5 |
| Tokens, all runs | 62,693 | 143,650 |
| Tokens per correct run | 15,673 | 35,913 |
| Runs that used all 6 calls | 1 | 4 |
| Runs that end with the gauge passing and the judge failing | 5 of 10 | 2 of 10 |
| Runs where the final pass or no-pass agrees with the judge | 5 of 10 | 8 of 10 |
| Per attempt: wrong attempts that the gauge rejects (sensitivity) | 6 of 11 | 24 of 26 |
| Per attempt: correct attempts that the gauge accepts (specificity) | 4 of 4 | 4 of 4 |

What was read in the transcripts and the per-attempt data:

- **The redesign rule does not trigger.** `kit-bare` is correct in 4 of 10 runs, not 9 or more, and neither arm is at zero. The design can discriminate.
- **The loop never repaired anything.** Five runs used more than one call. In none of them did the number of visible checks passed go up between attempts, and none ended with the gauge passing. In four of the five the model sent an answer identical to its previous one at least once, in spite of the warning that says so. All 15 runs that passed their gauge passed it at the first attempt.
- **The gauge in view detected wrong code and the model could not correct it.** With the public tests in view the gauge rejected 24 of 26 wrong attempts; with the 4 basic checks alone it rejected 6 of 11. The correct runs did not change.
- **Two silent defects got through the public tests.** In `discount` on Next.js the model left out the rounding rule that the task states, and the 12 visible checks passed. This is the case T12 predicts. In `webhook` on Django the 12 visible checks also passed on a wrong function.
- **The `signature` function the model wrote scored like an unfilled slot**: 16 of 21 and 16 of 26 in all four runs, against 15 of 21 and 16 of 26 for the unfilled stub in the control table.
- **The stack mattered more than the arm.** Django had 3 of 5 correct in each arm and Next.js 1 of 5. On Next.js three runs never built: the model replaced the slot with a different module twice (`webhook`, both arms) and imported a library that is not installed once (`cart`, `kit-tests`).
- **The feedback filter worked as intended in the runs read.** The build error of the model's own file reached the model with its code frame, and no installed code was quoted. The model ignored the error.
- **Cells look close to deterministic.** At temperature 0.2 the same stack and slot gave the same hidden score in both arms in 9 of 10 pairs, and the same correct or wrong in 10 of 10. The confirmatory campaign will show how much runs of one cell vary.

What this changes in the design (proposed by the assistant on 2026-11-18, not confirmed by the owner):

1. **T11 stays as written and is expected to be refuted for this model.** The exploratory difference is zero. That expectation is not a result: the confirmatory campaign decides.
2. **One look of 5 runs per cell, 100 runs.** At 178 s per run that is about 5 hours. With a true difference near zero, the two-look plan would rarely stop at its first look and would then need 120 runs.
3. **A new thesis, T22, born from these runs:** with the gauge in view, the pass or no-pass decision at the end of a run agrees with the judge more often. It is tested on the confirmatory runs with the same decision rule (section 1). The exploratory runs that suggested it are not counted.
4. **The gauge loop model in [`docs/model.md`](../../docs/model.md) assumes attempts are independent.** These runs say they are not: a failed attempt is usually followed by the same answer. The per-attempt data of the confirmatory campaign will test that assumption.

## 4. Results per stack, then pooled

**In short:** with the public tests in view the model did not write correct code more often, it never repaired a wrong answer, and its failures became visible in one slot of five.

| Item | Value |
| --- | --- |
| Runs | 100, 5 per cell, finished on 2026-11-22 at 07:33 UTC. Mean wall time 2.2 minutes per run |
| Instrument | Harness hash `3b3adef503d66d97`, the same before and after |
| Look | One, after the 100 runs and after the audit of section 5 |
| Commands | The two frozen commands of section 2, run once. Their full output is in [`data/confirmatory/analysis-T11.md`](data/confirmatory/analysis-T11.md) and [`analysis-T22.md`](data/confirmatory/analysis-T22.md). The descriptive tables are in [`describe.md`](data/confirmatory/describe.md) |
| Verdict code | The one at the tag: `git diff prereg/E04 -- analysis/cli.mjs analysis/stats.mjs` prints nothing |

### T11, correct runs: refuted

| Stratum | `kit-tests` | `kit-bare` | Difference (points) | Interval (points) |
| --- | --- | --- | --- | --- |
| Django | 14 of 25 | 14 of 25 | 0.0 | -25.7 to +25.7 |
| Next.js | 5 of 25 | 7 of 25 | -8.0 | -30.5 to +15.5 |
| **Pooled** | **19 of 50** | **21 of 50** | **-4.0** | **-23.1 to +15.5** (z_R = 2.05) |

- The upper limit of the difference, +15.5 points, is below d* = 30 points. That is the rule for `refuted`.
- Exact stratified test: one-sided p = 0.88, with 4 informative strata of 10.
- By slot, `kit-tests` against `kit-bare`: `cart` 5 of 10 against 8 of 10, `discount` 5 against 4, `ledger` 9 against 9, `signature` 0 against 0, `webhook` 0 against 0.
- At the first attempt the counts are the same 19 and 21. No run became correct after its first attempt.

### T22, the decision is right: supported

| Arm | Delivered correct | Known failure | Silent defect | False rejection | Right decisions |
| --- | --- | --- | --- | --- | --- |
| `kit-bare` | 21 | 6 | 23 | 0 | 27 of 50 (54.0%) |
| `kit-tests` | 19 | 18 | 13 | 0 | 37 of 50 (74.0%) |

| Stratum | `kit-tests` | `kit-bare` | Difference (points) | Interval (points) |
| --- | --- | --- | --- | --- |
| Django | 19 of 25 | 14 of 25 | +20.0 | -6.0 to +42.7 |
| Next.js | 18 of 25 | 13 of 25 | +20.0 | -6.6 to +43.0 |
| **Pooled** | **37 of 50** | **27 of 50** | **+20.0** | **+0.3 to +37.6** (z_R = 2.05) |

- Exact stratified test: one-sided p = 0.0018, with 5 informative strata of 10. The difference is positive in both stacks. That is the rule for `supported`.
- `supported` means the difference is above zero and d* is not excluded. It does not mean the difference reaches d*: the estimate is 20 points and d* is 30.

**The whole difference comes from one slot.**

| Slot | `kit-tests` | `kit-bare` | Difference (points) |
| --- | --- | --- | --- |
| `signature` | 10 of 10 | 0 of 10 | +100 |
| `discount` | 5 of 10 | 4 of 10 | +10 |
| `ledger` | 10 of 10 | 10 of 10 | 0 |
| `webhook` | 5 of 10 | 5 of 10 | 0 |
| `cart` | 7 of 10 | 8 of 10 | -10 |

In the four slots other than `signature` the count is 27 against 27. In `signature` the model wrote a wrong function in all 20 runs. The 4 basic checks passed it every time, and the public tests rejected it every time. What T22 shows here is that the public tests of `signature` see a failure the basic checks cannot see. It does not show a gain spread over the slots.

**Where the 12 checks still pass wrong code.** 13 silent defects remain with the gauge in view: `webhook` on Django in 5 of 5 runs, `discount` on Next.js in 5 of 5, and `cart` in 3 (1 on Django, 2 on Next.js).

### Detection per run

| Arm | Wrong runs | Never built | Built and rejected by the checks | Silent defects | Detected |
| --- | --- | --- | --- | --- | --- |
| `kit-bare` | 29 | 6 | 0 | 23 | 6 of 29, 20.7% (Wilson 9.8% to 38.4%) |
| `kit-tests` | 31 | 7 | 11 | 13 | 18 of 31, 58.1% (Wilson 40.8% to 73.6%) |

Of the 11 runs that the checks rejected, 10 are `signature` and 1 is `ledger` on Next.js. Per attempt, the gauge rejected 108 of 121 wrong attempts in `kit-tests` (89.3%, bootstrap 80.4% to 94.9%) and 36 of 59 in `kit-bare` (61.0%, bootstrap 30.8% to 77.4%). The per-attempt figure counts a repeated wrong answer once per attempt, so the per-run table is the one to read. No correct attempt was rejected in either arm: 19 of 19 and 21 of 21.

### T12 and T13, secondary: undecidable

| Thesis | Result | Verdict |
| --- | --- | --- |
| T12 | `discount`, `kit-tests`: all 10 runs passed the gauge and 5 failed the judge, 50.0%. Clopper-Pearson interval 18.7% to 81.3%, which contains 0.5. The 5 are the Next.js runs; the 5 Django runs are correct | `undecidable` |
| T13 | Tokens per correct run: 32,660 in `kit-tests` (limits 17,397 to 64,267) and 15,883 in `kit-bare` (limits 7,784 to 33,322). Ratio 2.06, limits 0.43 to 9.63, which contain 1 | `undecidable` |

### The loop

| Arm | Runs | Attempts | Runs with more than one attempt | Gauge result changed | Judge result changed | Tokens of first attempts | Tokens of all attempts | Share after the first attempt |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `kit-bare` | 50 | 80 | 6 | 0 | 0 | 169,283 | 333,548 | 49.2% |
| `kit-tests` | 50 | 140 | 18 | 0 | 0 | 180,970 | 620,531 | 70.8% |

- In the 24 runs with more than one attempt, neither the gauge result nor the judge result changed between the first and the last attempt. The loop repaired nothing.
- With a budget of one call every run would have ended with the same two results, for 350,253 of the 954,079 tokens (36.7%).
- At the first attempt `kit-tests` spends 6.9% more tokens than `kit-bare`. The ratio of 2.06 per correct run is mostly the cost of retries that changed nothing.

### Agreement inside a cell

In 14 of the 20 cells the 5 runs agree on correct or wrong. The 6 mixed cells: `kit-bare` on Django `discount` (4 of 5 correct), Next.js `cart` (3 of 5) and Next.js `ledger` (4 of 5); `kit-tests` on Django `cart` (4 of 5), Next.js `cart` (1 of 5) and Next.js `ledger` (4 of 5). Cells are close to deterministic, as the exploratory runs suggested, and not fully so.

### Against what was written before the run

| Written on 2026-11-21 (section 2) | Result |
| --- | --- |
| T11 expected to end `refuted` | `refuted` |
| T22 expected between 20 and 30 points, most of it from `signature`, and possibly `undecidable` | 20.0 points, all of it from `signature`. `supported`, not `undecidable` |
| The loop expected to repair few runs or none | None in 24 runs |

## 5. Deviations from the preregistration

Two stops of the campaign, both by the memory guard of the session that launched it, and five runs set aside and run again because of them. Nothing was analysed before this was written.

### The campaign stopped after 8 runs (2026-11-21)

**What happened.** The campaign started at 16:10 UTC. At 16:28 the memory guard of the session that launched it killed the launcher, because the machine had less than 1 GB of free memory. The memory watchdog of section 2 died with the launcher. The campaign process survived, and the assistant stopped it at 16:30. Eight runs had finished and a ninth had just started.

**Cause.** The model server holds about 6 GB of memory on this machine; the assistant had estimated 4.5 GB. A Next.js build inside Docker needs 1 to 1.5 GB more. Dropping the Docker file cache, the measure written in section 2, was not enough.

**One run was damaged.** The run of `kit-tests`, `signature`, Next.js, run 1, finished at 16:29:48, during the shortage. Its attempts 1 to 5 built and failed 2 of the 12 visible checks. Its attempt 6 reported "docker compose up failed". The harness aborts on the machine failures it recognises, and it did not recognise this one.

**How the damage was told from a model error.** After freeing memory, the assistant rebuilt the final workspace of each of the three runs that ended without a build (`docker build` on the workspace of the run).

| Run (Next.js, run 1) | Recorded | Rebuild | Reading |
| --- | --- | --- | --- |
| `kit-tests`, `signature` | Attempt 6 did not build | Builds without error | Machine failure |
| `kit-bare`, `webhook` | No attempt built | Fails: the model's file does not export the function the installed code imports | Model error |
| `kit-tests`, `cart` | No attempt built | Fails for the same kind of reason | Model error |

In the damaged run, the correct-or-wrong result (wrong) and the gauge result (not passed) come from attempts 1 to 5 and do not depend on attempt 6. Its `built_final` and its hidden pass counts do.

**Changes for the rest of the campaign.** The assistant proposed them on 2026-11-21 and the owner answered the same day with the instruction to resume. The damaged run was moved to `bench/results/E04-slot-gauge-confirmatory-set-aside/` before the campaign resumed, so the harness runs it again.

1. **Memory.** When free memory falls under 3 GB, a watchdog asks Windows to release the idle pages of the model server (`EmptyWorkingSet`), and drops the Docker file cache if that is not enough. The weights of the model are in video memory, so those pages are idle. No setting of the model server or of the harness changes. Measured on 2026-11-21: free memory went from 3.2 GB to 7.5 GB, and the model generated 50 tokens per second before and 49 after.
2. **Audit rule, for all 100 runs.** Every run that ends without a build has its final workspace rebuilt after the campaign. If it builds, the failure was the machine's: the run is set aside, kept, and run again. The rule looks only at whether the final workspace builds, never at the result of the run. The damaged run above is its first case. The harness seeds every call from the run number and the attempt number, so the repeated run uses the same seeds.

The seven other finished runs are kept as they are.

### The campaign stopped a second time, with 64 valid runs (2026-11-22)

**What happened.** The campaign resumed at 04:06 UTC on 2026-11-22. At about 06:05 UTC the memory guard killed the launcher again. By the launcher's own log, memory was not short this time: free memory stayed between 3.9 and 4.6 GB during the last hour, and committed memory was at 72% of its limit two minutes after the kill. The guard does not publish its threshold; it acted with about a quarter of the memory free.

**What the kill does to the campaign process.** The campaign process survived again. From that moment it could not start Docker: each `docker compose up` returned at once, with an error and no output, and the harness recorded each one as an attempt that did not build. Four runs were recorded this way between 06:05:10 and 06:06:57 UTC, each with 6 calls, no build, and about 0.1 s of build time for the six calls together. A real build takes 10 s or more. The assistant stopped the process at 06:07 UTC.

**Correction to the reading of the first stop.** The damaged run of 2026-11-21 fits the same pattern: its failed attempt came right after the guard's kill. The kill is the likely cause there too, more than the memory shortage by itself. The table above stands: that failure was the machine's.

**Rule for runs recorded by an orphaned process.** A run is set aside and run again when it was in progress at the guard's kill, or started after it and before the process was stopped. These runs are recognised without looking at their result: their build time is under 2 s per call, which means Docker never ran. Set aside under this rule, all on Next.js: `kit-bare` `ledger` run 4, and `kit-tests` `discount`, `cart` and `signature` run 4. The run in progress when the assistant stopped the process (`kit-tests` `webhook` run 4) had no result file, and the harness repeats it by itself. 64 finished runs remain. The audit of runs that end without a build still applies to all 100 at the end.

**Changes for the rest of the campaign.**

1. The watchdog releases the idle memory of the model server when free memory falls under 5.5 GB, not 3 GB, to stay away from the level at which the guard acted.
2. The launcher stops the campaign process if the launcher loses its own parent process, so an orphaned process cannot record runs.

**Who decided to resume.** The owner was away. After the first stop the assistant had told the owner that it could not restart the campaign by itself after a memory stop. The owner answered on 2026-11-21 "puedes continuar? te doy libertad 100%" (can you continue? I give you 100% freedom) and later "just continue and do your thing". The assistant resumed on 2026-11-22 under that instruction, after checking that 7.0 GB of memory were available.

### The end of the campaign and the audit (2026-11-22)

**The third launch finished by itself**, from 06:10 to 07:33 UTC, with the two changes above. The watchdog released memory 22 times. The lowest free memory seen at a poll was 1.2 GB in the first launch, 2.5 GB in the second and 1.4 GB in the third; the third was the moment the model loaded, and the release followed at once.

**No fake run is among the 100.** No finished run has under 2 s of build time per call.

**The audit found no machine failure.** 13 of the 100 runs ended without a build, all on Next.js: `webhook` in all 10 runs of both arms, `cart` in 2 runs of `kit-tests`, and `ledger` in 1 run of `kit-bare`. `bench/controls/rebuild-audit.mjs` built and started the final workspace of each one again. All 13 failed again with a build error in the model's own file, so all 13 are model errors and none was set aside. The rows are in [`data/confirmatory/rebuild-audit.csv`](data/confirmatory/rebuild-audit.csv).

**The five runs set aside** are listed in [`data/confirmatory/set-aside.csv`](data/confirmatory/set-aside.csv). All five were recorded as wrong with the gauge not passed, which counts as a right decision. Their repeats: all five wrong again, three with the gauge not passed and two with the gauge passed. Had the set-aside records been kept in place of their repeats, the correct runs would be the same 19 and 21, and the right decisions of `kit-tests` would be 39 of 50, not 37. Setting them aside did not favour either verdict.

**What the assistant saw.** To diagnose the stops, the assistant read the campaign log and the `metrics.json` of the three runs that ended without a build. The log shows, for each run, its hidden pass count, calls and tokens; the assistant read those lines for the first 8 runs and for the runs around the second stop, and the build flags and times of the result files of all finished runs. Nothing was counted across runs, no analysis command was run on the confirmatory data, and neither the criteria nor the design changed. The plan stays one look, after the 100 runs.

## 6. Limits

Limits seen in the results of 2026-11-22:

- **T22 rests on one slot.** All 20 points come from `signature`. With that slot left out, the two arms decide right equally often, 27 against 27. A different set of five slots could give a larger difference, or none.
- **The two arms have different gauges.** `kit-bare` is decided by 4 checks and `kit-tests` by 12. T22 does not separate what the model sees from the size of the gauge that decides, and with a model that never repairs, the size of the gauge is the likely source.
- **One 7B model.** A stronger model may write these five functions correctly at the first attempt, and then neither arm would have failures to detect. A stronger model may also use the feedback of the loop, which this one did not.
- **Slots are strata, not a sample.** Ten pairs of stack and slot carry the information, and 14 of the 20 cells gave the same result in their 5 runs.
- **The 12 checks have blind spots that are stable.** `webhook` on Django and `discount` on Next.js passed all 12 checks in 5 of 5 runs while wrong.

These are the limits written with the design in `docs/context.md`.

- **The arms do not get the same number of calls, on purpose.** `kit-bare` stops when its 4 checks pass and `kit-tests` continues until 12 pass. The loop is part of the treatment. Calls and tokens are reported per arm. The comparison with every arm scored at its first attempt uses the judge result of each attempt, which the instrument records since 2026-11-18 (item 10).
- **The gauge can be measured per attempt since 2026-11-18.** The hidden suites run after every attempt that builds and starts (item 10), so sensitivity and specificity of the gauge per attempt can be estimated. T12 itself is still read from final states.
- **Small samples in the secondary theses.** T12 rests on the discount cell, about 10 to 12 runs. T13 depends on both arms having correct runs.
- **Information and feedback are not separated.** `kit-tests` receives the description of the tests and also their results.
- **The strongest objection is not tested.** There is no arm where the model writes its own tests. That is [E07](../E07-independent-gauge/README.md).
- **One task, one model, slots of a few lines.** It says nothing about writing a whole service.
- **Authorship.** The piece, the public tests and `hidden` have the same author. `hidden2` is independent.

## 7. What changes

Read against [`docs/decisions.md`](../../docs/decisions.md) and [`docs/product.md`](../../docs/product.md) on 2026-11-22. Everything in this table is a reading by the assistant; the decisions are the owner's.

| What the result says | What it changes |
| --- | --- |
| T11 is refuted for this scope | Gate G1, as written on 2026-11-17, names T11 or T18. It is not met. With the amendment proposed on 2026-11-21, which adds T22, it would be met for this scope. The owner decides on the amendment |
| The gauge detects and the loop does not repair | For this model the value of the gauge is the decision at the end, not better code. The promise of approach P1 is that decision, and it should be measured with a budget of one call |
| Retries cost 63% of the tokens and changed no result | A budget of 6 is waste for this model. The next designs use one call, or several independent samples with the gauge choosing among them |
| The difference comes from one slot | The next question is how the detection changes with the size and the content of the gauge, over more slots. Five slots cannot answer it. A cheap first step, proposed by the assistant on 2026-11-22: replay the wrong answers of this campaign against other gauges. The 60 wrong runs are real failures of a model, the replay needs no model call, and its result is the share of wrong answers that each gauge lets through |
| The stack matters more than the arm | Django gave 14 of 25 correct runs in each arm, and Next.js 5 and 7. T20 reads this in [E05](../E05-line-vs-workshop/README.md) |
| The model wrote `signature` and `webhook` wrong in all 40 runs | These two slots are at the floor for this model. They can show detection and cannot show a gain in correctness |

### Open items before preregistering

State on 2026-11-21: every item is closed. Closed items stay in the table with the date and how they were closed.

| # | Item | State |
| --- | --- | --- |
| 1 | **Revise the T11 criterion.** The earlier one asked for 20 points with 25 runs per arm in each stack. The table in [`docs/method.md`](../../docs/method.md) says 25 runs per arm detect about 39 points, and 50 per arm (both stacks pooled) about 28. A 20-point difference needs 62 to 97 runs per arm. `docs/method.md` does not allow preregistering a criterion the runs cannot detect | Answered by the revision of 2026-11-18 (section 1): d* of 30 points, stratified exact test, 100 runs in one look. Confirmed by the owner on 2026-11-21 |
| 2 | **Run the exploratory campaign.** If `kit-bare` is already near 100%, or both arms are near 0%, the design cannot discriminate and is redesigned before the tag | Closed on 2026-11-18. 20 runs, 4 of 10 correct in each arm. The redesign rule did not trigger (section 3) |
| 3 | Fix the call budget. It was not written, and the arms stop at different points | Settled as proposed on 2026-11-18: 6 calls. The different stopping points are part of the treatment |
| 4 | Define T13 when `kit-tests` has no correct runs | Settled as proposed on 2026-11-18: T13 is a ratio of tokens per correct run, and `undecidable` when either arm has none |
| 5 | Look at the sample behind T12. It rests on the discount cell alone, and "at least half" of 5 runs has a very wide interval | Answered by the T12 rule of 2026-11-18: a Clopper-Pearson interval against 0.5, `undecidable` when it straddles it, and said in advance to be often so |
| 6 | **The Django judge is unstable.** On Django the reference judgement failed hidden test X15 with "fetch failed" in 5 of 13 runs | Closed on 2026-11-18. Cause: gunicorn closes an idle keep-alive connection after 2 s and Node fetch reused it later. `req()` in `bench/suites/lib.mjs` now sends `Connection: close`. With 16 clients over 90 s on Django, 46 of 1,734 requests failed before and 0 of 1,734 after. `validate-gold --stacks nextjs,django` then passed 59 of 59 on both stacks three times in a row |
| 7 | **The harness hash skips the gold reference.** The kit arms install the reference and the judge scores it | Closed on 2026-11-18. `experimentHash` in `bench/src/judge.mjs` includes `stacks/*/gold` and hashes text files with CRLF turned into LF. Results directories created before this change refuse to resume |
| 8 | **The piece shares example values with one hidden test.** It does not change this experiment's arms, but it is an open instrument problem recorded in [E01](../E01-pilot-full-task/README.md#6-limits) and [E05](../E05-line-vs-workshop/README.md#6-limits) | Closed on 2026-11-18. The two example rows of `bench/arms/openfabric/piece.md` that shared amounts with one test of `hidden2` use other amounts. `bench/test/arms-leak.test.mjs` fails if any amount asserted by a hidden suite appears in a file under `bench/arms/` |
| 9 | **The harness report counts "fully correct" on one hidden suite** | Closed on 2026-11-18. `bench/src/report.mjs` counts a run as correct only when it passes every test of both hidden suites. The column is "Runs passing both suites", and `runs.csv` has the new columns `slot`, `gauge_pass` and `correct` |
| 10 | **Per-attempt judge results.** The hidden suites ran only at the end of a run. Without them no arm could be scored at its first attempt, and the sensitivity and specificity of the gauge could not be estimated | Closed on 2026-11-18. Both hidden suites run after every attempt that builds and starts, on the same app instance, and the result goes to `metrics.json` only. `runs.csv` gained `first_correct`, `first_correct_attempt` and `judge_agrees`, and `attempts.csv` has one row per attempt |

Item 6 of the earlier list, "finish and commit the harness changes", was closed earlier: the work is committed (see the harness state above).

The three ways out of item 1 that the assistant listed on 2026-11-11 are kept for the record. They were observations by the assistant.

| Option | Runs per cell | Runs per arm | Criterion the runs can detect |
| --- | --- | --- | --- |
| Raise the criterion | 5 | 25 in each stack | About 39 points in each stack |
| Read the pooled counts | 5 | 50 over both stacks | About 28 points pooled, with the same sign in each stack |
| Raise the runs | 13 to 20 | 65 to 100 in each stack (62 to 97 are needed) | 20 points in each stack |

The revision of 2026-11-18 follows the second option: it reads the counts stratified by stack and slot, as the verdict rule in `docs/method.md` does, asks for a positive difference in every stack, and raises the criterion to 30 points.

### The owner's confirmation (2026-11-21)

Between 2026-11-18 and 2026-11-21 the assistant explained to the owner the criteria, the plan, the slot list and what the exploratory runs can and cannot show, and asked whether the owner confirmed the criteria as written so that the record could be tagged and the campaign started. On 2026-11-21 the owner answered with the instruction to go ahead and run the experiment. The assistant records that answer as the owner's confirmation of:

- **The criteria of T11, T12, T13 and T22** as proposed on 2026-11-18: d* of 30 points for T11 and T22, the T12 interval rule and the T13 ratio rule.
- **The plan:** one look of 5 runs per cell, 100 runs.
- **The slot list.** The proposal the owner approved on 2026-11-11 named discount, idempotency, webhook signature, ledger entry and stock reservation. The design uses five pure functions (`discount`, `cart`, `signature`, `webhook`, `ledger`) and leaves idempotency and stock reservation installed, because they live in SQL. That substitution was an assumption by the assistant until this confirmation.
