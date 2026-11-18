# E04: Gauge at slot level

**Designed, revised on 2026-11-18, not preregistered, not run.** The tool installs the whole reference service and leaves one slot: a pure function with one business rule. The model writes only that function, with or without the gauge in view. On 2026-11-18 the assistant revised the criteria of T11, T12 and T13 so that the planned runs can detect them (section 1). The four instrument problems listed before are closed (section 7). The preregistration is still blocked by three things: the owner has not confirmed the criteria, the instrument does not yet record the judge result of each attempt, and the exploratory campaign has not run. The owner's standing instruction of 2026-11-17 is to start testing the theses once the path is clear.

| Field | Value |
| --- | --- |
| Status | `designed` |
| Kind | confirmatory, planned |
| Dates | Not run. Designed on 2026-11-11 |
| Theses | T11, T12, T13, defined in [`docs/theses.md`](../../docs/theses.md) |
| Research questions | RQ1 Gauge |
| Scope | Planned: Next.js and Django; Qwen2.5-Coder 7B (Q4_K_M) on a local GPU; five slots of the checkout task |
| Tag and hash | None yet |
| Data | None yet. The control results are kept outside the repository and carried here from [`docs/context.md`](../../docs/context.md) |

This experiment is called "Ronda 3" in `docs/context.md`. The task notes behind it are working notes kept outside the repository.

## 1. Verdict per thesis

