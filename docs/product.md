# Product approaches

**Proposed by the assistant on 2026-11-21. Not confirmed by the owner.** This applies to every approach, rung and rule below.

Summary:

- The registry orders the claims. This document orders the product: seven approaches, each written so it can be tested and stopped.
- Every approach climbs the same five rungs. A rung is passed by a number written before it runs.
- Nothing of the product is built. Only P1 is in progress, at rung 1. E04 gave its verdicts on 2026-11-22: T22 supported (20 points, below d* = 30, all from the `signature` slot) and T11 refuted. P1 passes rung 1 only when the owner decides the amendment to G1.

| Id | Approach | Gate | Rung today | State |
| --- | --- | --- | --- | --- |
| P1 | Gauge kit for existing stacks | G1 | 1, evidence in | Rung 1: evidence in, waits for the owner |
| P2 | Catalog and assembler (the production line) | G2, G3, G7 | 0 | Stated |
| P3 | Pieces that carry business questions | G5 | 0 | Stated |
| P4 | Blueprints | G6 | 0 | Stated |
| P5 | A stack of its own | G4 | 0 | Stated |
| P6 | Catalog access: how the agent finds the piece | G8 | 0 | Stated |
| P7 | Memory of the line: lessons kept from the gauge | G9 | 0 | Stated |

## The end: what done means

**Proposed by the assistant on 2026-11-21 from the owner's statements. Not confirmed by the owner.** The work ends when these six things are true.

| # | Done means | The owner said it on |
| --- | --- | --- |
| 1 | **A verdict on whether it is worth it.** Every approach in this document has passed its rungs or has been stopped, with correct runs and tokens counted and the rules frozen before the data | 2026-11-09 |
| 2 | **Tested in many ways.** The verdicts hold for more than one model, including a real agent, for more than one stack and for more slots than the five of E04 | 2026-11-09 |
| 3 | **Order.** Every approach has a card, a gate and a place in the order, and everything is on `main` | 2026-11-21 |
| 4 | **Deterministic first.** The tool does what a rule can do, and every step done by a model has a gauge with a measured error rate | 2026-11-21 |
| 5 | **Numbers, not agreement.** A result against the thesis is published like one in favour | 2026-11-11 |
| 6 | **A product, if the evidence supports one.** It is built under the two outputs: clean, scalable code in OpenFabric and in each piece. If the evidence refutes it, the benchmark and the negative result are what the work delivers | 2026-11-18 |

E04 is the first step towards point 1, for P1. It does not meet point 2: it has one model, two stacks and five slots.

## What this document is

