# OpenFabric benchmark report: exploratorio-7b-loop2

> Copy of the harness report (`node src/cli.mjs report`). Two things differ from the original: the endpoint URL is replaced by a description, and the per-test table is omitted as explained below. The raw data listed in the last line stays outside git.

Model `hf.co/bartowski/Qwen2.5-Coder-7B-Instruct-GGUF:Q4_K_M` at a local OpenAI-compatible endpoint (Docker Model Runner), temperature 0.2, max 8192 output tokens per call, at most 6 calls per run, 4 run(s) per cell, runtime docker. Started 2026-11-11T02:55:05.661Z. Harness commit `c90c80a` (with uncommitted changes). Experiment hash `94393a0e352d5b28`.

**How to read it.** Every arm gets the same task, the same model, the same maximum number of calls and the same smoke-check feedback. A run stops when every check its arm can see passes, or when the budget runs out. The `tests` arm also sees the 8 public tests; the OpenFabric arms see them plus the piece, so `of-spec` versus `tests` isolates the value of the piece. All arms are judged by the same hidden HTTP suite on a fresh start; no model ever sees it. "Tokens per passed test" is total tokens divided by hidden tests passed, summed over runs. "Second hidden suite passed" comes from an independent suite (tests X01 onward) written from the task alone, without seeing the piece or the primary suite; it checks that the result does not depend on who wrote the judge.

## django

| Arm | Runs | Hidden tests passed | Second hidden suite passed | Fully correct runs | Input tokens | Output tokens | Total tokens | Tokens per passed test | Model calls | Minutes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| bare (task only) | 4 | 0.0 ± 0.0% | 0.0 ± 0.0% | 0/4 | 27,193 ± 5,806 | 27,611 ± 17,834 | 54,804 ± 13,485 | no test passed | 6.0 ± 0.0 | 15.8 ± 5.5 |
| tests (task + public test feedback, no piece) | 4 | 0.0 ± 0.0% | 0.0 ± 0.0% | 0/4 | 35,738 ± 4,977 | 20,193 ± 16,518 | 55,931 ± 11,847 | no test passed | 6.0 ± 0.0 | 12.6 ± 5.4 |

## nextjs

| Arm | Runs | Hidden tests passed | Second hidden suite passed | Fully correct runs | Input tokens | Output tokens | Total tokens | Tokens per passed test | Model calls | Minutes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| bare (task only) | 4 | 0.0 ± 0.0% | 0.0 ± 0.0% | 0/4 | 40,306 ± 2,994 | 13,110 ± 1,658 | 53,415 ± 2,896 | no test passed | 6.0 ± 0.0 | 7.1 ± 0.2 |
| tests (task + public test feedback, no piece) | 4 | 0.0 ± 0.0% | 0.0 ± 0.0% | 0/4 | 42,336 ± 1,003 | 11,528 ± 4,869 | 53,865 ± 5,507 | no test passed | 6.0 ± 0.0 | 6.4 ± 1.2 |

## All stacks combined

| Arm | Runs | Hidden tests passed | Second hidden suite passed | Fully correct runs | Input tokens | Output tokens | Total tokens | Tokens per passed test | Model calls | Minutes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| bare (task only) | 8 | 0.0 ± 0.0% | 0.0 ± 0.0% | 0/8 | 33,750 ± 8,210 | 20,360 ± 14,056 | 54,110 ± 9,060 | no test passed | 6.0 ± 0.0 | 11.5 ± 5.9 |
| tests (task + public test feedback, no piece) | 8 | 0.0 ± 0.0% | 0.0 ± 0.0% | 0/8 | 39,037 ± 4,846 | 15,861 ± 12,188 | 54,898 ± 8,624 | no test passed | 6.0 ± 0.0 | 9.5 ± 4.9 |

of-code exists only for stacks that have a code piece, so its combined row covers fewer stacks.

## Hidden tests: pass rate per cell

Omitted from this copy. The harness report lists every hidden test by name; the names stay out of the experiment records so the judge is not described outside `bench/suites/`. Nothing is lost here: all 47 tests scored 0% in every cell.

## How each run ended

| Cell | Visible checks passed | Budget exhausted | Model error | Final build failed |
| --- | --- | --- | --- | --- |
| django / bare | 0 | 4 | 0 | 2 |
| django / tests | 0 | 4 | 0 | 2 |
| nextjs / bare | 0 | 4 | 0 | 4 |
| nextjs / tests | 0 | 4 | 0 | 4 |

## Environment and integrity

- Machine: win32/x64, 12 CPUs (AMD Ryzen 5 2600 Six-Core Processor            ), 16 GB RAM, Node v22.19.0
- SHA-256 of suites/lib.mjs: `1ba4d1ed4396d5b9966a6622f0337d122c815f33ecf26b690c6479784cb186f1`
- SHA-256 of suites/smoke.mjs: `be6692967eac9a9bc5549076bbf6fc735a8631006bce47bdf9784d098f6eb5e4`
- SHA-256 of suites/public.mjs: `a643785315a1f329e6a5b5f2b4cf4bf177b1024825534bbf198e0b05940b7f28`
- SHA-256 of suites/hidden.mjs: `b920e1d49632fdf9024eb4bdfa274af02303a3eede7502ca18ad0e68ad915b9f`
- SHA-256 of suites/hidden2.mjs: `1e3d4f037597bdea62ec779984fb8b8fdf0b1452b0d16fbd70c01f72d691ed8b`
- The hidden suite was written before any model run and must not change between runs that are compared. Compare the hashes above across reports.
- Raw data: `runs/*/metrics.json` (numbers), `runs/*/transcript.jsonl` (every prompt and answer), `runs/*/workspace` (the code each run produced).
