# OpenFabric benchmark report: E04 exploratory campaign

> Copy of the harness report (`node src/cli.mjs report`). Two things differ from the original: the endpoint URL is replaced by a description, and the per-test table is omitted as explained below. The raw data listed in the last line stays outside git. The campaign was interrupted once after 16 runs and resumed on the same instrument (see the record).

Model `hf.co/bartowski/Qwen2.5-Coder-7B-Instruct-GGUF:Q4_K_M` at a local OpenAI-compatible endpoint (Docker Model Runner), temperature 0.2, max 8192 output tokens per call, at most 6 calls per run, 1 run(s) per cell, runtime docker. Started 2026-11-18T17:11:07.025Z. Harness commit `47ede0e`. Experiment hash `3b3adef503d66d97`.

**How to read it.** Every arm gets the same task, the same model, the same maximum number of calls and the same smoke-check feedback. A run stops when every check its arm can see passes, or when the budget runs out. The `tests` arm also sees the 8 public tests; the OpenFabric arms see them plus the piece, so `of-spec` versus `tests` isolates the value of the piece. All arms are judged by the same hidden HTTP suite on a fresh start; no model ever sees it. "Tokens per passed test" is total tokens divided by hidden tests passed, summed over runs. "Runs passing both suites" counts the runs that pass every test of both hidden suites. Both hidden suites also judge the state after every attempt, only to be recorded (never shown to the model): "Correct at the first attempt" counts the runs whose state after attempt 1 passes every test of both suites. The final judgement on a fresh build stays the primary metric. "Second hidden suite passed" comes from an independent suite (tests X01 onward) written from the task alone, without seeing the piece or the primary suite; it checks that the result does not depend on who wrote the judge.

## django

| Arm | Runs | Hidden tests passed | Second hidden suite passed | Runs passing both suites | Input tokens | Output tokens | Total tokens | Tokens per passed test | Model calls | Minutes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| kit-bare.cart | 1 | 100.0 ± 0.0% | 100.0 ± 0.0% | 1/1 | 3,124 ± 0 | 177 ± 0 | 3,301 ± 0 | 157 | 1.0 ± 0.0 | 1.7 ± 0.0 |
| kit-tests.cart | 1 | 100.0 ± 0.0% | 100.0 ± 0.0% | 1/1 | 3,352 ± 0 | 154 ± 0 | 3,506 ± 0 | 167 | 1.0 ± 0.0 | 3.7 ± 0.0 |
| kit-bare.discount | 1 | 100.0 ± 0.0% | 100.0 ± 0.0% | 1/1 | 3,099 ± 0 | 86 ± 0 | 3,185 ± 0 | 152 | 1.0 ± 0.0 | 1.7 ± 0.0 |
| kit-tests.discount | 1 | 100.0 ± 0.0% | 100.0 ± 0.0% | 1/1 | 3,327 ± 0 | 86 ± 0 | 3,413 ± 0 | 163 | 1.0 ± 0.0 | 1.8 ± 0.0 |
| kit-bare.ledger | 1 | 100.0 ± 0.0% | 100.0 ± 0.0% | 1/1 | 3,148 ± 0 | 114 ± 0 | 3,262 ± 0 | 155 | 1.0 ± 0.0 | 1.7 ± 0.0 |
| kit-tests.ledger | 1 | 100.0 ± 0.0% | 100.0 ± 0.0% | 1/1 | 3,376 ± 0 | 114 ± 0 | 3,490 ± 0 | 166 | 1.0 ± 0.0 | 2.1 ± 0.0 |
| kit-bare.signature | 1 | 76.2 ± 0.0% | 61.5 ± 0.0% | 0/1 | 3,161 ± 0 | 142 ± 0 | 3,303 ± 0 | 206 | 1.0 ± 0.0 | 1.6 ± 0.0 |
| kit-tests.signature | 1 | 76.2 ± 0.0% | 61.5 ± 0.0% | 0/1 | 24,637 ± 0 | 9,848 ± 0 | 34,485 ± 0 | 2,155 | 6.0 ± 0.0 | 13.3 ± 0.0 |
| kit-bare.webhook | 1 | 95.2 ± 0.0% | 92.3 ± 0.0% | 0/1 | 3,215 ± 0 | 107 ± 0 | 3,322 ± 0 | 166 | 1.0 ± 0.0 | 1.6 ± 0.0 |
| kit-tests.webhook | 1 | 95.2 ± 0.0% | 92.3 ± 0.0% | 0/1 | 3,443 ± 0 | 107 ± 0 | 3,550 ± 0 | 178 | 1.0 ± 0.0 | 1.9 ± 0.0 |

