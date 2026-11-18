# E08: Composition

**Proposed, and the least defined of the planned experiments.** Do pieces that pass their gauges one by one still pass when they are assembled together? Only one piece exists today, the checkout, so the mix this experiment needs cannot be assembled yet.

| Field | Value |
| --- | --- |
| Status | `proposed` |
| Kind | confirmatory, planned |
| Dates | Not run |
| Theses | T19, defined in [`docs/theses.md`](../../docs/theses.md) |
| Research questions | RQ4 Composition |
| Scope | To decide |
| Tag and hash | None |
| Data | None |

## 1. Verdict per thesis

None yet.

| Thesis | Claim | How it would be tested | Criterion | Who proposed it |
| --- | --- | --- | --- | --- |
| T19 | Pieces that pass separately pass together | A mix of pieces, judged by a hidden suite of the combination | To be set before the test is designed | Proposed in [`docs/context.md`](../../docs/context.md) on 2026-11-16, not fixed |

## 2. Design as preregistered

Not preregistered. This is a sketch and every item is open.

| Item | Sketch |
| --- | --- |
| Mix | Live sales: payment, tenants, and stock reservation during the live event |
| Judge | A hidden suite of the combination, written by an independent agent |
| Measure | Runs where every piece passes its own gauge and the combination suite fails |
| Arms, stacks, model, runs | Open |

T19 as written is a claim about one rate, not a comparison between two arms. A thesis needs one primary comparison and a result that would refute it.

## 3. Controls and the exploratory run

None yet. Required before a tag:

| Control | What it needs here |
| --- | --- |
| Reference | The reference of the mix passes every piece gauge and the combination suite, in every stack |
| Empty | What the mix scores with one piece missing or unfilled |
| Can it fail | A known interaction fault that every piece gauge misses and the combination suite catches |
| Denominator | The rate when no run passes every piece gauge |
| Exploratory run | 1 run per cell |

## 4. Results per stack, then pooled

Not run yet.

## 5. Deviations from the preregistration

None. Nothing is preregistered.

## 6. Limits

Known before running:

- **One mix.** A result for live sales says nothing about another combination.
- **Authorship.** The combination suite must come from someone who did not write the pieces.
- **The interactions were avoided so far.** [E04](../E04-slot-gauge/README.md) leaves idempotency and stock reservation installed because they live in SQL. Composition is where shared tables and transactions meet.

## 7. What changes

Nothing yet. What each verdict would justify is in [`docs/decisions.md`](../../docs/decisions.md).

### Open design questions

1. **The pieces do not exist.** Someone has to write the other pieces of the mix, their gauges and their references, and in which stacks.
2. **What the comparison is.** A threshold on the rate, or a second arm, such as the same mix written from scratch.
3. **Whether tenants is a piece.** `docs/context.md` lists tenants in this mix, and also says that tenants, auth and contracts come with the base and are not pieces.
4. **Who writes the combination suite,** and from which description.
5. **Which stacks.** A general claim needs two from different families.
6. **Which model or agent.** The 7B is at the floor on a single full task ([E03](../E03-exploratory-loop-fixes/README.md)).
7. **Whether it waits for [E05](../E05-line-vs-workshop/README.md).** The plan of 2026-11-16 put it last.

Items 8 to 10 were added on 2026-11-18. They come from [`docs/model.md`](../../docs/model.md) (section 11 and predictions P8, P11 and P12), which states what this experiment must record for the model to be tested.

8. **A field for the authoring cost F.** The record has no place for the tokens spent once to author each piece and its gauge (authoring only). The pieces of the mix do not exist yet (item 1), so this is the first experiment that builds them, and F has to be recorded as they are written. Without it the break-even number of uses N* cannot be computed (P8).
9. **Dose levels.** P12 lists E08 for the check of the sum law over open slots: runs at 1, 3 and 5 open slots, so that the line is not fitted through two points. The mix has to allow a level with 3 open slots.
10. **The call budget must grow with the open slots.** P11 (pieces that pass alone pass together, R = 1) is valid only if the budget scales with the open slots (assumption A6). With a shared budget R falls without any interference.

### What the owner must decide

- **The mix.** The owner named fintech, streaming and gaming as verticals on 2026-11-16; `docs/context.md` uses live sales for this test.
- **The comparison and the criterion** of T19.
- **Who builds the missing pieces,** and when.
- **The order:** after E05, or earlier in a smaller form.
