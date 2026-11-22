# E09: Finding the piece

**Proposed, not designed.** Does the agent pick the right pieces from an index it can query as often as when it reads the whole catalog, and with fewer tokens? It tests T23, the thesis behind [P6](../../docs/product.md#p6-catalog-access-how-the-agent-finds-the-piece). It was proposed by the assistant on 2026-11-21, after the owner's request of that day, and the owner has not confirmed it. Nothing is fixed, including the criterion.

| Field | Value |
| --- | --- |
| Status | `proposed` |
| Kind | confirmatory, planned |
| Dates | Not run |
| Theses | T23, defined in [`docs/theses.md`](../../docs/theses.md) |
| Research questions | RQ8 Reach |
| Scope | To decide. The sketch is one local model and a synthetic catalog |
| Tag and hash | None |
| Data | None |

## 1. Verdict per thesis

None yet.

| Thesis | Claim | Primary comparison | Criterion | Who proposed it |
| --- | --- | --- | --- | --- |
| T23 | The agent picks the right pieces from an index it can query, as often as from the whole catalog, with fewer tokens | `index` against `full`, with `similarity` as a third arm, at 10, 50 and 200 cards | Not set | Proposed by the assistant on 2026-11-21. Not confirmed by the owner |

## 2. Design as preregistered

Not preregistered. This is a sketch and every item is open.

| Arm | What the model gets |
| --- | --- |
| `full` | Every piece card in the prompt |
| `index` | One line per piece (name, what it does, its contract in short), then a fetch of the full card of the piece it picks. The pick is checked: the fetched contract must fit the gap |
| `similarity` | The top cards by embedding similarity to the task description |

| Item | Sketch |
| --- | --- |
| Catalog | Piece cards with no code behind them, at three sizes: 10, 50 and 200 cards |
| Tasks | A set of task descriptions for which the right pieces are known |
| Answer key | Cards and key are written by an agent that does not see the arms. A second agent checks the key |
| Primary metric | To choose. Candidates are the share of tasks where the picked set equals the right set, and the share of right pieces found. A thesis has one primary comparison |
| Secondary metrics | Tokens per task, and the miss rate of `similarity`, which is what the rule of [Deterministic first](../../docs/product.md#deterministic-first) asks before it enters |
| Model | The local model. Settings open |
| Runs | Open. A run takes seconds and needs no Docker |

## 3. Controls and the exploratory run

None yet. The method asks for these before a confirmatory run:

| Control | What it needs here | Exists |
| --- | --- | --- |
| Reference | The answer key, applied as a pick, scores the maximum | No |
| Empty | A pick of nothing, and a pick of a random card, to give the floor | No |
| Can it fail | An outcome where `index` picks fewer right pieces than `full` at 200 cards | No |
| Denominator | Tokens per task is defined for every arm. A rate over right pieces when a task has none | No |
| Wrong solution | A pick by name overlap alone, to see if the key can be met without choosing | No |
| Exploratory run | 1 run per cell, to look for a floor or a ceiling. At 10 cards `full` may sit at the ceiling | No |

## 4. Results per stack, then pooled

Not run yet. There is no stack: the cards have no code behind them.

## 5. Deviations from the preregistration

None. Nothing is preregistered.

## 6. Limits

Known before running:

- **The cards have no code behind them.** It measures the pick, not the result of building.
- **One local model.** A result with it says nothing about a stronger agent, whose long context may favour `full`.
- **A synthetic catalog.** Real pieces may be less alike, or more alike, than cards written for the test.
- **The authors of cards and key are agents.** A second agent checks the key, and the key is still not a judgment by a person.
- **Guard against leakage.** The arms must not see the key, and no card may hold the words of a task description by construction. The check is written before the campaign.

## 7. What changes

Nothing yet. If T23 is `supported`, gate G8 opens the catalog index and its query interface. If T23 is `refuted`, the assembler takes pieces from a manifest that a person approves. See [`docs/decisions.md`](../../docs/decisions.md#decision-map).

### Open design questions

1. **The primary metric and the criterion** of T23, chosen together with the number of tasks.
2. **How an index line is written,** and who decides what "its contract in short" holds.
3. **The embedding model and the number of top cards** for `similarity`, fixed before the run.
4. **How a pick is read from the model's answer,** and what counts as a wrong fetch.
5. **Whether `full` at 200 cards fits the context** of the local model. If it does not, that arm has a floor by construction.

### What the owner must decide

- **Whether the thesis is worth testing,** and its criterion.
- **The order** relative to [E04](../E04-slot-gauge/README.md) and [E05](../E05-line-vs-workshop/README.md). The proposal is that it comes first, because it needs no verdict.