**Correct at the first attempt** (the hidden suites judged the state after attempt 1, so every arm is scored with the same number of calls; the model never sees this judgement)

| Arm | Correct at the first attempt |
| --- | --- |
| kit-bare.cart | 1 of 1 |
| kit-tests.cart | 1 of 1 |
| kit-bare.discount | 1 of 1 |
| kit-tests.discount | 1 of 1 |
| kit-bare.ledger | 1 of 1 |
| kit-tests.ledger | 1 of 1 |
| kit-bare.signature | 0 of 1 |
| kit-tests.signature | 0 of 1 |
| kit-bare.webhook | 0 of 1 |
| kit-tests.webhook | 0 of 1 |

## nextjs

| Arm | Runs | Hidden tests passed | Second hidden suite passed | Runs passing both suites | Input tokens | Output tokens | Total tokens | Tokens per passed test | Model calls | Minutes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| kit-bare.cart | 1 | 95.2 ± 0.0% | 96.2 ± 0.0% | 0/1 | 3,277 ± 0 | 209 ± 0 | 3,486 ± 0 | 174 | 1.0 ± 0.0 | 1.8 ± 0.0 |
| kit-tests.cart | 1 | 0.0 ± 0.0% | 0.0 ± 0.0% | 0/1 | 28,781 ± 0 | 1,553 ± 0 | 30,334 ± 0 | no test passed | 6.0 ± 0.0 | 2.9 ± 0.0 |
| kit-bare.discount | 1 | 95.2 ± 0.0% | 92.3 ± 0.0% | 0/1 | 3,238 ± 0 | 87 ± 0 | 3,325 ± 0 | 166 | 1.0 ± 0.0 | 2.6 ± 0.0 |
| kit-tests.discount | 1 | 95.2 ± 0.0% | 92.3 ± 0.0% | 0/1 | 3,466 ± 0 | 149 ± 0 | 3,615 ± 0 | 181 | 1.0 ± 0.0 | 1.8 ± 0.0 |
| kit-bare.ledger | 1 | 100.0 ± 0.0% | 100.0 ± 0.0% | 1/1 | 3,291 ± 0 | 151 ± 0 | 3,442 ± 0 | 164 | 1.0 ± 0.0 | 1.9 ± 0.0 |
| kit-tests.ledger | 1 | 100.0 ± 0.0% | 100.0 ± 0.0% | 1/1 | 3,519 ± 0 | 178 ± 0 | 3,697 ± 0 | 176 | 1.0 ± 0.0 | 1.9 ± 0.0 |
| kit-bare.signature | 1 | 76.2 ± 0.0% | 61.5 ± 0.0% | 0/1 | 3,299 ± 0 | 122 ± 0 | 3,421 ± 0 | 214 | 1.0 ± 0.0 | 1.8 ± 0.0 |
| kit-tests.signature | 1 | 76.2 ± 0.0% | 61.5 ± 0.0% | 0/1 | 23,537 ± 0 | 1,177 ± 0 | 24,714 ± 0 | 1,545 | 6.0 ± 0.0 | 7.6 ± 0.0 |
| kit-bare.webhook | 1 | 0.0 ± 0.0% | 0.0 ± 0.0% | 0/1 | 30,102 ± 0 | 2,544 ± 0 | 32,646 ± 0 | no test passed | 6.0 ± 0.0 | 2.9 ± 0.0 |
| kit-tests.webhook | 1 | 0.0 ± 0.0% | 0.0 ± 0.0% | 0/1 | 30,932 ± 0 | 1,914 ± 0 | 32,846 ± 0 | no test passed | 6.0 ± 0.0 | 3.1 ± 0.0 |

**Correct at the first attempt** (the hidden suites judged the state after attempt 1, so every arm is scored with the same number of calls; the model never sees this judgement)

