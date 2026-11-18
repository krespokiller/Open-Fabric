# OpenFabric benchmark report: piloto

> Copy of the harness report (`node src/cli.mjs report`). Two things differ from the original: the endpoint URL is replaced by a description, and the per-test table is omitted as explained below. The raw data listed in the last line stays outside git.

Model `hf.co/bartowski/Qwen2.5-Coder-7B-Instruct-GGUF:Q4_K_M` at a local OpenAI-compatible endpoint (Docker Model Runner), temperature 0.2, max 8192 output tokens per call, at most 6 calls per run, 3 run(s) per cell, runtime docker. Started 2026-11-09T21:29:55.373Z. Harness commit `c90c80a`. Experiment hash `e3cd4befe3a7b2e4`.

**How to read it.** Every arm gets the same task, the same model, the same maximum number of calls and the same smoke-check feedback. A run stops when every check its arm can see passes, or when the budget runs out. The `tests` arm also sees the 8 public tests; the OpenFabric arms see them plus the piece, so `of-spec` versus `tests` isolates the value of the piece. All arms are judged by the same hidden HTTP suite on a fresh start; no model ever sees it. "Tokens per passed test" is total tokens divided by hidden tests passed, summed over runs. "Second hidden suite passed" comes from an independent suite (tests X01 onward) written from the task alone, without seeing the piece or the primary suite; it checks that the result does not depend on who wrote the judge.

**About of-code.** Its installed code is the same as the Next.js reference implementation that was validated against the hidden suite, so its pass rate measures how well the model mounts the piece and fills the slot, and is partly correct by construction.

## django

| Arm | Runs | Hidden tests passed | Second hidden suite passed | Fully correct runs | Input tokens | Output tokens | Total tokens | Tokens per passed test | Model calls | Minutes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| bare (task only) | 2 | 0.0 ± 0.0% | 0.0 ± 0.0% | 0/2 | 37,212 ± 632 | 14,089 ± 42 | 51,301 ± 590 | no test passed | 6.0 ± 0.0 | 11.4 ± 0.5 |
| docs (task + library docs) | 2 | 0.0 ± 0.0% | 0.0 ± 0.0% | 0/2 | 39,701 ± 1,083 | 12,890 ± 3,026 | 52,591 ± 1,943 | no test passed | 6.0 ± 0.0 | 11.1 ± 0.8 |
| tests (task + public test feedback, no piece) | 2 | 0.0 ± 0.0% | 0.0 ± 0.0% | 0/2 | 35,359 ± 1,517 | 17,290 ± 11,388 | 52,649 ± 9,871 | no test passed | 6.0 ± 0.0 | 12.7 ± 4.6 |
| of-spec (task + OpenFabric piece spec + public tests) | 2 | 0.0 ± 0.0% | 0.0 ± 0.0% | 0/2 | 43,877 ± 311 | 15,899 ± 5,875 | 59,776 ± 6,186 | no test passed | 6.0 ± 0.0 | 12.3 ± 1.7 |

## nextjs

| Arm | Runs | Hidden tests passed | Second hidden suite passed | Fully correct runs | Input tokens | Output tokens | Total tokens | Tokens per passed test | Model calls | Minutes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| bare (task only) | 2 | 0.0 ± 0.0% | 0.0 ± 0.0% | 0/2 | 42,239 ± 285 | 12,009 ± 1,701 | 54,247 ± 1,986 | no test passed | 6.0 ± 0.0 | 8.4 ± 2.1 |
| docs (task + library docs) | 2 | 0.0 ± 0.0% | 0.0 ± 0.0% | 0/2 | 46,018 ± 4,593 | 9,760 ± 5,158 | 55,778 ± 9,751 | no test passed | 6.0 ± 0.0 | 6.4 ± 2.3 |
| tests (task + public test feedback, no piece) | 2 | 0.0 ± 0.0% | 0.0 ± 0.0% | 0/2 | 40,746 ± 960 | 8,404 ± 2,562 | 49,150 ± 3,522 | no test passed | 6.0 ± 0.0 | 5.3 ± 0.7 |
| of-spec (task + OpenFabric piece spec + public tests) | 2 | 0.0 ± 0.0% | 0.0 ± 0.0% | 0/2 | 51,296 ± 800 | 14,474 ± 344 | 65,770 ± 456 | no test passed | 6.0 ± 0.0 | 7.8 ± 0.0 |
| of-code (task + installed OpenFabric code, slot + mount only) | 2 | 0.0 ± 0.0% | 0.0 ± 0.0% | 0/2 | 31,154 ± 144 | 4,495 ± 5,780 | 35,649 ± 5,924 | no test passed | 6.0 ± 0.0 | 6.6 ± 1.4 |

