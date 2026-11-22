# Thesis registry

On 2026-11-22, one thesis is supported (T22) and one is refuted (T11), for one 7B model (Qwen2.5-Coder), two stacks (Next.js and Django) and five slots. Of 26 theses, 5 ended undecidable (T1, T2, T3, T12, T13), 2 were superseded, 3 were discarded before running, 1 is supported, 1 is refuted and 14 are proposed.

| Status | Theses |
| --- | --- |
| `supported` | T22 |
| `refuted` | T11 |
| `undecidable` | T1, T2, T3, T12, T13 |
| `superseded` | T4 (by T20), T5 (by T17) |
| `discarded` | T8, T9, T10 |
| `proposed` | T6, T7, T14, T15, T16, T17, T18, T19, T20, T21, T23, T24, T25, T26 |

## How to read this registry

- Statuses and rules are defined in [`method.md`](method.md#theses). Numbers are never reused.
- A criterion is written before the run it judges. A run that misses its criterion is published anyway.
- There is one table per research question (`RQ`).
- Each criterion is a faithful translation of the earlier record, [`context.md`](context.md), except where a note below says it was revised (T11 to T13, T15). The tag at its end gives its state: **fixed** (frozen before the run), **proposed** (the owner has not confirmed it) or **not set**.
- Who set each criterion, and when, is in [Who set each criterion](#who-set-each-criterion).
- Experiment records are in [`../experiments/`](../experiments/).

Terms used in the criteria:

| Term | Meaning |
| --- | --- |
| `hidden`, `hidden2` | The two hidden suites: 21 tests, and 26 tests written independently from the task alone |
| Correct run | A run that passes every test of `hidden` and of `hidden2` |
| `bare`, `docs`, `tests`, `of-spec`, `of-code` | Arms of E01, defined in [`../bench/README.md`](../bench/README.md) |
| `of-kit` | Arm proposed for Round 2 and never built: the tool installs the whole piece with its adapter for the stack, and the model gets the contract of the gaps and the public tests. Planned first for Next.js and Django |
| `kit-bare`, `kit-tests` | Arms of E04: the tool installs the service and the model fills one slot |
| `workshop`, `workshop-gauge`, `line` | Arms of E05, all inside the same stack: from scratch, from scratch with the visible gauge, and pieces installed deterministically with the model filling the gaps |
| `full`, `index`, `similarity` | Arms of E09: every piece card in the prompt, one line per piece followed by a fetch of the full card, and the top cards by embedding similarity |
| Slot | A gap as the bench cuts it: one pure function with one business rule |

## RQ1 Gauge

Does a gauge the model can see make the gaps it fills correct, and does it matter who wrote the gauge?

| # | Thesis | Primary comparison | Criterion | Status | Experiment |
| --- | --- | --- | --- | --- | --- |
| T11 | Having the gauge in view improves correctness when filling a slot | `kit-tests` against `kit-bare` | Exact conditional Cochran-Mantel-Haenszel test stratified by stack and slot, one-sided alpha 0.025: `supported` needs a significant test and a positive observed difference in every stack; `refuted` when the Newcombe upper limit of the difference is below d*, with d* = 30 percentage points. One look of 5 runs per cell (100 runs), proposed after the exploratory campaign. **Fixed on 2026-11-21 by the tag `prereg/E04`. Proposed by the assistant on 2026-11-18, replacing the criterion of 2026-11-11, and confirmed by the owner on 2026-11-21.** See [the note on T11](#t11-was-revised-on-2026-11-18) | `refuted` on 2026-11-22 | [E04](../experiments/E04-slot-gauge/README.md) |
| T12 | A gauge that does not cover the subtle rule gives false confidence | Inside `kit-tests`, discount slot: visible checks against hidden tests | Secondary, discount slot, `kit-tests` only. False confidence = runs where the gauge passes and the judge fails, divided by runs where the gauge passes. `supported` when the Clopper-Pearson lower limit (95%) is above 0.5, `refuted` when the upper limit is below 0.5, otherwise `undecidable`; "not estimable" when no run passes the gauge. The public test P1 does not exercise half-to-even rounding. With about 10 to 12 runs it will often be `undecidable`. **Fixed on 2026-11-21 by the tag `prereg/E04`. Proposed by the assistant on 2026-11-18, replacing the criterion of 2026-11-11, and confirmed by the owner on 2026-11-21.** | `undecidable` on 2026-11-22 | [E04](../experiments/E04-slot-gauge/README.md) |
| T13 | The gauge does not make the result more expensive | `kit-tests` against `kit-bare`, tokens per correct run | Secondary. Ratio of tokens per correct run, `kit-tests` over `kit-bare`, with the interval of the statistics tool. `supported` when the upper limit is below 1, `refuted` when the lower limit is above 1, otherwise `undecidable`. If either arm has no correct run, only a one-sided statement is made and the verdict is `undecidable`. **Fixed on 2026-11-21 by the tag `prereg/E04`. Proposed by the assistant on 2026-11-18, replacing the criterion of 2026-11-11, and confirmed by the owner on 2026-11-21.** | `undecidable` on 2026-11-22 | [E04](../experiments/E04-slot-gauge/README.md) |
| T22 | With the gauge in view, the pass or no-pass decision at the end of a run agrees with the judge more often | `kit-tests` against `kit-bare`, on the outcome "the decision is right": the run passed its visible checks and is correct, or did not pass them and is wrong | The same test, strata, alpha and d* = 30 points as T11, on that outcome. The four classes of runs are reported per arm (delivered correct, known failure, silent defect, false rejection), because a gauge that always fails would also score well on wrong runs. **Fixed on 2026-11-21 by the tag `prereg/E04`. Proposed by the assistant on 2026-11-18, from the E04 exploratory campaign (8 of 10 against 5 of 10, not counted as evidence), and confirmed by the owner on 2026-11-21.** | `supported` on 2026-11-22 | [E04](../experiments/E04-slot-gauge/README.md) |
| T18 | A gauge written by someone else detects more than one written by the same model | An arm where the agent writes its own tests against an arm with an independent gauge | To be fixed after the exploratory run. The report also counts the runs that pass every visible example and fail the hidden suite. **Not set** | `proposed` | [E07](../experiments/E07-independent-gauge/README.md) |
| T26 | A gauge written independently from the contract of the piece lets through fewer real wrong answers than the current 12 checks, with the same model | The wrong answers of the E04 confirmatory campaign, replayed against the `public` gauge (the 12 checks of E04) and against an `independent` gauge. Outcome: the share of wrong answers that pass the gauge | To be fixed before any confirmatory replay. **Not set.** Proposed by the assistant on 2026-11-22, at the owner's request of that day | `proposed` | [E11](../experiments/E11-gauge-replay/README.md) |

T26 differs from T18 in what it measures. T18 compares a gauge the agent wrote for itself with an independent one, during a run. T26 measures gauges on answers that already exist, with no model call.

## RQ2 Assembly

Does the line (assembling verified pieces) reach correct software more often than the workshop (writing from scratch), and at what cost?

| # | Thesis | Primary comparison | Criterion | Status | Experiment |
| --- | --- | --- | --- | --- | --- |
| T1 | With the piece, a small model reaches correct software spending less | `of-spec` against `tests` | In each stack, `of-spec` passes more hidden tests (`hidden`, mean per run) than `tests` and spends at least 30% fewer tokens per passed test. **Fixed** | `undecidable` | [E01](../experiments/E01-pilot-full-task/README.md) |
| T2 | With the piece it comes out correct the first time | `of-spec` against `tests` | In each stack, `of-spec` has more 100% correct runs than `tests`. **Fixed** | `undecidable` | [E01](../experiments/E01-pilot-full-task/README.md) |
| T3 | The judge is not biased in favour of the piece | `of-spec` against `tests`, on `hidden2` | In each stack, `of-spec` also beats `tests` on the `hidden2` mean. **Fixed** | `undecidable` | [E01](../experiments/E01-pilot-full-task/README.md) |
| T8 | With the piece assembled by the tool, a small model reaches correct software | `of-kit` against a fixed threshold, with no comparison arm | In each stack, `of-kit` passes on average at least 90% of `hidden` and of `hidden2`. **Proposed, never fixed** | `discarded` | [E02](../experiments/E02-no-model-controls/README.md) |
| T9 | Assembling is cheaper than fabricating | `of-kit` against the best from-scratch arm | In each stack, `of-kit` spends at most 30% of the tokens per passed test of the best from-scratch arm. If no from-scratch arm passes tests, it is reported as "only by assembling does one reach correct software". **Proposed, never fixed** | `discarded` | [E02](../experiments/E02-no-model-controls/README.md) |
| T14 | The line reaches correct software more often than the workshop | `line` against `workshop` | `line` has at least 20 percentage points more correct runs. **Proposed** | `proposed` | [E05](../experiments/E05-line-vs-workshop/README.md) |
| T15 | Assembly adds something beyond the gauge | `line` against `workshop-gauge`, in the same stack | `line` has more correct runs, or the same number with a lower cost per correct run. **Proposed**, carried over from the earlier wording, see [the note on T15](#t15-was-revised-on-2026-11-17) | `proposed` | [E05](../experiments/E05-line-vs-workshop/README.md) |
| T16 | The line does not make the result more expensive | `line` against `workshop`, cost per correct run | `line` spends at most the same as `workshop` per correct run, in tokens and in dollars. **Proposed** | `proposed` | [E05](../experiments/E05-line-vs-workshop/README.md) |

## RQ3 Elicitation

Do the questions a piece carries recover the rules a client did not say?

| # | Thesis | Primary comparison | Criterion | Status | Experiment |
| --- | --- | --- | --- | --- | --- |
| T5 | It works with vague prompts | A new arm with the task written as a client would say it | To be fixed before designing the arm. **Not set** | `superseded` by T17 (2026-11-16) | None |
| T17 | The piece's questions recover the rules the client did not say | With the piece's questions against without them. The task is written as a client would say it, and a simulated client answers only what it is asked | With questions, at least twice as many omitted rules are recovered and there are more correct runs. **Proposed** | `proposed` | [E06](../experiments/E06-piece-questions/README.md) |

## RQ4 Composition

Do pieces that pass on their own still pass when combined?

| # | Thesis | Primary comparison | Criterion | Status | Experiment |
| --- | --- | --- | --- | --- | --- |
| T19 | Pieces that pass separately pass together | A live-sales mix (payment, tenants, and stock reservation during the live session), judged by a hidden suite of the combination written by an independent agent | To be fixed before designing the test. **Not set** | `proposed` | [E08](../experiments/E08-composition/README.md) |

## RQ5 Stack

Does the result depend on the stack, and does a purpose-built stack add anything?

| # | Thesis | Primary comparison | Criterion | Status | Experiment |
| --- | --- | --- | --- | --- | --- |
| T4 | It works in any stack, including legacy | The full matrix with Spring Boot and Laravel | T1 is also met in Spring Boot and Laravel. **Fixed** | `superseded` by T20. It never ran on Spring Boot or Laravel | [E01](../experiments/E01-pilot-full-task/README.md) |
| T20 | The line's advantage does not depend on the stack | `line` against `workshop`, read per stack | The difference has the same sign in every stack tested, at least two. **Proposed** | `proposed` | [E05](../experiments/E05-line-vs-workshop/README.md) |
| T21 | A purpose-built stack adds something beyond the line | `line` in the candidate stack (Go plus PostgreSQL) against `line` in the best existing stack | **Not set**. Runs only if T14 is supported | `proposed` | Not assigned |

## RQ6 Model scale

Does the result hold as models get stronger?

| # | Thesis | Primary comparison | Criterion | Status | Experiment |
| --- | --- | --- | --- | --- | --- |
| T6 | It also helps with large models | The same experiment with a cloud model | To be fixed before running it. **Not set** | `proposed` | Not assigned |
| T10 | The advantage holds with a bigger model | T9 repeated with a 14B model | T9 is also met with the 14B. **Proposed, never fixed** | `discarded` | [E02](../experiments/E02-no-model-controls/README.md) |
| T25 | With a more capable model, the gauge in view raises correct runs and the loop repairs wrong answers | The design of E04 (same arms, slots, stacks and hidden suites) run with a more capable model. `kit-tests` against `kit-bare` on correct runs, and the share of runs with more than one attempt whose result changes after the first attempt | **Not set.** Stated by the owner on 2026-11-22 | `proposed` | Not assigned. It needs the owner's decision on model and budget, see the [open question](decisions.md#open-questions) |

T25 differs from T6. T6 asks whether the piece helps with a large model. T25 asks whether the two things that failed in E04 with the 7B (the gauge in view raising correct runs, and the loop repairing wrong answers) change with a larger one.

## RQ7 Layers beyond backend

Does the gauge work outside the backend?

| # | Thesis | Primary comparison | Criterion | Status | Experiment |
| --- | --- | --- | --- | --- | --- |
| T7 | The gauge works in the frontend | A UI piece with end-to-end tests | To be fixed before writing the piece. **Not set** | `proposed` | Not assigned |

## RQ8 Reach

How should the pieces and what the line has learned reach the agent?

| # | Thesis | Primary comparison | Criterion | Status | Experiment |
| --- | --- | --- | --- | --- | --- |
| T23 | The agent picks the right pieces from an index it can query, as often as from the whole catalog, with fewer tokens | `index` against `full`, with `similarity` as a third arm, at 10, 50 and 200 cards | **Not set.** Proposed by the assistant on 2026-11-21, after the owner's request of that day | `proposed` | [E09](../experiments/E09-finding-the-piece/README.md) |
| T24 | Lessons kept from earlier visible check failures raise correctness at the first attempt | `kit-tests` with the lessons of the slot against `kit-tests` | **Not set.** Proposed by the assistant on 2026-11-21, after the owner's request of that day | `proposed` | [E10](../experiments/E10-lessons-from-the-gauge/README.md) |

## Who set each criterion

A criterion that the owner has not confirmed stays `proposed` and cannot be preregistered.

| Theses | State of the criterion | Set by | When |
| --- | --- | --- | --- |
| T1 to T4 | Fixed before the pilot ran (tag `piloto-preregistro-2`) | The record does not name the author | 2026-11-09 |
| T5, T6, T7 | Never set. The rule was "fixed before designing each test" | Nobody | Not applicable |
| T8 to T10 | Proposed with Round 2 and never fixed | The record does not name the author | After the pilot of 2026-11-09. Discarded on 2026-11-11 |
| T11 to T13 | Proposed, then revised. Confirmed by the owner on 2026-11-21 and preregistered with the tag `prereg/E04` on 2026-11-21 | The assistant | 2026-11-11, revised 2026-11-18 |
| T14, T16, T17, T18, T19 | Proposed with the single-stack pivot. No owner confirmation is recorded | The record does not name the author | 2026-11-16 |
| T15 (revised), T20, T21 | Proposed. The owner has not confirmed them | The assistant | 2026-11-17 |
| T22 | Proposed after the E04 exploratory campaign. Confirmed by the owner on 2026-11-21 and preregistered with the tag `prereg/E04` on 2026-11-21 | The assistant | 2026-11-18 |
| T23, T24 | Never set. The theses were proposed by the assistant after the owner's request of the same day. The owner has not confirmed them | The assistant | 2026-11-21 |
| T25 | Never set. The thesis was stated by the owner on 2026-11-22, after the E04 verdicts. The owner has not set a criterion | Nobody. The owner stated the thesis | 2026-11-22 |
| T26 | Never set. The thesis was proposed by the assistant on 2026-11-22, at the owner's request of that day. The owner has not confirmed it | The assistant | 2026-11-22 |

## Notes

### Why T1 to T3 are undecidable

The pilot ([E01](../experiments/E01-pilot-full-task/README.md)) was stopped on purpose at 18 of 27 runs because all 18 scored 0 of 21 in every arm. That is a floor effect. It says neither that the piece helps nor that it does not.

- **Scope:** one 7B model (Qwen2.5-Coder), Next.js and Django, the whole checkout task.
- **Confirmed again:** the exploratory run with the loop fixes ([E03](../experiments/E03-exploratory-loop-fixes/README.md)) also stayed at zero in all 16 runs, so `tests` against `bare` is still undecidable at full-task size.

### Why T4 and T5 were superseded

- **T4** was marked as replaced on 2026-11-16, when the product direction moved to a single stack. It never ran: the pilot covered only Next.js and Django. The stack question is now T20, which reads the sign of the line's advantage per stack.
- **T5** was replaced by T17 on 2026-11-16. T17 turns "vague prompts still work" into a comparison that can fail.

### Why T8 to T10 were discarded

Round 2 was discarded on 2026-11-11 without running. The no-model controls ([E02](../experiments/E02-no-model-controls/README.md)) showed that its criteria could not be read.

| # | Problem | What the controls showed |
| --- | --- | --- |
| T8 | It is met by construction, so it cannot fail | The criterion was 90%. The discount function the 7B wrote in the pilot (87 output tokens) already puts the installed reference at 95% of `hidden` and 92% of `hidden2`. Only 7 of the 21 tests of `hidden` depend on the slot |
| T9 | It has no denominator | No from-scratch arm passes a single test, so "tokens per passed test" divides by zero |
| T10 | Its criterion is T9 with a bigger model | It falls with T9. The 14B was never run: the available machine only loads the 7B |

What Round 2 left behind:

- **A limit that still applies.** The code a tool installs is the validated reference, so it is correct in part by construction. What such an arm measures is whether deterministic assembly plus slot filling gives a correct service, and at what cost.
- **The loop fixes** it proposed for every arm were made and are described in [E03](../experiments/E03-exploratory-loop-fixes/README.md).
- **The slot design** of [E04](../experiments/E04-slot-gauge/README.md) is the measurable version of the same idea: the tool assembles, the model fabricates the small part, the gauge judges.

### T11 was revised on 2026-11-18

The criterion proposed on 2026-11-11 for T11 was a difference of 20 points with 25 runs per arm. The sample-size table in [`method.md`](method.md#how-many-runs) says that cannot be detected.

| Runs per arm | Smallest difference that can be detected |
| --- | --- |
| 25 (one stack, as proposed) | About 39 points |
| 50 (both stacks pooled) | About 28 points |
| 62 to 97 | 20 points |

The method gives the example: 10 correct of 25 against 15 of 25 is a 20-point difference with a Fisher exact p of 0.26. The method also says a criterion that the planned runs cannot detect is not preregistered. The anchor of this note used to read "T11 must be revised before preregistering".

The assistant revised T11, T12 and T13 on 2026-11-18. The owner confirmed the revision on 2026-11-21, and E04 was preregistered with the tag `prereg/E04` on the same day. The exploratory campaign ran on 2026-11-18, and the confirmatory campaign ran on 2026-11-22 (see the next section).

| | Before (2026-11-11) | After (2026-11-18) |
| --- | --- | --- |
| T11 test | At least 20 points more correct runs, in each stack, over 25 runs per arm | `kit-tests` against `kit-bare`: exact conditional Cochran-Mantel-Haenszel test stratified by stack and slot, one-sided alpha 0.025, a positive observed difference in every stack for `supported` |
| T11 size | 20 points | d* = 30 points. `refuted` when the Newcombe upper limit is below d* |
| Runs | 5 per cell, 100 runs | Fixed at preregistration: 5 per cell in one look (100 runs), or 3 then 6 per cell in two looks (120 runs at most), from the plan table in [`../analysis/README.md`](../analysis/README.md) |
| T12 | At least half of the discount runs of `kit-tests` pass the gauge and fail the judge | Secondary. Clopper-Pearson interval of the false-confidence rate against 0.5; "not estimable" when no run passes the gauge |
| T13 | `kit-tests` spends fewer tokens per correct run than `kit-bare`, in each stack | Secondary. Ratio of tokens per correct run with its interval; `undecidable` when either arm has no correct run |
| Call budget | Not written | 6 calls. The arms stop at different points on purpose, and the record says so |

Why 30 points: in three of the five slots (`signature`, `webhook`, `ledger`) `kit-bare` gets no error signal and stops at its first attempt, so if the gauge matters the difference should be large. It is also the smallest difference that the plan table detects with about 100 runs, and the plan keeps the false-refutation rate at d* below 2.5%. A true difference below 30 points is expected to end `undecidable` or `supported`. The exploratory campaign of E04 ran on 2026-11-18. The owner confirmed the criteria on 2026-11-21, and E04 was preregistered with the tag `prereg/E04` on the same day. See [E04](../experiments/E04-slot-gauge/README.md).

The same check applies to T14. Its proposed criterion is also 20 points, and its runs per arm are not set yet.

### Verdicts of E04 (2026-11-22)

E04 ran its confirmatory campaign on 2026-11-22: 100 runs, 5 per cell, one look, against the criteria fixed by the tag `prereg/E04`. Every verdict holds for one model (Qwen2.5-Coder 7B), two stacks (Next.js and Django) and five slots. The record is [E04](../experiments/E04-slot-gauge/README.md).

| Thesis | Verdict | Numbers |
| --- | --- | --- |
| T11 | `refuted` | Correct runs: `kit-tests` 19 of 50, `kit-bare` 21 of 50. Difference -4.0 points, interval -23.1 to +15.5 points. The upper limit is below d* = 30 points. Exact one-sided p = 0.88 |
| T22 | `supported` | Right decisions: `kit-tests` 37 of 50, `kit-bare` 27 of 50. Difference +20.0 points, interval +0.3 to +37.6 points, exact one-sided p = 0.0018, +20 points in each stack |
| T12 | `undecidable` | Discount slot, `kit-tests`: 5 of the 10 runs that passed the gauge failed the judge. The 95% Clopper-Pearson interval, 18.7% to 81.3%, contains 0.5 |
| T13 | `undecidable` | Tokens per correct run: 32,660 for `kit-tests` and 15,883 for `kit-bare`. Ratio 2.06, limits 0.43 to 9.63, which contain 1 |

Two limits on the `supported` verdict of T22:

1. `supported` means the difference is above zero and d* is not excluded. The estimate is 20 points, below the 30 points named as d*.
2. The whole difference comes from one slot, `signature`: 10 of 10 right decisions against 0 of 10. In the other four slots together the count is 27 against 27.

### T15 was revised on 2026-11-17

T15 was never preregistered, so the method allows editing it. The assistant proposed the revision and the owner has not confirmed it.

| | Before (2026-11-16) | After (2026-11-17) |
| --- | --- | --- |
| Claim | The purpose-built stack adds something beyond the gauge | Assembly adds something beyond the gauge |
| Comparison | `line` in a Go stack against `workshop-gauge` in Django | `line` against `workshop-gauge` in the same stack |
| Why it changed | The two arms differed in the stack and in the treatment at once | One difference per comparison |
| If it is not met | The product is the verification layer on top of existing frameworks | See the [decision map](decisions.md#decision-map) |

The question about the purpose-built stack moved to T21. T14 and T16 were drafted on 2026-11-16 with `workshop` in Django and `line` in a Go stack, on a variant of the checkout task with rules the piece does not carry, run by a real agent. Since 2026-11-17 all three arms sit in the same stack. The design is in [E05](../experiments/E05-line-vs-workshop/README.md).

### Secondary comparisons

Secondary comparisons are described and never get a verdict.

| Thesis | Secondary comparison |
| --- | --- |
| T1 | `of-spec` against `docs` |
| Not tied to one thesis (listed with T14 to T19 on 2026-11-16) | A copied piece against a sealed piece, measured by the tokens the agent spends reading the piece |
| T18 | How many runs pass every visible example and fail the hidden suite |

### Evidence that is not a verdict

- **The gauge caught a subtle error.** In the no-model controls, the two hidden suites, written separately, both flag ordinary rounding where the rule asks for half-to-even (tests H07, X09 and X10). It is the first data point in favour of the idea. See [E02](../experiments/E02-no-model-controls/README.md).
- **The 7B cannot do the whole task.** 34 runs between the pilot and the exploratory run, about 1.83 million tokens, 0 hidden tests passed. See [E01](../experiments/E01-pilot-full-task/README.md) and [E03](../experiments/E03-exploratory-loop-fixes/README.md).

### Claims named but not numbered

These appear in the earlier record as future work. They get a number when someone designs their test.

| Claim | Where it came from |
| --- | --- |
| The tool can install pieces in real projects that differ from the bench skeleton | Round 2: "the real risk moves to the tool" |
| There is a model size from which writing from scratch starts to pass tests | Round 2 proposed a ladder of 7B and 14B models. It belongs to RQ6 |