[`theses.md`](theses.md) orders the claims. The [decision map](decisions.md#decision-map) says which verdicts justify building what. This document adds the product side: each approach is something that could be built, written so that it can be tested and stopped.

Why it exists, in the owner's words:

| Date | What the owner said |
| --- | --- |
| 2026-11-09 | The goal is to test the thesis in many ways and have a real benchmark, with token spend, of whether the idea is worth it or not, and to think about how to do it better |
| 2026-11-18 | The product that eventually comes out must have a good, scalable architecture, clean principles and good performance. The code of OpenFabric must be clean and so must each piece. The owner called these "the 2 outputs" |
| 2026-11-21 | The first deliverable (E04) is good. The owner also wants approaches to the product that are testable too. That is why many experiments are run, and it needs order and a method to get there |
| 2026-11-21 | The owner asked for a second approach: "something like make a rag of components or use engram", and added that the assistant knows AI workflows and design patterns better and should choose |
| 2026-11-21 | The owner then said: "this works if maths and engeneering throws a good result. you know? like deterministic", and asked whether that contradicted the first request |

The decision map was proposed by the assistant on 2026-11-17 and the owner has not confirmed it. This document uses its gates by id and does not restate them. The method is in [`method.md`](method.md).

## The ladder

Every approach climbs the same rungs, in order. Each rung has an exit test with a number written before it runs.

| Rung | What happens | What lets it pass | Where it is recorded |
| --- | --- | --- | --- |
| 0. Stated | A card exists in this document | The card has all its rows | This document |
| 1. Evidence | The theses the approach rests on have verdicts, for the scope that matters. This is the gate of the decision map | The verdicts named in its gate | [`theses.md`](theses.md) and the experiment records |
| 2. Prototype in the bench | The smallest version of the approach runs as an arm of the bench against the best alternative, on the same tasks, with the same judge, counting correct runs and tokens. It is preregistered like any thesis | The criterion fixed before the run | A new experiment in [`../experiments/`](../experiments/) |
| 3. Field trial | A real agent (Claude Code, Codex or OpenCode) uses it on a real task that the authors of the approach did not write. Measured: correct result, tokens, time and silent defects | The numbers fixed before the trial | A new experiment record |
| 4. Build | Only now is product code written, under the two outputs the owner asked for on 2026-11-18 | Clean architecture and clean code, for the whole and for each piece | The repository |

Rules:

- An approach that fails a rung is stopped or reshaped. A reshaped approach gets a new card with a new number. Numbers are not reused.
- A negative result is published, as the method requires.
- A rung passed with one model and two stacks is passed for that scope only. This repeats the scope rule of the [decision map](decisions.md#decision-map).

## The order rule

1. One approach per rung is in "Now" at a time.
2. The cheapest test that can stop the most valuable approach goes first.
3. An approach that others depend on goes before them.
4. Anything that needs a paid model waits for the owner's decision on model and budget. See [Open questions](decisions.md#open-questions).

## Deterministic first

**Proposed by the assistant on 2026-11-21. Not confirmed by the owner.** It answers the two requests of that day in the table above. They do not contradict each other if one rule holds.

A step is done by the tool whenever a rule can do it. The model is used only where judgment is needed.

| Part of the rule | What it means |
| --- | --- |
| Every model step has a gauge | The error rate of a step done by a model is measured in the bench, like the gauge of a slot |
| Finding a piece | It starts with an exact lookup: an index with one line per piece, and a fetch of the full card by its id. Search by similarity (embeddings, the usual "RAG") is a fallback for a catalog too large for an index. It enters only with a measured miss rate |
| Memory | It is read by key (piece and slot), not by similarity. Engram, a persistent memory store for agents, saves observations under a key and reads them back in later sessions; the rule asks only for that kind of read |

Two approaches follow from it: [P6](#p6-catalog-access-how-the-agent-finds-the-piece) for finding pieces and [P7](#p7-memory-of-the-line-lessons-kept-from-the-gauge) for what the line remembers.

## The approaches

| Id | Approach | Rests on | Gate | Rung today | Needs a paid model |
| --- | --- | --- | --- | --- | --- |
| P1 | Gauge kit for existing stacks | T22, T12, T13, T18 | G1 | 1, evidence in | No for rungs 1 and 2 |
| P2 | Catalog and assembler | T14, T15, T16, T20 | G2, G3, G7 | 0 | Yes for the full E05 |
| P3 | Pieces that carry business questions | T17 | G5 | 0 | Not set; decided when E06 is designed |
| P4 | Blueprints | T19 | G6 | 0 | Not set; decided when E08 is designed |
| P5 | A stack of its own | T21 | G4 | 0 | Not set; T21 has no experiment |
| P6 | Catalog access | T23 | G8 | 0 | No. The local model is enough |
| P7 | Memory of the line | T24 | G9 | 0 | No. The local model is enough |

### P1. Gauge kit for existing stacks

| Row | Content |
| --- | --- |
| What it is | Each piece ships with a gauge, and the agent ends every gap with a pass or a known failure instead of a silent defect |
| Who it is for | A developer whose agent works in an existing stack. Not set beyond that |
| The promise | With the gauge in view, the agent's decision at the end of a gap agrees with the judge more often. Number: not set; fixed before its rung. For rung 1 the number is the d* of [T22](theses.md#rq1-gauge) |
| Rests on | [T22](theses.md#rq1-gauge), [T12](theses.md#rq1-gauge) and [T13](theses.md#rq1-gauge) in [E04](../experiments/E04-slot-gauge/README.md); [T18](theses.md#rq1-gauge) in [E07](../experiments/E07-independent-gauge/README.md) |
| Smallest version that can be tested | The `kit-tests` arm of E04 is already close to it. The prototype is that loop packaged for a real agent, measured in the bench against the same agent without it |
| Its test and number | Rung 1: the criteria of E04, fixed by the tag `prereg/E04` on 2026-11-21. Gate G1 was written before T22 existed and names T11 or T18; the amendment that adds T22 is in the [decision map](decisions.md#decision-map). Rung 2: not set; fixed before its rung |
| What stops it | T22 refuted and T18 refuted |
| Cost to test | The local model is enough for rungs 1 and 2 |
| Depends on | Nothing |
| State | Rung 1: evidence in. E04 ran its confirmatory campaign on 2026-11-22: T22 `supported` (20 points, below d* = 30, and all from the `signature` slot), T11 `refuted`, T12 and T13 `undecidable`. It passes rung 1 only when the owner decides the amendment to G1 |

### P2. Catalog and assembler (the production line)

| Row | Content |
| --- | --- |
| What it is | The tool installs verified pieces deterministically, and the model only fills the gaps. This is the production line of [`vision.md`](vision.md#the-production-line) |
| Who it is for | A developer who wants the boring and dangerous part to come out verified. Not set beyond that |
| The promise | The line reaches correct software more often than the workshop, at no higher cost per correct run. Number: not set; fixed before its rung. The criteria in the registry are proposals |
| Rests on | [T14](theses.md#rq2-assembly), [T15](theses.md#rq2-assembly), [T16](theses.md#rq2-assembly) and [T20](theses.md#rq5-stack), all in [E05](../experiments/E05-line-vs-workshop/README.md) |
| Smallest version that can be tested | The `line` arm of E05 against `workshop` and `workshop-gauge`, in the same stack |
| Its test and number | The E05 comparisons. Not set; fixed before its rung |
| What stops it | T14 refuted. That is gate G7 |
| Cost to test | The full E05 needs a model that can sometimes build the whole task. The local 7B cannot: E01 and E03 ended at the floor. It waits for the owner's decision on model and budget. The local variant of E05 reads only T14 and T20 |
| Depends on | P1 only in that the line uses gauges |
| State | Stated. E05 is proposed and not designed. Criteria not confirmed |

### P3. Pieces that carry business questions

| Row | Content |
| --- | --- |
| What it is | A piece asks the questions of the business rule instead of guessing them |
| Who it is for | A developer or a business person who gives the agent a vague request. The owner said on 2026-11-16 that the approver of the business gauge may be non-technical, for example a CEO. See [Open questions](decisions.md#open-questions) |
| The promise | With the piece's questions, more of the rules the client did not say are recovered. Number: not set; fixed before its rung |
| Rests on | [T17](theses.md#rq3-elicitation) in [E06](../experiments/E06-piece-questions/README.md) |
| Smallest version that can be tested | The question list of one piece, with a simulated client, as in E06 |
| Its test and number | The E06 comparison. Not set; fixed before its rung |
| What stops it | T17 refuted |
| Cost to test | Not set. E06 needs a way for the model to ask a question, which the harness lacks |
| Depends on | P2 |
| State | Stated. E06 is proposed and not designed. Gate G5 |

### P4. Blueprints

| Row | Content |
| --- | --- |
| What it is | Whole applications composed from the catalog |
| Who it is for | A developer who wants a vertical, not a single piece. Not set beyond that |
| The promise | Pieces that pass separately pass together. Number: not set; fixed before its rung |
| Rests on | [T19](theses.md#rq4-composition) in [E08](../experiments/E08-composition/README.md) |
| Smallest version that can be tested | The live-sales mix of E08. The record of 2026-11-16 names it as payment, tenants and stock reservation during the live session |
| Its test and number | A hidden suite of the combination, written by an independent agent. Not set; fixed before its rung |
| What stops it | T19 refuted |
| Cost to test | Not set. Only one piece exists today, the checkout, so the mix cannot be assembled yet |
| Depends on | P2 |
| State | Stated. E08 is proposed and the least defined experiment. Gate G6 |

The illustration is the owner's description of 2026-11-16: verticals such as fintech, streaming and gaming installed with one command, and a real application that mixes several. The owner's example of that day, given in conversation: a live-sales streaming application, like sales on television, where the owner offers the payment gateway through a provider, multi-tenant, and with a mobile application. The owner said it is an example that can be used as a test. The frontend and the mobile client are not decided: React with Tailwind and shadcn, and a mobile client on the same contract, are unconfirmed recommendations of the assistant in [`decisions.md`](decisions.md#recommendations-not-confirmed).

### P5. A stack of its own

| Row | Content |
| --- | --- |
| What it is | A framework designed for the agent from the start |
| Who it is for | Not set |
| The promise | A purpose-built stack adds something beyond the line. Number: not set; fixed before its rung |
| Rests on | [T21](theses.md#rq5-stack), which has no experiment assigned yet |
| Smallest version that can be tested | `line` in the candidate stack (Go plus PostgreSQL) against `line` in the best existing stack, as T21 states |
| Its test and number | Not set; T21 has no criterion |
| What stops it | T21 not supported, or T14 not supported, because T21 runs only if T14 is supported |
| Cost to test | The highest. The Go stack must pass 59 of 59 with the current suites before it enters the bench |
| Depends on | P2 and on T20 |
| State | Stated. Gate G4 |

It is last: the most expensive to test and the one that depends on most of the others.

What the owner said about a single stack:

| Date | Statement |
| --- | --- |
| 2026-11-16 | The product is a production line in a single stack, an AI-first replacement for something like Django |
| 2026-11-17 | Research comes first, on several stacks, and the three promises stand. That statement neither withdraws nor repeats the single-stack direction |

Since 2026-11-17 the research treats the stack as an experimental factor, and the product stack is chosen from the results. See [Single stack and the three promises](decisions.md#single-stack-and-the-three-promises).

### P6. Catalog access: how the agent finds the piece

| Row | Content |
| --- | --- |
| What it is | The catalog reaches the agent as an index it can query. One line per piece is always in view (name, what it does, its contract in short), and the agent fetches the full card of the piece it picks. The pick is checked: the fetched contract must fit the gap |
| Who it is for | A developer whose agent must choose among many pieces. Not set beyond that |
| The promise | The agent picks the right pieces from the index as often as when it reads the whole catalog, with fewer tokens. Number: not set; fixed before its rung |
| Rests on | [T23](theses.md#rq8-reach) in [E09](../experiments/E09-finding-the-piece/README.md) |
| Smallest version that can be tested | A catalog of piece cards with no code behind them, at three sizes (10, 50 and 200 cards), and a set of task descriptions for which the right pieces are known. Three arms: `full` (every card in the prompt), `index` (one line per piece, then a fetch) and `similarity` (the top cards by embedding similarity). No Docker is needed and a run takes seconds |
| Its test and number | The E09 comparison of `index` against `full`. Not set; fixed before its rung |
| What stops it | T23 refuted. Then the model does not choose pieces at all: the assembler takes them from a manifest that a person approves, which is the deterministic assembler of P2 |
| Cost to test | The local model is enough. The cards and the answer key must be written by an agent that does not see the arms, and the key must be checked by a second one |
| Depends on | P2 for its value (a catalog must exist). Its test does not depend on any verdict |
| State | Stated. E09 is proposed and not designed. Gate G8 |

### P7. Memory of the line: lessons kept from the gauge

| Row | Content |
| --- | --- |
| What it is | When a gap fails its visible checks, the line keeps a short lesson under the key of that piece and slot. The next agent that fills the same slot gets those lessons before its first attempt |
| Who it is for | A developer whose agent fills the same kind of gap more than once. Not set beyond that |
| The promise | With the lessons, more runs are correct at the first attempt. Number: not set; fixed before its rung |
| Rests on | [T24](theses.md#rq8-reach) in [E10](../experiments/E10-lessons-from-the-gauge/README.md) |
| Smallest version that can be tested | A third arm in the slot bench of E04: `kit-tests` plus the lessons of that slot, against `kit-tests`. The lessons come from earlier runs of the same slot |
| Its test and number | The E10 comparison. Not set; fixed before its rung |
| A hard rule | A lesson is built only from what the model could see: its own answer and the output of the visible checks. Nothing from the hidden suites enters a lesson, and a unit test must fail if a lesson holds a value that a hidden suite asserts. The bench already has such a guard for the arms |
| What stops it | T24 refuted |
| Cost to test | The local model is enough. It needs a new arm, so a new instrument hash |
| Depends on | P1. Its lessons come from the attempts of E04, so it runs after the E04 analysis |
| State | Stated. E10 is proposed and not designed. Gate G9 |

## The order today

| Order | Approach | Why, by the order rule |
| --- | --- | --- |
| 1 | P1 | Cheapest test that can stop a valuable approach (rule 2), no paid model (rule 4), and its test ran on 2026-11-22 |
| 2 | P6 | Its test depends on no verdict, needs no Docker and no paid model (rules 2 and 4) |
| 3 | P7 | Needs the attempts of E04 as the source of its lessons, and no paid model (rule 4) |
| 4 | P2 | Others depend on it (rule 3). Its full test waits for the owner's decision on model and budget (rule 4) |
| 5 | P3 | Depends on P2 |
| 6 | P4 | Depends on P2, and the mix cannot be assembled yet |
| 7 | P5 | The most expensive to test, and it depends on most of the others |

"Now" is P1 at rung 1: its E04 evidence is in (2026-11-22), and what remains is the owner's decision on the amendment to G1. This matches the "Now" row of the [roadmap](roadmap.md).

## What only the owner can decide

| Decision | Why it is the owner's |
| --- | --- |
| The list of approaches and their order | This document is a proposal |
| The number in each promise | A criterion that the owner has not confirmed stays `proposed` and cannot be preregistered |
| The model and the budget | See [Open questions](decisions.md#open-questions). It blocks P2 at full size and every rung 3 |
| Whether the decision map and this document are confirmed | Both are proposals of the assistant |
