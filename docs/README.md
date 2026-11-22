# Documentation

Start with [`vision.md`](vision.md) for the idea and [`method.md`](method.md) for the rules. OpenFabric is a research project: every claim is a numbered thesis, every thesis is tested by an experiment, and nothing of the product is built yet.

## Reading order

| # | Document | Read it to learn |
| --- | --- | --- |
| 1 | [`vision.md`](vision.md) | What OpenFabric claims and why: the workshop-to-factory story, the production line, the catalog and the three promises |
| 2 | [`method.md`](method.md) | How a claim becomes a verdict: vocabulary, statuses, controls, preregistration and verdict rules |
| 3 | [`theses.md`](theses.md) | The registry: every thesis, its criterion, its status and its experiment |
| 4 | [`roadmap.md`](roadmap.md) | What runs now, next and later, and the gates between them |
| 5 | [`decisions.md`](decisions.md) | What the owner decided, what is only recommended, what is open, and which verdicts justify building what |
| 6 | [`product.md`](product.md) | The product approaches, written so each can be tested and stopped, the rungs they climb and the order |
| 7 | [`architecture.md`](architecture.md) | How the instrument is built and how a stack enters it |
| 8 | [`model.md`](model.md) | The mathematical model of the claim |

## Find something fast

| Question | Go to |
| --- | --- |
| What is the status of thesis T<n>? | [`theses.md`](theses.md) |
| What happened in an experiment? | [`../experiments/`](../experiments/) |
| What do we do next? | [`roadmap.md`](roadmap.md#now) |
| Was this decided, or only recommended? | [`decisions.md`](decisions.md) |
| What would make us build something? | [`decisions.md`](decisions.md#decision-map) |
| Which product approach are we testing, and what comes next? | [`product.md`](product.md) |
| What does the market look like? | [`../research/README.md`](../research/README.md) |
| How do I run the bench? | [`../bench/README.md`](../bench/README.md) |
| What does a word mean? | [`method.md`](method.md#vocabulary) |

## The five folders

| Folder | What it holds |
| --- | --- |
| `docs/` | The idea, the method, [the mathematical model of the claim](model.md), the registry, the roadmap and the decisions |
| [`../experiments/`](../experiments/) | One folder per experiment, with its record and the data behind every number. Records follow [`../experiments/TEMPLATE.md`](../experiments/TEMPLATE.md) |
| [`../research/`](../research/README.md) | Market and research evidence. The competitor report of 2026-11 is [`../research/2026-11-competitors/report.es.md`](../research/2026-11-competitors/report.es.md), in Spanish |
| [`../bench/`](../bench/README.md) | The instrument: task, arms, stacks, suites and the loop |
| `../analysis/` | A statistics library with tests, being finished. It sits outside `bench/` so that changing the analysis never changes the frozen harness hash |

## Experiments

| Experiment | Date | Theses | State |
| --- | --- | --- | --- |
| [E01 pilot, full task](../experiments/E01-pilot-full-task/README.md) | 2026-11-09 | T1 to T4 | Ran. Stopped at 18 of 27 runs. T1 to T3 undecidable |
| [E02 no-model controls](../experiments/E02-no-model-controls/README.md) | 2026-11-10 and 11 | T8 to T10 | Ran without a model. The three theses were discarded |
| [E03 exploratory run with loop fixes](../experiments/E03-exploratory-loop-fixes/README.md) | 2026-11-11 (UTC) | None, exploratory | Ran. Floor again |
| [E04 slot gauge](../experiments/E04-slot-gauge/README.md) | 2026-11-21 and 22 | T11 to T13, T22 | Ran, 100 runs. T11 refuted, T22 supported, T12 and T13 undecidable. The T22 difference is 20 points, below the 30 named as d*, and all of it comes from one slot |
| [E05 line against workshop](../experiments/E05-line-vs-workshop/README.md) | Not run | T14, T15, T16, T20 | Proposed |
| [E06 piece questions](../experiments/E06-piece-questions/README.md) | Not run | T17 | Proposed |
| [E07 independent gauge](../experiments/E07-independent-gauge/README.md) | Not run | T18 | Proposed |
| [E08 composition](../experiments/E08-composition/README.md) | Not run | T19 | Proposed |
| [E09 finding the piece](../experiments/E09-finding-the-piece/README.md) | Not run | T23 | Proposed |
| [E10 lessons from the gauge](../experiments/E10-lessons-from-the-gauge/README.md) | Not run | T24 | Proposed |
| [E11 gauge replay](../experiments/E11-gauge-replay/README.md) | Not run | T26 | Proposed |

## History

[`context.md`](context.md) is the earlier single record, written in Spanish. The documents above carry its content. Experiment results moved to [`../experiments/`](../experiments/) and market evidence moved to [`../research/README.md`](../research/README.md).

The idea is also told for a first-time reader in the top-level [`README.md`](../README.md).
