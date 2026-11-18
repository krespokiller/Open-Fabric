# Go vs Rust (vs TypeScript and Python) as the single language of an agent-written full-stack framework, including frontend and mobile — state of evidence, November 2026

Reading conventions used in every section:

- **[Measured]** = a number from a paper, benchmark, survey or API that I read in the primary source.
- **[Measured, secondary]** = a number I only saw through a search summary or a third-party write-up, not in the primary text. Treat as unverified until re-checked.
- **[Vendor/author claim]** = a statement by the project or company about its own product.
- **[Anecdote]** = individual blog or forum report.
- GitHub star counts were read by me from the public GitHub REST API on 2026-11-16. Stars are an attention signal, not a production-usage measurement.
- Anything dated before 2025 is marked "(older)".

## 1. How well do current LLMs and coding agents write Go, Rust, TypeScript and Python?

### Takeaway
Python is the best-served language in almost every benchmark, but there is **no stable Go-versus-Rust ranking for frontier models**: Rust beats Go on three repository-level benchmarks (SWE-bench Multilingual, Multi-SWE-bench best configurations, SWE-rebench V2) and the result flips per model on a fourth (SWE-Bench ProMax). For **small local models the picture is clear and different: Rust collapses** (roughly 6-16% pass@1 at 7-8B versus 12-29% for Go and 21-38% for TypeScript on AutoCodeBench; 31% of Rust outputs from a 7B model do not compile at all on PROBE).

### Cited Findings

**Repository-level issue resolution (agents fixing real repos)**

