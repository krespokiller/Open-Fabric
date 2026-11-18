# E07: Independent gauge

**Proposed, not designed.** Does a gauge written by someone else detect more than the tests a model writes for its own code? This is the arm that [E04](../E04-slot-gauge/README.md) lacks, and its strongest objection. Nothing is fixed, including what "detects" means.

| Field | Value |
| --- | --- |
| Status | `proposed` |
| Kind | confirmatory, planned |
| Dates | Not run |
| Theses | T18, defined in [`docs/theses.md`](../../docs/theses.md) |
| Research questions | RQ1 Gauge |
| Scope | To decide |
| Tag and hash | None |
| Data | None |

## 1. Verdict per thesis

None yet.

| Thesis | Claim | Primary comparison | Criterion | Who proposed it |
| --- | --- | --- | --- | --- |
| T18 | A gauge written by another detects more than one written by the same model | An arm where the agent writes its own tests against an arm with an independent gauge | To be set after the exploratory run | Proposed in [`docs/context.md`](../../docs/context.md) on 2026-11-16, not fixed |

Also reported, without a verdict: how many runs pass every visible example and fail the hidden suite.

## 2. Design as preregistered

Not preregistered. This is a sketch and every item is open.

| Arm | Who writes the gauge | The model iterates until |
| --- | --- | --- |
| Own gauge | The model, for its own code | Its own tests pass, or the budget ends |
| Independent gauge | A different author, before the run | The given tests pass, or the budget ends |

| Item | Sketch |
| --- | --- |
| Judge | The hidden suites, the same for both arms |
| Primary metric | To choose. See the first open question |
| Size of the job | One slot, as in E04, or the full task |
| Stacks, model, runs | Open |

### Published evidence behind it

From the competitor research of 2026-11-16, summarized in [`research/README.md`](../../research/README.md):

| Finding | What it suggests |
| --- | --- |
| Tests written by the same model after the code detect 14% of faults, against 25% when written independently | A gauge by a different author |
| Read-only tests stop a model from editing them, not from programming to fit the examples | A hidden suite next to the visible examples |
| An escalation channel lowered cheating from 23.6% to 5.3% | A way for the agent to stop the line. This is an assistant recommendation that the owner has not confirmed |

These figures come from other people's tasks and models. T18 asks whether the first one holds in this bench.

## 3. Controls and the exploratory run

None yet. Required before a tag:

| Control | What it needs here |
| --- | --- |
| Reference | The reference passes the independent gauge and both hidden suites |
| Empty | What an unfilled solution scores against each gauge. A model can also write an empty gauge that passes anything |
| Can it fail | An outcome where the own gauge detects as much as the independent one |
| Denominator | Any rate over "faults" when a run has none |
| Exploratory run | 1 run per cell. The criterion is set after it |

## 4. Results per stack, then pooled

Not run yet.

## 5. Deviations from the preregistration

None. Nothing is preregistered.

## 6. Limits

Known before running:

- **The existing public tests are not independent.** They have the same author as the piece and as `hidden`. Only `hidden2` was written from the task alone.
- **The arms cannot spend the same.** The arm that writes its own tests uses tokens and calls to write them.
- **One task and one model,** whichever is chosen.

## 7. What changes

Nothing yet. What each verdict would justify is in [`docs/decisions.md`](../../docs/decisions.md).

### Open design questions

1. **What "detects" means.** Two readings: fewer runs that pass their gauge and fail the hidden suite; or more faults caught when each gauge is run against a fixed set of faulty versions of the reference. The thesis needs one.
2. **Who writes the independent gauge,** and how to show that the author never saw the piece.
3. **Whether the harness can run tests the model wrote.** Today the loop applies files and runs fixed checks. The model cannot run commands.
4. **Slot or full task.** A slot fits the 7B and reuses E04. The full task needs a stronger agent.
5. **How it relates to T12 in E04.** Both count runs that pass what they can see and fail the hidden suite.
6. **Whether the escalation channel is a third arm** or a separate experiment.
7. **Runs and criterion,** chosen together.

### What the owner must decide

- **The reading of "detects"** in the first question.
- **The author of the independent gauge.**
- **The scope:** whether a slot-sized result with the 7B is worth having.
- **The order** relative to [E05](../E05-line-vs-workshop/README.md).