| Arm | Correct at the first attempt |
| --- | --- |
| kit-bare.cart | 0 of 1 |
| kit-tests.cart | 0 of 1 |
| kit-bare.discount | 0 of 1 |
| kit-tests.discount | 0 of 1 |
| kit-bare.ledger | 1 of 1 |
| kit-tests.ledger | 1 of 1 |
| kit-bare.signature | 0 of 1 |
| kit-tests.signature | 0 of 1 |
| kit-bare.webhook | 0 of 1 |
| kit-tests.webhook | 0 of 1 |

## All stacks combined

| Arm | Runs | Hidden tests passed | Second hidden suite passed | Runs passing both suites | Input tokens | Output tokens | Total tokens | Tokens per passed test | Model calls | Minutes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| kit-bare.cart | 2 | 97.6 ± 3.4% | 98.1 ± 2.7% | 1/2 | 3,201 ± 108 | 193 ± 23 | 3,394 ± 131 | 166 | 1.0 ± 0.0 | 1.8 ± 0.1 |
| kit-tests.cart | 2 | 50.0 ± 70.7% | 50.0 ± 70.7% | 1/2 | 16,067 ± 17,981 | 854 ± 989 | 16,920 ± 18,970 | 1,611 | 3.5 ± 3.5 | 3.3 ± 0.5 |
| kit-bare.discount | 2 | 97.6 ± 3.4% | 96.2 ± 5.4% | 1/2 | 3,169 ± 98 | 87 ± 1 | 3,255 ± 99 | 159 | 1.0 ± 0.0 | 2.2 ± 0.7 |
| kit-tests.discount | 2 | 97.6 ± 3.4% | 96.2 ± 5.4% | 1/2 | 3,397 ± 98 | 118 ± 45 | 3,514 ± 143 | 171 | 1.0 ± 0.0 | 1.8 ± 0.0 |
| kit-bare.ledger | 2 | 100.0 ± 0.0% | 100.0 ± 0.0% | 2/2 | 3,220 ± 101 | 133 ± 26 | 3,352 ± 127 | 160 | 1.0 ± 0.0 | 1.8 ± 0.1 |
| kit-tests.ledger | 2 | 100.0 ± 0.0% | 100.0 ± 0.0% | 2/2 | 3,448 ± 101 | 146 ± 45 | 3,594 ± 146 | 171 | 1.0 ± 0.0 | 2.0 ± 0.1 |
| kit-bare.signature | 2 | 76.2 ± 0.0% | 61.5 ± 0.0% | 0/2 | 3,230 ± 98 | 132 ± 14 | 3,362 ± 83 | 210 | 1.0 ± 0.0 | 1.7 ± 0.1 |
| kit-tests.signature | 2 | 76.2 ± 0.0% | 61.5 ± 0.0% | 0/2 | 24,087 ± 778 | 5,513 ± 6,131 | 29,600 ± 6,909 | 1,850 | 6.0 ± 0.0 | 10.5 ± 4.0 |
| kit-bare.webhook | 2 | 47.6 ± 67.3% | 46.2 ± 65.3% | 0/2 | 16,659 ± 19,012 | 1,326 ± 1,723 | 17,984 ± 20,735 | 1,798 | 3.5 ± 3.5 | 2.3 ± 1.0 |
| kit-tests.webhook | 2 | 47.6 ± 67.3% | 46.2 ± 65.3% | 0/2 | 17,188 ± 19,438 | 1,011 ± 1,278 | 18,198 ± 20,715 | 1,820 | 3.5 ± 3.5 | 2.5 ± 0.8 |

of-code exists only for stacks that have a code piece, so its combined row covers fewer stacks.

## Slot arms: runs with every hidden test passing

In the kit arms the tool installs the reference service and the model writes one function (the slot). Any hidden failure therefore comes from that function. A run counts here only when both hidden suites pass in full. `kit-bare` sees the task and the slot contract; `kit-tests` also sees the public tests and their results.

