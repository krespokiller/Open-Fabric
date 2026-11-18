# AI-first / agent-native full-stack frameworks and batteries-included Go/Rust frameworks (state as of 2026-11-16)

Conventions used in these notes:

- **[verified]** = read directly from a primary source in this session (repo, docs page, GitHub API).
- **[vendor]** = claim or measurement made by the party that sells or maintains the product.
- **[secondary]** = reported by a third party, not confirmed against the primary source.
- **[inference]** = my own reasoning, never a sourced fact.
- All GitHub star counts, licenses, archive flags and last-push dates were read from the public GitHub REST API on 2026-11-16 and are cited to the repository URL.
- "The idea" = the product described in the brief: AI-first single-stack framework in Go or Rust, catalog of verified pieces (code + tests as gauge + business questions), shadcn-style CLI install, vertical blueprints, multitenancy and auth in the base, the developer's own coding agent as assembler via CLI/MCP, and a conversation that turns approved examples into tests the agent may not edit.

## Key question 1: Which frameworks explicitly market themselves as built for AI coding agents or "AI-first", and what do they actually ship for agents?

### Takeaway
"Built for agents" is now a crowded positioning: Wasp, Laravel, Encore, Convex, Plain, Modelence, Medusa and several tiny Go projects all claim it, and what they ship has converged on the same kit (rules files / AGENTS.md, agent skills or plugins, an MCP server, llms.txt, generators). None of them ships a verified-piece catalog with tests as a gate plus a spec-to-locked-tests flow; the closest in shape are Wasp's experimental "full-stack modules" and two near-zero-adoption Go projects (GoFastr, gonext).

### Cited Findings

