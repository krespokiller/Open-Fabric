# Catalogs, registries, vertical building blocks and multitenant starter kits (state as of November 2026)

Scope note: this covers the CATALOG and VERTICALS side of the idea (a catalog of verified pieces = code + tests-as-gauge + business questions, installed by CLI/MCP, combined into vertical blueprints, on a base with built-in auth and multitenancy). The framework side is covered by another researcher.

Reading conventions used below:
- "Verified" = read on the primary page (official docs, the project's own repository page, or the vendor's own announcement).
- "Vendor claim" = stated by the vendor about itself, not independently checked.
- "Secondary" = taken from an aggregator, a third-party blog or a search-result summary; treat as approximate.
- GitHub star counts were read from the repository pages on 2026-11-16 through an automated page reader; they are rounded and one of them (Blnk) looks suspicious and is flagged.
- Sources dated before 2025 are marked "(older)".

---

## 1. How do the shadcn registry (and its MCP server), Bit / Hope AI, Vercel v0 registries and similar 2025-2026 registries work? Do any cover backend, data and infrastructure? Do pieces carry tests or contracts?

### Takeaway
The shadcn registry became the de facto distribution format for "copied source installed by CLI and by agents over MCP", and since 2025-2026 it can technically carry any file (backend code, env vars, config, even a test setup), but its schema has no concept of tests, verification or contracts, and the real-world backend content is thin and tied to a hosted backend (Supabase, Convex). The registries that do take verification seriously (Bit, Convex Components, Tessl) use the opposite model, a versioned or sandboxed dependency, so nobody was found combining "copied, agent-editable source" with "tests that travel with the piece and must keep passing".

### Cited Findings