None yet. The criteria below were proposed by the assistant on 2026-11-18, replacing the ones proposed on 2026-11-11, and the owner has not confirmed them. The decision rule is the one in [`docs/method.md`](../../docs/method.md#the-decision-rule), implemented in [`analysis/`](../../analysis/README.md).

| Thesis | Claim | Primary comparison and proposed criterion | Verdict |
| --- | --- | --- | --- |
| T11 | A gauge in view improves correctness when filling a slot. **Primary** | `kit-tests` (treatment) against `kit-bare` (control). Exact conditional Cochran-Mantel-Haenszel test stratified by stack and slot, one-sided alpha 0.025. `supported` needs the test to pass and a positive observed difference in every stack. `refuted` when the Newcombe upper limit of the difference is below d*. d* = 30 percentage points. Runs per cell are fixed at preregistration (see section 2) | None yet |
| T12 | A gauge that does not cover the subtle rule gives false confidence. Secondary | Discount slot, `kit-tests` only. False confidence = runs where the gauge passes and the judge fails, divided by runs where the gauge passes. `supported` when the Clopper-Pearson lower limit (95%) is above 0.5, `refuted` when the upper limit is below 0.5, otherwise `undecidable`. "Not estimable" when no run passes the gauge. Public test P1 does not exercise half-to-even rounding | None yet |
| T13 | The gauge does not make the result more expensive. Secondary | Ratio of tokens per correct run, `kit-tests` over `kit-bare`, with the interval of the statistics tool. `supported` when the upper limit is below 1, `refuted` when the lower limit is above 1, otherwise `undecidable`. If either arm has no correct run, only a one-sided statement is made and the verdict is `undecidable` | None yet |

**Why 30 points for T11.** In three of the five slots (`signature`, `webhook`, `ledger`) `kit-bare` gets no error signal and stops at its first attempt (section 3). If the gauge matters, the difference should be large there. 30 points is also the smallest difference that the plan table in [`analysis/README.md`](../../analysis/README.md) detects with about 100 runs: 5 runs per cell supports a true 30-point difference 81% of the time, and 3 then 6 per cell supports it 87% of the time. At a true difference of exactly 30 points the rule calls `refuted` at most 2.5% of the time (the table reports 2.4%). A true difference below 30 points is expected to end `undecidable` or `supported`, not `refuted`. This replaces "20 points with 25 runs per arm in each stack", which the runs could not detect (see [`docs/theses.md`](../../docs/theses.md#t11-was-revised-on-2026-11-18)).

**Why T12 and T13 are secondary.** They are read from the same runs and get no sample size of their own. With about 10 to 12 runs in the discount cell, T12 will often be `undecidable`; that is stated in advance. T13 is `undecidable` whenever one arm has no correct run.
## 2. Design as preregistered

Not preregistered. Everything here can still change.

Since everything outside the slot is the reference, any hidden test that fails is caused by the slot. This is the measurable version of "the tool assembles, the model makes the small part, the gauge judges".

| Item | Value |
| --- | --- |
| Slots | `discount`, `cart` (cart validation), `signature` (webhook signature), `webhook` (webhook decision), `ledger` (ledger entries). The same five in both stacks |
| Left installed | Idempotency and stock reservation, because they live in SQL |
| Arms | `kit-bare` and `kit-tests` (table below). One slot per run; every other slot holds the reference code |
| Stacks | Next.js and Django |
| Model | Qwen2.5-Coder 7B (Q4_K_M). The owner stated that only the local machine is available (working notes kept outside the repository) |
| Runs per cell | Fixed at preregistration from the plan table in [`analysis/README.md`](../../analysis/README.md): 5 per cell in one look (100 runs), or 3 then 6 per cell in two looks (120 runs at most). Cells are arm by slot by stack: 20 cells. The choice is made after the exploratory campaign measures the time per run |
| Call budget | 6, as in [E01](../E01-pilot-full-task/README.md) and [E03](../E03-exploratory-loop-fixes/README.md). The arms stop at different points on purpose: the gauge loop (keep working while a visible check fails) is part of the treatment, and this record says so |
| Primary metric | Correct run: every test of `hidden` and of `hidden2` passes |
| Secondary metrics | Calls and tokens per arm; runs that pass every visible check and fail a hidden test. The first-attempt comparison at equal calls (the rule "calls held equal" of [`docs/method.md`](../../docs/method.md)) is reported as a secondary result once the instrument records per-attempt judge results |
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
- In a kit run, build output and app logs lose the lines that quote installed files (`kitFeedbackText` in `bench/src/prompts.mjs`), because a code frame of an installed file would show the model code it cannot edit.
- `bench/test/` holds 33 unit tests; the command is `node --test "test/*.test.mjs"` from `bench/`.

`validate-gold` passed 59 of 59 on Next.js and Django three times in a row. The kit arms have not been used in a run yet. One instrument item is open and next: the judge result of each attempt (item 10).

## 3. Controls and the exploratory run

| Control | Result |
| --- | --- |
| Reference | Done. After the split into slot files the reference passes 59 of 59 in Next.js and in Django (working notes kept outside the repository; repeated on commit `759051f`). Repeated three times in a row on 2026-11-18, after the judge client fix, with 59 of 59 on both stacks each time |
| Empty | Done on 2026-11-11. Table below |
| Can it fail | Open. It depends on the exploratory campaign |
| Denominator | Written in the revised criteria of 2026-11-18. T13 is `undecidable` when either arm has no correct run, and T12 is "not estimable" when no run passes the gauge |
| Exploratory campaign | Pending. 1 run per cell, 20 runs, 10 per arm (the method asks for at least five per arm). See below |

### Unfilled-slot control

The reference with one slot left unfilled, per slot and stack. Ten controls ran. The results are identical in Next.js and Django.

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

## 4. Results per stack, then pooled

Not run yet.

## 5. Deviations from the preregistration

None. Nothing is preregistered.

## 6. Limits

These are the limits written with the design in `docs/context.md`.

- **The arms do not get the same number of calls, on purpose.** `kit-bare` stops when its 4 checks pass and `kit-tests` continues until 12 pass. The loop is part of the treatment. Calls and tokens are reported per arm. The comparison with every arm scored at its first attempt needs the judge result of each attempt, which the instrument does not record yet (item 10).
- **The gauge can be measured only at the end of a run.** The hidden suites run once, on the final state. Sensitivity and specificity of the gauge, and false confidence per attempt, cannot be estimated until item 10 is done. T12 is read from final states.
- **Small samples in the secondary theses.** T12 rests on the discount cell, about 10 to 12 runs. T13 depends on both arms having correct runs.
- **Information and feedback are not separated.** `kit-tests` receives the description of the tests and also their results.
- **The strongest objection is not tested.** There is no arm where the model writes its own tests. That is [E07](../E07-independent-gauge/README.md).
- **One task, one model, slots of a few lines.** It says nothing about writing a whole service.
- **Authorship.** The piece, the public tests and `hidden` have the same author. `hidden2` is independent.

## 7. What changes

Nothing yet. The result will be read against [`docs/decisions.md`](../../docs/decisions.md).

### Open items before preregistering

State on 2026-11-18. Closed items stay in the table with the date and how they were closed.

| # | Item | State |
| --- | --- | --- |
| 1 | **Revise the T11 criterion.** The earlier one asked for 20 points with 25 runs per arm in each stack. The table in [`docs/method.md`](../../docs/method.md) says 25 runs per arm detect about 39 points, and 50 per arm (both stacks pooled) about 28. A 20-point difference needs 62 to 97 runs per arm. `docs/method.md` does not allow preregistering a criterion the runs cannot detect | Answered by the revision of 2026-11-18 (section 1): d* of 30 points, stratified exact test, 100 or 120 runs. Awaits the owner's confirmation |
| 2 | **Run the exploratory campaign.** If `kit-bare` is already near 100%, or both arms are near 0%, the design cannot discriminate and is redesigned before the tag | Open. The redesign rule is written above. Waits for item 10 |
| 3 | Fix the call budget. It was not written, and the arms stop at different points | Settled as proposed on 2026-11-18: 6 calls. The different stopping points are part of the treatment |
| 4 | Define T13 when `kit-tests` has no correct runs | Settled as proposed on 2026-11-18: T13 is a ratio of tokens per correct run, and `undecidable` when either arm has none |
| 5 | Look at the sample behind T12. It rests on the discount cell alone, and "at least half" of 5 runs has a very wide interval | Answered by the T12 rule of 2026-11-18: a Clopper-Pearson interval against 0.5, `undecidable` when it straddles it, and said in advance to be often so |
| 6 | **The Django judge is unstable.** On Django the reference judgement failed hidden test X15 with "fetch failed" in 5 of 13 runs | Closed on 2026-11-18. Cause: gunicorn closes an idle keep-alive connection after 2 s and Node fetch reused it later. `req()` in `bench/suites/lib.mjs` now sends `Connection: close`. With 16 clients over 90 s on Django, 46 of 1,734 requests failed before and 0 of 1,734 after. `validate-gold --stacks nextjs,django` then passed 59 of 59 on both stacks three times in a row |
| 7 | **The harness hash skips the gold reference.** The kit arms install the reference and the judge scores it | Closed on 2026-11-18. `experimentHash` in `bench/src/judge.mjs` includes `stacks/*/gold` and hashes text files with CRLF turned into LF. Results directories created before this change refuse to resume |
| 8 | **The piece shares example values with one hidden test.** It does not change this experiment's arms, but it is an open instrument problem recorded in [E01](../E01-pilot-full-task/README.md#6-limits) and [E05](../E05-line-vs-workshop/README.md#6-limits) | Closed on 2026-11-18. The two example rows of `bench/arms/openfabric/piece.md` that shared amounts with one test of `hidden2` use other amounts. `bench/test/arms-leak.test.mjs` fails if any amount asserted by a hidden suite appears in a file under `bench/arms/` |
| 9 | **The harness report counts "fully correct" on one hidden suite** | Closed on 2026-11-18. `bench/src/report.mjs` counts a run as correct only when it passes every test of both hidden suites. The column is "Runs passing both suites", and `runs.csv` has the new columns `slot`, `gauge_pass` and `correct` |
| 10 | **Per-attempt judge results.** The hidden suites run only at the end of a run. Without them no arm can be scored at its first attempt, and the sensitivity and specificity of the gauge cannot be estimated | Open, and next. It comes before the exploratory campaign |

Item 6 of the earlier list, "finish and commit the harness changes", was closed earlier: the work is committed (see the harness state above).

The three ways out of item 1 that the assistant listed on 2026-11-11 are kept for the record. They were observations by the assistant.

| Option | Runs per cell | Runs per arm | Criterion the runs can detect |
| --- | --- | --- | --- |
| Raise the criterion | 5 | 25 in each stack | About 39 points in each stack |
| Read the pooled counts | 5 | 50 over both stacks | About 28 points pooled, with the same sign in each stack |
| Raise the runs | 13 to 20 | 65 to 100 in each stack (62 to 97 are needed) | 20 points in each stack |

The revision of 2026-11-18 follows the second option: it reads the counts stratified by stack and slot, as the verdict rule in `docs/method.md` does, asks for a positive difference in every stack, and raises the criterion to 30 points.

### What the owner must decide

- **The criteria of T11, T12 and T13** as revised on 2026-11-18: d* of 30 points, the T12 interval rule and the T13 ratio rule. They are proposals until confirmed.
- **The slot list.** The proposal the owner approved on 2026-11-11 named discount, idempotency, webhook signature, ledger entry and stock reservation. The design uses five pure functions instead and leaves idempotency and stock reservation installed. That substitution is an assumption by the assistant, recorded in working notes kept outside the repository, and still needs the owner's confirmation.