| Stack | Slot | kit-bare correct | kit-tests correct | kit-bare calls | kit-tests calls | kit-bare tokens | kit-tests tokens |
| --- | --- | --- | --- | --- | --- | --- | --- |
| django | cart | 1/1 | 1/1 | 1.0 | 1.0 | 3,301 | 3,506 |
| django | discount | 1/1 | 1/1 | 1.0 | 1.0 | 3,185 | 3,413 |
| django | ledger | 1/1 | 1/1 | 1.0 | 1.0 | 3,262 | 3,490 |
| django | signature | 0/1 | 0/1 | 1.0 | 6.0 | 3,303 | 34,485 |
| django | webhook | 0/1 | 0/1 | 1.0 | 1.0 | 3,322 | 3,550 |
| nextjs | cart | 0/1 | 0/1 | 1.0 | 6.0 | 3,486 | 30,334 |
| nextjs | discount | 0/1 | 0/1 | 1.0 | 1.0 | 3,325 | 3,615 |
| nextjs | ledger | 1/1 | 1/1 | 1.0 | 1.0 | 3,442 | 3,697 |
| nextjs | signature | 0/1 | 0/1 | 1.0 | 6.0 | 3,421 | 24,714 |
| nextjs | webhook | 0/1 | 0/1 | 6.0 | 6.0 | 32,646 | 32,846 |

## Hidden tests: pass rate per cell

Omitted from this copy. The harness report lists every hidden test by name; the names stay out of the experiment records so the judge is not described outside `bench/suites/`. The counts per run are in `runs.csv`.

## How each run ended

| Cell | Visible checks passed | Budget exhausted | Model error | Final build failed |
| --- | --- | --- | --- | --- |
| django / kit-bare.cart | 1 | 0 | 0 | 0 |
| django / kit-tests.cart | 1 | 0 | 0 | 0 |
| django / kit-bare.discount | 1 | 0 | 0 | 0 |
| django / kit-tests.discount | 1 | 0 | 0 | 0 |
| django / kit-bare.ledger | 1 | 0 | 0 | 0 |
| django / kit-tests.ledger | 1 | 0 | 0 | 0 |
| django / kit-bare.signature | 1 | 0 | 0 | 0 |
| django / kit-tests.signature | 0 | 1 | 0 | 0 |
| django / kit-bare.webhook | 1 | 0 | 0 | 0 |
| django / kit-tests.webhook | 1 | 0 | 0 | 0 |
| nextjs / kit-bare.cart | 1 | 0 | 0 | 0 |
| nextjs / kit-tests.cart | 0 | 1 | 0 | 1 |
| nextjs / kit-bare.discount | 1 | 0 | 0 | 0 |
| nextjs / kit-tests.discount | 1 | 0 | 0 | 0 |
| nextjs / kit-bare.ledger | 1 | 0 | 0 | 0 |
| nextjs / kit-tests.ledger | 1 | 0 | 0 | 0 |
| nextjs / kit-bare.signature | 1 | 0 | 0 | 0 |
| nextjs / kit-tests.signature | 0 | 1 | 0 | 0 |
| nextjs / kit-bare.webhook | 0 | 1 | 0 | 1 |
| nextjs / kit-tests.webhook | 0 | 1 | 0 | 1 |

## Environment and integrity

- Machine: win32/x64, 12 CPUs (AMD Ryzen 5 2600 Six-Core Processor            ), 16 GB RAM, Node v22.19.0
- SHA-256 of suites/lib.mjs: `feb64edbfa3f1620c62be91e4b22086a8a302c5eff9b125070f13b6f291671ed`
- SHA-256 of suites/smoke.mjs: `be6692967eac9a9bc5549076bbf6fc735a8631006bce47bdf9784d098f6eb5e4`
- SHA-256 of suites/public.mjs: `a643785315a1f329e6a5b5f2b4cf4bf177b1024825534bbf198e0b05940b7f28`
- SHA-256 of suites/hidden.mjs: `b920e1d49632fdf9024eb4bdfa274af02303a3eede7502ca18ad0e68ad915b9f`
- SHA-256 of suites/hidden2.mjs: `1e3d4f037597bdea62ec779984fb8b8fdf0b1452b0d16fbd70c01f72d691ed8b`
- The hidden suite was written before any model run and must not change between runs that are compared. Compare the hashes above across reports.
- Raw data: `runs/*/metrics.json` (numbers), `runs/*/transcript.jsonl` (every prompt and answer), `runs/*/workspace` (the code each run produced).