**shadcn registry and its MCP server**
- Verified: the registry item schema defines these types: `registry:base`, `registry:block`, `registry:component`, `registry:font`, `registry:lib`, `registry:hook`, `registry:ui`, `registry:page`, `registry:file` ("Use for miscellaneous files", requires `target`), `registry:style`, `registry:theme`, `registry:item` ("Use for universal registry items"). Fields: `dependencies`, `devDependencies`, `registryDependencies`, `files`, `cssVars`, `css`, `envVars`, `docs` (an install-time message), `categories`, `meta` (free key/value). There is no field for tests, verification or contracts. — [shadcn registry-item.json docs](https://ui.shadcn.com/docs/registry/registry-item-json)
- Verified: the docs example distributes a `.env` file via `registry:file`, and `envVars` is documented as "development or example variables. Do NOT use it to add production variables". — [shadcn registry-item.json docs](https://ui.shadcn.com/docs/registry/registry-item-json)
- Verified: CLI 3.0 (August 2025, older than 2026 but the base of the current model) added namespaced registries, private registries, search and an MCP server "for all registries". — [shadcn changelog 2025-08](https://ui.shadcn.com/docs/changelog/2025-08-cli-3-mcp); summary in [LogRocket](https://blog.logrocket.com/shadcn-cli-3-0-update-overview/)
- Verified: consumers declare a namespace in `components.json` (for example `"@acme": "https://acme.com/r/{name}.json"`); registry authors "do not need to do anything special to enable MCP support". Agents can be prompted to list and install namespaced items such as `@internal/auth-form`. — [shadcn MCP docs](https://ui.shadcn.com/docs/mcp); [registry MCP docs](https://ui.shadcn.com/docs/registry/mcp)
- Verified: CLI v4 (March 2026) introduced `shadcn/skills`, context that helps coding agents work with components and registries, and made fonts a first-class registry type. — [shadcn changelog 2026-03](https://ui.shadcn.com/docs/changelog/2026-03-cli-v4)
- Verified: May 2026 added an `include` option to compose large registries from several `registry.json` files and a `shadcn registry validate` command. — [shadcn changelog 2026-05](https://ui.shadcn.com/docs/changelog/2026-05-registry-include)
- Verified (via search summary of the official page): June 2026 added GitHub-hosted registries; the docs state registry items "can include any repository files" and give a testing setup (Vitest config, setup file, team guide) as an example. `registry validate` resolves includes and checks that referenced files exist; it does not run tests. — [shadcn GitHub registry docs](https://ui.shadcn.com/docs/registry/github); [changelog 2026-06](https://ui.shadcn.com/docs/changelog/2026-06-github-registries)
- Secondary: Base UI became the default component library in July 2026, Radix still supported. — [third-party copy of the changelog](https://forceui.public.prd.shared.perforce.com/docs/changelog)
- Secondary (rough adoption signal): a third-party tracker reports the top shadcn agent skill at about 193k installs as of June 2026. — [Skillselion guide](https://skillselion.com/guides/shadcn-ui-component-ownership-2026)
- Verified: there is an official registry directory listing community registries. — [shadcn directory](https://ui.shadcn.com/docs/directory?q=%40ncdai)
- Third-party registries add their own MCP support on top of the same format (examples: marmelab's shadcn-admin-kit, Cult UI, Tailark, shadcnblocks). — [marmelab blog, 2025-08](https://marmelab.com/blog/2025/08/19/shadcn-admin-kit-mcp.html); [Cult UI MCP](https://www.cult-ui.com/docs/mcp-server); [Tailark MCP](https://tailark.com/docs/mcp); [shadcnblocks MCP](https://www.shadcnblocks.com/docs/shadcn-mcp/overview)

**Backend content distributed through the shadcn format**
- Verified: the Supabase UI Library is "a set of components built on top of the shadcn/ui registry system"; a password-based auth block installs with one `npx shadcn@latest add` command, and the docs note that the developer still has to configure the Supabase project, environment variables and redirect URLs afterwards. — [Supabase UI Library intro](https://supabase.com/ui/docs/getting-started/introduction); [Supabase password-based auth docs](https://supabase.com/library/docs/nextjs/password-based-auth.md)
- Secondary (community project, not Convex's own): "Convex UI" ships React components plus Convex functions in one install, is derived from the Supabase UI Library (Apache 2.0), and its realtime and type generation depend on Convex. — [Convex UI docs](https://www.mintlify.com/BankkRoll/Convex-UI)
- A targeted search for a "shadcn for backend" registry with a full-stack or backend-specific block library found no established, widely used one; results were UI component and block registries. — [search result set, e.g. Tailkits registry guide](https://tailkits.com/blog/shadcn-registry/); [21st.dev "registries with a CLI"](https://21st.dev/blog/registries-with-a-cli)

**Vercel v0 and "Open in v0"**
- Verified: a public registry item can be opened in v0 through `https://v0.dev/chat/api/open?url=[URL]`. Open in v0 "does not support `cssVars`, `css`, `envVars`, namespaced registries, or advanced authentication methods". — [shadcn Open in v0 docs](https://ui.shadcn.com/docs/registry/open-in-v0)
- Verified: Vercel publishes a Registry Starter template (Next.js + shadcn/ui) with Open in v0 buttons per component. — [Vercel registry starter](https://vercel.com/templates/next.js/shadcn-ui-registry-starter)
- Vendor docs (read on a mirror host): v0 "automatically uses shadcn/ui components" and warns it is "specifically trained on the default implementations of the shadcn/ui components and may struggle with any customizations"; the docs include an MCP config running the shadcn registry MCP server. — [v0 design systems docs](https://237.v0.build/docs/design-systems); legacy page at [v0.app](https://v0.app/docs/design-systems-legacy)
- Community signal: a Vercel community thread reports Open in v0 failing for shadcn registry blocks ("v0 API preview not supported"), dated February 2026. — [Vercel community](https://community.vercel.com/t/open-in-v0-not-working/33124/10)

**Bit and Hope AI (versioned dependency model, covers backend)**
- Vendor claim: Bit Cloud made Hope AI generally available on 2025-05-28; it is an AI development agent built on Bit's composable platform, "used by more than 500 organizations"; it turns prompts, specs or mockups into "complete composable solutions, from backend systems to UI components" (React, Node.js, TypeScript, MongoDB, GraphQL). — [PR Newswire, 2025-05-28](https://prnewswire.com/il/news-releases/bit-cloud-launches-hope-ai-enabling-developers-to-build-complex-applications-in-a-few-hours-302466854.html)
- Vendor docs: Hope AI first proposes an architecture of components (structure, interfaces, dependencies) and reuses existing versioned components before generating new code; the workflow is prompt, then edit components locally. — [Bit AI-native docs](https://bit.dev/docs/ai-native/)
- Vendor claim: Bit exposes an MCP server so Copilot, Cursor or other agents can use the team's reusable components. — [Product Hunt listing](https://www.producthunt.com/products/hope-ai-by-bit-cloud)
- Verified in Bit docs: testing is a task in every component's build pipeline, run in an isolated "capsule"; test files are selected by glob (`**/*.spec.*`, `**/*.test.*`). — [Bit tester overview](https://bit.dev/reference/testing/tester-overview); [Bit build pipelines](https://bit.dev/reference/build-pipeline/build-pipelines)
- Verified in Bit docs (staging copy): when a component changes, tests of all dependent components run as well "to make sure nothing got broken"; Ripple CI executes each component's build pipeline in the cloud. — [Bit testing during build](https://staging-bit.pages.dev/reference/testing/testing-during-build); [Ripple CI](https://bit.dev/reference/ci/ripple-ci)
- No 2026-specific news on Hope AI adoption was found; coverage is mostly from 2025. — [Bit 10-year blog](https://bit.dev/blog/telling-the-bit-story-celebrating-10-years-of-composability)

**Convex Components (sandboxed backend pieces, hosted-backend-specific)**
- Verified: Convex Components are "independent, modular, TypeScript building blocks for your backend", installed from npm (`@convex-dev/` scope), each with its own schema, functions and isolated tables; they "can't read your app's tables or call your app's functions unless you pass them in explicitly", so "installing them is always safe". Examples: aggregate, action cache, sharded counter, rate limiter, migrations, Stripe billing, LaunchDarkly sync. — [Convex components docs](https://docs.convex.dev/components); [Convex components directory](https://www.convex.dev/components); [Convex blog on backend components](https://stack.convex.dev/backend-components)
- Verified caveat: the authoring APIs for building your own components were described as still changing and not fully documented. — [Convex components docs](https://docs.convex.dev/components/understanding)

**Agent-facing registries of skills, specs and plugins (instructions, not application code)**
- Vendor claim: Tessl launched its Spec Registry in open beta on 2025-09-16 with "more than 10,000" pre-built specs (usage specs for open-source libraries). — [Tessl launch post](https://tessl.io/blog/tessl-launches-spec-driven-framework-and-registry/)
- Secondary: in January 2026 Tessl repositioned the registry as a skills registry (versioned, evaluated bundles of instructions, docs and rules installed with `tessl install`), a third-party review counts "3,000+" public skills as of June 2026, says evals were published across about 300 public tiles, that a Snyk partnership (March 2026) attaches a security score to public skills, and that the full Tessl Framework was still in closed beta. The 10,000 and 3,000 figures measure different things and are unreconciled. — [CodeMySpec review of Tessl, 2026](https://codemyspec.com/blog/tessl-review)
- Secondary, low confidence (third-party blogs, attribution of each number to a specific page not checked): skills.sh is a Vercel-run open directory and install channel for agent skills launched in early 2026, supporting many agents (one blog says 19, including Claude Code, Cursor, Codex, Copilot); install counts are aggregated across agents. — [virtualuncle.com overview](https://virtualuncle.com/agent-skills-marketplace-skills-sh-2026/); [mejba.me](https://www.mejba.me/blog/skills-sh-claude-code-agents); [dev.to](https://dev.to/nishilbhave/claude-skills-marketplace-skillssh-shipping-your-own-skill-9a5)
- Secondary, low confidence: AgentSkill.sh, a separate directory, claims "107,000+" agent skills. — [moge.ai listing](https://moge.ai/product/agentskillsh)
- Verified existence: a community "verified registry for AI coding agents" (Sigistry marketplace) advertises "security-checked plugins and portable SKILL.md skills" with an "open eight-check methodology"; its checks concern security and structure, not functional acceptance tests. — [GitHub: monitoringevaluationstudio/marketplace](https://github.com/monitoringevaluationstudio/marketplace)
- Vertical platforms now publish agent skills for their own customization model: Spree publishes `spree/agent-skills` (for example a decorators skill), Convex publishes `convex-agent-plugins` (a components guide), and third parties publish Medusa module skills. — [skills.sh: spree-decorators](https://www.skills.sh/spree/agent-skills/spree-decorators); [skills.sh: convex components-guide](https://www.skills.sh/get-convex/convex-agent-plugins/components-guide); [skills.sh: medusa-modules](https://www.skills.sh/orcaqubits/agentic-commerce-claude-plugins/medusa-modules)
- Verified: Lago ships an MCP server and "Agent SDKs" (MIT, separate repositories) next to its AGPL core. — [GitHub: getlago/lago](https://github.com/getlago/lago)
- Verified: SaaS Pegasus now ships agent skills, including an `/upgrade-pegasus` skill for Claude Code that performs the boilerplate upgrade (requires `pegasus-cli` 0.12+). — [SaaS Pegasus upgrading docs](https://docs.saaspegasus.com/upgrading/)

### Inferences
- The distribution mechanics the idea describes (CLI in the style of `npx shadcn add`, private and namespaced registries, an MCP server so the developer's own agent searches and installs, agent skills shipped by the registry owner) already exist and are standardized by shadcn. Building a new registry protocol would be redoing solved work; the open question is the content and the verification layer, not the transport.
- The shadcn format is capable of carrying backend files, but it has three structural limits for the idea: (1) it is file-copy with no notion of a database migration, a tenant-scoping rule or a service contract; (2) there is no tests or verification field, only a free-form `meta`; (3) the ecosystem is JavaScript/React-centred, while the idea is Go or Rust. A Go/Rust catalog could reuse the JSON shape and CLI conventions but not the content.
- Where backend pieces are distributed through the shadcn format today (Supabase UI Library, Convex UI), they are thin UI + glue for a hosted backend; the hard part (data model, auth, RLS) lives in the hosted service, and the docs admit manual configuration remains after install.
- Three different answers to "how do I trust a reused piece" exist, none of them the idea's answer: Bit (versioned components whose tests and dependents' tests run on every change), Convex (runtime sandbox, so a component cannot corrupt host data), Tessl (evals of whether the agent follows the instructions). All three keep the piece out of the developer's editable source tree. The idea's bet (copied source + gauge tests that survive customization) is a fourth option that was not found in production anywhere.
- Skills registries grew very fast in 2026 (thousands to 100k+ listed items, by vendor and third-party counts), which suggests the scarce asset is not "a catalog" but curation and proof that an item works. That supports the "verified" part of the idea and weakens any plan that relies on catalog size as the differentiator.
- Bit's Hope AI is the closest existing product to "an agent assembles an app from a catalog of reusable backend + frontend pieces". Differences: it is a commercial cloud platform, Node/React-centred, pieces are versioned dependencies, and the assembler is Bit's own agent rather than the developer's (although an MCP server exists).

### Gaps
- No independent adoption numbers for Hope AI in 2026 were found; the "500 organizations" figure refers to Bit's platform and is a 2025 vendor claim.
- The exact count of registries in the shadcn directory and how many include backend code was not obtained.
- Whether any third-party shadcn registry systematically ships test files next to each block was not established; the official docs only show that it is possible.
- skills.sh numbers (total skills, launch date) come from third-party blogs with inconsistent dates; Vercel's own documentation was not read.
- Claude Code plugin marketplaces were not measured (count, share of plugins that install application code rather than instructions).
- jsrepo, 21st.dev's registry and other shadcn-like registries were not examined in detail.

---

## 2. What open-source vertical building blocks already exist, how mature are they, and are any packaged as composable modules installable into a host app?

### Takeaway
Mature open-source building blocks exist for fintech and for commerce, and LiveKit dominates open-source real-time video, but almost all of them are consumed as a separate service behind an API rather than as source installed into a host application; Medusa's commerce modules are the main exception, and they are npm dependencies for Node. No open-source live-shopping platform was found, so "live commerce" as a blueprint would be a combination nobody has packaged, built from parts that all already exist.

### Cited Findings

**Fintech**
- Hyperswitch (Juspay): Apache-2.0, about 45.8k GitHub stars, Rust. The README says each payments module is independent and can be added to an existing stack: Vault, Intelligent Routing, Revenue Recovery, Reconciliation; the decision engine is "Standalone, works with any orchestrator"; the Prism connector library can be used without the full switch. — [GitHub: juspay/hyperswitch](https://github.com/juspay/hyperswitch)
- Vendor claims: Juspay relaunched Hyperswitch as a modular open-source payments platform with US, Europe and UK expansion in March 2025; Juspay cites a roughly $1.2B valuation. Hyperswitch Prism (integration library) launched 2026-05-12. — [Hyperswitch press post](https://hyperswitch.io/blog/juspay-hyperswitch-open-source-payments-platform-expands-to-us-europe-and-uk); [Hyperswitch about](https://hyperswitch.io/about); [Product Hunt: Hyperswitch Prism](https://www.producthunt.com/products/hyperswitch-2/launches/hyperswitch-prism)
- Lago: AGPL-3.0 core, about 10.9k stars; "Open Source Metering and Usage Based Billing API"; consumed as a service (Lago Cloud or self-hosted, usually Docker Compose) with REST API, webhooks and SDKs; MCP server and Agent SDKs under MIT in separate repositories; positioned for AI products billing on tokens or compute. — [GitHub: getlago/lago](https://github.com/getlago/lago)
- TigerBeetle: Apache-2.0, about 17.4k stars; "The financial transactions database designed for mission critical safety and performance"; consumed as a database binary/cluster with clients. — [GitHub: tigerbeetle/tigerbeetle](https://github.com/tigerbeetle/tigerbeetle)
- Formance Ledger: MIT, about 1.5k stars on the ledger repository; "The programmable open source core ledger for fintech"; the README describes Ledger v3 as a distributed system using Raft, with Numscript transaction scripting, idempotency keys and bulk operations; consumed as a networked service (HTTP on 9000, gRPC on 8888), not as an embeddable library. — [GitHub: formancehq/ledger](https://github.com/formancehq/ledger)
- Blnk: Apache-2.0; "an open-source ledger & financial core for shipping fintech products fast"; double-entry ledger with balance monitoring, inflight and scheduled transactions, reconciliation and identity management with PII tokenization; primarily a self-hosted service or Blnk Cloud. The automated page read returned 597 stars, which may be a misread and should be rechecked. — [GitHub: blnkfinance/blnk](https://github.com/blnkfinance/blnk)
- Apache Fineract: the ASF release catalog lists version 1.15.0 released 2026-07-14, so the project is actively released; it is a core-banking platform (the engine behind Mifos). — [ASF release catalog: Fineract](https://release-catalog.apache.org/fineract/index.html); [Fineract docs 1.15.0](https://fineract.apache.org/docs/1.15.0-WIP/)
- Secondary: Fineract is described as recognized as a Digital Public Good. — [BaaSflow on LinkedIn](https://linkedin.com/company/baasflow)
- Moov: "Moov creates open source infrastructure for financial technology"; Go libraries such as `ach` (about 574 stars), `iso8583` (about 540, Apache-2.0), `watchman` sanctions screening (about 522, Apache-2.0), `fed`, `imagecashletter`, `achgateway`; 69 repositories in total. These are importable Go libraries and small services, the closest thing in fintech to "pieces a Go host app links in". — [GitHub: moov-io](https://github.com/moov-io)
- Secondary market framing: Formance and Blnk are programmable ledgers aimed at application developers, TigerBeetle is a lower-level transactions database on which ledger logic is built; TigerBeetle's "up to 1,000x" throughput figure is a vendor claim. — [Ledger-as-a-service overview, banq.ai](https://www.banq.ai/embedded-finance/category/ledger-as-a-service); [Apideck on money-movement infrastructure](https://apideck.com/blog/money-movement-infrastructure-fintech-ledger-as-a-service)

**Commerce**
- Medusa: about 37.3k stars; open-core, MIT core plus an `ENTERPRISE-LICENSE.md` for RBAC-based Enterprise Edition material; modules split into Commerce Modules (product, cart, order, pricing, payment and more) and Infrastructure Modules (event bus, caching, file, locking, workflow engine), with Module Providers (Stripe, S3) plugging in; "commerce modules are open-source and freely available on npm". — [GitHub: medusajs/medusa](https://github.com/medusajs/medusa)
- Verified: Medusa's docs state Commerce Modules can be used outside a Medusa application, in a serverless app such as Next.js or any Node.js project, by installing them as npm packages. — [Medusa commerce modules docs](https://docs.medusajs.com/v2/resources/commerce-modules)
- Vendor claim (v2 release, 2024, older): Medusa 2.0 removed database-level dependencies between commerce modules so a team can adopt only some modules. — [Medusa v2 release post](https://medusajs.com/blog/v2-release)
- Verified: Medusa publishes "recipes" for vertical use cases: Marketplace, Subscriptions, Digital Products, ERP integration, B2B, Bundled Products, Commerce Automation, Ecommerce, Multi-Region Store, Omnichannel, OMS, Personalized Products, POS. They are described as guides with example implementations. Live shopping or streaming is not among them. — [Medusa recipes](https://docs.medusajs.com/resources/recipes)
- Funding (older): the last round found is an $8M seed in July 2022, close to $9M total with pre-seed. No 2025-2026 round was confirmed. — [TechCrunch, 2022](https://techcrunch.com/2022/07/15/medusa-shopify-open-source-e-commerce-javascript-developers); [Medusa seed announcement](https://medusajs.com/blog/announcement-8m-usd-seed-round-to-build-the-leading-ecom-platform-for-devs/)
- Ecosystem signal: Mercur is a multi-vendor marketplace platform built on Medusa. — [21st.dev listing](https://21st.dev/community/apps/mercur)
- Vendure: moved from MIT to GPLv3 with v3.0 (announced 2024, older); v2.3 was the last MIT release; a commercial licence and a paid "Vendure Platform" exist; a licence-guard plugin is documented. — [Vendure license change announcement](https://vendure.io/blog/license-change-announcement); [Vendure v2.3/v3.0 announcement](https://vendure.io/blog/announcing-vendure-v2-3-v3-0); [Vendure license guard docs](https://docs.vendure.io/current/platform/platform/license-guard)
- Secondary: Vendure about 8.2k stars, v3.7.0 dated 2026-07-01; a 2026 technical roadmap is published. — [dev.co snapshot](https://dev.co/ecommerce/open-source/vendure); [Vendure roadmap 2026](https://www.vendure.io/blog/vendure-technical-roadmap-2026)
- Saleor: BSD-3-Clause; roughly 21.5k to 23.3k stars depending on the snapshot (secondary); extended through webhooks and separately running "apps". — [Saleor extending overview](https://docs.saleor.io/developer/extending/overview); [dev.co snapshot](https://dev.co/ecommerce/open-source/saleor); [ideaproof snapshot, Aug 2026](https://ideaproof.io/open-source/project/saleor)
- Competitor-sourced, treat with caution: a Swell page counts 28 apps in Saleor's official App Store as of August 2026. — [Swell on Saleor limitations](https://www.swell.is/content/saleor-limitations)
- Spree (Rails engine based) remains active with a REST API, TypeScript SDK and Next.js storefront, and publishes agent skills. — [SelfHost Hub: Spree](https://selfhost-hub.pages.dev/en/spree-commerce); [skills.sh: spree agent skills](https://www.skills.sh/spree/agent-skills/spree-decorators)

**Live video and streaming**
- LiveKit: server is Apache-2.0, about 22.2k stars, Go, built on Pion; "open source platform for building voice, video, and AI agents"; a distributed WebRTC SFU deployed as a binary, Docker or Kubernetes, or LiveKit Cloud; client SDKs for browser, Swift, Android, Flutter, React Native, Rust, Unity and more; server SDKs for Node, Go, Ruby, Java/Kotlin, Python, Rust; UI component kits for React, Compose, SwiftUI, Flutter; plus Egress, Ingress and SIP. — [GitHub: livekit/livekit](https://github.com/livekit/livekit)
- LiveKit raised a $100M Series C at a $1B valuation, announced 2026-01-22, led by Index Ventures. — [TechCrunch, 2026-01-22](https://www.techcrunch.com/2026/01/22/voice-ai-engine-and-openai-partner-livekit-hits-1b-valuation/); [SiliconANGLE](https://siliconangle.com/2026/01/22/livekit-raises-100m-1b-valuation-scale-real-time-ai-media-platform/)
- Unconfirmed: private-market data sites list a $40M "Series C-1" in August 2026 at about $1.45B that had not been announced. — [multiples.vc](https://multiples.vc/private-comps/livekit); [premieralts](https://www.premieralts.com/companies/livekit/funding-rounds)
- Owncast: MIT, self-hosted single-streamer live video and chat server; about 11.6k stars and a 0.3.0 release dated 2026-09-03 per third-party snapshots; the trademark policy restricts use of the name and logo. — [ideaproof snapshot](https://ideaproof.io/open-source/project/owncast); [dev.co snapshot](https://dev.co/devops/open-source/owncast); [Owncast trademark policy](https://owncast.online/trademark)
- Ant Media Server: about 4.7k stars; the repository carries separate `COMMUNITY_EDITION_LICENSE` and `ENTERPRISE_EDITION_LICENSE` files; README: "Choose Community for essentials or Enterprise for advanced features & support"; Enterprise has a 14-day trial. — [GitHub: ant-media/Ant-Media-Server](https://github.com/ant-media/Ant-Media-Server)
- A search for an open-source live-shopping or live-commerce platform, or a LiveKit-based commerce template, returned only general self-hosted e-commerce platforms (Spree, Medusa, Bagisto, Mercur and others); none is described as supporting live streaming or live shopping. — [uideck list of self-hosted e-commerce, 2026](https://uideck.com/blog/self-hosted-ecommerce-solutions); [dev.co open-source e-commerce index](https://dev.co/ecommerce/open-source)

### Inferences
- Packaging model summary (my classification from the findings above):

| Project | License | How it is consumed | Installable into a host app as a module? |
|---|---|---|---|
| Hyperswitch | Apache-2.0 | Service(s), Rust; modules adoptable independently | No (separate services), but modular |
| Lago | AGPL-3.0 | Service + API, MCP server | No |
| TigerBeetle | Apache-2.0 | Database cluster + clients | No |
| Formance Ledger | MIT | Service (HTTP/gRPC) | No |
| Blnk | Apache-2.0 | Service + API | No |
| Fineract | Apache-2.0 (ASF project) | Core-banking server | No |
| Moov libraries | mostly Apache-2.0 | Go libraries + small services | Yes, as Go dependencies (low-level file formats, not product features) |
| Medusa modules | MIT core, open-core | npm packages, usable standalone in Node | Yes, as versioned dependencies (Node only) |
| Vendure | GPLv3 / commercial | Node server + plugins | Plugins only inside Vendure |
| Saleor | BSD-3-Clause | Python server + external apps over webhooks | No |
| LiveKit | Apache-2.0 | Media server + SDKs + UI kits | SDKs and UI kits are dependencies; the server is separate |
| Owncast | MIT | Standalone server | No |
| Ant Media | dual CE / EE | Media server | No |

- The dominant pattern for hard verticals is "run it as a service and call its API". There are good reasons: money and media have operational invariants (consistency, latency, compliance) that vendors do not want mixed into an arbitrary host schema. A fintech "piece" that is copied source the agent may edit is in direct tension with that; a realistic fintech blueprint would more likely be thin, tested adapters around Hyperswitch, Lago, TigerBeetle or Formance than a reimplementation.
- The idea does better than these projects on one axis only: a single stack with one data model, one auth and one tenancy model across verticals. Each project above brings its own database, auth and tenancy concept, and integrating three of them is the real cost. It does worse on depth: Hyperswitch, LiveKit, Medusa and TigerBeetle each represent years of full-time work and cannot be matched by catalog pieces.
- Medusa is the strongest prior art for "vertical = combination of modules + recipe". Its recipes are written guides, not installable units, which suggests that even the project best positioned to ship installable blueprints chose documentation plus an agent/developer doing the assembly. That is weak evidence that installable blueprints are either hard to keep correct or not demanded; I found no statement from Medusa explaining the choice.
- Live commerce appears unoccupied in open source as a packaged product. That is an opening, but also a warning: the components (LiveKit, a commerce engine, a payments orchestrator) are separately mature, and the absence of a packaged combination may reflect low demand for self-hosted live shopping rather than difficulty.
- Licences matter for a catalog that copies source: AGPL (Lago), GPLv3 (Vendure) and dual-licensed editions (Ant Media, Medusa EE parts) cannot be vendored as copied pieces without licence consequences; Apache/MIT projects (Hyperswitch, TigerBeetle, Formance, Blnk, Moov, LiveKit, Owncast) can be wrapped.

### Gaps
- Medici-style ledgers (the Node/Mongo `medici` library and similar embeddable double-entry libraries) were not researched; no source was collected.
- Blnk's star count needs a manual recheck; the value read (597) may be wrong.
- Latest release versions and dates could not be read from the GitHub pages for Medusa, Hyperswitch, Formance, Lago, TigerBeetle, LiveKit and Ant Media.
- No confirmed 2025-2026 funding round for Medusa was found; one aggregator headline mentions a Series A figure that I could not verify and did not use.
- Ant Media's exact community licence terms and edition feature split were not read.
- Mifos/Fineract production adoption numbers were not found.
- Whether Hyperswitch, Formance or Blnk publish official agent skills or MCP servers was not checked (Lago does).
- Proprietary live-shopping SaaS and LiveKit example apps were not surveyed.

---

## 3. What is the track record of feature-level reuse inside one framework (Django reusable apps, Rails engines, Laravel packages/Spark/Jetstream, JHipster blueprints, Amplication plugins, Medusa modules, Bullet Train)? What made customization hard?

### Takeaway
The historical record is consistent across ecosystems: feature-level pieces delivered as a dependency are easy to update and hard to customize (overrides, decorators and monkey patches break on upgrade), and pieces delivered as generated or copied code are easy to customize and effectively never updated. Over 2020-2025 the major frameworks (Phoenix, Rails 8, Laravel 12) moved their own auth and starter features from the dependency model to the generated-code model, accepting the loss of updates.

### Cited Findings

**Django reusable apps and Pinax**
- (older, 2010) A django-users thread titled "Why Django Apps Suck" argues apps are "hard to reuse with minor modifications (extensions)", that hard-coded choices such as authorization decorators on views tie policy into the app and make it non-reusable, and asks where project-specific modifications should live; replies defend the model and recommend contributing customization points upstream. — [django-users thread](https://groups.google.com/g/django-users/c/Iodf0ofQqoE); [mail archive of a reply](https://go.mail-archive.com/django-users@googlegroups.com/msg108303.html)
- (older, 2010) A DjangoCon US talk, "Rethinking the reusable application paradigm", argued that the common wisdom about what makes an app reusable was not accurate. — [pyvideo: DjangoCon 2010](https://pyvideo.org/djangocon-us-2010/djangocon-2010--rethinking-the-reusable-applicati.html)
- (older, 2010) "Everything I hate about Mingus": lessons from a blog engine assembled from 30+ reusable apps and the obstacles of depending on that many. — [djangoadvent article](https://github.com/djangoadvent/djangoadvent-articles/blob/master/1.2/05_everything-i-hate-about-mingus.rst)
- (older) Practitioner posts document forking as the routine escape hatch for reusable apps. — [Lincoln Loop: Reusable Django apps and forking](https://lincolnloop.com/blog/reusable-django-apps-and-forking/)
- (older, 2017) DjangoCon Europe talk "Qualities of great reusable Django apps" opens from the premise that writing any reusable code is difficult. — [pyvideo: DjangoCon Europe 2017](https://pyvideo.org/djangocon-europe-2017/qualities-of-great-reusable-django-apps.html)
- Pinax (older): started in 2008 to abstract recurring patterns into "reusable Pinax starter projects, apps, and themes". Maintainers later said that once Django itself supported project templates "there is no longer a need for Pinax's version of the infrastructure", and that the idea "that you could download Pinax ... is no longer true"; it became a loose ecosystem of apps and starter projects. Users asked whether it had stopped and noted it had fallen behind Django. — [Pinax history](https://katherinemichel.gitbooks.io/pinax-tutorial/what_is_pinax.html); [pinax-users: future of Pinax](https://groups.google.com/g/pinax-users/c/OvB4sB87Nr4); [pinax-users: is Pinax stopped?](https://groups.google.com/g/pinax-users/c/G-9G9Q3wpsc)
- (older, 2015) Pinax maintainers' own lesson: "reusability isn't always just at the level of an individual app. Often what's reusable is a collection of apps wired together in a particular way." — [Pinax blog, Nov 2015 hangout recap](https://blog.pinaxproject.com/2015/11/25/recap-november-pinax-hangout)

**Rails engines (Spree, Solidus) and Rails 8**
- Spree's current docs: "Decorators should be a last resort. They tightly couple your code to Spree internals and can break during upgrades." — [Spree decorators docs](https://spreecommerce.org/docs/developer/customization/decorators.md)
- Solidus: decorator autoloading (`*_decorator.rb`) stopped working by default from 3.2; the guides warn that core classes may change with each release and that decorators should be tested before upgrading. — [Solidus decorators guide](https://legacy-guides.solidus.io/developers/customizations/decorators); [Solidus monkey patches guide](https://legacy-guides.solidus.io/developers/customizations/monkey_patches)
- Shopify engineering on the general mechanism: monkey patches break on upgrades when the patched API changes, and are often discovered only during an upgrade or an incident "with no clear path towards removal". — [Shopify: The case against monkey patching](https://shopify.engineering/the-case-against-monkey-patching)
- Rails 8 ships an authentication generator that writes sessions, login and password-reset code into the app instead of depending on Devise; a widely repeated quote attributed to the Rails creator is "Rails 8 is not going to ship with Devise. It's not going to ship with a black box security" (quoted by a third-party blog; original wording not verified). The generator's scope is deliberately small (login, password reset); Devise keeps about ten modules (confirmable, lockable, timeoutable and others). — [Codeminer42: Rails 8.0 is out](https://blog.codeminer42.com/rails-8-0-is-out/); [Saeloun, 2025-05](https://blog.saeloun.com/2025/05/12/rails-8-adds-built-in-authentication-generator/); [dev.to comparison](https://dev.to/zilton7/rails-8-built-in-auth-vs-devise-why-the-default-finally-wins-2g2n)

**Phoenix `phx.gen.auth` (the explicit design decision)**
- (older, 2020) The generator's docs: because it writes code into the application, "you have complete freedom to modify the authentication system", and "upgrading the library version does not change your application's existing auth logic". — [phx_gen_auth overview](https://hexdocs.pm/phx_gen_auth/overview.html)
- (older, 2020) The stated drawback in the design thread: generated code cannot easily be updated when the template changes, and developers can edit security-sensitive generated code unsafely. — [Elixir Forum: an upcoming authentication solution for Phoenix](https://elixirforum.com/t/an-upcoming-authentication-solution-for-phoenix/30255)
- (older) Practitioner framing: "The best authentication framework is no framework at all(?)", generated code removes hidden complexity because it is visible. — [Simple Thread](https://www.simplethread.com/the-best-authentication-framework-is-no-framework-at-all/)

**Laravel (Breeze, Jetstream, new starter kits)**
- Verified (2025-03-19): Laravel replaced Breeze and Jetstream with three starter kits (Livewire, React, Vue). "Jetstream and Breeze were packages that published files into an existing application"; the new kits are "cloneable repositories where you own all the code from day one"; "Since all code lives directly in your application, customization is more straightforward without worrying about package updates." The React and Vue kits use shadcn/ui. At launch they had feature parity with Breeze only; "Jetstream is popular for its built-in teams functionality", and teams and 2FA were described as planned ("soon"). — [Laravel blog: starter kits](https://laravel.com/blog/laravel-starter-kits-a-new-beginning-for-your-next-project)
- Verified: the Jetstream repository states it is for Laravel 11.x and prior and points to the new starter kits. — [GitHub: laravel/jetstream](https://github.com/laravel/Jetstream)

**JHipster (generator + blueprints, with a real upgrade mechanism)**
- Verified: `jhipster upgrade` regenerates the application with the new generator version on a dedicated `jhipster_upgrade` branch and merges it into the working branch; "you need to proceed with resolving merge conflicts if there are any"; the docs advise never committing on the upgrade branch and raising Git's rename limit for large renames, and recommend the "side-by-side" practice (keep custom code in separate files from generated code) to reduce conflicts. — [JHipster: upgrading an application](https://jhipster.tech/upgrading-an-application)
- Verified: blueprints are JHipster's plugin mechanism (since v7.9.0 "modules are blueprints with stand-alone generators"); official blueprints include Kotlin, NestJS, React Native, Ionic, Quarkus, Svelte and jOOQ (page may be dated). — [JHipster: extending and customizing](https://www.jhipster.tech/modules/extending-and-customizing); [JHipster official blueprints](https://www.jhipster.tech/modules/official-blueprints)
- Multi-step upgrades are required across majors (for example reach 7.9.4 before v8) with conflict resolution and passing tests at each step. — [generator-jhipster upgrade README](https://cdn.jsdelivr.net/npm/generator-jhipster@9.0.0/dist/generators/upgrade/README.md)

**Amplication (plugins for generated backends)**
- Amplication's plugin system let plugins hook into the code-generation engine to add features or change generated behaviour. — [Amplication on dev.to](https://dev.to/amplication/the-amplication-plugin-system-1ndp); [GitHub: amplication/amplication](https://github.com/amplication/amplication)
- Secondary (aggregators, to be verified on the vendor's site): the open-source generator is described as in maintenance mode while the team builds "Overcut", a platform for agent-driven SDLC workflows, and amplication.com is reported to redirect to overcut.ai. — [opensourcealternatives.to: Amplication](https://www.opensourcealternatives.to/item/amplication); [everydev.ai: Amplication](https://www.everydev.ai/developers/amplication)

**Blitz.js recipes (codemod-style installers)**
- Blitz recipes are "predefined formulas for adding npm dependencies or other code to your application", run with `blitz install`, "unversioned and pulled directly from GitHub". The legacy site carries the banner that Blitz pivoted to a framework-agnostic toolkit; the hope that upgrades could be done through recipes was stated as an aspiration. — [Blitz: using recipes](https://blitzjs.com/docs/using-recipes); [Blitz legacy: writing recipes](https://legacy.blitzjs.com/docs/writing-recipes)

**Bullet Train (hybrid: gems + starter repo + eject)**
- Bullet Train is an MIT-licensed Rails SaaS framework with a paid Pro tier; a third-party index showed about 1.76k stars. — [bullettrain.co](https://bullettrain.co/); [ecosyste.ms snapshot](https://awesome.ecosyste.ms/projects/github.com%2Fbullet-train-co%2Fbullet_train)
- Verified: upgrades are "stepwise" (one version at a time, run tests, deploy), either via a GitHub Action that opens an upgrade pull request or manually by fetching the starter repo and running `git merge <version tag>`; gem versions are kept in sync with the starter repo. Conflicts appear where the developer changed starter defaults; `Gemfile.lock` conflicts "can be the most frustrating to resolve"; and ejected views "need to be updated although no merge conflicts arose from `git merge`", so they must be compared by hand against the core. — [Bullet Train upgrade docs](https://bullettrain.co/docs/upgrades)

**Medusa modules and Convex components (current-generation isolation)**
- Medusa 2.0 removed database-level dependencies between commerce modules (vendor claim, older) and publishes modules as npm packages. — [Medusa v2 release post](https://medusajs.com/blog/v2-release); [Medusa commerce modules docs](https://docs.medusajs.com/v2/resources/commerce-modules)
- Convex components isolate each piece's tables and functions from the host. — [Convex components docs](https://docs.convex.dev/components)

### Inferences
- What made customization hard, across all cases, reduces to four causes: (1) the piece hard-codes a policy the host needs to change (permissions, user model, URL structure); (2) the extension points the author anticipated are not the ones the user needs, so users fork, decorate or monkey-patch; (3) pieces assume a shared schema and shared user/tenant model, so combining many pieces creates coupling the framework does not manage (Mingus, Pinax); (4) the maintainer burden of keeping N pieces current with the framework grows faster than the contributor base (Pinax fell behind Django).
- What worked: small, narrowly scoped pieces with stable interfaces (auth libraries, payment adapters), pieces the framework's own team maintains, and "generate once, own forever" for anything with heavy UI or policy. The framework vendors' convergence on generated/owned code is the strongest signal in this section, and it predates coding agents.
- Pinax is the closest historical analogue to "one catalog of pieces + starter projects that combine them" and its trajectory is the base rate the idea must beat: early enthusiasm, then the host framework absorbed the valuable infrastructure and the catalog decayed. The maintainers' lesson that the reusable unit is often "a collection of apps wired together" supports the blueprint concept, and warns that the wiring is where the value and the maintenance cost are.
- The idea's proposed answer to the dilemma (copied code, plus tests that travel with the piece as a gauge, plus an agent that does the customization and the later merges) attacks cause (2) and the update problem at once. Two existing data points make this plausible but unproven: JHipster and Bullet Train already rely on "regenerate/merge, then run tests", and SaaS Pegasus now delegates the upgrade merge to a coding agent. None of them ship per-piece acceptance tests as the contract.
- Amplication's reported retreat to maintenance mode is a caution for "catalog of backend plugins for generated code" as a business; the cause is not documented in the sources I read, so no causal claim is made.
- Cause (3) is where a single-stack framework with built-in tenancy has a real structural advantage over Django apps and Rails engines: if every piece is written against one mandatory tenant and auth model, the cross-piece coupling problem is designed out instead of left to convention. Bullet Train is the existing proof that this works inside one framework.

### Gaps
- Laravel Spark's specific model (billing portal shipped as a Composer package) and its history with Jetstream teams were not sourced; no claim is made.
- No maintainer post-mortem of Pinax was read in full (the "Pinax lessons learned" talks were only seen as titles).
- No first-hand 2025-2026 account of JHipster v9 upgrade pain was found; experience reports are from older versions.
- Rails engines beyond Spree/Solidus (for example Devise as an engine, admin engines) were not covered.
- Blitz's reasons for pivoting away from a framework were not read; no causal link to recipes is claimed.
- Template-update tools (Copier's `copier update` three-way merge, cruft) and Angular `ng add` schematics were not researched and would be relevant prior art for updating copied code.
- Amplication's status must be confirmed on the vendor's own site.

---

## 4. Which SaaS starter kits include multitenancy by default, and how do they handle updates after the buyer has modified the code?

### Takeaway
Multitenancy as "organizations/teams with members and roles" is now standard in the paid kits (Makerkit, Supastarter, SaaS Pegasus, Bullet Train), and every one of them handles updates the same way: the buyer's project is a fork, and updating means a git merge or rebase from upstream with manual conflict resolution whose cost grows with customization. The only real mitigations found are procedural (small incremental PRs, LTS branches, stepwise upgrades) and, in one case, an agent skill that performs the merge.

### Cited Findings

**Makerkit (commercial, Next.js/React Router/TanStack + Supabase, Prisma or Drizzle)**
- Verified: the database "supports two types of accounts", personal and team accounts, for B2C and B2B; by default any user can create team accounts, and policies can restrict creation (for example to subscribers). — [Makerkit database architecture](https://makerkit.dev/docs/next-supabase-turbo/development/database-architecture); [Makerkit team account creation policies](https://makerkit.dev/docs/md/next-supabase-turbo/recipes/team-account-creation-policies)
- Verified: updates come by pulling from an `upstream` git remote; the docs recommend merging rather than rebasing, then reinstalling dependencies. — [Makerkit updating the codebase](https://makerkit.dev/docs/next-supabase-turbo/installation/updating-codebase)
- Verified: the v4 major migration "is delivered as 9 incremental PRs, each merged in order. Every PR is a self-contained step — your app should build and run after each one"; estimated 2-4 hours for light customization; v3 remains as an LTS branch; the v3 guide estimated 3-6 hours for heavy customization. — [Makerkit v4 migration](https://makerkit.dev/docs/next-supabase-turbo/installation/v4-migration); [Makerkit v3 migration](https://makerkit.dev/docs/next-supabase-turbo/installation/v3-migration)

**Supastarter (commercial, Next.js and Nuxt)**
- Verified: "a premium starter kit available under a commercial license. It is not open source in the traditional sense, but you own the code and can modify it freely." — [Supastarter docs](https://supastarter.dev/docs/nextjs.md)
- Vendor claim: ships organizations out of the box (teams, invitations, roles); multitenancy can be required, hidden or disabled by configuration. — [Supastarter multi-tenancy template](https://supastarter.dev/nextjs-multi-tenancy-template)
- Verified: update is `git pull upstream main --allow-unrelated-histories --rebase` with conflicts resolved by hand; the docs say each change you make makes the codebase harder to update because you are effectively rebasing your code on the latest supastarter code. The Nuxt docs also mention an `npx supastarter update` command. — [Supastarter: updating the codebase (Next.js)](https://supastarter.dev/docs/nextjs/codebase/update.md); [Supastarter: update (Nuxt)](https://supastarter.dev/docs/nuxt/codebase/update)

**SaaS Pegasus (commercial, Django)**
- Verified: four upgrade paths: (1) an AI-agent path, running the `/upgrade-pegasus` skill in Claude Code (needs GitHub integration and `pegasus-cli` 0.12+), with the instruction to "review the code changes carefully before merging"; (2) a GitHub pull request generated from the Pegasus download page, merged with a merge commit (not squash or rebase); (3) a manual "pure Pegasus" branch merged into main; (4) git patches applied with `--reject`, leaving `.rej` files to resolve. — [SaaS Pegasus upgrading docs](https://docs.saaspegasus.com/upgrading/)
- Verified: merge conflicts are described as the most time-consuming part; advice includes enabling `git rerere`, keeping your own migration history and re-running `makemigrations`, accepting Pegasus's lock files and regenerating, and rebuilding bundled static files. — [SaaS Pegasus upgrading docs](https://docs.saaspegasus.com/upgrading/)
- Secondary: Pegasus offers an optional teams/organizations model for multi-tenant apps. — [SaaSykit comparison of starter kits](https://saasykit.com/blog/best-laravel-multi-tenant-saas-starter-kits-for-2025)

**Bullet Train (open source MIT core + paid Pro, Rails)**
- Verified: hybrid model, a starter repo the team owns plus framework gems; upgrade by merging the upstream tag one version at a time (or a GitHub Action that opens the PR); ejected views are not covered by git conflict detection and must be compared manually. — [Bullet Train upgrade docs](https://bullettrain.co/docs/upgrades); [bullettrain.co](https://bullettrain.co/)

**Laravel first-party and ecosystem**
- Verified: Jetstream was "popular for its built-in teams functionality"; the new first-party kits (March 2025) launched without teams, with teams listed as planned. — [Laravel blog: starter kits](https://laravel.com/blog/laravel-starter-kits-a-new-beginning-for-your-next-project)
- Vendor claims: SaaSykit Tenancy sells a multi-tenant Laravel starter where each tenant (organization) has its own users, subscriptions and settings. — [Laravel News partner post: SaaSykit Tenancy](https://laravel-news.com/index.php/build-your-multi-tenant-saas-app-in-days-with-saasykit-tenancy)

**JHipster (open source, for comparison)**
- Verified: the only starter found with a tool-driven regeneration upgrade (`jhipster upgrade` on a dedicated branch, then merge). — [JHipster: upgrading an application](https://jhipster.tech/upgrading-an-application)

**Open-source SaaS starters**
- Open SaaS (Wasp-based, open source) published a version 2 in July 2025. — [Open SaaS v2 post, 2025-07-29](https://docs.opensaas.sh/blog/2025-07-29-open-saas-version-2/)
- Apptension's SaaS boilerplate is an open-source full starter kit on GitHub. — [GitHub: apptension/saas-boilerplate](https://github.com/apptension/aws-boilerplate)

### Inferences
- "Auth + organizations + billing ready" is a commodity in 2026: at least four commercial kits and one MIT framework ship it, on Next.js, Django and Rails. For the idea, built-in multitenancy is table stakes, not a differentiator, except in the Go/Rust space, which none of the kits found here serve.
- "Multitenancy" in these kits means application-level organizations with membership and roles (and, on Supabase, row-level security). None of the sources read describes database-per-tenant or schema-per-tenant isolation as the default. If the idea offers stronger isolation by default, that would be a genuine difference; this needs checking against the framework-side research.
- The copied-code update problem is unsolved in this market. The state of the art is: keep an upstream remote, merge often, and keep vendor code and custom code in separate files. Makerkit's "9 incremental PRs" and Bullet Train's "stepwise" upgrades are process answers to a structural problem.
- Pegasus's agent-driven upgrade (2026) is the most relevant recent development for the idea: a vendor already assumes the buyer's coding agent can perform the three-way merge. What is missing there is an objective gauge that the merge preserved behaviour, which is exactly what per-piece acceptance tests would add.
- The hybrid model (Bullet Train: core behaviour in versioned packages, presentation and wiring as owned code, explicit "eject") is the most mature compromise found, and its documented failure mode (ejected files silently drift) is precisely the case a piece-level test gauge would catch.

### Gaps
- Laravel Spark was not sourced: its Composer-package model, team billing and update behaviour remain unverified here.
- BoxyHQ's enterprise SaaS starter kit, Nextacular, Jumpstart Pro (Rails) and ShipFast were not verified; the claim that ShipFast lacks teams came only from a competitor's page and is not used.
- Go and Rust SaaS starter kits with multitenancy were not surveyed (they belong partly to the framework-side research).
- Whether Open SaaS and the Apptension boilerplate include organizations by default was not confirmed.
- Prices, customer counts and revenue for the commercial kits were not collected.
- No user-side accounts (forum threads) quantifying how many buyers ever merge an upstream update were found.

---

## 5. Is there any product that ships each piece with its own acceptance tests that must keep passing after an agent customizes it? Any evidence that verified/tested catalogs reduce errors or cost?

### Takeaway
No product was found that ships copied, agent-editable pieces together with acceptance tests that act as a must-pass gauge after customization; the nearest neighbours verify something else (Bit tests versioned components and their dependents, Tessl evaluates whether agents follow a skill, Convex sandboxes the piece, shadcn validates only that files exist). Evidence that supplying tests improves model-generated code exists but comes from benchmark studies and one vendor case study, not from any measurement of a tested catalog in real projects.

### Cited Findings
- shadcn: no tests/verification field in the item schema; test files and a test setup can be shipped as ordinary registry files; `shadcn registry validate` checks structure and file references, not behaviour. — [shadcn registry-item.json docs](https://ui.shadcn.com/docs/registry/registry-item-json); [shadcn GitHub registry docs](https://ui.shadcn.com/docs/registry/github)
- Bit: every component carries its tests, the build pipeline runs them in isolation, and dependents' tests are run when a component changes; this is verification of a versioned dependency graph, not of a copy the consumer edited. — [Bit tester overview](https://bit.dev/reference/testing/tester-overview); [Bit testing during build](https://staging-bit.pages.dev/reference/testing/testing-during-build); [Ripple CI](https://bit.dev/reference/ci/ripple-ci)
- Tessl: registry tiles/skills ship with evals that "track how reliably the agent follows instructions"; secondary reporting says evals cover about 300 public tiles and that skills carry a Snyk security score. — [CodeMySpec review of Tessl](https://codemyspec.com/blog/tessl-review); [Tessl registry launch](https://tessl.io/blog/tessl-launches-spec-driven-framework-and-registry/)
- Vendor-reported result (Tessl, 2026-01-26): on the `bowser@2.12.0` npm library, an unnamed agent passed 57% of 50+ criteria across ten scenarios without the Tessl tile and 93% with it (a 1.63x improvement). Scenarios and criteria were generated by Tessl's own pipeline; the model, number of runs and any independent check are not stated. — [Tessl blog: bowser case](https://tessl.io/blog/how-tessl-improved-agent-accuracy-by-163-on-the-bowser-npm-library/)
- Community registry with checks: Sigistry's marketplace advertises security-checked plugins and skills with an eight-check methodology; these are security/structure checks. — [GitHub: monitoringevaluationstudio/marketplace](https://github.com/monitoringevaluationstudio/marketplace)
- Convex components: safety by isolation ("installing them is always safe"), not by tests. — [Convex components docs](https://docs.convex.dev/components)
- Starter kits rely on the project's own test suite after an upgrade merge (Bullet Train: upgrade one version, run tests, deploy; JHipster: resolve conflicts and reach passing tests per step). — [Bullet Train upgrade docs](https://bullettrain.co/docs/upgrades); [generator-jhipster upgrade README](https://cdn.jsdelivr.net/npm/generator-jhipster@9.0.0/dist/generators/upgrade/README.md)
- Research (older, 2024): "Test-Driven Development for Code Generation" reports that giving the model test cases along with the problem statement increased problems solved; a secondary review cites an additional 12.0% on MBPP and 8.5% on HumanEval. The authors frame the benefit as something to examine rather than assume. — [arXiv 2402.13521](https://arxiv.org/html/2402.13521v2); figures via [Moonlight review](https://www.themoonlight.io/en/review/test-driven-development-for-code-generation)
- Research (2025): TENET studies a repository-level agent under a TDD setting and how properties of the test suite affect agent performance. — [arXiv 2509.24148](https://arxiv.org/abs/2509.24148v2)
- Research (2026, listed in results, abstract-level only): "TDD-Agent: Test-Driven Reasoning for Code Generation" reports that iterative refinement improves code correctness and test effectiveness; "Coding Agents as Test-Suite Auditors" is about agents finding what official test suites miss; "N-Version Programming with Coding Agents" is related work on redundancy. — [arXiv 2608.16742](https://arxiv.org/pdf/2608.16742); [arXiv 2608.01715](https://arxiv.org/pdf/2608.01715); [arXiv 2606.20158](https://arxiv.org/pdf/2606.20158)
- A broad search for "registry of code blocks with acceptance tests for AI coding agents" returned no product matching the full description; the nearest results were skill registries, provenance tooling (agent run attestations) and research papers. — [GitHub: BlockTarioIQ/agentattest](https://github.com/BlockTarioIQ/agentattest); [The New Stack: an "AI slop registry"](https://thenewstack.io/engineering-ai-slop-registry/)

### Inferences
- The "piece = code + gauge tests + business questions" unit appears to be novel as a packaged product. Absence of evidence is not proof: the search was English-only, limited in depth, and private/internal platforms would not show up. It should be stated as "not found", not "does not exist".
- The supporting evidence for the mechanism is real but indirect: (a) benchmark studies show tests supplied up front raise pass rates on small problems; (b) a vendor case study shows curated context raising an agent's pass rate on one library. Neither measures the idea's actual claim, which is that a catalog of tested pieces lowers error rate or cost when building a whole product. That claim is currently unsupported by external data and would need the project's own benchmark.
- There is a known weakness in the mechanism that the literature points at: tests are only a gauge for what they cover, and an agent told "make the tests pass" can satisfy the suite while breaking uncovered behaviour or by editing the tests. The 2026 "test-suite auditors" line of work exists because official suites miss defects. A credible version of the idea needs a rule for when the agent may change a gauge test (customization that legitimately changes behaviour) versus when it may not; none of the surveyed products has had to solve this.
- "Business questions the piece needs answered" has no close equivalent in the surveyed registries. The nearest are JHipster's interactive generator prompts, shadcn's `docs` install message and Tessl's spec tiles. It is a differentiator on paper with no adoption evidence either way.

### Gaps
- No controlled study was found comparing agent-built applications with and without a verified component catalog (error rate, cost, time).
- The original numbers of the TDD papers were read through secondary summaries; the papers themselves should be read before citing figures.
- Enterprise internal developer platforms (Backstage software templates with scorecards, golden paths) were not researched and may contain closer analogues.
- Spec-driven tools (GitHub Spec Kit, Kiro) were not examined for per-feature acceptance criteria that persist after customization.

---

## 6. Naming check: what existing products, companies or organizations are named OpenFabric, Openfabric AI, OpenFabrics Alliance or similar?

### Takeaway
The name is heavily occupied: there is an active crypto/AI company (Openfabric AI, with an OFN token), a Singapore fintech in payments (Open Fabric, openfabric.co), a long-standing open-source networking consortium (OpenFabrics Alliance), an IETF routing proposal called OpenFabric, and an open-source cloud framework called OpenFABR. Two of these collide directly with the idea's territory, AI and fintech.

### Cited Findings
- Openfabric AI: described in company directories as a decentralized AI platform with a Layer 1 blockchain for building, training and deploying AI algorithms and services; one directory lists it as founded in 2019; locations differ between profiles (unverified). — [Crunchbase: Openfabric AI](https://www.crunchbase.com/organization/openfabric-ai); [Gust profile](https://gust.com/companies/openfabric-ai-2); [openfabric.ai blog](https://openfabric.ai/blog/openfabric-the-closest-synonym-to-artificial-intelligence)
- Openfabric AI has a native token, OFN, a BEP20 token with a fixed supply of 500,000,000 per its own docs; market-data sites show a very low and inconsistent price during 2026 and low liquidity; no 2026 news on project status was found. — [Openfabric token docs](https://docs.openfabric.ai/token/index); [CoinMarketCap listing](https://coinmarketcap.com/assets/openfabric-ai); [Delta listing noting low liquidity](https://delta.app/en/crypto/openfabric)
- Open Fabric (openfabric.co): a Singapore-based fintech that helps wallets, BNPL providers and digital banks get acceptance at merchants over Visa and Mastercard rails ("Helping local payment methods achieve a global footprint"); partners reported include BillEase and Home Credit in the Philippines. — [openfabric.co company page](https://openfabric.co/company); [openfabric.co](https://openfabric.co); [Marketech APAC on BillEase + OpenFabric](https://marketech-apac.com/billease-openfabric-partner-to-launch-new-integration-solution-for-merchants/)
- OpenFabrics Alliance (OFA): an open-source organization that develops, tests, licenses, supports and distributes RDMA/advanced-network software (the OFED stack for InfiniBand, iWARP and RoCE); founded in June 2004 as the OpenIB Alliance and later renamed. — [Wikipedia: OpenFabrics Alliance](https://en.wikipedia.org/wiki/OpenFabrics_Alliance); [OFA overview](https://www.openfabrics.org/ofa-overview/)
- OpenFabric (IETF Internet-Draft `draft-white-openfabric`, versions 00-07, older): a proposal to adapt IS-IS for large spine-and-leaf data-centre fabrics, originally edited by engineers at LinkedIn; it is an individual draft ("work in progress"); one version is marked as replaced by `draft-white-distoptflood`. — [IETF datatracker](https://datatracker.ietf.org/doc/draft-white-openfabric/01/); [draft -07 text](https://potaroo.net/ietf/all-ids/draft-white-openfabric-07.html)
- OpenFABR: an organization publishing an open-source "Cloud Development Framework" under the `@openfabr` npm scope (for example `@openfabr/cdf`, `@openfabr/fabr-bind-cli`). — [GitHub: openfabr](https://github.com/openfabr); [pkgstats: @openfabr/cdf](https://www.pkgstats.com/pkg:@openfabr/cdf)
- Adjacent "fabric" names in the same ecosystems: the `fabric` npm package (Fabric.js), Hyperledger Fabric's Node SDK, and FabricLabs/fabric on GitHub. — [npm: fabric](https://npmjs.com/package/fabric); [Hyperledger fabric-sdk-node](https://awesome.ecosyste.ms/projects/github.com%2Fhyperledger%2Ffabric-sdk-node); [GitHub: FabricLabs/fabric](https://github.com/FabricLabs/fabric)

### Inferences
- For an "AI-first" developer product, the collision with Openfabric AI is the most damaging one for search and for trust: searching the name returns a crypto token with a collapsed price, and the two would be confused in AI-tool directories, where Openfabric AI is already listed.
- A fintech blueprint under the OpenFabric name would collide with Open Fabric, an operating payments company in the same domain.
- OpenFabrics Alliance and the IETF OpenFabric draft occupy the infrastructure/networking meaning of the term and already cause search ambiguity among infrastructure engineers, who are part of the target audience.
- With five distinct prior uses, the name has weak distinctiveness. Whether any of them holds registered trademarks in software classes was not checked, so no legal conclusion is drawn; the practical conclusion is that discoverability and differentiation would be poor.

### Gaps
- No trademark database search (USPTO, EUIPO, WIPO) was done.
- Availability of the exact names on npm, crates.io, pkg.go.dev, GitHub organizations and domain registries was not checked.
- Microsoft Fabric, fabric.inc (commerce) and other large "Fabric" brands were not sourced in this pass but are obvious additional neighbours.
- The `github.com/onfabric` organization appeared in results and was not examined.
- The current operating status of Openfabric AI as a company in late 2026 is unknown.
