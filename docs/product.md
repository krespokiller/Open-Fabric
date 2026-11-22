# Product approaches

**Proposed by the assistant on 2026-11-21. Not confirmed by the owner.** This applies to every approach, rung and rule below.

Summary:

- The registry orders the claims. This document orders the product: five approaches, each written so it can be tested and stopped.
- Every approach climbs the same five rungs. A rung is passed by a number written before it runs.
- Nothing of the product is built. Only P1 is in progress, at rung 1, and E04 has no verdict yet.

| Id | Approach | Gate | Rung today | State |
| --- | --- | --- | --- | --- |
| P1 | Gauge kit for existing stacks | G1 | 1 | Rung 1 in progress |
| P2 | Catalog and assembler (the production line) | G2, G3, G7 | 0 | Stated |
| P3 | Pieces that carry business questions | G5 | 0 | Stated |
| P4 | Blueprints | G6 | 0 | Stated |
| P5 | A stack of its own | G4 | 0 | Stated |

## What this document is

[`theses.md`](theses.md) orders the claims. The [decision map](decisions.md#decision-map) says which verdicts justify building what. This document adds the product side: each approach is something that could be built, written so that it can be tested and stopped.

Why it exists, in the owner's words:

| Date | What the owner said |
| --- | --- |
| 2026-11-09 | The goal is to test the thesis in many ways and have a real benchmark, with token spend, of whether the idea is worth it or not, and to think about how to do it better |
| 2026-11-18 | The product that eventually comes out must have a good, scalable architecture, clean principles and good performance. The code of OpenFabric must be clean and so must each piece. The owner called these "the 2 outputs" |
| 2026-11-21 | The first deliverable (E04) is good. The owner also wants approaches to the product that are testable too. That is why many experiments are run, and it needs order and a method to get there |

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

## The approaches

| Id | Approach | Rests on | Gate | Rung today | Needs a paid model |
| --- | --- | --- | --- | --- | --- |
| P1 | Gauge kit for existing stacks | T22, T12, T13, T18 | G1 | 1 | No for rungs 1 and 2 |
| P2 | Catalog and assembler | T14, T15, T16, T20 | G2, G3, G7 | 0 | Yes for the full E05 |
| P3 | Pieces that carry business questions | T17 | G5 | 0 | Not set; decided when E06 is designed |
| P4 | Blueprints | T19 | G6 | 0 | Not set; decided when E08 is designed |
| P5 | A stack of its own | T21 | G4 | 0 | Not set; T21 has no experiment |

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
| State | Rung 1 in progress. E04 was preregistered on 2026-11-21 and its confirmatory campaign is running. No verdict yet |

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

## The order today

| Order | Approach | Why, by the order rule |
| --- | --- | --- |
| 1 | P1 | Cheapest test that can stop a valuable approach (rule 2), no paid model (rule 4), and its test is already running |
| 2 | P2 | Others depend on it (rule 3). Its full test waits for the owner (rule 4) |
| 3 | P3 | Depends on P2 |
| 4 | P4 | Depends on P2, and the mix cannot be assembled yet |
| 5 | P5 | The most expensive to test, and it depends on most of the others |

"Now" is P1 at rung 1, which is the E04 confirmatory campaign. This matches the "Now" row of the [roadmap](roadmap.md).

## What only the owner can decide

| Decision | Why it is the owner's |
| --- | --- |
| The list of approaches and their order | This document is a proposal |
| The number in each promise | A criterion that the owner has not confirmed stays `proposed` and cannot be preregistered |
| The model and the budget | See [Open questions](decisions.md#open-questions). It blocks P2 at full size and every rung 3 |
| Whether the decision map and this document are confirmed | Both are proposals of the assistant |
