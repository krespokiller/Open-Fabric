# E04: Gauge at slot level

**Designed, not preregistered, not run.** The tool installs the whole reference service and leaves one slot: a pure function with one business rule. The model writes only that function, with or without the gauge in view. The preregistration is blocked: the proposed T11 criterion cannot be detected with the planned runs, the exploratory run has not happened, and four instrument problems are open (see section 7).

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

None yet. The criteria below were proposed by the assistant on 2026-11-11 and the owner has not confirmed them.

| Thesis | Claim | Primary comparison and proposed criterion | Verdict |
| --- | --- | --- | --- |
| T11 | A gauge in view improves correctness when filling a slot | In each stack, over the five slots (5 runs per cell, 25 per arm), `kit-tests` has at least 20 percentage points more correct runs than `kit-bare` | None yet |
| T12 | A gauge that does not cover the subtle rule gives false confidence | In the discount slot, at least half of the `kit-tests` runs pass every visible check and fail some hidden test. Public test P1 does not exercise half-to-even rounding | None yet |
| T13 | The gauge does not make the result more expensive | In each stack, `kit-tests` spends fewer tokens per correct run than `kit-bare`. If `kit-bare` has no correct runs, it is reported as such | None yet |

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
| Runs per cell | 5. Cells are arm by slot by stack: 20 cells, 100 runs, 25 per arm in each stack |
| Call budget | Not written yet. [E01](../E01-pilot-full-task/README.md) and [E03](../E03-exploratory-loop-fixes/README.md) used 6 |
| Primary metric | Correct run: every test of `hidden` and of `hidden2` passes |
| Secondary metrics | Calls and tokens per arm; runs that pass every visible check and fail a hidden test |
| Installed code | Read-only, and left out of the prompt |

| Arm | What the model gets | Feedback after each attempt | Stops when |
| --- | --- | --- | --- |
| `kit-bare` | The task and the contract of the slot | Build and start, plus the 4 basic checks | The 4 checks pass, or the budget ends |
| `kit-tests` | The same, plus the 8 public tests | The same, plus the results of the 8 public tests | The 12 checks pass, or the budget ends |

**One slot per run** was chosen on 2026-11-11 for two reasons: the 7B writes one file per call, and each slot gives an independent data point.

**Harness state on 2026-11-18.** The instrument work is committed on `main` and pushed: the loop fixes in `7d84d61`, the references split into slot files in `c20ca1c`, the kit arms in `bafdac5` and the slot checks before a run, with both kit arms covered by the selftest, in `759051f`. `validate-gold` passed 59 of 59 on Next.js and Django, and `node --test test/kit.test.mjs` passed 14 of 14. The kit arms have not been used in a run yet. Four instrument problems are still open (see the open items below).

## 3. Controls and the exploratory run

| Control | Result |
| --- | --- |
| Reference | Done. After the split into slot files the reference passes 59 of 59 in Next.js and in Django (working notes kept outside the repository; repeated on commit `759051f`) |
| Empty | Done on 2026-11-11. Table below |
| Can it fail | Open. It depends on the exploratory run |
| Denominator | Partly. T13 says what happens when `kit-bare` has no correct runs. It does not say what happens when `kit-tests` has none |
| Exploratory run | Pending. 1 run per cell, 20 runs |

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

## 4. Results per stack, then pooled

Not run yet.

## 5. Deviations from the preregistration

None. Nothing is preregistered.

## 6. Limits

These are the limits written with the design in `docs/context.md`.

- **The arms do not get the same number of calls.** `kit-bare` stops when its 4 checks pass and `kit-tests` continues until 12 pass. Calls and tokens are reported per arm.
- **Information and feedback are not separated.** `kit-tests` receives the description of the tests and also their results.
- **The strongest objection is not tested.** There is no arm where the model writes its own tests. That is [E07](../E07-independent-gauge/README.md).
- **One task, one model, slots of a few lines.** It says nothing about writing a whole service.
- **Authorship.** The piece, the public tests and `hidden` have the same author. `hidden2` is independent.

## 7. What changes

Nothing yet. The result will be read against [`docs/decisions.md`](../../docs/decisions.md).

### Open items before preregistering

| # | Item | Why it blocks |
| --- | --- | --- |
| 1 | **Revise the T11 criterion** | It asks for 20 points with 25 runs per arm in each stack. The table in [`docs/method.md`](../../docs/method.md) says 25 runs per arm detect about 39 points, and 50 per arm (both stacks pooled) about 28. A 20-point difference needs 62 to 97 runs per arm. `docs/method.md` does not allow preregistering a criterion the runs cannot detect |
| 2 | **Run the exploratory run** | 1 run per cell. If `kit-bare` is already near 100%, or both arms are near 0%, the design cannot discriminate and is redesigned before the tag |
| 3 | Fix the call budget | It is not written, and the arms stop at different points |
| 4 | Define T13 when `kit-tests` has no correct runs | The denominator control is only half answered |
| 5 | Look at the sample behind T12 | It rests on the discount cell alone: 5 runs per stack. "At least half" of 5 runs has a very wide interval. This is an observation by the assistant |
| 6 | **The Django judge is unstable** | On Django the reference judgement failed hidden test X15 with "fetch failed" in 5 of 13 runs. A correct run needs both hidden suites in full, so Django cannot be counted until the cause is fixed or the test is excluded by a rule written before the run |
| 7 | **The harness hash skips the gold reference** | The kit arms install the reference into the workspace and the judge scores it, so a change to it would not show in the hash. Include `stacks/*/gold` in the hash before the tag. This is a proposal of the assistant |
| 8 | **The piece shares example values with one hidden test** | The piece given to `of-spec` and `of-code` (not to the kit arms) contains example values that one test of `hidden2` also asserts. It does not change this experiment's arms, but it is an open instrument problem recorded in [E01](../E01-pilot-full-task/README.md#6-limits) and [E05](../E05-line-vs-workshop/README.md#6-limits) |
| 9 | **The harness report counts "fully correct" on one hidden suite** | The method defines a correct run over both suites, and the kit section of the report is the only place that uses both. Until the report or the analysis library counts both suites, the correct runs of E04 are counted by hand |

Item 6 of the earlier list, "finish and commit the harness changes", is closed: the work is committed (see the harness state above).

Three ways out of item 1, for the owner to choose. They are observations by the assistant.

| Option | Runs per cell | Runs per arm | Criterion the runs can detect |
| --- | --- | --- | --- |
| Raise the criterion | 5 | 25 in each stack | About 39 points in each stack |
| Read the pooled counts | 5 | 50 over both stacks | About 28 points pooled, with the same sign in each stack |
| Raise the runs | 13 to 20 | 65 to 100 in each stack (62 to 97 are needed) | 20 points in each stack |

The second option matches the verdict rule in `docs/method.md`, which tests the pooled counts and asks for the same sign in every stack. The proposed criterion is written "in each stack" instead.

### What the owner must decide

- **The criteria of T11, T12 and T13.** They are proposals until confirmed.
- **The slot list.** The proposal the owner approved on 2026-11-11 named discount, idempotency, webhook signature, ledger entry and stock reservation. The design uses five pure functions instead and leaves idempotency and stock reservation installed. That substitution is an assumption by the assistant, recorded in working notes kept outside the repository.
- **Runs or criterion:** one of the three options under item 1.
