# E05: Line against workshop

**Proposed, not designed.** This is the central experiment: does an agent that assembles verified pieces reach correct software more often than the same agent writing from scratch, in the same stack? Nothing is fixed. The arms below, the revision of T15 and the new T20 are assistant proposals from 2026-11-17 that the owner has not confirmed.

| Field | Value |
| --- | --- |
| Status | `proposed` |
| Kind | confirmatory, planned |
| Dates | Not run |
| Theses | T14, T15, T16, T20, defined in [`docs/theses.md`](../../docs/theses.md) |
| Research questions | RQ2 Assembly; RQ5 Stack for T20 |
| Scope | To decide. At least Next.js and Django; agent or model open |
| Tag and hash | None |
| Data | None |

## 1. Verdict per thesis

None yet. No criterion is fixed.

| Thesis | Claim | Primary comparison | Criterion | Who proposed it |
| --- | --- | --- | --- | --- |
| T14 | The line reaches correct software more often than the workshop | `line` against `workshop`, in the same stack | `line` has at least 20 percentage points more correct runs | Proposed in [`docs/context.md`](../../docs/context.md) on 2026-11-16, not fixed |
| T15, revised | Assembly adds something beyond the gauge | `line` against `workshop-gauge`, in the same stack | `line` has more correct runs, or the same number with a lower cost per correct run. Carried over from the wording of 2026-11-16 | Revised by the assistant on 2026-11-17, not confirmed |
| T16 | The line does not make the result more expensive | `line` against `workshop`, same runs | `line` spends at most the same as `workshop` per correct run, in tokens and in dollars | Proposed in `docs/context.md` on 2026-11-16, not fixed |
| T20, new | The line's advantage does not depend on the stack | The sign of `line` minus `workshop` in each stack | The same sign in every stack tested, at least two | Proposed by the assistant on 2026-11-17, not confirmed |

T15 could be revised because it was never preregistered. Its first wording was "the purpose-built stack adds something beyond the gauge", comparing `line` in a Go stack against `workshop-gauge` in Django. The revision changes the claim and the comparison and keeps the criterion.

## 2. Design as preregistered

Not preregistered. This is a sketch and every item is open.

| Arm | What the agent does | What it sees |
| --- | --- | --- |
| `workshop` | Writes the service from scratch | The task |
| `workshop-gauge` | Writes the service from scratch | The task and the visible gauge |
| `line` | Fills the gaps. The pieces are installed deterministically by the tool | The task and the contracts of the gaps. For T15 to isolate assembly, it must see the same gauge as `workshop-gauge` |

| Item | Sketch |
| --- | --- |
| Stacks | All three arms inside the same stack, in at least Next.js and Django |
| Task | A variant of the checkout, with rules the piece does not bring |
| Agent | A real agent in non-interactive mode, with its cost measured. Which one, and the budget, are open |
| Primary metric | Correct run |
| Secondary metrics | Cost per correct run, hidden pass fraction, calls |
| Runs per cell | Chosen together with the criterion. A 20-point criterion needs 62 to 97 runs per arm ([`docs/method.md`](../../docs/method.md)) |

**Why the arms changed.** The plan of 2026-11-16 compared `workshop` in Django against `line` in Go. That changes two things at once, the treatment and the stack, and `docs/method.md` asks for one difference per comparison. The proposal puts the three arms inside each stack. The stack question moves to T20, and to T21 below.

### Local variant

An assistant proposal, not confirmed. It uses what the bench already has and the only model the local machine loads.

| Item | Local variant |
| --- | --- |
| Model | Qwen2.5-Coder 7B (Q4_K_M) |
| Stacks | Next.js and Django |
| `line` | The reference is installed and the model fills all five slots of [E04](../E04-slot-gauge/README.md) in one run |
| `workshop` | The model writes the service from scratch, as in `bare` |
| `workshop-gauge` | Not specified in the proposal. The closest existing arm is `tests` |
| Primary metric | Correct run |

What the existing data already says about it:

- **`workshop` is expected at the floor.** The 7B scored 0 correct runs in 34 full-task runs ([E01](../E01-pilot-full-task/README.md) and [E03](../E03-exploratory-loop-fixes/README.md)). The variant can show whether `line` leaves the floor. It cannot measure T16, because `workshop` would have no correct runs to divide by.
- **Five files leave almost no retries in six calls.** In E01 the 7B wrote exactly one file in 11 of 12 `of-code` attempts. With five slot files, the budget of E01 and E03 leaves one call to correct anything.
- **A 7B result has a 7B scope.** It says nothing about a frontier agent.

