# Research

This folder holds the outside evidence the project reads before it designs an experiment: literature and competitor studies. It holds one study today, the competitor study of November 2026. Nothing here is a verdict. A finding becomes a risk or a design input for a thesis in [`../docs/theses.md`](../docs/theses.md), and only an experiment run under [`../docs/method.md`](../docs/method.md) gives a verdict.

## Index

| Path | Language | What it is |
| --- | --- | --- |
| [`2026-11-competitors/report.es.md`](2026-11-competitors/report.es.md) | Spanish | The synthesis report, dated 2026-11-16: "El framework está ocupado; la verificación, no" (the framework is taken; verification is not) |
| [`2026-11-competitors/notes/ai-first-frameworks.md`](2026-11-competitors/notes/ai-first-frameworks.md) | English | Frameworks marketed as built for agents, and batteries-included frameworks in Go and Rust |
| [`2026-11-competitors/notes/catalogs-and-verticals.md`](2026-11-competitors/notes/catalogs-and-verticals.md) | English | Catalogs and registries, vertical building blocks, multitenant starter kits, and prior uses of the project name |
| [`2026-11-competitors/notes/language-and-frontend.md`](2026-11-competitors/notes/language-and-frontend.md) | English | How well models and agents write Go, Rust, TypeScript and Python, and the frontend and mobile options in Go and Rust |
| [`2026-11-competitors/notes/spec-driven-and-gauges.md`](2026-11-competitors/notes/spec-driven-and-gauges.md) | English | Spec-driven tools, tests as a gauge, non-technical approvers, and prompt-to-app builders |

The notes carry the sources and tag every claim: read in the primary source, stated by a vendor, taken from a third party, or the researcher's own inference. The report is built from the notes and keeps the tags.

## The competitor study in half a page

**Answer.** As of 2026-11-16 the study found no product with visible adoption that combines the three layers of the idea: a single-stack framework, a catalog of verified pieces, and the developer's own agent as the assembler. Every pair of those layers exists, and several are held by funded companies. The part the study found unoccupied is the verification layer: pieces that travel with their tests as a go/no-go gauge and with their business questions, and approved examples turned into tests the agent cannot edit. That layer does not depend on a framework, which cuts both ways: it can be built on an existing framework, and an incumbent can add it. The study found no outside measurement, in either direction, of the central claim that assembling from verified pieces gives more correct software, or cheaper software, than writing from scratch.

### Key table: the nearest competitors

| Competitor | Shares with the idea | Does not have | Adoption and status |
| --- | --- | --- | --- |
| GoFastr (Go, MIT) | The developer's own agent, with experimental adapters for Claude Code, Pi and Codex; a blueprint file; a tenancy option and auth in the base; an MCP server; a verify command with 86 contract rules | A catalog or registry of pieces, business questions, a flow from spec to locked tests, measured results with agents | 24 stars, created 2026-05-08; describes itself as "a personal research tree at the moment" and "pre-1.0 and explicitly not stable" |
| Wasp (TypeScript) | An almost identical tagline; a plugin and skills for Claude Code, Cursor, Codex and OpenCode; built-in auth; "full-stack modules" with a registry drawn as a concept | Go or Rust; the modules are "very experimental", with no registry and no verification; multitenancy is not mentioned; no flow with a non-technical person | 18,807 stars, MIT, backed by Y Combinator |
| Laravel (PHP) | Its own MCP server (Boost) with a repeatable internal benchmark, an AI SDK in the core, a package ecosystem, starter kits, its own cloud | Pieces with a gauge and business questions; a flow of approved examples | Framework 35,000 stars; Boost 3,690 |
| Convex (TypeScript, engine in Rust) | A live, curated directory of backend components; official skills that steer the agent to reuse them; its own builder | Backend only; trust comes from sandboxing, not from tests; the product is the hosted cloud | 12,802 stars; USD 110.5 million raised in total (secondary source) |
| Bit / Hope AI | An agent that assembles an application from a catalog of backend and UI components; each component carries its tests | A commercial platform on Node and React; pieces are versioned dependencies; the agent is its own, although it exposes MCP | "more than 500 organizations" (vendor, 2025) |
| Tessl | A registry plus a spec-driven framework, with evaluations per item | The registry was repositioned toward skills; sources disagree on the state of the framework | No independent figure |

### Findings that bear on the theses