- [Measured] SWE-bench Multilingual (300 tasks, 9 languages; SWE-agent + Claude 3.7 Sonnet, $2.50 cost cap; 2025): Rust 58.14% (25/43), Java 53.49%, PHP 48.84%, Ruby 43.18%, JavaScript/TypeScript 34.88% (15/43), Go 30.95% (13/42), C/C++ 28.57%; overall 42.67% versus 63% for the same setup on Python SWE-bench Verified. — [swebench.com/multilingual](https://swebench.com/multilingual)
- [Measured] Same source, authors' caveats: Rust tasks had the largest average gold patches yet the highest resolution rate; they found no clear link between patch size and resolution rate, conclude "language and difficulty are both relevant" and that model capability, not agent design, is the limiting factor. Samples are 42-44 tasks per language. — [swebench.com/multilingual](https://swebench.com/multilingual)
- [Measured] Multi-SWE-bench (ByteDance, April 2025; 1,632 non-Python instances: Go 428, JS 356, Rust 239, TS 224, C++ 129, Java 128, C 128). Best configuration in the paper (MopenHands + Claude 3.7 Sonnet): Python 52.20, Java 21.88, Rust 15.90, C++ 14.73, C 8.59, Go 7.48, JS 5.06, TS 2.23. MSWE-agent + Claude 3.7 Sonnet: Python 45.80, Java 23.44, C++ 11.63, TS 11.16, C 8.59, Rust 6.69, Go 5.37, JS 4.78. — [Multi-SWE-bench paper, Table 4](https://arxiv.org/html/2504.02605)
- [Measured] Multi-SWE-bench, weaker/open models: Qwen2.5-72B-Instruct with MagentLess scored Python 26.80, Java 10.94, TS 4.46, Rust 2.51, Go 1.40, JS 0.84; with MSWE-agent it scored TS 0.00, Rust 0.42, Go 0.47. — [Multi-SWE-bench paper, Table 4](https://arxiv.org/html/2504.02605)
- [Measured] Multi-SWE-bench authors' reading: models "perform strongly on Python but generalize poorly to other languages"; "TS and JS consistently yield the lowest resolved rates"; they attribute Go/Rust/C/C++ difficulty to build systems and type systems and name a "method optimization bias toward Python" in agent scaffolds. — [Multi-SWE-bench paper](https://arxiv.org/html/2504.02605)
- [Measured] SWE-rebench V2 (arXiv 2602.23866, revised June 2026; 60 tasks per language, 3 runs per task), pass rate %:

  | Model | Python | JS | Go | Rust | Scala |
  |---|---|---|---|---|---|
  | Claude Opus 4.5 | 36.1 | 26.7 | 15.0 | 28.9 | 19.4 |
  | GLM 4.7 | 27.2 | 26.1 | 17.2 | 24.4 | 11.7 |
  | MiniMax M2.1 | 26.1 | 26.1 | 15.6 | 20.6 | 7.8 |
  | Gemini 3 Flash | 25.6 | 25.0 | 11.7 | 21.1 | 7.2 |
  | DeepSeek v3.2 | 23.3 | 24.4 | 12.2 | 21.7 | 5.6 |
  | GPT 5.2 | 20.6 | 24.4 | 11.1 | 21.7 | 7.2 |
  | gpt-oss-120b | 8.9 | 13.3 | 9.4 | 9.4 | 2.8 |

  Rust is at or above Go for all seven models; TypeScript and Java were not evaluated per model. — [SWE-rebench V2, Table 6](https://arxiv.org/html/2602.23866)
- [Measured] SWE-Bench ProMax (large multi-file refactoring; 170 instances; arXiv 2608.09802v2, revised 27 Oct 2026; only 22-29 instances per language), resolve rate % under the OpenHands scaffold:

  | Model | Overall | Python | TS | Go | Rust | Java |
  |---|---|---|---|---|---|---|
  | GPT-5.2 | 41.2 | 48.3 | 35.7 | 26.1 | 54.5 | 19.2 |
  | Claude Sonnet 4.6 | 38.8 | 17.2 | 53.6 | 26.1 | 63.6 | 30.8 |
  | GLM-5 | 36.5 | 20.7 | 28.6 | 34.8 | 36.4 | 34.6 |
  | Qwen3.5 | 36.5 | 37.9 | 17.9 | 39.1 | 22.7 | 26.9 |
  | Kimi-K2.5 | 32.9 | 24.1 | 10.7 | 43.5 | 18.2 | 30.8 |
  | Gemini-3-Pro | 19.4 | 13.8 | 0.0 | 8.7 | 22.7 | 19.2 |

  — [SWE-Bench ProMax](https://arxiv.org/html/2608.09802v2)
- [Measured] ProMax authors: "Performance varies substantially across languages. No single model dominates all languages"; the TypeScript/Rust variance "may reflect differences in language-specific training data rather than inherent language difficulty." — [SWE-Bench ProMax](https://arxiv.org/html/2608.09802v2)
- [Measured, secondary] Rust-SWE-bench (500 tasks, 34 Rust repos; arXiv 2602.22764, ICSE 2026; Claude 3.7-era models): OpenHands + Claude 3.7 Sonnet 21.2%, SWE-agent + Claude 3.7 Sonnet 15.0%, the authors' RustForger agent 28.6% (143/500), RustForger + o4-mini 16.4%; issue reproduction succeeded only 55.5% of the time for the best agent. — [Rust-SWE-bench](https://arxiv.org/abs/2602.22764)

**Function-level generation, frontier and small models side by side**

- [Measured] AutoCodeBench (Tencent, arXiv 2508.09101, Aug 2025; 3,920 problems, 20 languages), Pass@1 %:

  | Model | Avg (20 langs) | Python | Go | Rust | TypeScript | JavaScript | Elixir |
  |---|---|---|---|---|---|---|---|
  | Claude Opus 4 (reasoning) | 52.4 | 40.3 | 37.2 | 38.7 | 47.2 | 38.6 | 80.3 |
  | Claude Sonnet 4 (reasoning) | 51.1 | 37.2 | 41.9 | 36.2 | 44.2 | 34.8 | 81.8 |
  | o3-high | 51.1 | 40.8 | 22.0 | 42.2 | 47.2 | 40.8 | 80.8 |
  | Gemini 2.5 Pro | 48.7 | 40.3 | 37.2 | 24.6 | 41.7 | 37.0 | 68.7 |
  | DeepSeek-R1-0528 | 50.2 | 38.8 | 38.7 | 37.2 | 41.2 | 35.9 | 77.3 |
  | **Small models** | | | | | | | |
  | Qwen3-8B (reasoning) | 28.5 | 28.1 | 29.3 | 12.6 | 37.7 | 28.3 | 43.9 |
  | Qwen3-4B (reasoning) | 24.3 | 27.6 | 24.1 | 8.5 | 39.2 | 25.5 | 33.3 |
  | Seed-Coder-8B-Instruct | 32.3 | 23.5 | 22.5 | 15.6 | 31.2 | 28.8 | 57.1 |
  | Hunyuan-Coder-7B-Preview | 33.4 | 25.5 | 21.5 | 11.1 | 31.2 | 27.2 | 60.1 |
  | Qwen2.5-Coder-7B | 22.5 | 19.9 | 12.6 | 7.0 | 24.6 | 21.2 | 47.0 |
  | DeepSeek-Coder-6.7B-Instruct | 20.5 | 18.9 | 21.5 | 6.0 | 23.6 | 19.6 | 47.5 |
  | OpenCoder-8B | 19.3 | 14.3 | 17.3 | 6.0 | 21.1 | 12.5 | 34.3 |
  | Qwen3-1.7B (reasoning) | 11.2 | 16.8 | 9.9 | 0.0 | 19.6 | 12.5 | 20.7 |

  — [AutoCodeBench, Table 4](https://arxiv.org/html/2508.09101)
- [Measured] AutoCodeBench caveat from the authors: problems were filtered for difficulty using DeepSeek-Coder-V2-Lite, which removes easy problems better in popular languages, so absolute cross-language comparisons are confounded (it is why Elixir scores look high and Python looks low). — [AutoCodeBench](https://arxiv.org/html/2508.09101)
- [Measured] (older, Sept 2024) Qwen2.5-Coder technical report, MultiPL-E pass@1 for instruct models: 7B — Python 87.8, TypeScript 81.8, JavaScript 83.2, Java 76.5, C++ 75.6; 1.5B — Python 71.2, TS 61.0; 0.5B — Python 62.8, TS 50.3; CodeLlama-7B-Instruct — Python 34.8, TS 32.7; DeepSeek-Coder-6.7B-Instruct — Python 78.6, TS 67.2. Go and Rust are not reported. — [Qwen2.5-Coder report, Table 17](https://arxiv.org/html/2409.12186)
- [Measured, secondary] (older, 2024) Granite Code paper MultiPL-E base models: CodeLlama-7B about Python 35.4 / Go 21.3 / Rust 24.4; StarCoderBase-7B about Python 26.8 / Go 22.6 / Rust 22.6. — [Granite Code Models](https://arxiv.org/pdf/2405.04324)
- [Measured] PROBE (arXiv 2607.13820, July 2026; IBM CodeNet tasks; Python, C++, Java, C, Rust — no Go or TypeScript). Share of all executions that did not compile:

  | Model | Python | C++ | Java | C | Rust |
  |---|---|---|---|---|---|
  | GPT-4.1-mini | 0.00 | 0.03 | 0.02 | 0.07 | 0.06 |
  | Gemini-2.0-flash | 0.00 | 0.07 | 0.02 | 0.03 | 0.06 |
  | Qwen2.5-Coder:14b | 0.00 | 0.11 | 0.07 | 0.10 | 0.29 |
  | Qwen2.5-Coder:7b (Ollama) | 0.01 | 0.13 | 0.07 | 0.16 | 0.31 |
  | Qwen2.5:14b | 0.01 | 0.26 | 0.18 | 0.25 | 0.42 |

  Python scored highest pass@k and Rust lowest for every model. — [PROBE, Table 2](https://arxiv.org/html/2607.13820)

**End-to-end agent runs on the same task in many languages**

- [Measured] "Which programming language is best for Claude Code?" (author is a Ruby core committer and discloses that bias; March 2026; Claude Code with Opus 4.6 high effort; a two-phase "mini-git" with no external libraries; 20 trials per language, 600 runs):

  | Language | Tests passed (v1 / v2) | Total time (mean ± sd) | Avg cost | LOC |
  |---|---|---|---|---|
  | Ruby | 20/20, 20/20 | 73.1s ± 4.2s | $0.36 | 219 |
  | Python | 20/20, 20/20 | 74.6s ± 4.5s | $0.38 | 235 |
  | JavaScript | 20/20, 20/20 | 81.1s ± 5.0s | $0.39 | 248 |
  | Go | 20/20, 20/20 | 101.6s ± 37.0s | $0.50 | 324 |
  | Rust | 19/20, 19/20 | 113.7s ± 54.8s | $0.54 | 303 |
  | Python + mypy | 20/20, 20/20 | 125.3s ± 19.0s | $0.57 | 326 |
  | TypeScript | 20/20, 20/20 | 133.0s ± 29.4s | $0.62 | 310 |
  | Ruby + Steep | 20/20, 20/20 | 186.6s ± 69.7s | $0.84 | 304 |

  Only 3 of 600 runs failed (Rust 2, Haskell 1). — [DEV Community post](https://dev.to/mame/which-programming-language-is-best-for-claude-code-508a)
- [Measured] Aider polyglot composition: 225 Exercism exercises across C++, Go, Java, JavaScript, Python, Rust. — [aider.chat](https://aider.chat/2024/12/21/polyglot.html)

### Inferences
- With frontier models in an agent loop, Go and Rust are both workable and neither is consistently ahead. Go's deficit on SWE-bench Multilingual and SWE-rebench V2 is real in those samples, but it is measured on existing open-source Go repositories (infrastructure-heavy codebases), not on greenfield CRUD web apps, so it does not transfer cleanly to a framework use case.
- For small local models (the project's stated target), the function-level evidence ranks roughly TypeScript ≥ Python > Go >> Rust. Rust at 6-16% pass@1 for 7-8B models versus 12-29% for Go is the single strongest language-choice signal in this research.
- The project's pilot result (a 7B model failing to get TypeScript to compile far more often than Python/Django) is **not** reproduced at function level: 7-8B models score as high or higher on TypeScript than on Python in AutoCodeBench and close to Python in MultiPL-E. The likely explanation is project-level friction (tsconfig, module resolution, package versions, multi-file type agreement) rather than the language itself; no public benchmark I found measures that for 7B models.
- Benchmarks disagree by task type, and per-language samples are small (22-60 tasks). A 10-point per-language difference in ProMax is two or three tasks.

### Gaps
- No official per-language breakdown of the Aider polyglot leaderboard was found; the only per-language numbers located were unverified third-party one-attempt runs, which I am not reporting.
- No CRUXEval-X or current (2026) MultiPL-E per-language numbers were retrieved in this pass.
- No 2026 per-language SWE-bench Multilingual leaderboard table was found; the only per-language split is the Claude 3.7 Sonnet baseline.
- No benchmark measures agents building a **web application** (routing, ORM, templates, auth) in Go versus Rust versus TypeScript versus Python. Every per-language result above is either algorithmic problems or patches to existing repositories.
- No public benchmark isolates small local models (7B class) on Go versus TypeScript at project level with a compiler in the loop. The project's own pilot is, as far as I found, the only data of that shape.

## 2. Does strict static typing and a compiler in the loop help or hurt agents?

### Takeaway
The evidence splits by scale: on a small greenfield task a compiler and type checker made Claude Code 1.4-2.6x slower and more expensive with no reliability gain, while controlled and field evidence says type errors are better repair signals than test failures and that weaker models spend more of their fixes on type and API errors. Nothing measured yet shows where the crossover point is, and no study measures compile-time cost per agent iteration.

### Cited Findings
- [Measured] Same-task Claude Code runs (March 2026): adding a type checker to the same language roughly doubled cost — Python $0.38 → Python/mypy $0.57; Ruby $0.36 → Ruby/Steep $0.84; statically typed languages were 1.4-2.6x slower and more expensive than Ruby/Python/JavaScript; Go ($0.50) and Rust ($0.54) were cheaper than TypeScript ($0.62). Standard deviation of total time was far larger for compiled languages (Go ±37.0s, Rust ±54.8s) than for Python (±4.5s). — [DEV Community post](https://dev.to/mame/which-programming-language-is-best-for-claude-code-508a)
- [Author caveat] The same author states the task is prototyping-scale with no external libraries, that "static typing may become advantageous at larger scales — someone should test this", and that results "may look different in a few months". — [DEV Community post](https://dev.to/mame/which-programming-language-is-best-for-claude-code-508a)
- [Measured, qualitative only] "Type-Error Ablation and AI Coding Agents" (arXiv 2606.01522, June 2026; controlled experiment on an ML-style typed teaching language, one injected type error per program, four feedback conditions): more detailed type error messages improve repair; a type system "appears to help more than test-suite failure reports alone"; when the agent fixes the type error the program usually passes all semantic tests. No numbers were visible in the summary I read. — [paper summary](https://arxivlens.com/PaperView/ViewPdf/type-error-ablation-and-ai-coding-agents-773-0b7b4665)
- [Measured] Type-constrained decoding (arXiv 2504.09246, April 2025; TypeScript; HumanEval and MBPP): constraining generation with the type system "reduces compilation errors by more than half" and "significantly increases functional correctness", including for open-weight models above 30B. — [arXiv 2504.09246](https://arxiv.org/abs/2504.09246)
- [Vendor claim citing that paper] GitHub's developer-advocacy blog (8 Jan 2026) states that "94% of LLM-generated compilation errors were type-check failures", attributing it to arXiv 2504.09246; the abstract I read does not contain that figure, so I could not confirm it in the primary text. The same post says TypeScript became the most-used language on GitHub in August 2025 (about 2.6 million developers, +66% year over year) and calls the AI link "correlative evidence". — [GitHub blog](https://github.blog/ai-and-ml/llms/why-ai-is-pushing-developers-toward-typed-languages/)
- [Measured] Field case study, production monorepo with TypeScript/React frontends and Python/FastAPI backends (arXiv 2607.13080; one developer; May-July 2026): syntax/type repair commits were 2 (1.8% of fix commits) under Claude Code with a hosted frontier model versus 20 (7.3%) under an on-premise quantized open model in OpenCode; API/package misuse fixes were 3 (2.7%) versus 29 (10.5%). The category difference excluding Test/CI was not statistically significant (χ²(2)=5.59, p=0.06). The paper notes the weaker model "more frequently violated the specified type constraints and API boundaries". — [arXiv 2607.13080](https://arxiv.org/html/2607.13080)
- [Measured] Compile failure as the dominant failure channel for small models in strict languages: 31% of all Rust outputs from Qwen2.5-Coder:7b did not compile, versus 1% for Python and 13-16% for C/C++; frontier-class small proprietary models were at 6% for Rust. — [PROBE, Table 2](https://arxiv.org/html/2607.13820)
- [Measured, secondary] (older, 2024) RustRepoTrans: compilation errors were 92.3% of failed Rust translations. — [RustRepoTrans](https://arxiv.org/pdf/2411.13990)
- [Measured, secondary] (older, 2023) RustAssistant: an LLM looped against `cargo build` errors fixed roughly 74% of real-world Rust compilation errors. — [RustAssistant](https://arxiv.org/pdf/2308.05177)
- [Measured, secondary] SafeTrans (2026, C-to-Rust): borrow-checker violations were repaired at an average 74.2% across LLMs; trait-implementation failures at 58.7%. — [SafeTrans](https://www3.cs.stonybrook.edu/~mikepo/papers/safetrans.recode26.pdf)
- [Measured] Rust compiler performance survey (Rust project, September 2025; over 3,700 responses): 55% wait more than ten seconds for an incremental rebuild on their most problematic project; slow incremental rebuilds were the most common complaint; about 45% of respondents who stopped using Rust cited compile times; about 20% call clean builds a significant blocker; about 25% of CI users call CI build time a big blocker. — [Rust Blog](https://blog.rust-lang.org/2025/09/10/rust-compiler-performance-survey-2025-results)
- [Measured, secondary] 2025 State of Rust Survey (published March 2026; 7,156 responses): more than 27% call slow compilation a significant problem. — [Rust Blog](https://blog.rust-lang.org/2026/03/02/2025-State-Of-Rust-Survey-results)
- [Anecdote, unverified numbers] Blog figures for a medium service: Rust clean build 25-35s and incremental 3-8s in one post; Go 2-8s versus Rust 45-120s in another; methodology is not stated in either. — [blog benchmark](https://blog-5f3.pages.dev/posts/2025-10-18-performance-benchmarking-rust-vs-go-microservices); [tech-insider.org](https://tech-insider.org/rust-vs-go-2026-3/)
- [Measured, secondary] A TypeScript mining study reports AI agents are about 9x more likely than humans to use the `any` type, i.e. agents escape the type system when it blocks them. — [arXiv 2602.17955](https://arxiv.org/html/2602.17955)

### Inferences
- The compiler loop is a tax on easy tasks and a safety net on hard ones. For a framework where agents assemble mostly conventional CRUD code, the tax is what will be felt on every task; the safety net pays off only when the codebase is large enough that untyped errors would surface late.
- The tax is proportional to feedback latency and error difficulty. Go's compiler is fast and its type system simple; Rust adds both slower rebuilds (55% of humans wait >10s incrementally) and a class of errors (ownership, lifetimes, trait bounds) that small models fail to repair (31% non-compiling output at 7B). This asymmetry between Go and Rust is larger than the asymmetry between "typed" and "untyped".
- TypeScript was the most expensive mainstream typed language in the one same-task agent benchmark (more than Go and Rust), which is consistent with the project's pilot observation that TypeScript toolchains cost agents iterations.
- A weaker model shifts failures toward exactly the categories a compiler catches (type and API misuse went from 4.5% to 17.8% of fix commits combined in the field study). That argues that a compiler matters more, not less, for local models — provided the errors are of a kind the model can actually repair.

### Gaps
- No study measures wall-clock or token cost per agent iteration as a function of compile time, in any language.
- No study measures borrow-checker failure rates inside modern agent loops (Claude Code, Codex, OpenCode) on application code; the Rust repair numbers are from translation or older single-shot setups.
- No controlled comparison at "framework app" scale (tens of files, real dependencies) of typed versus untyped languages under agents; the author of the 600-run benchmark explicitly calls for it.
- No Go-specific compile-error-repair study was found.
- Reliable, methodologically sound Go-versus-Rust incremental build measurements for a web service were not found; only unsourced blog figures.

## 3. Realistic full-stack options in each language for a polished default UI, and how well agents write them

### Takeaway
Neither Go nor Rust has a UI stack with anything near the adoption, component ecosystem or model familiarity of React + Tailwind + shadcn/ui; the mature paths in both languages are either server-rendered HTML with a small hypermedia library (strongest in Go: templ + htmx or Datastar) or a JavaScript/TypeScript frontend fed by the backend. There is no benchmark of agents writing templ, Leptos or Dioxus; the only relevant measurement shows an HTML-first htmx stack was the cheapest for Claude Code to build among 12 JavaScript stacks, within the margin of error.

### Cited Findings

**Adoption signals (GitHub API, read 2026-11-16)**

- [Measured] JavaScript baseline: shadcn/ui 128,322 stars; Tailwind CSS 98,677 stars. — [shadcn-ui/ui](https://github.com/shadcn-ui/ui); [tailwindlabs/tailwindcss](https://github.com/tailwindlabs/tailwindcss)
- [Measured] Hypermedia layer: htmx 49,645 stars; Datastar 5,250 stars. — [bigskysoftware/htmx](https://github.com/bigskysoftware/htmx); [starfederation/datastar](https://github.com/starfederation/datastar)
- [Measured] Go UI: templ 10,613 stars (33 open issues, pushed 2026-11-13); gomponents 1,924; the Inertia adapter gonertia 268 stars (last push April 2026); Wails (desktop webview) 37,134. — [a-h/templ](https://github.com/a-h/templ); [maragudk/gomponents](https://github.com/maragudk/gomponents); [romsar/gonertia](https://github.com/romsar/gonertia); [wailsapp/wails](https://github.com/wailsapp/wails)
- [Measured] The repository path for the templ component kit templUI resolved through the GitHub API to a repository named `axadrn/shadcn-templ` with 1,796 stars. — [templui/templui](https://github.com/templui/templui)
- [Measured] Rust UI: Dioxus 39,788 stars (918 open issues and PRs); Yew 32,861; Leptos 21,536 (117 open); Tauri 112,900; Trunk (WASM bundler) 4,428; Loco 9,638. — [DioxusLabs/dioxus](https://github.com/DioxusLabs/dioxus); [yewstack/yew](https://github.com/yewstack/yew); [leptos-rs/leptos](https://github.com/leptos-rs/leptos); [tauri-apps/tauri](https://github.com/tauri-apps/tauri); [trunk-rs/trunk](https://github.com/trunk-rs/trunk); [loco-rs/loco](https://github.com/loco-rs/loco)
- [Measured] Version maturity: Leptos latest crate is 0.8.20 and Dioxus is 0.7.8 — both pre-1.0. — [docs.rs leptos](https://docs.rs/crate/leptos/latest); [docs.rs dioxus](https://docs.rs/crate/dioxus/0.7.8/source/README.md)
- [Measured] Stack Overflow Developer Survey 2025, web framework usage (all respondents): React 44.7%, Next.js 20.8%, Django 12.6%, Laravel 8.9%, Svelte 7.2%, Ruby on Rails 5.9%, Axum 2.8%, Phoenix 2.4%. Language usage: JavaScript 66%, Python 57.9%, TypeScript 43.6%, Go 16.4%, Rust 14.8%. — [Stack Overflow 2025 survey, Technology](https://survey.stackoverflow.co/2025/technology/)
- [Secondary, weak] A 2026 framework comparison describes Leptos as stronger for web performance and streaming SSR and Dioxus as stronger for desktop and mobile, calling all three Rust frameworks "production-usable"; no production-user counts or compile-time measurements were given. — [pistack.xyz comparison](https://www.pistack.xyz/posts/2026-08-29-dioxus-vs-yew-vs-leptos-rust-wasm-frameworks-comparison/)
- [Author/community claim] The templ documentation ships Datastar integration guidance; a January 2026 write-up describes templ's maturation as the main shift in the Go frontend story. — [templ.guide](https://templ.guide/server-side-rendering/datastar); [rajnandan.com](https://rajnandan.com/posts/go-frontend-architecture-2026/)

**How well agents write these stacks**

- [Measured] Framework bake-off (developer at a security company; reported 4 Nov 2026; Claude Code; a simple Pokémon app; 5 sandbox runs per stack; 12 JavaScript stacks): Hono + htmx had the lowest median cost at $2.67 (1,370 LOC), Astro $2.76 (fastest at 8.2 min), Nuxt $2.82, SvelteKit $4.28, Angular $4.97 (17.2 min, 9.76M tokens, failed to produce a working app in 2 of 5 runs). The author states the top three are within the margin of error and that the app was simple. All backends in this test were JavaScript/TypeScript. — [DevClass](https://www.devclass.com/ai-ml/2026/11/04/pokemon-bakeoff-reveals-best-javascript-frameworks-for-ai/5307282)
- [Measured, secondary] (older, 2024) WebApp1K, a React-only benchmark, found all models' solutions follow the same React template without prompting, consistent with React being the default in training data. — [arXiv 2409.05177](https://arxiv.org/html/2409.05177)
- [Anecdote] A r/LocalLLaMA commenter reports Rust being "nearly unusable" with LLMs for Leptos and Dioxus because models emit deprecated or broken API usage. — [Reddit thread](https://redlib.hbubli.cc/r/LocalLLaMA/comments/1l1q3dk/which_programming_languages_do_llms_struggle_with/mvnq9aq/?context=3)
- [Measured, secondary] An ICSE 2025 study on Python libraries found deprecated-API usage in 25-38% of plausible completions, rising to 70-90% when the surrounding code already used outdated patterns. — [tianpan.co summary](https://tianpan.co/blog/2026-04-17-deprecated-api-trap-ai-coding-agents)
- [Vendor claim] Wasp's founders say users describe it as "the stack that works best with AI" and argue a compile-time full-stack spec makes agent-written code more predictable; Wasp's frontend is React. — [Wasp blog, 13 May 2026](https://wasp.sh/blog/2026/05/13/new-language-for-web-dev-was-a-mistake)

### Inferences
- "Polished by default" is cheapest to reach by reusing Tailwind-class styling regardless of backend language. Tailwind works with any HTML output, so templ + Tailwind + a copied component kit gets the look without React; what it does not get is the shadcn/Radix component catalogue and the model prior that comes with it (shadcn/ui has about 70x the stars of the templ component kit).
- Go's server-rendered path (templ + htmx or Datastar) is the only non-JavaScript option here whose pieces are all 1.0-class or widely deployed and whose generated artefact is plain HTML, which every model writes well. The Rust WASM frameworks are pre-1.0, change APIs between minor versions, and compile slowly — three properties that each raise agent iteration cost.
- The bake-off result suggests HTML-over-the-wire is not a handicap for agents even though React dominates training data, but it tested a JavaScript backend with htmx, not templ in Go; transferring the result to Go is my inference.
- A framework can keep "one language" for all application logic and still ship a polished UI if the UI layer is HTML templates plus a fixed, pre-built component set; it stops being one language the moment interactive widgets need custom client code.

### Gaps
- No benchmark or controlled test of agents writing templ, gomponents, Datastar, Leptos, Dioxus or Yew exists in what I found. The Rust-UI evidence is a single forum anecdote.
- No production-usage statistics (as opposed to stars) for templ, Datastar, Leptos or Dioxus were found. htmx usage in the Stack Overflow 2025 survey could not be confirmed from the page content retrieved.
- No data on the quality (not cost) of agent-built UIs in htmx versus React; the bake-off checked accessibility trees and Lighthouse, not visual polish.
- Inertia for Go has only a small community adapter (268 stars); no first-party Go or Rust Inertia adapter was found, and I did not verify the official adapter list.

## 4. Mobile options and which are production-grade in 2026

### Takeaway
No Go-native or Rust-native UI toolkit can be called production-grade for mobile on the evidence found: Dioxus mobile and Tauri mobile both render in a platform WebView and are described by their own projects in hedged terms, and gomobile is a narrow binding tool rather than an app framework. The production-grade routes remain React Native/Expo, Flutter, or a web app wrapped with Capacitor/PWA — all of which consume the backend through an API rather than sharing its language.

### Cited Findings
- [Vendor claim] Dioxus 0.7 docs: "Mobile is a first-class target for Dioxus apps"; apps "are rendered with either the platform's WebView or experimentally with WGPU"; "native Android animations and widgets aren't currently supported"; the mobile ecosystem "continues to mature". The page lists no shipped apps and does not use the words stable or production-ready. Building requires Android Studio/SDK/NDK and Xcode. — [Dioxus mobile guide](https://dioxuslabs.com/learn/0.7/guides/platforms/mobile/)
- [Vendor claim] (older, 2024) An earlier `dioxus-mobile` crate page described Android support as "quite experimental" requiring "a lot of configuration". — [docs.rs dioxus-mobile 0.7.0-alpha.0](https://docs.rs/crate/dioxus-mobile/0.7.0-alpha.0)
- [Vendor claim] (older, 2024) Tauri's 2.0 release-candidate post says production-ready mobile apps can be developed with Tauri now, while cautioning not to expect 2.0 to be the "mobile as a first class citizen" release. Tauri mobile renders in WKWebView / Android WebView with native features via Rust plugins or Swift/Kotlin. — [Tauri 2.0 RC blog](https://v2.tauri.app/blog/tauri-2-0-0-release-candidate/)
- [Anecdote] One team's decision record rejecting Tauri for mobile says the community describes Tauri mobile as closer to alpha and that there was no reliable official camera plugin; a 2026 blog names desktop production users (Spacedrive, AppFlowy) but no comparable mobile list. — [Tauri vs Capacitor decision record](https://range-day-docs.pages.dev/decisions/Tauri-vs-Capacitor); [codercops blog](https://blog.codercops.com/blog/tauri-2-desktop-mobile-apps-rust-web-2026)
- [Measured] gomobile: the repository has 6,230 stars and was last pushed 2026-10-11. The official Go wiki says only a subset of Go types is supported across the binding and that bindings carry a performance overhead; Apple targets require macOS with Xcode. — [golang/mobile](https://github.com/golang/mobile); [Go Wiki: Mobile](https://go.dev/wiki/Mobile)
- [Measured] Mainstream mobile toolkits by attention: Flutter 181,241 stars; React Native 126,937; Expo 53,589; Capacitor 17,103; all pushed on 2026-11-16. — [flutter/flutter](https://github.com/flutter/flutter); [facebook/react-native](https://github.com/facebook/react-native); [expo/expo](https://github.com/expo/expo); [ionic-team/capacitor](https://github.com/ionic-team/capacitor)
- [Vendor claim] Encore generates a typed TypeScript request client from the backend (`encore gen client`), keeping request/response types in sync for any TypeScript frontend; the client covers REST APIs only. — [Encore client generation docs](https://encore.dev/docs/ts/cli/client-generation); [Encore frontend request client](https://encore.dev/docs/ts/frontend/request-client)

### Inferences
- Because both Rust mobile options are WebViews, they give no native-UI advantage over Capacitor wrapping the same server-rendered or SPA web UI; their benefit is only sharing Rust logic on-device, which a server-centric CRUD framework rarely needs.
- For a framework whose UI is server-rendered HTML (the Go templ/htmx path), the lowest-cost mobile story consistent with "one language" is a Capacitor or PWA shell around the same web UI; a native-feel app requires React Native or Flutter plus a generated typed client, which reintroduces a second language (TypeScript or Dart).
- "Mobile apps must be possible" is satisfiable in every candidate language; "mobile apps in the same single language, production-grade" is not supported by evidence for Go or Rust, and is satisfiable for TypeScript (React Native/Expo) only.

### Gaps
- No independent 2026 assessment or list of shipped App Store / Play Store apps built with Dioxus mobile or Tauri mobile was found; maturity statements are the vendors' own.
- No current official status statement for gomobile's maintenance level was found; the only signals are repository activity and old wiki text.
- Usage shares for Flutter, React Native, Capacitor and Tauri in the Stack Overflow 2025 survey could not be extracted from the page content retrieved.
- No evidence was found on how well agents write Dioxus/Tauri mobile code versus React Native or Flutter.
- I did not research hypermedia-native mobile clients (for example Hotwire Native or LiveView Native); their 2026 status is unverified here.

## 5. What teams behind "one language for everything" frameworks report about fighting versus embracing the JavaScript frontend ecosystem

### Takeaway
The clearest first-party retrospective (Wasp, May 2026) says inventing its own language layer was a mistake and that leaning on standard TypeScript/React tooling was the fix; Encore and Loco both stop at the API boundary and hand the frontend to the JavaScript ecosystem (typed generated client, npm-built client app). Server-driven UI frameworks (LiveView, Livewire, Hotwire) are reported as productive for small full-stack teams but repeatedly hit friction on rich interactive widgets — though this evidence is anecdotal and migrations run in both directions.

### Cited Findings
- [Vendor retrospective] Wasp (founded 2021, over $5M raised; 18,807 stars): "Five years in, we realize it was a mistake" to build a custom language; they are replacing the `.wasp` DSL with a TypeScript SDK (`main.wasp.ts`). Reasons given: the "lang" framing made developers think Wasp replaced JavaScript; IDE support for a custom language only reached "80% of where we wanted to be"; tools built for JS/TS "hit walls" with the DSL; they felt they were "constantly driving with a handbrake pulled up"; developers were happy to write TypeScript. They keep the full-stack compile-time spec as the real value and keep React + Node.js as the app code. — [Wasp blog, 13 May 2026](https://wasp.sh/blog/2026/05/13/new-language-for-web-dev-was-a-mistake); [wasp-lang/wasp](https://github.com/wasp-lang/wasp)
- [Vendor claim] Same post: RedwoodJS and BlitzJS are described as having been tied too tightly to specific technologies (GraphQL, Next.js); the founders credit Wasp's generality for avoiding that; they report agents and "vibe-coders" benefit from a high-level spec. — [Wasp blog, 13 May 2026](https://wasp.sh/blog/2026/05/13/new-language-for-web-dev-was-a-mistake)
- [Vendor docs] Encore (Go and TypeScript backends; 12,717 stars) does not ship a UI layer: it generates a typed client for the frontend, points to a React starter, and recommends deploying the frontend on Vercel, Netlify or similar. — [Encore: integrate a frontend](https://encore.dev/docs/how-to/integrate-frontend); [Encore client generation](https://encore.dev/docs/develop/client-generation); [encoredev/encore](https://github.com/encoredev/encore)
- [Vendor docs] Loco (Rust; "strongly inspired by Rails"; 9,638 stars): `loco new` offers a "Saas App with client side rendering" whose frontend lives in `frontend/` and is built with `npm install` and `npm run build`; built-ins listed are ORM, Axum controllers, view templating, background jobs (Redis queue or in-process), scheduler, mailers, storage and cache. The README does not use a Rust WASM frontend. — [loco-rs/loco README](https://github.com/loco-rs/loco)
- [Measured] Attention on the server-driven / bridge approaches: Livewire 23,595 stars; Inertia 8,141; Hotwire Turbo 7,400; Phoenix LiveView 6,840. — [livewire/livewire](https://github.com/livewire/livewire); [inertiajs/inertia](https://github.com/inertiajs/inertia); [hotwired/turbo](https://github.com/hotwired/turbo); [phoenixframework/phoenix_live_view](https://github.com/phoenixframework/phoenix_live_view)
- [Agency report] A Laravel agency that uses both says it defaults to Livewire because "it enables more team members to contribute" and reaches for Inertia (React/Vue) when the app needs it. — [Spatie blog](https://spatie.be/blog/livewire-and-inertia-how-we-love-and-use-both)
- [Anecdote] A LiveView developer (r/elixir, January 2025): "every time I try to make a more interactive UI experience like a toggle or a combo box, I wind up banging my head against a wall with Phoenix.LiveView.JS and hooks"; a suggested split in the same thread is Inertia + React for user-facing pages and LiveView for admin. — [r/elixir thread](https://redlib.hbubli.cc/r/elixir/comments/1hvkg33/has_anyone_transitioned_from_liveview_to_react/m65f3wp/?context=3)
- [Anecdote] A May 2026 post describes migrating a personal Rails app from Hotwire to Vite + React, satisfied with the result while acknowledging added build complexity. — [rails-life blog](https://rails-life.pages.dev/blog/moving-hotwire-to-vite-and-react)
- [Anecdote, opposite direction] A developer rebuilt a SaaS on Phoenix LiveView after a year on Inertia + React, citing that the React frontend "couldn't render itself on the server for free". — [DEV Community](https://dev.to/danielbergholz/moving-my-saas-away-from-react-and-inertia-to-elixir-50el)
- [Anecdote] A long r/laravel thread titled "Anyone else regret using Livewire" exists alongside the favourable agency report, indicating split experience. — [r/laravel thread](https://reddit.birdcat.cafe/r/laravel/comments/1jnx27n/anyone_else_regret_using_livewire)

### Inferences
- The pattern among the frameworks closest to this product idea is consistent: the durable asset is a whole-app specification and conventions, not a novel language or a novel UI runtime. Every one of Wasp, Encore and Loco delegates rich UI to the JavaScript ecosystem.
- No surveyed "single-language" framework in Go or Rust actually delivers the frontend in that language as its default path. A framework that did so would be taking a risk none of its closest predecessors chose to take, with no evidence yet that agents make that risk smaller.
- Server-driven UI (LiveView/Livewire/Hotwire style) is the closest existing proof that "one language" can cover most CRUD screens; the recurring failure point is rich client-side widgets, which suggests shipping those as a fixed, pre-built component set rather than expecting app authors (or agents) to write them.
- Wasp's tooling lesson generalises to agents: anything non-standard (a DSL, a new template language, a pre-1.0 UI framework) lacks editor tooling, training data and ecosystem at the same time.

### Gaps
- No formal retrospective from the Phoenix, Rails or Laravel core teams quantifying the cost of the server-driven approach was found; the evidence on LiveView/Livewire/Hotwire limits is forum- and blog-level.
- No first-party retrospective from Encore or Loco on why they chose not to own the frontend was found; the finding rests on what their docs ship.
- No data on how agents perform with LiveView, Livewire or Hotwire versus React was found.
- I did not find evidence on the failure or success of earlier Go full-stack attempts beyond repository signals (Buffalo: 8,423 stars, last pushed March 2026 — [gobuffalo/buffalo](https://github.com/gobuffalo/buffalo)); its maintenance status was not verified.

## 6. Operational facts: single-binary deployment, compile times, and ecosystem maturity for payments, auth, background jobs, migrations and multitenancy in Go versus Rust

### Takeaway
On every ecosystem dimension checked, Go has the more mature or first-party option (an official Stripe SDK, two widely used job queues, two widely used migration tools, established auth servers), while Rust's equivalents exist but are community-maintained, smaller or pre-1.0; Rust's documented top pain point is compile time. Built-in multitenancy has no standard solution in either ecosystem that I could find.

### Cited Findings
- [Measured] Payments: Stripe maintains an official Go SDK (`stripe/stripe-go`, 2,652 stars, pushed 2026-11-13) alongside official Node and Python SDKs. — [stripe/stripe-go](https://github.com/stripe/stripe-go); [stripe/stripe-node](https://github.com/stripe/stripe-node); [stripe/stripe-python](https://github.com/stripe/stripe-python)
- [Measured] Payments in Rust: the main option is the community crate `async-stripe` (763 stars), generated from Stripe's OpenAPI spec and listed at a 1.0.0 release-candidate version, i.e. still pre-1.0; a search surfaced only community crates and no official Stripe Rust SDK. — [arlyon/async-stripe](https://github.com/arlyon/async-stripe); [docs.rs async-stripe](https://docs.rs/crate/async-stripe/1.0.0-alpha.9)
- [Measured] Background jobs: Go — asynq 13,840 stars, River (Postgres-backed) 5,901 stars; Rust — apalis 1,505 stars, plus Loco's built-in Redis or in-process workers. — [hibiken/asynq](https://github.com/hibiken/asynq); [riverqueue/river](https://github.com/riverqueue/river); [apalis-dev/apalis](https://github.com/apalis-dev/apalis); [loco-rs/loco](https://github.com/loco-rs/loco)
- [Measured] Database and migrations: Go — golang-migrate 19,028 stars, goose 11,697, sqlc 18,461, GORM 39,990; Rust — sqlx 17,677 (includes migrations), SeaORM 9,972. — [golang-migrate/migrate](https://github.com/golang-migrate/migrate); [pressly/goose](https://github.com/pressly/goose); [sqlc-dev/sqlc](https://github.com/sqlc-dev/sqlc); [go-gorm/gorm](https://github.com/go-gorm/gorm); [launchbadge/sqlx](https://github.com/launchbadge/sqlx); [SeaQL/sea-orm](https://github.com/SeaQL/sea-orm)
- [Measured] Auth in Go: Ory Kratos (identity server written in Go) 13,958 stars; authboss (library) 4,201 stars. — [ory/kratos](https://github.com/ory/kratos); [volatiletech/authboss](https://github.com/volatiletech/authboss)
- [Measured] Web framework base: Go — Gin 89,528 stars, Fiber 40,283; Rust — Axum 27,837. For scale: Django 91,759, Rails 59,035, Laravel framework 35,000. — [gin-gonic/gin](https://github.com/gin-gonic/gin); [gofiber/fiber](https://github.com/gofiber/fiber); [tokio-rs/axum](https://github.com/tokio-rs/axum); [django/django](https://github.com/django/django); [rails/rails](https://github.com/rails/rails); [laravel/framework](https://github.com/laravel/framework)
- [Measured] Rust compile times as reported by Rust users: 55% wait over ten seconds for incremental rebuilds on their worst project; about 45% of people who left Rust cite compile times; about 25% of CI users call CI build time a big blocker. — [Rust compiler performance survey 2025](https://blog.rust-lang.org/2025/09/10/rust-compiler-performance-survey-2025-results)
- [Measured, secondary] 2025 Go Developer Survey (published January 2026; 5,379 respondents): 91% satisfied with Go; 53% use AI development tools daily; about 55% satisfied with those tools and 13% very satisfied, with non-functional code and quality issues cited. — [Go Blog](https://go.dev/blog/survey2025); [InfoWorld summary](https://www.infoworld.com/article/4121617/go-developers-mixed-on-ai-coding-tools-survey.html)
- [Measured, secondary] Stack Overflow 2025: Rust is the most admired language at 72%. — [Stack Overflow 2025 survey](https://survey.stackoverflow.co/2025/technology/)
- [Measured, secondary] 2025 State of Rust Survey: 48.8% of respondents' organisations make non-trivial use of Rust; 42.1% worry about insufficient industry usage. — [Rust Blog](https://blog.rust-lang.org/2026/03/02/2025-State-Of-Rust-Survey-results)
- [Measured] Developer reach: Go is used by 16.4% and Rust by 14.8% of Stack Overflow 2025 respondents, against Python 57.9% and TypeScript 43.6%. — [Stack Overflow 2025 survey](https://survey.stackoverflow.co/2025/technology/)

### Inferences
- For the specific building blocks a Django/Rails/Laravel replacement must ship (payments, auth, jobs, migrations), Go lets the framework wrap first-party or widely used libraries; Rust would require depending on a pre-1.0 community Stripe client and smaller job/auth libraries, or building them — more surface for the framework to own and for agents to get wrong.
- Rust's compile-time problem compounds in an agent workflow: a framework with ORM, templating, async runtime and macros is exactly the dependency-heavy profile where humans report multi-second to multi-ten-second incremental rebuilds, and an agent pays that on every repair iteration.
- Go and Rust are comparable in developer reach (about 15-16% each) and both are roughly a third to a quarter of TypeScript's or Python's reach; choosing either narrows the human contributor pool relative to TypeScript or Python regardless of how agents perform.
- Go's 91% satisfaction together with only 55% satisfaction with AI tools suggests Go developers are a receptive but currently under-served audience for an AI-first framework; this is an interpretation of two survey numbers, not a measured demand signal.

### Gaps
- Single-binary deployment was not sourced in this pass. It is common knowledge that both Go and Rust compile to a single native executable and can embed static assets, but I did not retrieve a source or any measured comparison of binary size, cold start or memory for a full framework app.
- No evidence was found on built-in multitenancy libraries or established patterns in either Go or Rust; nothing can be said about relative maturity there.
- Rust auth library maturity was not researched in this pass; only Go auth options were checked.
- No trustworthy measured Go-versus-Rust compile-time comparison on an equivalent web application was found; Go's speed advantage is supported here only by weak blog figures and by Rust users' own survey complaints.
- Star counts do not measure production adoption, API stability or security track record; no download or dependency-graph statistics were collected.
- Whether Stripe has announced any official Rust SDK was not confirmed against Stripe's own SDK list; the finding is "none surfaced in search".
