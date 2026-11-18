# E06: Piece questions

**Proposed, not designed.** It tests the second promise, vague prompts that still work: do the business questions a piece carries recover the rules a client did not state? Nothing is fixed, and the harness cannot run it yet, because the model has no way to ask a question.

| Field | Value |
| --- | --- |
| Status | `proposed` |
| Kind | confirmatory, planned |
| Dates | Not run |
| Theses | T17, defined in [`docs/theses.md`](../../docs/theses.md). T17 replaces T5 |
| Research questions | RQ3 Elicitation |
| Scope | To decide |
| Tag and hash | None |
| Data | None |

## 1. Verdict per thesis

None yet.

| Thesis | Claim | Primary comparison | Criterion | Who proposed it |
| --- | --- | --- | --- | --- |
| T17 | The piece's questions recover the rules the client did not say | The same task with and without the piece's questions | With the questions, at least twice as many omitted rules are recovered and there are more correct runs | Proposed in [`docs/context.md`](../../docs/context.md) on 2026-11-16, not fixed |

## 2. Design as preregistered

Not preregistered. This is a sketch and every item is open.

| Item | Sketch |
| --- | --- |
| Task | The checkout written as a client would say it, with some rules left out |
| Client | Simulated. It only answers what it is asked |
| Arms | Without the piece's questions, and with them. Nothing else differs |
| Primary metric | To choose between omitted rules recovered and correct run. A thesis has one primary comparison, and the proposed criterion names two |
| Stacks, model, runs | Open |

The idea behind it, from `docs/context.md`: each piece brings its business questions, and a gap is a question nobody has answered.

## 3. Controls and the exploratory run

None yet. Required before a tag:

| Control | What it needs here |
| --- | --- |
| Reference | With every omitted rule answered, the reference passes every suite |
| Empty | What a run scores when no question is asked and the defaults are used |
| Can it fail | An outcome where the questions are asked and the rules are still not recovered |
| Denominator | "Twice as many" when the arm without questions recovers zero rules |
| Exploratory run | 1 run per cell |

## 4. Results per stack, then pooled

Not run yet.

## 5. Deviations from the preregistration

None. Nothing is preregistered.

## 6. Limits

Known before running:

- **A simulated client is not a business person.** The result says nothing about a real approver. The owner stated on 2026-11-16 that the approver may be non-technical, for example a CEO; this experiment does not test that.
- **Nobody has measured the whole chain.** The competitor research found one survey from 2020, self-selected, on who defines examples in teams, and no measurement from business person to verified software. See [`research/README.md`](../../research/README.md).
- **One task**, the checkout.

## 7. What changes

Nothing yet. What each verdict would justify is in [`docs/decisions.md`](../../docs/decisions.md).

### Open design questions

1. **The harness has no question channel.** The loop sends a prompt and applies files. The model cannot ask, and nothing answers.
2. **Which rules are omitted, and who chooses them.** If the author of the questions also picks the omissions, the questions fit them by construction.
3. **How the simulated client decides that a question asks for a rule.** It needs a fixed rule or a separate judge, written before the runs.
4. **Whether the arm without the piece's questions may ask its own.** If it may not ask at all, two things differ between the arms: the channel and the list.
5. **What "recovered" means:** asked and answered, or implemented and passing the hidden tests of that rule.
6. **Which model.** The 7B is at the floor on the full task ([E03](../E03-exploratory-loop-fixes/README.md)). A slot-sized version may be the only one the local machine can run.
7. **Whether it depends on [E05](../E05-line-vs-workshop/README.md).** The questions belong to pieces, so the line must exist in some form.

### What the owner must decide

- **The primary metric and the criterion** of T17.
- **Who plays the client:** simulated only, or a person in a later experiment.
- **Which rules are left out.** They stand for the business-core rules that, in the owner's description of 2026-11-16, are talked through with the LLM.
- **The model or agent,** and its budget.
- **The order:** before or after E05.
