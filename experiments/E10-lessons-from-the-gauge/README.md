# E10: Lessons from the gauge

**Proposed, not designed.** When a gap fails its visible checks, the line keeps a short lesson under the key of that piece and slot. Do the lessons raise correctness at the first attempt? It tests T24, the thesis behind [P7](../../docs/product.md#p7-memory-of-the-line-lessons-kept-from-the-gauge). It was proposed by the assistant on 2026-11-21, after the owner's request of that day, and the owner has not confirmed it. Nothing is fixed, including the criterion.

| Field | Value |
| --- | --- |
| Status | `proposed` |
| Kind | confirmatory, planned |
| Dates | Not run |
| Theses | T24, defined in [`docs/theses.md`](../../docs/theses.md) |
| Research questions | RQ8 Reach |
| Scope | To decide. The sketch is the local model and the slots of [E04](../E04-slot-gauge/README.md) |
| Tag and hash | None |
| Data | None |

## 1. Verdict per thesis

None yet.

| Thesis | Claim | Primary comparison | Criterion | Who proposed it |
| --- | --- | --- | --- | --- |
| T24 | Lessons kept from earlier visible check failures raise correctness at the first attempt | `kit-tests` with the lessons of the slot against `kit-tests` | Not set | Proposed by the assistant on 2026-11-21. Not confirmed by the owner |

## 2. Design as preregistered

Not preregistered. This is a sketch and every item is open.

| Arm | What the model gets |
| --- | --- |
| `kit-tests` | As in E04: the service installed, one slot to fill, and the visible checks |
| `kit-tests` plus lessons | The same, and the lessons kept for that piece and slot, before the first attempt |

| Item | Sketch |
| --- | --- |
| Source of the lessons | Earlier runs of the same slot, taken from the attempts of E04. The analysis of E04 must be done first |
| Key of the store | Piece and slot. Memory is read by key, not by similarity |
| Judge | The hidden suites, the same for both arms |
| Primary metric | To choose. The thesis speaks of correctness at the first attempt, which the per-attempt judge results of E04 can score |
| Stacks, model, runs | Open. The sketch is the stacks and slots of E04 and the local model |

### A hard rule

A lesson is built only from what the model could see: its own answer and the output of the visible checks. Nothing from the hidden suites enters a lesson.

A unit test must fail if a lesson holds a value that a hidden suite asserts. The bench already has such a guard for the arms. The test is written before any lesson is built, and the arm is not run without it.

## 3. Controls and the exploratory run

None yet. The method asks for these before a confirmatory run:

| Control | What it needs here | Exists |
| --- | --- | --- |
| Reference | The reference solution still passes every suite in every stack, with the new arm in the harness | Partly. The E04 controls exist; the new arm has none |
| Empty | What an unfilled slot scores, with the lessons in view | No |
| Can it fail | An outcome where the lessons do not raise first-attempt correctness | No |
| Denominator | The rate at the first attempt is defined when an arm has no correct run | No |
| Leak guard | The unit test of the hard rule | No |
| Exploratory run | 1 run per cell, to look for a floor or a ceiling | No |

## 4. Results per stack, then pooled

Not run yet.

## 5. Deviations from the preregistration

None. Nothing is preregistered.

## 6. Limits

Known before running:

- **One model.** A result with the local model says nothing about a stronger agent.
- **The slots of E04 only.** It says nothing about other slots or tasks.
- **Lessons from the same model may only repeat what the visible checks already say.** If the model already sees the output of its failed checks on the next attempt, a lesson built from them may add nothing at the first attempt of a new run. That is a plausible way for T24 to be `refuted`, and the design must be able to show it.
- **A new arm means a new instrument hash.** It cannot be added to the preregistered E04 campaign.
- **The lessons depend on E04.** The attempts that produce them are the same runs that E04 judges, so the two must not be mixed in one analysis.

## 7. What changes

Nothing yet. If T24 is `supported`, gate G9 opens the lesson store of the line. See [`docs/decisions.md`](../../docs/decisions.md#decision-map).

### Open design questions

1. **How a lesson is written from an attempt,** by a rule or by a model. The rule of [Deterministic first](../../docs/product.md#deterministic-first) prefers a rule, and a model step needs its own gauge.
2. **How many lessons the model gets,** and in which order.
3. **Which runs of E04 may feed the store,** so that the runs scored later are not the source of their own lessons.
4. **The primary metric and the criterion,** chosen together with the number of runs.

### What the owner must decide

- **Whether the thesis is worth testing,** and its criterion.
- **The order:** after the E04 analysis is the proposal.