## All stacks combined

| Arm | Runs | Hidden tests passed | Second hidden suite passed | Fully correct runs | Input tokens | Output tokens | Total tokens | Tokens per passed test | Model calls | Minutes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| bare (task only) | 4 | 0.0 ± 0.0% | 0.0 ± 0.0% | 0/4 | 39,725 ± 2,930 | 13,049 ± 1,551 | 52,774 ± 2,079 | no test passed | 6.0 ± 0.0 | 9.9 ± 2.2 |
| docs (task + library docs) | 4 | 0.0 ± 0.0% | 0.0 ± 0.0% | 0/4 | 42,860 ± 4,553 | 11,325 ± 3,897 | 54,185 ± 6,028 | no test passed | 6.0 ± 0.0 | 8.8 ± 3.1 |
| tests (task + public test feedback, no piece) | 4 | 0.0 ± 0.0% | 0.0 ± 0.0% | 0/4 | 38,053 ± 3,278 | 12,847 ± 8,470 | 50,899 ± 6,379 | no test passed | 6.0 ± 0.0 | 9.0 ± 5.0 |
| of-spec (task + OpenFabric piece spec + public tests) | 4 | 0.0 ± 0.0% | 0.0 ± 0.0% | 0/4 | 47,587 ± 4,312 | 15,186 ± 3,496 | 62,773 ± 4,980 | no test passed | 6.0 ± 0.0 | 10.0 ± 2.7 |
| of-code (task + installed OpenFabric code, slot + mount only) | 2 | 0.0 ± 0.0% | 0.0 ± 0.0% | 0/2 | 31,154 ± 144 | 4,495 ± 5,780 | 35,649 ± 5,924 | no test passed | 6.0 ± 0.0 | 6.6 ± 1.4 |

of-code exists only for stacks that have a code piece, so its combined row covers fewer stacks.

## Hidden tests: pass rate per cell

Omitted from this copy. The harness report lists every hidden test by name; the names stay out of the experiment records so the judge is not described outside `bench/suites/`. Nothing is lost here: all 47 tests scored 0% in every cell.

## How each run ended

| Cell | Visible checks passed | Budget exhausted | Model error | Final build failed |
| --- | --- | --- | --- | --- |
| django / bare | 0 | 2 | 0 | 2 |
| django / docs | 0 | 2 | 0 | 1 |
| django / tests | 0 | 2 | 0 | 1 |
| django / of-spec | 0 | 2 | 0 | 1 |
| nextjs / bare | 0 | 2 | 0 | 2 |
| nextjs / docs | 0 | 2 | 0 | 2 |
| nextjs / tests | 0 | 2 | 0 | 2 |
| nextjs / of-spec | 0 | 2 | 0 | 2 |
| nextjs / of-code | 0 | 2 | 0 | 2 |

## Environment and integrity

- Machine: win32/x64, 12 CPUs (AMD Ryzen 5 2600 Six-Core Processor            ), 16 GB RAM, Node v22.19.0
- SHA-256 of suites/lib.mjs: `1ba4d1ed4396d5b9966a6622f0337d122c815f33ecf26b690c6479784cb186f1`
- SHA-256 of suites/smoke.mjs: `be6692967eac9a9bc5549076bbf6fc735a8631006bce47bdf9784d098f6eb5e4`
- SHA-256 of suites/public.mjs: `a643785315a1f329e6a5b5f2b4cf4bf177b1024825534bbf198e0b05940b7f28`
- SHA-256 of suites/hidden.mjs: `b920e1d49632fdf9024eb4bdfa274af02303a3eede7502ca18ad0e68ad915b9f`
- SHA-256 of suites/hidden2.mjs: `1e3d4f037597bdea62ec779984fb8b8fdf0b1452b0d16fbd70c01f72d691ed8b`
- The hidden suite was written before any model run and must not change between runs that are compared. Compare the hashes above across reports.
- Raw data: `runs/*/metrics.json` (numbers), `runs/*/transcript.jsonl` (every prompt and answer), `runs/*/workspace` (the code each run produced).