## 3. Controls and the exploratory run

None yet. Required before a tag:

| Control | What it needs here |
| --- | --- |
| Reference | The reference of the task variant passes every suite in every stack |
| Empty | The untouched starting project for `workshop`; all gaps unfilled for `line` |
| Can it fail | `line` is correct by construction outside the gaps. Show an outcome where it misses the criterion |
| Denominator | T16 when an arm has no correct runs |
| Exploratory run | 1 run per cell, to look for a floor in `workshop` or a ceiling in `line` |

## 4. Results per stack, then pooled

Not run yet.

## 5. Deviations from the preregistration

None. Nothing is preregistered.

## 6. Limits

Known before running:

- **Authorship.** The pieces and `hidden` have the same author. `hidden2` is independent, with one exception: the piece given to the `of-spec` and `of-code` arms contains example values that one test of `hidden2` also asserts. For any arm that receives the piece, that suite was not fully independent. The values are not quoted here. They must be changed, and the new hash recorded, before a run gives the piece to a model. Update of 2026-11-18: the two example rows of the piece now use other amounts, and a unit test (`bench/test/arms-leak.test.mjs`) fails if any amount asserted by a hidden suite appears under `bench/arms/`. The new hash is still to be recorded when a run uses the piece.
- **One base task**, the checkout.
- **Real agents cost money and change.** A model changes between runs that are months apart.
- **Help for agents shrinks with each model generation.** A result in favour today may not hold.
- **Risk for T16 and the "fewer tokens" promise.** The competitor research of 2026-11-16 found that help for agents raises the success of weak models by spending more tokens, and that most of this evidence comes from vendors. The promise stands as a thesis under test.
- **Risk for T20 and the "any stack" promise.** In E01 the cost was in mounting the piece into the framework, and each piece needs an adapter per stack. The same research cites a benchmark where models do worse in less popular frameworks. The promise stands as a thesis under test.

The research is summarized in [`research/README.md`](../../research/README.md).

## 7. What changes

Nothing yet. What each verdict would justify is in [`docs/decisions.md`](../../docs/decisions.md).

**T21, a follow-up outside this experiment.** "A purpose-built stack adds something beyond the line": add the candidate stack, Go with PostgreSQL, to the bench and compare `line` there against `line` in the best existing stack. It runs only if T14 is supported. T21 is an assistant proposal from 2026-11-17 and has no experiment number. Go for the backend is an assistant recommendation that the owner has not confirmed.

### Open design questions

1. Which agent or model, and what budget. The 7B cannot do the `workshop` arm.
2. Which stacks. Next.js and Django are in the bench; a general claim needs two from different families.
3. What `line` installs in each stack. Today the pieces exist only as the reference split into five slots.
4. What "the visible gauge" is in `workshop-gauge`: the public tests with their results, as in the `tests` arm, or something else.
5. Which rules the task variant adds, and who writes its hidden tests.
6. The criteria. T15's has two parts and no size: "more correct runs" is met by a difference of one run. T14 asks for 20 points and its runs are not set.
7. How to keep calls and context equal across arms.
8. Whether dollars apply. T16 names them, and a local model has no price.

Items 9 to 12 were added on 2026-11-18. They come from [`docs/model.md`](../../docs/model.md) (section 11 and predictions P5, P8, P11, P12 and P13b), which states what this experiment must record for the model to be tested.

9. **A field for the authoring cost F.** The record has no place for the tokens spent once to author a piece and its gauge (authoring only). Without it the break-even number of uses N* cannot be computed (P8).
10. **A dose level with 3 open slots.** With runs at 1 and 5 open slots, any two points lie on a line, so the sum law of P12 cannot fail. A test needs a third level, 3 open slots, with the call budget scaled to the open slots (assumption A6, also needed for P11). One open slot comes from [E04](../E04-slot-gauge/README.md) and five from the `line` arm of the local variant.
11. **A specified `workshop-gauge` arm and a d* for T15.** Question 4 asks what the visible gauge is. Separately, T15's criterion has no size, so it can come out `supported` or `undecidable` and never `refuted` (P5). It needs a d* before preregistering.
12. **The glue-check result of each workshop run.** For each run of `workshop` and `workshop-gauge`, whether the project built, started and passed the health check. This gives the glue rate per stack that P13b and assumption A7 need.

### What the owner must decide

- **The T15 revision, T20 and T21:** confirm, change or reject.
- **The arms:** three arms inside each stack, as proposed here, or the plan of 2026-11-16.
- **The agent and the budget** for the full-task runs.
- **The local variant:** run it first, or skip it.
- **The criteria,** before any tag.