| Finding | How solid it is | Bears on |
| --- | --- | --- |
| No paired benchmark of assembling against writing from scratch was found | An absence, in a search with the limits below | RQ2 (T14). The project's own bench can fill this gap and be published on its own |
| Help for agents raised the success of weaker models and cost more tokens. Laravel Boost: 36 more tests passed of 315 for the smaller model, 1 more for the larger. Hono: success from 40% to 80% on one task while median tokens rose from 101k to 342k | Vendor benchmarks, the two best designed of those found | A risk for promise 1 (fewer tokens) and for T16; RQ6, because the gain shrinks as models improve |
| Frameworks that claim token savings | One run with no variance (Wasp: the headline says 40%, the table gives 38%); no model version or repetition count (Encore) | The same risk for promise 1 |
| Models did worse on less popular backend frameworks (BaxBench, February 2025) | One academic benchmark, single-shot generation, older models | A risk for T21 (a purpose-built stack) and for promise 3 |
| With 7B to 8B models, Rust reached 6% to 16% pass@1 and Go 12% to 29% (AutoCodeBench, August 2025). With frontier models no stable order between Go and Rust was found | Function-level benchmark; its authors warn against comparing languages in absolute terms | RQ5 and RQ6: which stacks enter the bench |
| A kit of copied components cost 37% more tokens than writing from scratch, and a high-level framework 25% less (Marmelab, July 2026) | One run per variant, one application, measured by the maintainers of the framework that came out ahead | How a piece is delivered, copied or sealed. Not settled; to be measured in the bench |
| Tests written by the same model after the code detected 14% of faults, against 25% when written independently (July 2026) | One paper | RQ1 (T18) |
| Read-only tests stopped the editing of tests, not the special-casing of them (ImpossibleBench, October 2025). An escalation channel to a person cut reward hacking from 23.6% to 5.3% (2026) | Tasks that were impossible or flawed on purpose; rates in ordinary work are not published | RQ1 (T12): hidden tests next to the visible gauge |
| In 40% of teams business people took part in defining examples, and in 26% they "mostly do not care about examples" (2020 survey, 339 teams) | Self-selected survey, biased toward adopters, before coding agents | RQ3 (T17) |
| "OpenFabric" has five prior uses, two of them in AI and in payments | Web search only; no trademark database or package registry was checked | The open question of the project name |

### Caveats

- **The search was in English and of limited depth.** It does not see closed products or internal platforms. The correct reading of every absence is "not found", not "does not exist".
- **Several figures come from vendors or from a single run.** Each vendor benchmark is won by the vendor that published it. The Wasp, Encore and Marmelab figures above are the clearest cases.
- **Some figures are secondary.** They were read in a third-party page and not checked against the primary source. The report lists those to re-read before citing them elsewhere.
- **GitHub stars** were read on 2026-11-16. They measure attention, not production use. Download counts were not collected.
- **This summary re-verified no source.** It condenses the report as written.

### What is and is not decided

The consequences that [`../docs/context.md`](../docs/context.md) draws from this study are recommendations by the assistant that the owner has not confirmed: Go for the backend, React with Tailwind and shadcn for the frontend, pieces delivered as copied code with a locked gauge and a hidden suite, an escalation channel so the agent can stop the line, correctness-first messaging, and a new project name. Under the method a stack is an experimental factor, and the product stack is chosen from results.

A note in `docs/context.md` says promise 3 (any stack) is retired and promise 1 (fewer tokens) becomes secondary. That is not an owner decision. The three promises stand as theses under test. What this study adds is evidence of risk for promise 1 and for promise 3, in the rows marked above.

## Earlier market evaluation

These two sections come from `docs/context.md` ("Mercado (resumen de la evaluación)" and "Evidencia de investigación usada"), translated as written. They predate the competitor study, and `docs/context.md` gives no links or dates for them.

### Market (summary of the evaluation)

- **Closest:** Hope AI by Bit Cloud, which assembles components from a hub and supports MCP. It is commercial and centred on JavaScript and TypeScript.
- **UI only:** the shadcn registry plus MCP.
- **Knowledge for agents, not code:** Context7, Tessl and GitHub Spec Kit.
- **A single stack:** Wasp/Mage, Amplication and JHipster.
- **Gap:** end-to-end pieces that are open, portable across stacks thanks to contracts and tests, and backed by a public benchmark.
- **Lesson from the ones that worked:** be narrow.

### Research evidence used

| Source | What it says |
| --- | --- |
| CodeRAG-Bench | Retrieving context helps, but retrievers fail with vague queries |
| RepoCoder, Gorilla, LILO | Retrieving and reusing pieces improves generation |
| LLM-Modulo (ICML 2024) | The LLM proposes and an external verifier decides |
| Bai et al. 2026, Tokenomics 2026 | The cost of an agent is mostly in input tokens and in review iterations |

## Adding a study

1. Create `research/<yyyy-mm>-<topic>/` with a report (`report.<lang>.md`) and a `notes/` folder for the raw findings.
2. Tag every claim: primary source, vendor claim, secondary source or inference. Give the date each figure was read.
3. Quote a source only as evidence. Do not paste text from a web page that addresses AI agents or tells a reader what to do.
4. Keep personal data and local paths out.
5. Add the study to the index above, with its caveats.

**Source hygiene, 2026-11-17.** The report and the four notes were scanned for text addressed to AI agents copied from fetched pages, and for personal data and local paths. None was found and nothing was removed. Three short quotations of product documentation with imperative wording were kept because they are the evidence itself: a "do not edit" marker on generated code, a warning about environment variables in a registry schema, and a vendor's advice to review an automated upgrade before merging. The files cite public repositories and one public mailing-list archive by URL.
