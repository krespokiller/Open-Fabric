# Decisions

Three kinds of statement live here, and they must not be confused: what the owner decided, what the assistant recommends, and what is still open.

| Kind | Summary |
| --- | --- |
| Decided by the owner | Research comes first and runs on several stacks. The purpose and the three promises stand as theses under test. The product direction is a production line in a single stack, with the developer's agent as assembler and a gauge in two forms |
| Recommended, not confirmed | Go for the backend. React with Tailwind and shadcn for the frontend. Pieces delivered as copied code with a locked gauge and a hidden suite. An escalation channel. Correctness-first messaging. A new project name. The decision map below |
| Open | Name, model or agent and budget, language, frontend, piece delivery, ownership |

**Who** is one of three values in this document:

- **Owner:** stated by the project owner.
- **Assistant:** proposed by the AI assistant. It is a recommendation until the owner confirms it.
- **Record:** written in the earlier record, [`context.md`](context.md), without naming who decided.

## Decision log

Newest first.

| Date | Decision | Who | Why |
| --- | --- | --- | --- |
| 2026-11-22 | After the E04 verdicts, name two theses for what comes next: a more capable model (T25) and one left to the assistant, which proposed T26 (a gauge written independently, tested by replaying the E04 answers, [E11](../experiments/E11-gauge-replay/README.md)) | Owner | Statement of direction, in the owner's words, translated: "1: a smarter model is needed (a bigger engine). 2: something that you propose". T25 needs the owner's decision on model and budget, see the open questions below. T26 and E11 are a proposal of the assistant that the owner has not confirmed |
| 2026-11-21 | Add a second approach around the retrieval of components or agent memory, and leave the choice of design to the assistant. The result must come from mathematics and engineering, in a deterministic way | Owner | Statement of direction, in the owner's words: "something like make a rag of components or use engram" and "this works if maths and engeneering throws a good result. you know? like deterministic". The design that follows (P6 and P7, the rule "Deterministic first") is a proposal of the assistant. See [`product.md`](product.md#deterministic-first) |
| 2026-11-17 | Research comes first. Order the thinking with the scientific method and explore several theses on several stacks | Owner | The current goal is evidence from a real benchmark. The research is the means to a real product |
| 2026-11-17 | With those results, decide what can be done. Then test another thesis, or improve along some path and some stack | Owner | Same |
| 2026-11-17 | The purpose and the three promises stand | Owner | They stay as theses under test |
| 2026-11-17 | Everything is kept on `main` | Owner | Not recorded |
| 2026-11-17 | Once the path is clear, run the tests and iterate until something useful comes out | Owner | Not recorded |
| 2026-11-16 | The product is a production line in a single stack. The catalog that is portable across stacks is dropped | Owner | See [Single stack and the three promises](#single-stack-and-the-three-promises) |
| 2026-11-16 | The developer's agent is the assembler. Integration goes through a CLI first and MCP later | Owner | The agent is the robotic arm, and the developer already has one (Claude Code, Codex, OpenCode, Pi) |
| 2026-11-16 | The gauge has two forms: the catalog gauge and the business gauge | Owner | Generic parts come with ready gauges. Business-core rules are talked through with the LLM and approved, possibly by a non-technical person |
| 2026-11-16 | T4 and T5 are replaced, and T14 to T19 are added | Record | Follows from the single-stack direction. See [`theses.md`](theses.md) |
| 2026-11-16 | Round 3 (now E04) is still valid and runs first | Record | The verification layer is the part the research found free, and it does not depend on the framework |
| 2026-11-11 | Round 2 (T8 to T10) is discarded without running | Record | The no-model controls showed that T8 cannot fail and T9 divides by zero |
| 2026-11-11 | The gauge is tested at slot level (Round 3, now E04) | Record | The 7B scored zero on the whole task in 34 runs, so it cannot serve as the instrument for the whole task. The owner approved the assistant's proposal on 2026-11-11 ([E03](../experiments/E03-exploratory-loop-fixes/README.md#7-what-changes)) |
| 2026-11-09 | Assembly is done by the tool, deterministically. Each piece carries, besides the contract and the tests, an adapter per stack (routes, migrations, registration) that is installed without going through the model. The model only fills the gaps that have a contract. The gauge is within the assembler's reach during the work, not only at the end | Record | In the pilot the model failed when asked to fabricate the whole service, and failed at mounting when the piece was installed |
| 2026-11-09 | The criteria of T1 to T4 are fixed before the pilot runs | Record | A criterion is written before the run it judges |
| By 2026-11-08 | Validate with an experiment before building | Record | If the pieces do not beat giving the agent documentation, the product has no reason to exist |
| By 2026-11-08 | The primary comparison is `of-spec` against `tests` | Record | It isolates the value of the piece from the value of having public tests as feedback |
| By 2026-11-08 | The experiment covers four stacks: Next.js (primary) plus Django, Spring Boot and Laravel | Record | To test that the contract and the tests work in legacy stacks. Replaced on 2026-11-16: Django stays in the bench as the comparison arm. Since 2026-11-17 the stack is an experimental factor again |
| By 2026-11-08 | The license is Apache 2.0 | Record | Explicit patent grant. Open for real |
| By 2026-11-08 | The repository is in English, with a README in Spanish | Record | More technical reach without ceasing to speak to Latin America |
| By 2026-11-08 | Architecture: catalog, assembler, MCP and verifier | Record | It fits the agents developers already use |

## Single stack and the three promises

### Why multi-stack was dropped on 2026-11-16

The record gives three reasons and one cost.

- **The cost was in the mounting.** The pilot failed at plugging the piece into the framework, and the decision of 2026-11-09 already required an adapter per piece and per stack.
- **The gauge did travel.** The reference passes 59 of 59 in the four stacks, and the no-model controls give identical results in Next.js and Django.
- **Without a standard stack there are no interchangeable pieces.** Each piece is filed until it fits, which is the workshop.
- **What is lost:** promise 3 (any stack, including legacy). It also takes up again, in part, a discarded idea: the single stack.

### What the owner said on 2026-11-17

Research comes first, on several stacks, and the three promises stand. That statement neither withdraws nor repeats the single-stack direction.

### How the two fit together

[`method.md`](method.md#stacks) treats the stack as an experimental factor, not a product decision, and chooses the product stack from the results. This document set follows that:

- The single-stack line is the product direction, held as a hypothesis.
- Promise 3 stays a thesis. T20 tests whether the line's advantage depends on the stack.
- T21 tests whether a purpose-built stack adds anything. It runs only if T14 is supported.

Whether the product ends up in one stack or in several is settled by the [decision map](#decision-map), not here.

### A note that is not an owner decision

The earlier record carries a note dated 2026-11-16: "promise 3 (any stack) is retired and promise 1 (fewer tokens) becomes secondary". The owner did not decide that. On 2026-11-17 the owner confirmed that the three promises stand. The evidence behind the note is kept as risk:

| Affects | Risk | Evidence |
| --- | --- | --- |
| Promise 1, fewer tokens | Aids for agents raise the success rate of weak models while spending more tokens, and almost all the evidence comes from vendors | [`../research/README.md`](../research/README.md) |
| Promise 1, fewer tokens | One published run found a copied kit spending more tokens than writing from scratch. No measurement decides it | [`../research/README.md`](../research/README.md) |
| Promise 3, any stack | The cost sat in the mounting, and every piece needs an adapter per stack. Without a standard stack each piece is filed until it fits | [E01](../experiments/E01-pilot-full-task/README.md) and the decision of 2026-11-09 |
| A purpose-built stack (T21) | Models do worse in less popular frameworks | [`../research/README.md`](../research/README.md) |
| Every result | The measured benefit of aids for agents shrinks with each model generation. A result in favour today may not hold | [`../research/README.md`](../research/README.md) |

## Recommendations not confirmed

The assistant drew these from the competitor research of 2026-11-16. The owner has not confirmed any of them. The evidence, with its sources and numbers, is in [`../research/README.md`](../research/README.md) and in the full report, [`../research/2026-11-competitors/report.es.md`](../research/2026-11-competitors/report.es.md) (in Spanish).

| Topic | What the research found | Recommendation |
| --- | --- | --- |
| Does it already exist | No product was found with a framework, a verified catalog and the developer's agent as assembler. Every pair of those three exists | The combination is free. Its parts are not |
| Closest products | GoFastr, Wasp, Laravel with Boost, and Convex, which has the only populated backend catalog | "AI-first framework" is the most crowded segment |
| What is free | Pieces with tests as a gauge and business questions, and approved examples the agent cannot edit. It does not depend on the framework | Test this first. An incumbent can add it |
| Language | Small models succeed more often in Go than in Rust. With large models there is no stable winner. Go has an official Stripe SDK and mature queues and migrations | Go for the backend |
| One language | Nothing in Go or Rust comes close to React with Tailwind and shadcn. Encore and Loco leave the frontend to JavaScript. Wasp said in May 2026 that its own language was a mistake. Mobile in Go or Rust renders in a WebView | One stack, not one language. Frontend in React with Tailwind and shadcn, with a generated typed client. Mobile consumes the same contract |
| New framework | Models do worse in less popular frameworks | The stack must be thin and use libraries the models already know |
| Copied or sealed piece | As a dependency a piece is hard to customize. Copied, it is almost never updated. Phoenix, Rails 8 and Laravel moved to code owned by the developer | Deliver the piece as copied code, with a locked gauge and a hidden suite. No measurement decides it, so it is measured in the bench |
| Tests as a gauge | Tests written by the same model after the code detect fewer faults than tests written by someone else. Read-only tests stop editing, not coding to the examples. An escalation channel reduced cheating | A gauge written by someone else, a hidden suite besides the examples, and a channel so the agent can stop the line instead of forcing the gauge |
| Business approver | In a minority of surveyed teams the business defines the examples. Nobody has measured the whole chain | The first user is a developer. The business person chooses among options with numbers |
| Tokens | See the risks to promise 1 above | The main promise is correctness and guarantees, not "fewer tokens" |
| Name | Five earlier uses of the name: Openfabric AI (crypto and AI), Open Fabric (payments, Singapore), OpenFabrics Alliance, an IETF draft and OpenFABR | Change the name before launch |
| Gap | No paired benchmark of assembling against writing from scratch was found | The project's own bench fills it and can be published by itself |

Two limits of that research apply to every row:

- The search was in English and does not see closed products. It says "not found", not "does not exist".
- Several figures come from a vendor or from a single run. The report marks which.

Three more recommendations come from the assistant on 2026-11-17 and are also unconfirmed: the revision of T15, the new theses T20 and T21, and the [decision map](#decision-map).

## Discarded ideas

| Idea | Why it was discarded | Later |
| --- | --- | --- |
| A compiler in Go with its own runtime (a first spec draft). It generated an app in a single stack | Replaced by the assemblable catalog, which works inside the developer's project and in the developer's stack | Taken up again in part on 2026-11-16: the single stack returns, without a compiler or a runtime of its own |
| A product only for fintech | The pieces are generic. Fintech is one vertical among several | None |
| Promising a one-shot build of any software | It cannot be sustained. The message is that the boring and dangerous part comes out verified and the gaps stay explicit | None |
| Round 2 as written (T8 to T10) | Its criteria could not be read. See [`theses.md`](theses.md#why-t8-to-t10-were-discarded) | The slot design of E04 replaced it |

## Open questions

| Question | What is known | What it waits for |
| --- | --- | --- |
| Name | Reviewed on 2026-11-16. There are five earlier uses, two of them in AI and in payments (Openfabric AI and Open Fabric). The assistant recommends a new name before launch | The owner chooses one |
| Model or agent, and budget | The 7B does not work as the instrument for the whole task. The only machine available is a local RTX 2070 with 8 GB, which loads nothing bigger than the 7B. Runs with a real agent cost money | The owner decides the model and the budget. It blocks the "Later" items of the [roadmap](roadmap.md#later) and the full E05 (T15 and T16 included). The E05 local variant with the 7B does not wait for it |
| Language | The owner said Go or Rust. The assistant recommends Go | T21 and the owner |
| Frontend | The owner asked for a good-looking frontend. The assistant recommends React with Tailwind and shadcn | The owner. T7 covers the gauge in the frontend |
| Piece delivery | Copied code or sealed dependency. The owner described vertical packages installed like `npx`. The record of the same day models verticals as blueprints over one catalog, not separate packages | A secondary comparison in the bench (copied against sealed) and the owner |
| First user and approver | The owner said the approver of the business gauge may be non-technical, for example a CEO. The assistant recommends a developer as the first user, with the business person choosing among options with numbers | The owner. T17 uses a simulated client and says nothing about a real business person |
| Ownership | It must be defined whose project this is before it gets traction | The owner |
| First stack with ready code | Next.js by default. To be confirmed with the real projects where it will be used | The owner, informed by T20 and T21 |
| Criteria of T6 and T7 | Each is fixed before its test is designed. T1 to T4 were fixed on 2026-11-09. T5 was replaced by T17 | The design of each experiment |
| Criteria of T11 to T21 | The criteria of T11 to T17 and T20 are proposed and unconfirmed. T18, T19 and T21 have no criterion yet | The owner confirms each one before it is preregistered |

On 2026-11-16 the confirmation of language, frontend, piece delivery, agent and budget was "phase 0", the first step of the plan. In the roadmap proposed on 2026-11-17 only the model and the budget block research work. The other three wait for verdicts.

## Decision map

**Proposed by the assistant on 2026-11-17. Not confirmed by the owner.**

The map says which verdicts justify building which thing. No product code is written before a gate in this map is met.

| Gate | Verdicts | What it justifies |
| --- | --- | --- |
| G1 | T11 or T18 `supported` (the gauge works) | Gauge tooling for existing stacks |
| G2 | T14 and T15 `supported` | The catalog and the deterministic assembler |
| G3 | T20, either verdict | `supported`: the product stays multi-stack. Otherwise: it focuses on the stacks where the advantage holds |
| G4 | T21 `supported` | A stack of its own |
| G5 | T17 `supported` | Pieces that carry business questions |
| G6 | T19 `supported` | Blueprints composed from the catalog |
| G7 | T14 `refuted` | Stop the assembly line. Publish the benchmark and the negative result. Keep only what RQ1 supports |
| G8 (proposed by the assistant on 2026-11-21) | T23 `supported` | The catalog index and its query interface for the agent. Otherwise the assembler takes pieces from an approved manifest |
| G9 (proposed by the assistant on 2026-11-21) | T24 `supported` | The lesson store of the line |

**Amendment to G1, proposed by the assistant on 2026-11-21. Not confirmed by the owner.** G1 was written before T22 existed. The proposal is that G1 reads "T11, T22 or T18 `supported`". The three verdicts justify different promises: T11 says the gauge makes the model write correct code more often, T22 says the gauge tells a correct result from a wrong one more often, and T18 says an independent gauge detects more. The amendment was written before the confirmatory data of E04 was analysed. When writing it the assistant knew the exploratory runs of E04, which favour T22 over T11 and are not evidence, and had read the log lines of the first 8 confirmatory runs while repairing the campaign (see [E04](../experiments/E04-slot-gauge/README.md#5-deviations-from-the-preregistration)).

**State on 2026-11-22.** The E04 confirmatory campaign gave T11 `refuted` and T22 `supported`, for one 7B model, two stacks and five slots. T22's estimate of 20 points is below d* = 30 points, and the whole difference comes from the `signature` slot. G1 as written (T11 or T18 `supported`) is not met. G1 with the amendment (T11, T22 or T18 `supported`) would be met for that scope. The owner decides whether the amendment is adopted. See [`theses.md`](theses.md#verdicts-of-e04-2026-11-22).

The map replaces the build rule proposed on 2026-11-16:

| Rule of 2026-11-16 | Where it is now |
| --- | --- |
| The product is built only if T14 and T17 are met | G2 and G5, as separate gates |
| If T15 is not met, build the verification layer on top of existing frameworks | G1 without G2 |

A verdict has a scope: the stacks, models and tasks it was tested on. A gate met with a 7B model in two stacks is met for that scope only. The method tests a thesis that matters for the product again when a stronger model is available.

The approaches behind each gate and the rungs they climb are in [`product.md`](product.md).