#### Wasp (TypeScript: React + Node.js + Prisma)
- [verified] Repo description: "The batteries-included full-stack framework for the AI era"; 18,807 stars, MIT, active (pushed 2026-11-16), created 2020 — [github.com/wasp-lang/wasp](https://github.com/wasp-lang/wasp)
- [vendor] Site taglines: "The framework for building real apps with AI" and "The Framework for the Agentic Era"; ships a plugin and Agent Skills for Claude Code, Cursor, Codex and others, plus `/llms.txt`; no MCP server is mentioned on that page; built-in auth (Google, Slack, email, with auth UI); site claims "18k+ GitHub Stars" and a 4.5k+ Discord; backed by Y Combinator — [wasp.sh/vibe-coding](https://wasp.sh/vibe-coding)
- [verified] Official agent plugin adds Wasp conventions to CLAUDE.md / AGENTS.md and deployment guidance (Railway, Fly.io); works with Claude Code, Cursor, Codex, Gemini CLI, GitHub Copilot, OpenCode — [Wasp docs: coding agent plugin](https://wasp.sh/docs/wasp-ai/coding-agent-plugin); the plugin repo itself has 14 stars — [github.com/wasp-lang/wasp-agent-plugins](https://github.com/wasp-lang/wasp-agent-plugins)
- [vendor] In June 2026 Wasp replaced its custom DSL with a TypeScript spec ("Wasp is now 100% TypeScript", `main.wasp.ts`) — [Wasp TS Spec post](https://wasp.sh/blog/2026/06/15/wasp-typescript-spec); a May 2026 company post is titled "new language for web dev was a mistake" — [wasp.sh blog](https://wasp.sh/blog/2026/05/13/new-language-for-web-dev-was-a-mistake)
- [vendor] "Full-stack modules": a vertical slice packaging client code, server code, webhooks and database models, wired through the spec file and imagined as an npm package (example: a `stripePayments` module). Status in the author's words: "Beware, this is all very experimental, but the concept is solid." A registry does not exist; the post shows "A concept for a future full-stack module registry". No tests or verification are described as part of a module — [Wasp: JavaScript still can't ship a full-stack module, 2026-06-22](https://wasp.sh/blog/2026/06/22/javascript-still-cant-ship-a-full-stack-module)
- [vendor] Full Stack Modules and Wasp Studio were listed as experimental items on the public roadmap in July 2025 — [Wasp public roadmap](https://wasp.sh/blog/2025/07/14/public-wasp-dev-roadmap)
- [secondary] Funding: TechCrunch (April 2025) reports $5.2M total raised; the company says "over $5M" (May 2026); CB Insights lists $5.7M — [TechCrunch](https://techcrunch.com/2025/04/17/wasps-platform-is-the-glue-that-holds-web-apps-together/), [CB Insights](https://www.cbinsights.com/company/wasp-2)
- [verified] Open SaaS, Wasp's free SaaS boilerplate (auth, email, background jobs, payments), has 16,328 stars, MIT — [github.com/wasp-lang/open-saas](https://github.com/wasp-lang/open-saas)

#### Laravel (PHP) — Boost, AI SDK, MCP
- [verified] Laravel's own page title reads "The clean stack for Artisans and agents" — [laravel.com blog](https://laravel.com/blog/which-ai-model-is-best-for-laravel)
- [verified] Laravel Boost: "Laravel-focused MCP server for augmenting your AI powered local development experience"; 3,690 stars, MIT, created 2025-07-15, active — [github.com/laravel/boost](https://github.com/laravel/boost)
- [secondary] Laravel 13 shipped 2026-03-17 and the first-party Laravel AI SDK went from beta to stable the same day (text generation, tool-calling agents, embeddings, vector stores) — [Laravel 13 release notes](https://laravel.com/docs/13.x/releases.md), [Laravel News](https://laravel-news.com/index.php/laravel-13-released)
- [vendor] Laravel runs an internal evaluation framework ("Boost Benchmarks") to measure whether changes to Boost help agents; numbers are in key question 4 — [Laravel: Which AI model is best for Laravel?, 2026-03-18](https://laravel.com/blog/which-ai-model-is-best-for-laravel)
- [vendor] A follow-up post says agents with Boost now pass the 17 eval tasks at or near 100%, saturating the benchmark, so Laravel is moving to measuring idiomatic code — [Laravel: idiomatic Laravel and AI coding agents](https://laravel.com/blog/idiomatic-laravel-ai-coding-agents)
- [verified] laravel/framework: 35,000 stars, MIT — [github.com/laravel/framework](https://github.com/laravel/framework)

#### Encore (Go and TypeScript backend framework + cloud)
- [verified] 12,717 stars, MPL-2.0, active; repo description "Infrastructure orchestration from local to your cloud" — [github.com/encoredev/encore](https://github.com/encoredev/encore)
- [verified] Ships: a local MCP server (`encore mcp start`) that lets agents inspect services, APIs, auth handlers and infrastructure, read SQL schemas and query local data, call endpoints, search traces, and read docs; a Cloud MCP server for deploy logs and production traces; `encore llm-rules init` to generate CLAUDE.md / Cursor rules / AGENTS.md; agent skills via `npx skills add encoredev/skills` — [Encore docs: AI integration](https://encore.dev/docs/go/ai-integration)
- [verified] The skills repo has 30 stars, created 2026-01-08 — [github.com/encoredev/skills](https://github.com/encoredev/skills)
- [vendor] Leap.new, an AI developer agent from the Encore team, launched 2025-05-28, generates Encore.ts apps and deploys to the user's own AWS or GCP — [Encore blog: Leap is here](https://encore.dev/blog/leap-is-here), [docs.leap.new](https://docs.leap.new/getting-started/introduction.md)
- [vendor] Encore's own ranking article (updated 2026-11-05) puts Encore first among Encore, FastAPI, Django, NestJS, Hono and Gin for agents; it contains no measured results and admits caveats (cron jobs do not run locally; existing apps must be ported to Encore's declarations) — [Encore: best backend frameworks for AI agents](https://encore.dev/articles/best-backend-frameworks-for-ai-agents-to-build-on)
- [secondary] Funding: $3M seed in April 2022 led by Crane Venture Partners; no 2025-2026 round found; CB Insights lists a small later round that conflicts with other sources — [tech.eu](https://tech.eu/2022/04/19/enabling-developers-to-build-new-cloud-backends-in-minutes-lands-encore-with-3-million), [CB Insights](https://www.cbinsights.com/company/encore-3)
- [vendor] Pricing: free Starter tier and Pro at $49 per member per month; deployment supported on AWS and GCP only — [encore.dev/about](https://encore.dev/about)

#### Convex (TypeScript reactive backend; Rust engine)
- [verified] convex/convex-backend: 12,802 stars, non-standard license (GitHub reports NOASSERTION), active — [github.com/convex/convex-backend](https://github.com/convex/convex-backend)
- [secondary] $57M Series B announced 2026-08-04, led by Insight Partners, total funding $110.5M; positioned as "the backend for agent-written software" — [SiliconANGLE](https://siliconangle.com/2026/08/04/convex-reels-57m-ai-optimized-application-backend/), [Pulse 2.0](https://pulse2.com/convex-raises-57-million-series-b-bringing-total-funding-to-110-5-million/amp/), [Convex](https://news.convex.dev/convex-raises-57m/)
- [verified] Components: "Open-source building blocks for your Convex app", a "curated directory of components, libraries, and tools"; each installs as an independent npm library; the directory accepts submissions — [convex.dev/components](https://www.convex.dev/components), [Convex docs: components](https://docs.convex.dev/components)
- [vendor] Component authoring and the directory reached general availability on 2025-12-01 — [Convex changelog](https://ship.convex.dev/changelog/components-authoring-ga-directory)
- [verified] Official agent skills installed with `npx skills add convex/agent-skills`, including a component-creation skill and a guide telling agents to browse the directory before building their own — [Convex docs: agent skills](https://docs.convex.dev/ai/agent-skills)
- [verified] Chef, "The only AI app builder that knows backend": 4,600 stars, Apache-2.0, last push 2026-10-28 — [github.com/convex/chef](https://github.com/convex/chef)
- [vendor] Public LLM leaderboard scoring models on Convex coding tasks, with and without guidelines — [convex.dev/llm-leaderboard](https://convex.dev/llm-leaderboard)

#### Plain (Python; Django fork)
- [verified] "Originally a fork of Django, reshaped over years of real use"; positioning "Explicit, typed, and predictable. What's good for humans is good for AI" and "Ready for the era of agents"; BSD-3; Python 3.14+, Postgres only; Jinja2 + htmx + Tailwind — [plainframework.com](https://plainframework.com/)
- [verified] Ships for agents: always-on rules files (e.g. `.claude/rules/`), a docs CLI (`plain docs <package> --api / --search`), slash-command skills (`/plain-install`, `/plain-upgrade`, `/plain-optimize`, `/plain-bug`), and a `plain.mcp` package; 32 first-party packages including auth, sessions, oauth, admin, jobs, flags; multitenancy is not listed — [plainframework.com](https://plainframework.com/)
- [verified] 1,041 stars, pushed 2026-11-04, created 2023 — [github.com/dropseed/plain](https://github.com/dropseed/plain)
- [secondary] Show HN "Plain – The full-stack Python framework designed for humans and agents", submitted 2026-04-14 — [HN mirror](https://alt-hn.vercel.app/item/47768750)

#### Modelence (TypeScript + MongoDB; YC S25)
- [secondary] Launch HN described it as the first full-stack framework built for coding agents and humans alike — [Launch HN](https://news.ycombinator.com/item?id=46872733)
- [verified] The homepage now leads with "Production cloud on autopilot" for backends "deployed and operated by agents"; the open-source framework is a secondary link; claims "Trusted by 20,000+ developers and companies" [vendor]; no MCP server mentioned; multi-tenancy and admin not mentioned — [modelence.com](https://modelence.com/)
- [verified] 436 stars, non-standard license, active — [github.com/modelence/modelence](https://github.com/modelence/modelence)

#### Motia (now iii)
- [verified] The `MotiaDev/motia` repository now redirects to `iii-hq/iii`: 18,933 stars, no license detected by the GitHub API, active — [github.com/iii-hq/iii](https://github.com/iii-hq/iii)
- [verified] iii's migration guide describes Motia as "a higher-level framework built on top of `iii-sdk`" and tells users to remove the `motia` package and install `iii-sdk` directly — [iii docs: migrating from Motia](https://iii.dev/docs/changelog/0-11-0/migrating-from-motia-js)
- [secondary] Motia was pitched as a multi-language backend framework unifying APIs, background jobs, queues, workflows, streams and AI agents around one "Step" primitive, on a Rust-based engine — [Motia introduction](https://www.mintlify.com/MotiaDev/motia/introduction)

#### RedwoodSDK (TypeScript, Cloudflare-only)
- [verified] 1,729 stars, MIT, active; "Server-first React, running on the Cloudflare platform" — [github.com/redwoodjs/sdk](https://github.com/redwoodjs/sdk)
- [secondary] RedwoodJS was rebuilt from scratch as RedwoodSDK; 1.0 launched 2026-03-11; the original framework was renamed Redwood GraphQL and is community-maintained — [bytes.dev](https://bytes.dev/archives/474), [RedwoodSDK: RedwoodJS to RedwoodSDK](https://rwsdk.com/blog/redwoodjs-to-redwoodsdk)
- [verified] Legacy Redwood GraphQL repo: 17,589 stars — [github.com/redwoodjs/graphql](https://github.com/redwoodjs/graphql)

#### Phoenix / Ash (Elixir) — the closest "packages carry their own agent rules + composable installers" ecosystem
- [verified] `usage_rules` synchronizes LLM rules files with a project's dependencies (`mix usage_rules.sync`), so each package ships its own agent guidance; newer versions generate skills — [hexdocs: usage_rules](https://hexdocs.pm/usage_rules/readme.html); 228 stars — [github.com/ash-project/usage_rules](https://github.com/ash-project/usage_rules)
- [verified] Igniter, "A code generation and project patching framework", used as the install path (`mix igniter.install <package>`): 412 stars — [github.com/ash-project/igniter](https://github.com/ash-project/igniter)
- [verified] Tidewave, "MCP server with runtime-level tools for Phoenix development": 862 stars, Apache-2.0 — [github.com/tidewave-ai/tidewave_phoenix](https://github.com/tidewave-ai/tidewave_phoenix)
- [verified] Ash documents an LLM workflow and an Ash AI dev MCP server — [Ash: working with LLMs](https://ash.hexdocs.pm/working-with-llms.html)

#### Rails and Django
- [secondary] No official Rails MCP or agent feature was found; all Rails MCP servers surfaced are community gems (Rails MCP Server, ActionMCP, Rails Active MCP, Rails AI Context) — [Rails MCP Server README](https://cdn.jsdelivr.net/gh/maquina-app/rails-mcp-server@main/README.md), [Rails AI Context](https://crisnahine.github.io/rails-ai-context/TOOLS.html)
- [secondary] At Rails World 2026 (September 2026) the Rails creator said he has not written code by hand since about March 2026 and that "English is a better programming language than Ruby"; the article reports no new Rails features for agents — [The Decoder, 2026-09-25](https://the-decoder.com/ruby-on-rails-creator-dhh-says-hes-done-writing-code-by-hand/)
- [secondary] The same keynote reportedly announced HEY being rebuilt as native apps with its mail server core rewritten in Rust by coding agents, with self-reported figures of roughly 99% less CPU and 95% less memory; sources conflict on whether this is underway or exploratory, and the numbers are not independently reproduced — [dealroom summary of the keynote](https://dealroom.co/news/talk-vDjW_dRyKXY-pencils-down-dhh-declares-the-end-of-hand-written-code), [heise](https://heise.de/-11473479), [runtimewire on the Campfire Rust port](https://runtimewire.com/article/campfire-agent-written-rust-language-tradeoffs)
- [verified] rails/rails 59,035 stars; django/django 91,760 stars — [github.com/rails/rails](https://github.com/rails/rails), [github.com/django/django](https://github.com/django/django)
- [verified] Django's contributing docs (6.1) include an "AI-Assisted Contributions" section about contributing to Django itself; a forum thread proposes an AI/LLM contribution policy. Neither is tooling for agents building Django apps — [Django docs](https://docs.djangoproject.com/en/6.1/internals/contributing/writing-code/submitting-patches/), [Django forum](https://forum.djangoproject.com/t/proposal-add-an-ai-llm-contribution-policy-to-django/44298)

#### New Go and Rust projects launched 2025-2026 that claim "AI-first"
- [verified] **GoFastr** (Go, MIT): "The full-stack Go framework that doesn't get in the way of you or your agents." One Go entity declaration yields SQL schema, REST routes, an OpenAPI 3 spec and MCP tools; an optional `gofastr.yml` blueprint scaffolds a whole app; `multi_tenant` option scopes data by tenant; opt-in `auth` battery; RBAC; server-rendered UI with "90+ primitives"; `gofastr dev` exposes routes, config and logs to a coding agent over MCP; "Kiln" is an experimental agent-driven build mode with adapters for Claude Code, Pi, Codex and custom commands; `gofastr verify` runs 86 contract rules — [pkg.go.dev: gofastr v0.38.0](https://pkg.go.dev/github.com/DonaldMurillo/gofastr@v0.38.0), [github.com/DonaldMurillo/gofastr](https://github.com/DonaldMurillo/gofastr)
- [verified] GoFastr adoption and status: 24 stars, created 2026-05-08, pushed 2026-11-16; self-described as "a personal research tree at the moment", "a thesis framework", "pre-1.0 and explicitly not stable"; "External production adopters are the part still ahead of us"; no measured claims about agent performance; no registry of installable modules — [github.com/DonaldMurillo/gofastr](https://github.com/DonaldMurillo/gofastr)
- [verified] **gonext** (Go + Next.js, MIT): "An AI-first Go + Next.js framework" for codebases where "AI coding agents are the primary authors and humans review the decisions"; deterministic generators (`gonext generate resource`), a `make check` compile/test loop, auth + RBAC, a Next.js admin portal, optional feature packs A–J (workers, email, blob storage, cache, observability, admin, mobile, deployment, embedded AI), AGENTS.md / CLAUDE.md, and "Spec & Plan Skills" shipped with the generated project. Multitenancy and MCP are not mentioned. The README is a vision document and the CLI is not yet installable — [pkg.go.dev: gonext](https://pkg.go.dev/github.com/dennys-bd/gonext)
- [verified] gonext adoption: 0 stars, created 2026-08-28, last push 2026-09-16 — [github.com/dennys-bd/gonext](https://github.com/dennys-bd/gonext)
- [verified] **ploykit** (Go + React 19, MIT): "a full-stack framework for building multi-tenant SaaS products" with business domains (auth incl. OAuth and federated SSO, workspaces, billing with Stripe/PayPal adapters, admin), tenant isolation as a security invariant, and `mcpx`, an MCP server kernel that "turns a product's app into an agent-operable control plane"; v0.29.0 published 2026-11-13 — [pkg.go.dev: ploykit](https://pkg.go.dev/github.com/haozing/ploykit); 1 star, created 2026-10-08 — [github.com/haozing/ploykit](https://github.com/haozing/ploykit)
- [verified] **LastSaaS** (Go + React, MIT): "SaaS boilerplate/starter-kit in Go+React with Stripe integration, multi-tenant support, comprehensive features and AI-agent ready"; 181 stars, created 2026-02-22 — [github.com/metavert-io/lastsaas](https://github.com/metavert-io/lastsaas)
- [verified] **platformkit** (Go, Apache-2.0): "Open-source Go backend for multi-tenant SaaS"; 17 stars, created 2026-07-08 — [github.com/septagon-oss/platformkit](https://github.com/septagon-oss/platformkit)
- [verified] **rustango** (Rust, Apache-2.0 or MIT): "A batteries-included web framework for Rust: declare a model once, and get an ORM, auto-migrations, an auto-admin, multi-tenancy, and a REST API out of it"; tenants resolve from subdomain, header, path or port; an `mcp` feature "turns an app into a Model Context Protocol server"; v0.66.0 released 2026-11-13; "Rustango is `0.x`, so a minor bump is allowed to break things and several have" — [docs.rs: rustango](https://docs.rs/crate/rustango/latest); 20 stars — [github.com/ujeenet/rustango](https://github.com/ujeenet/rustango)
- [secondary] **Pylon Sync**: Show HN in July 2026, "an agent-first full-stack realtime framework" (server-rendered React, TypeScript functions, entities, policies, built-in auth, jobs) — [HN mirror](https://hn.svelte.dev/item/48849648)

#### Adjacent: registries and spec tooling that agents already consume
- [verified] shadcn/ui: 128,322 stars, MIT — [github.com/shadcn-ui/ui](https://github.com/shadcn-ui/ui); since June 2026 any public GitHub repository can act as a shadcn registry — [shadcn changelog](https://ui.shadcn.com/docs/changelog/2026-06-github-registries); CLI v4 (March 2026) added agent skills and design-system presets [secondary] — [dev.to summary](https://dev.to/codedthemes/shadcnui-march-2026-update-cli-v4-ai-agent-skills-and-design-system-presets-1gp1)
- [verified] agentcn uses the shadcn CLI to install backend "agent recipes", showing the registry mechanism is already used for non-UI code — [agentcn docs](https://agentcn.vercel.app/docs)
- [verified] GitHub Spec Kit ("Toolkit to help you get started with SDD"): 150,074 stars, MIT, created 2025-08-21 — [github.com/github/spec-kit](https://github.com/github/spec-kit)
- [verified] Medusa now describes itself as "The world's most flexible commerce platform for agents and developers": 37,276 stars — [github.com/medusajs/medusa](https://github.com/medusajs/medusa)
- [verified] ABP (ASP.NET Core application framework): 14,474 stars, LGPL-3.0 — [github.com/abpframework/abp](https://github.com/abpframework/abp); ABP Studio ships an integrated, solution-aware AI coding agent that is an MCP client but does not expose itself as an MCP server to external agents — [ABP docs: Studio AI agent](https://abp.io/docs/latest/studio/ai-agent)

### Inferences
- [inference] The agent-facing kit is commoditized. Rules files, skills, MCP and llms.txt are shipped by Wasp, Laravel, Encore, Convex, Plain and Loco alike, so "we have an MCP server and AGENTS.md" is no longer a differentiator.
- [inference] Positioning collision is real: "the batteries-included full-stack framework for the AI era" (Wasp) and "The clean stack for Artisans and agents" (Laravel) already occupy the slogan the idea would use.
- [inference] ABP Studio and Leap/Chef went the opposite way from the idea: they bundle their own agent. The idea's "bring your own agent" stance matches Wasp, Laravel Boost, Encore, Convex skills and GoFastr's Kiln adapters.
- [inference] Motia being absorbed into a different product (iii) within about two years, Modelence shifting its homepage from framework to managed cloud, and Redwood restarting on Cloudflare suggest that venture-backed "new framework" plays tend to drift toward infrastructure or hosting, where the revenue is.

### Gaps
- No official statement was found on whether `rails new` generates agent files or whether Rails core plans an MCP server; one blog claims the Rails repo ships an AGENTS.md for contributors, which I did not confirm against the repository.
- The HEY-to-Rust claims come from secondary and partly AI-generated summaries of a keynote; I could not read a primary 37signals write-up (one source returned HTTP 403).
- Download counts (npm, crates.io, Packagist, Go module proxy) were not collected; adoption evidence here is stars, funding and vendor statements only.
- Laravel's company funding and the number of Boost installs were not re-verified in this session.
- Convex's exact license name and the number of components in its directory could not be read (the directory page did not render its listing).
- I did not find a Django Software Foundation initiative for agent tooling; absence of search results is not proof that none exists.

## Key question 2: What batteries-included "Rails/Django for Go or Rust" projects exist, how adopted are they, and why did earlier attempts fail or stall?

### Takeaway
Batteries-included frameworks in Go and Rust exist and are alive, but they are an order of magnitude less adopted than the minimal routers in the same languages (Gin 89.5k and Fiber 40.3k stars versus Goravel 4.9k and Buffalo 8.4k; Loco 9.6k versus Leptos 21.5k and Dioxus 39.8k), and I found no sourced post-mortem explaining why. The most adopted Go "backend in one file", PocketBase, archived its GitHub repository in October 2026 citing LLM spam.

### Cited Findings

#### Go
- [verified] **Goravel**: Laravel-style Go framework ("Familiar structure. Native Go."), 30 facades including Auth (JWT and session guards), ORM, queues, scheduler, mail, views, plus new AI and Telemetry facades; single static binary; v1.19; MIT; site lists 4,910 stars and 43 contributors. No multitenancy, admin panel, AGENTS.md, MCP or llms.txt mentioned; its "AI SDK" is for building AI features into apps, not for coding agents — [goravel.dev](https://www.goravel.dev/); 4,911 stars — [github.com/goravel/goravel](https://github.com/goravel/goravel)
- [verified] **GoFr**: 20,796 stars, Apache-2.0, active; "An opinionated GoLang framework for accelerated microservice development" (a backend/microservice framework, not full-stack) — [github.com/gofr-dev/gofr](https://github.com/gofr-dev/gofr)
- [verified] **Buffalo**: 8,423 stars, MIT, created 2014; GitHub API reports `archived=false`, last push 2026-03-21, latest release v1.1.4 on 2026-03-20 — [github.com/gobuffalo/buffalo](https://github.com/gobuffalo/buffalo); contradicted by an index that lists it as archived with last push 2023-12-04 — [ecosyste.ms](https://awesome.ecosyste.ms/projects/github.com%2Fgobuffalo%2Fbuffalo)
- [secondary] One article describes Buffalo's and Revel's communities as significantly declined and "rarely recommended in Go discussions" — [daily.dev](https://daily.dev/blog/top-8-go-web-frameworks-compared-2024)
- [verified] **Revel**: 13,210 stars, last push 2023-10-28 (no activity for about three years) — [github.com/revel/revel](https://github.com/revel/revel)
- [verified] **Beego**: 32,436 stars, active — [github.com/beego/beego](https://github.com/beego/beego)
- [verified] **Pagoda** ("Rapid, easy full-stack web development starter kit and admin panel in Go"): 2,964 stars, MIT — [github.com/mikestefanello/pagoda](https://github.com/mikestefanello/pagoda)
- [verified] **Andurel** ("Space-grade Go framework"): 227 stars, created 2025-08-26, active — [github.com/mbvlabs/andurel](https://github.com/mbvlabs/andurel)
- [verified] Reference points for minimal Go routers: Gin 89,528 stars; Fiber 40,283 stars; templ 10,613 stars — [github.com/gin-gonic/gin](https://github.com/gin-gonic/gin), [github.com/gofiber/fiber](https://github.com/gofiber/fiber), [github.com/a-h/templ](https://github.com/a-h/templ)
- [verified] **Encore** (Go/TS): 12,717 stars, see key question 1 — [github.com/encoredev/encore](https://github.com/encoredev/encore)
- [verified] **PocketBase** (Go, MIT, 61,584 stars): the GitHub repository was archived on 2026-10-26 and development moved to the author's own host with "no official GitHub mirror"; Go users must change import paths for newer versions. Stated reason: "My problem is with the constant LLM spam and lack of effort or even attempt from GitHub to educate its users." Latest GitHub release is v0.40.6 (2026-10-23), still pre-1.0 — [PocketBase discussion #7841](https://github.com/pocketbase/pocketbase/discussions/7841), [github.com/pocketbase/pocketbase](https://github.com/pocketbase/pocketbase)

#### Rust
- [verified] **Loco** ("The one-person framework for Rust for side-projects and startups"): 9,638 stars, Apache-2.0, created 2023-11-07, latest release v1.3.1 on 2026-11-06 — [github.com/loco-rs/loco](https://github.com/loco-rs/loco)
- [secondary] Loco reached 1.0 in July 2026; built on Axum with Sea-ORM 2.0 — [OpenReplay](https://blog.openreplay.com/getting-started-loco-rust-rails/)
- [verified] Loco's site lists services, data, email, background jobs, tasks, a CLI, auth and generators; views/frontend, admin, multitenancy and deployment are not mentioned; the only AI reference is an "and AI agents" badge linking to `/llms.txt` — [loco.rs](https://loco.rs/)
- [verified] **Leptos**: 21,536 stars, MIT. **Dioxus** ("Fullstack app framework for web, desktop, and mobile"): 39,788 stars. Both are UI/full-stack rendering frameworks, not Rails-style application frameworks — [github.com/leptos-rs/leptos](https://github.com/leptos-rs/leptos), [github.com/DioxusLabs/dioxus](https://github.com/DioxusLabs/dioxus)
- [verified] **Cot** ("The Rust web framework for lazy developers"): 1,107 stars, Apache-2.0, active — [github.com/cot-rs/cot](https://github.com/cot-rs/cot)
- [verified] **Tuono** (Rust + React): 1,153 stars. **rwf**: 1,063 stars, last push 2026-04-14. **Pavex** ("A backend framework for Rust professionals"): 2,074 stars. **summer-rs** (formerly spring-rs, Spring Boot style): 1,031 stars — [github.com/tuono-labs/tuono](https://github.com/tuono-labs/tuono), [github.com/levkk/rwf](https://github.com/levkk/rwf), [github.com/LukeMathWalker/pavex](https://github.com/LukeMathWalker/pavex), [github.com/summer-rs/summer-rs](https://github.com/summer-rs/summer-rs)
- [verified] **rustango**: Django-shaped, 20 stars, see key question 1 — [github.com/ujeenet/rustango](https://github.com/ujeenet/rustango)

#### JavaScript precedents for stalls and pivots
- [verified] **Blitz.js** ("The Missing Fullstack Toolkit for Next.js"): 14,117 stars, last push 2025-11-21 (about a year without activity) — [github.com/blitz-js/blitz](https://github.com/blitz-js/blitz)
- [secondary] **RedwoodJS** evolved into RedwoodSDK after its lead developer left to build a startup on it; the rewrite was described as a move away from heavy tooling — [bytes.dev](https://bytes.dev/archives/474)

### Inferences
- [inference] The adoption gap is consistent and large: in Go, the most-starred batteries-included app framework with a Rails/Laravel shape (Goravel, 4.9k) has about 5% of Gin's stars; in Rust, Loco after three years and a 1.0 release has less than half of Leptos and a quarter of Dioxus. A new Go or Rust "Rails replacement" starts in a segment where even the leaders are niche.
- [inference] None of the established Go/Rust batteries-included frameworks (Goravel, GoFr, Buffalo, Loco, Cot) has repositioned as agent-first; Loco added llms.txt only. The Go/Rust + agent-first intersection is currently occupied only by projects with 0-200 stars. That is either an open lane or a signal that demand is unproven; the data here cannot tell which.
- [inference] PocketBase leaving GitHub over LLM spam is a cautionary data point for any open-source project that invites agent-driven contributions: the maintenance cost of agent-generated issues and PRs was enough to move a 61k-star project off the platform.
- [inference] The pattern across Buffalo, Revel, Blitz and Redwood is dependence on one or a few maintainers plus no sustaining revenue; this is my reading of repository activity and the Redwood account, not a documented cause.

### Gaps
- I found no primary post-mortem from Buffalo or Revel maintainers explaining the decline, and no source substantiating the common claim that "the Go community prefers libraries over frameworks." Treat that explanation as folklore until sourced.
- Buffalo's archive status is contradictory across sources; the GitHub API (primary, read today) says not archived with a March 2026 release.
- Production users of Loco, Goravel and GoFr were not found on the pages reviewed.
- Cot's Django inspiration is from my prior knowledge; the repository description read today only says "for lazy developers."

## Key question 3: Which of them have built-in multitenancy, auth, admin and deployment/infra as first-class parts of the framework?

### Takeaway
Auth is common, admin is occasional, deployment is the paid layer of the venture-backed ones, and first-class multitenancy is rare: among everything reviewed it appears only in very small projects (GoFastr, ploykit, rustango, LastSaaS, platformkit). None of the adopted agent-era frameworks (Wasp, Laravel core, Encore, Convex, Loco, Goravel, Plain) lists multitenancy as a base feature on the pages reviewed.

### Cited Findings

| Project | Auth | Admin | Multitenancy | Deploy / infra | Source |
|---|---|---|---|---|---|
| Wasp | Built in (social + email, with UI) | Not mentioned | Not mentioned | Plugin gives guidance for Railway / Fly.io | [wasp.sh/vibe-coding](https://wasp.sh/vibe-coding), [Wasp docs](https://wasp.sh/docs/wasp-ai/coding-agent-plugin) |
| Encore | Auth handlers as a primitive | Not mentioned | Not mentioned | Core product: provisions AWS / GCP from code; Encore Cloud | [Encore AI integration docs](https://encore.dev/docs/go/ai-integration), [encore.dev/about](https://encore.dev/about) |
| Convex | Via components / libraries | Dashboard (hosted) | Not mentioned | Hosted cloud is the product | [Convex docs: components](https://docs.convex.dev/components) |
| Plain | plain.auth, sessions, passwords, oauth, loginlink | plain.admin | Not listed | Not a core package; Plain Cloud for telemetry | [plainframework.com](https://plainframework.com/) |
| Modelence | User management and roles | Not mentioned | Not mentioned | Managed cloud is the primary product | [modelence.com](https://modelence.com/) |
| Loco | Listed | Not mentioned | Not mentioned | Not mentioned | [loco.rs](https://loco.rs/) |
| Goravel | JWT and session guards, gates | Not mentioned | Not mentioned | Single static binary | [goravel.dev](https://www.goravel.dev/) |
| GoFastr | Opt-in `auth` battery, RBAC, secure-by-default CRUD | Small read-only admin battery | `multi_tenant` option adds `tenant_id` and scopes queries and SSE | Not described | [pkg.go.dev](https://pkg.go.dev/github.com/DonaldMurillo/gofastr@v0.38.0), [GitHub](https://github.com/DonaldMurillo/gofastr) |
| gonext | Argon2id, cookie sessions, RBAC | Next.js admin portal | Not mentioned | Deployment targets as an optional pack | [pkg.go.dev](https://pkg.go.dev/github.com/dennys-bd/gonext) |
| ploykit | Password, OAuth, federated SSO, workspaces | `admin` domain | Tenant isolation as a security invariant | Not described | [pkg.go.dev](https://pkg.go.dev/github.com/haozing/ploykit) |
| rustango | Sessions, JWT, API key, TOTP, OAuth2/OIDC | Auto-admin with per-tenant branding | Per-tenant database or per-schema (Postgres) | Not described | [docs.rs](https://docs.rs/crate/rustango/latest) |
| LastSaaS | Yes (three-tier RBAC) [secondary] | Admin interface [secondary] | Tenant-scoped data isolation | Not described | [github.com/metavert-io/lastsaas](https://github.com/metavert-io/lastsaas), [mcpservers.org listing](https://mcpservers.org/servers/jonradoff/lastsaas) |
| PocketBase | Built in | Built-in admin UI | Not a feature | Single binary | [github.com/pocketbase/pocketbase](https://github.com/pocketbase/pocketbase) |

- [verified] GoFastr applies the same scopes to MCP tools as to REST routes ("anonymous → 401, cross-user → 404"), i.e. tenancy and auth also bind the agent-facing surface — [github.com/DonaldMurillo/gofastr](https://github.com/DonaldMurillo/gofastr)
- [verified] rustango's MCP feature has agents authenticate as tenant-scoped identities — [docs.rs: rustango](https://docs.rs/crate/rustango/latest)
- [verified] Bullet Train is "The Open Source Ruby on Rails SaaS Template": 1,894 stars, MIT — [github.com/bullet-train-co/bullet_train](https://github.com/bullet-train-co/bullet_train)

### Inferences
- [inference] "Multitenancy and auth in the base" is a genuine differentiator against every adopted competitor reviewed, but it is not novel: three tiny 2026 Go/Rust projects already do it, and two of them (GoFastr, rustango) also scope the MCP surface by tenant.
- [inference] Deployment/infra is where the funded players monetize (Encore Cloud, Convex, Modelence, Laravel Cloud). A framework that ships none leaves the revenue layer to someone else; one that ships it competes with companies that have raised from $3M to $110M.

### Gaps
- Multitenancy in the mainstream ecosystems is normally supplied by packages (for example tenancy packages in Laravel, team models in Bullet Train, tenant modules in ABP). I did not source those in this session, so the table says "not mentioned" rather than "absent."
- "Not mentioned" means not found on the specific pages read; I did not audit full documentation sets.

## Key question 4: Is there published evidence that an agent-oriented framework makes agents produce more correct software or spend fewer tokens than a mainstream framework?

### Takeaway
There are numbers, but almost all are vendor-run, single-run or tiny-sample, and each vendor's benchmark is won by that vendor. The better-designed ones (Laravel Boost Benchmarks, Hono Agent DX) measure agent tooling on top of a framework rather than one framework against another, and show a consistent pattern: tooling raises success mostly for weaker models and harder tasks, and usually costs more tokens, not fewer. The only independent academic result found (BaxBench) points the other way for a new framework: models do worse on less popular frameworks.

### Cited Findings

#### Vendor-run comparisons
- [vendor] **Laravel Boost Benchmarks** (2026-03-18): 6 models, 17 tasks, 315 Pest tests, run through OpenCode, with and without Boost. Tests passed with Boost vs without: haiku-4.5 267 vs 231 (+36); sonnet-4.6 297 vs 296 (+1); kimi-k2.5 298 vs 270 (+28); gpt-5.3-codex 313 vs 298 (+15); gpt-5.4 313 vs 299 (+13); opus-4.6 301 vs 275 (+26). Laravel states Boost "can add token, context, and sometimes time overhead", with an average cost delta of roughly $0.05 to $0.20 per evaluation, and that on simple tasks "Boost adds MCP calls and extra tokens but rarely changes the outcome" — [Laravel blog](https://laravel.com/blog/which-ai-model-is-best-for-laravel)
- [vendor] Same post, on noise: "haiku 4.5 improved from 7/19 to 17/19 on the Livewire evaluation with Boost just by running the same evaluation again"; "the results should be treated as directional signals rather than fixed measurements" — [Laravel blog](https://laravel.com/blog/which-ai-model-is-best-for-laravel)
- [vendor] **Wasp vs Next.js** (2026-03-26): Claude Code given one identical feature prompt on Vercel's SaaS starter and a Wasp conversion of it. Total tokens 2,505,796 (Wasp) vs 4,049,413 (Next.js); cost $2.87 vs $5.17; API calls 66 vs 96. Output tokens were nearly equal (about 5,400 each); the gap came from input and cache tokens. One run, one feature, no variance reported; the headline says 40% while the table says 38% — [Wasp blog](https://wasp.sh/blog/2026/03/26/nextjs-vs-wasp-40-percent-less-tokens-same-app), repeated on [wasp.sh/vibe-coding](https://wasp.sh/vibe-coding)
- [vendor] **Convex Fullstack-Bench** (date not shown on the page; older, treat as roughly 2025): Cursor agent implements a backend for an existing Next.js frontend on three backends. Chat: Convex 12/12 in 3:34 with 0 reported errors; FastAPI 12/12 in 27:05 with 14 errors; Supabase 11/12 in 30:00 with 14 errors. Todo: Convex 22/22, FastAPI 20/22, Supabase 22/22. Files (1h limit): Convex 33/34, FastAPI 11/34, Supabase 16/34. Stated conclusions: "Type safety, in particular, is an excellent guardrail for coding agents" and "Writing regular procedural code against a novel but natural API (like most of Convex) outperforms a declarative language that's well-represented in the pre-training dataset" — [Convex: introducing Fullstack-Bench](https://stack.convex.dev/introducing-fullstack-bench)
- [vendor] **Encore ai-backend-benchmark** (2026-05-26): Claude Code on the same backend project across Encore, Express, Fastify, Hono, NestJS, three runs. Total spend Encore $6.29 vs NestJS $12.69; rubric run: Encore and Fastify passed all checks, NestJS 30 of 36, Hono 29 of 36. Model version and repeat counts are not given on the page, and Express's total is not reported — [Encore: cheapest framework for AI coding 2026](https://encore.dev/resources/cheapest-framework-ai-coding-2026)
- [vendor] **Hono Agent DX** (value experiment run 2026-09-06, 10 runs per cell, claude-haiku-4-5), plain fetch handler vs Hono on the same task: Shop API 2/10 success, 103k median tokens (plain) vs 4/10, 87k (Hono); Notes API with auth 10/10, 134k (plain) vs 10/10, 93k (Hono) — [agent-dx.hono.dev](https://agent-dx.hono.dev/)
- [vendor] Hono Agent DX, "practical" tasks, baseline vs Hono CLI + skill: on haiku, `session-users` went from 40% success at 101k median tokens to 80% at 342k; `refactor-routes` from 80% at 172k to 100% at 230k; on opus, `session-users` stayed at 80% while tokens rose from 91k to 249k — [agent-dx.hono.dev](https://agent-dx.hono.dev/)
- [vendor] Hono Agent DX, adoption test: with a neutral prompt, agents chose a raw handler or Express far more often than Hono in most cells (0% Hono adoption on node-js across all scenarios for both models tested) — [agent-dx.hono.dev](https://agent-dx.hono.dev/)
- [secondary] **Vercel Next.js evals**: a compressed ~8KB docs index in AGENTS.md reached 100% pass rate on Next.js 16 API evals; a docs skill reached 79% when explicitly instructed and 53% by default, equal to the no-docs baseline of 53%. Figures are from secondary write-ups of Vercel's post — [Vercel blog](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals), [The Decoder](https://the-decoder.com/a-simple-text-file-beats-complex-skill-systems-for-ai-coding-agents/)
- [secondary] Vercel's public Next.js evals: 24 tasks; as of 2026-06-01 the top row was 92% — [benchlm.ai](https://benchlm.ai/benchmarks/nextjsEvals)

#### Independent or non-framework-vendor comparisons
- [verified] **19-framework token test** (individual author, 2026-02-23): Claude Code with Opus 4.6, one run per framework, simple blog app then a "add categories" follow-up. ASP.NET Minimal API cheapest at about 26k tokens; Phoenix most expensive at about 74k (2.9x); minimal frameworks clustered at 26–29k; SvelteKit about 28k and Django called out as efficient full-featured frameworks. All 19 initial builds worked; 18 of 19 follow-ups succeeded (Spring Boot failed). Phoenix's cost is attributed to reading scaffolded code. The author calls it "not a hugely scientific approach". Rust frameworks are not named in the article — [martinalderson.com](https://martinalderson.com/posts/which-web-frameworks-are-most-token-efficient-for-ai-agents/)
- [verified] **Rails vs Django vs Laravel** (monitoring vendor's blog, 2026-06-17): Cursor Pro, one build each of an auth + CRUD + comments + JSON API app. Total tokens Rails 61,141; Django 31,301; Laravel about 104,989 (of which about 44,000 was one debugging session). Time to working app 9, 3 and 7 minutes. All three generated apps had an N+1 query problem — [AppSignal blog](https://blog.appsignal.com/2026/06/17/vibe-coding-economically-which-framework-is-the-cheapest-rails-vs-django-vs-laravel.html)
- [verified] **railsblueprint/stack-comparison** (2025-10-25, older): claims Rails uses about 2x fewer tokens than React (about 3,733 vs 7,266), but tokens are estimated at 4 characters per token over the size of generated code, the scopes are not symmetric, and each stack was generated once — [github.com/railsblueprint/stack-comparison](https://github.com/railsblueprint/stack-comparison)
- [verified] **BaxBench** (academic, arXiv February 2025, older): 392 backend-generation tasks; the best model reached 62% code correctness; "on average, we could successfully execute security exploits on around half of the correct programs"; models "further struggle to generate correct and secure applications" in less popular backend frameworks — [arXiv 2502.11844](https://arxiv.org/abs/2502.11844)
- [secondary] BaxBench covers 28 scenarios across 14 frameworks in 6 languages — [ICLR virtual page](https://iclr.cc/virtual/2025/33345)
- [secondary] **Web-Bench** (2025, older): the best model reached 25.1% Pass@1 on tasks over web standards and frameworks — [arXiv 2505.07473](https://arxiv.org/abs/2505.07473v1)

### Inferences
- [inference] No study found measures the thing the idea claims. Nobody compared "agent + framework with a verified-piece catalog" against "agent + mainstream framework" on correctness of a non-trivial application with repeated runs. The claim is currently unsupported by published evidence in either direction.
- [inference] The measured effect of agent tooling is success rate for weak models on hard tasks, not token savings. Laravel reports extra tokens with Boost; Hono reports up to 3.4x more tokens with CLI + skill. A pitch built on "fewer tokens" rests only on Wasp's single run and Encore's undisclosed-repeat benchmark.
- [inference] Strong models compress the benefit: sonnet-4.6 gained 1 test of 315 from Boost, and Laravel's own benchmark saturated within months. A framework whose value is "agents make fewer mistakes" faces a shrinking margin as models improve, unless the value is in guarantees the model cannot supply (locked tests, tenancy isolation, verified modules).
- [inference] There is a real tension in the evidence about novelty. BaxBench and the Phoenix result suggest unfamiliar frameworks cost correctness and tokens; Convex argues a novel but natural, strongly typed API beats a familiar declarative one. A new Go or Rust framework would be unfamiliar to every model on day one, so its design has to carry the load that training-data familiarity carries for Django or Rails. Hono's adoption test adds that agents do not pick an unfamiliar framework unprompted.
- [inference] The most defensible measured design levers across these sources are: compile-time or type-level feedback (Convex, Encore), deterministic generators and thin interfaces (Wasp, gonext's stated goal), and always-loaded compact context over on-demand skills (Vercel).

### Gaps
- I found no peer-reviewed paper comparing web frameworks as a variable for agentic (multi-step, tool-using) development; BaxBench is single-shot generation and predates current models.
- Per-framework BaxBench scores for Go and Rust frameworks were not retrieved.
- Vercel's 100% / 79% / 53% figures were read from secondary write-ups, not from the primary post body.
- Encore's raw transcripts (`encoredev/ai-backend-benchmark`) and the full per-framework table of the 19-framework test (published as charts) were not read.
- One secondary note mentioned a university study finding that context files can lower success rates; I did not locate or verify it.

## Key question 5: Did any project try "framework + catalog of installable verified modules + agent as assembler" as one product, and what happened to it?

### Takeaway
No project found ships all three as one product with meaningful adoption. Each pair exists: framework + module catalog (Convex Components, Wasp's experimental full-stack modules, Laravel packages, Medusa), catalog + agent-as-installer (shadcn registries, Tessl), framework + agent-as-builder (GoFastr Kiln, gonext, Leap, Chef). The one company that tried "spec framework + registry" as a product, Tessl, repositioned its registry toward agent skills within about four months and its framework's status is disputed. The specific combination of tests-as-gauge per piece, business questions per piece, and a non-technical conversation producing locked tests was not found anywhere as a product.

### Cited Findings
- [vendor] **Tessl**: launched a Spec Registry (open beta, 2025-09-16, over 10,000 specs for external libraries) together with the Tessl Framework (closed beta) — [Tessl launch post](https://tessl.io/blog/tessl-launches-spec-driven-framework-and-registry/)
- [secondary] By a 2026-01-29 repositioning the registry became a skills registry (3,000+ skills advertised in 2026; a March 2026 partnership attaches a security score to public skills). Sources conflict on the Framework: one says development was paused in 2025 and the functionality removed from the rebuilt CLI; others say it is still in closed beta or not generally available as of mid-2026 — [codemyspec review](https://codemyspec.com/blog/tessl-review), [rywalker research note](https://rywalker.com/research/tessl)
- [vendor] **Wasp full-stack modules**: the nearest framework-native version of "pieces" (client + server + data + wiring in one installable unit), explicitly experimental, registry is a concept image, no verification described; the post's own experiment had an agent build the same webshop in 11 frameworks with payments required to be a full-stack module, arguing "the less custom glue we ask them to write, the better" — [Wasp blog, 2026-06-22](https://wasp.sh/blog/2026/06/22/javascript-still-cant-ship-a-full-stack-module)
- [vendor] **Convex Components**: a live, curated directory of sandboxed backend modules installable from npm, with official agent skills that steer agents to reuse components, plus an AI app builder (Chef). Backend only; no claim found that each component's tests act as an acceptance gate for the user's app — [convex.dev/components](https://www.convex.dev/components), [Convex docs: agent skills](https://docs.convex.dev/ai/agent-skills), [github.com/convex/chef](https://github.com/convex/chef)
- [verified] **shadcn registries**: the install mechanism the idea borrows is already generic. Since June 2026 any public GitHub repository can be a registry, and the CLI lets an agent inspect an item's source before installing; third parties already use it for backend files — [shadcn changelog](https://ui.shadcn.com/docs/changelog/2026-06-github-registries), [agentcn docs](https://agentcn.vercel.app/docs)
- [secondary] A hosted shadcn catalogue advertises an MCP through which an agent searches, previews and installs across 6,000+ blocks with "verified dependencies"; how verification works is not shown — [shadcn.io/mcp](https://www.shadcn.io/mcp)
- [verified] **Elixir (Ash + Igniter + usage_rules)**: packages ship their own agent rules, and installers patch a project deterministically; this is an ecosystem convention, not a single product, and adoption is small (Igniter 412 stars, usage_rules 228) — [hexdocs: usage_rules](https://hexdocs.pm/usage_rules/readme.html), [github.com/ash-project/igniter](https://github.com/ash-project/igniter)
- [verified] **gonext**: micro-kernel core "extended with pluggable feature packs and generated by an interactive CLI", deterministic generators, and spec-and-plan skills; states "the agent's first step should be a generator rather than a hand-written skeleton" and aims to turn common LLM mistakes into compile errors. It is a vision document with 0 stars and an uninstallable CLI — [pkg.go.dev: gonext](https://pkg.go.dev/github.com/dennys-bd/gonext), [github.com/dennys-bd/gonext](https://github.com/dennys-bd/gonext)
- [verified] **GoFastr**: blueprint file → generated plain Go, opt-in batteries behind small interfaces, a wire protocol for out-of-process third-party modules, and Kiln as an agent build mode with multiple agent adapters; no registry, no measured agent results, one listed production app — [github.com/DonaldMurillo/gofastr](https://github.com/DonaldMurillo/gofastr)
- [secondary] **Locked acceptance tests as a workflow, not a product**: a practitioner guide describes tests "approved by a human, then locked outside the implementing agent's edit scope, so a green run proves the agreed behavior instead of the agent's own interpretation of it", with the agent reporting instead of editing when it disagrees. The search surfaced guides and conventions, no framework that enforces it — [developertoolkit.ai](https://developertoolkit.ai/en/workflows/plan/acceptance-criteria/)
- [verified] Spec-driven tooling has very large mindshare independent of any framework: GitHub Spec Kit has 150,074 stars 15 months after creation — [github.com/github/spec-kit](https://github.com/github/spec-kit)
- [vendor] Hosted AI app builders already sell "conversation → app on a fixed stack": Leap (Encore.ts, deploys to the user's cloud) and Chef (Convex) — [Encore blog](https://encore.dev/blog/leap-is-here), [github.com/convex/chef](https://github.com/convex/chef)

### Inferences

#### What happened to those who tried
- [inference] The pattern is drift, not collapse. Tessl moved from specs toward a skills registry; Wasp named the module concept but has not shipped a registry in the 16 months since it appeared on the roadmap; Motia was folded into an engine product; Modelence leads with cloud. Catalog-plus-framework products appear hard to finish before the company needs revenue from something else.
- [inference] Convex is the only one found with a functioning, populated catalog tied to a framework-like runtime, and it has $110.5M and a hosted product paying for it.

#### Closest competitor and remaining gap (honest assessment)
- [inference] **Closest by shape: GoFastr.** Same language choice, same "bring your own agent" stance with adapters for Claude Code, Codex and Pi, blueprint file, multitenancy and auth in the base, default UI kit, MCP for the coding agent, contract verification command. It differs in having no piece catalog, no business-question layer, no spec-to-locked-tests flow, and essentially no adoption (24 stars, self-described personal research tree). It proves the shape is buildable by one person with agents in about six months; it does not prove demand.
- [inference] **Closest by threat: Wasp.** Same slogan, 18.8k stars, YC-backed, agent plugin shipped, built-in auth, and "full-stack modules + registry" is the same idea as pieces and a catalog, already named and on its roadmap. Its gaps relative to the idea: TypeScript rather than Go/Rust, modules experimental with no registry, no verification or tests-as-gauge in the module concept, no multitenancy, no non-technical spec flow.
- [inference] **Incumbent that makes "replace Laravel" hard: Laravel itself.** It is the only one with a first-party agent tool backed by a repeatable benchmark it uses to steer development, an AI SDK in core, a mature package ecosystem and starter kits, and its own cloud. Its agents already pass its own evals at or near 100%.
- [inference] **Size of the remaining gap, by component:**
  - Agent kit (MCP, rules, skills, llms.txt): no gap; commodity.
  - Batteries-included Go/Rust framework: partially filled (Loco 1.x, Goravel, Encore), all with modest adoption and none agent-first beyond llms.txt or Encore's MCP.
  - Multitenancy + auth in the base: open against adopted frameworks; already done by three tiny projects.
  - Installable catalog with a shadcn-style CLI: mechanism is free and generic; a populated backend catalog exists only at Convex; Wasp has announced intent.
  - Pieces that carry their own tests as a pass/fail gauge and their own business questions: not found anywhere. This is the widest gap and the most original part.
  - Conversation with a non-technical person producing approved examples as tests the agent may not edit: found only as a workflow convention in guides; no product enforcing it was found.
  - Evidence that the whole thing makes agents more correct: not found for anyone, including the idea.
- [inference] Net: nobody has already built this product, and nobody has done it better. But the unoccupied part is not "an AI-first framework" (crowded, and incumbents with distribution are one feature away); it is the verification layer: pieces with executable gauges, business questions, and locked example-tests. That layer is framework-independent in principle, which cuts both ways: it could be built on top of an existing framework, and an incumbent could add it.
- [inference] Two headwinds the data makes explicit: models perform worse on unfamiliar frameworks and do not choose them unprompted (BaxBench, the 19-framework test, Hono's adoption test), and batteries-included frameworks in Go and Rust have historically captured a small fraction of their language's web developers.

### Gaps
- Search coverage is limited to what public search surfaced in English; small projects in other languages or communities (and closed-source products) may exist and be missed.
- I did not find any acquisition or shutdown announcement for the projects reviewed; "pivoted" judgments for Tessl, Modelence and Motia rest on current public positioning and secondary reports, and Tessl's framework status is contradictory across sources.
- I could not verify how any "verified" label on third-party registries is earned.
- Whether a catalog of pieces with tests-as-gauge improves agent correctness is unmeasured; this is the claim most in need of the project's own benchmark.
