# OpenFabric benchmark report: E04 confirmatory campaign

> Copy of the harness report (`node src/cli.mjs report`). Two things differ from the original: the endpoint URL is replaced by a description, and the per-test table is omitted as explained below. The raw data listed in the last line stays outside git. The campaign was interrupted once after 16 runs and resumed on the same instrument (see the record).

Model `hf.co/bartowski/Qwen2.5-Coder-7B-Instruct-GGUF:Q4_K_M` at `a local OpenAI-compatible endpoint (Docker Model Runner)`, temperature 0.2, max 8192 output tokens per call, at most 6 calls per run, 5 run(s) per cell, runtime docker. Started 2026-11-21T16:10:39.271Z. Harness commit `00f6b0c`. Experiment hash `3b3adef503d66d97`.

**How to read it.** Every arm gets the same task, the same model, the same maximum number of calls and the same smoke-check feedback. A run stops when every check its arm can see passes, or when the budget runs out. The `tests` arm also sees the 8 public tests; the OpenFabric arms see them plus the piece, so `of-spec` versus `tests` isolates the value of the piece. All arms are judged by the same hidden HTTP suite on a fresh start; no model ever sees it. "Tokens per passed test" is total tokens divided by hidden tests passed, summed over runs. "Runs passing both suites" counts the runs that pass every test of both hidden suites. Both hidden suites also judge the state after every attempt, only to be recorded (never shown to the model): "Correct at the first attempt" counts the runs whose state after attempt 1 passes every test of both suites. The final judgement on a fresh build stays the primary metric. "Second hidden suite passed" comes from an independent suite (tests X01 onward) written from the task alone, without seeing the piece or the primary suite; it checks that the result does not depend on who wrote the judge.

## django

| Arm | Runs | Hidden tests passed | Second hidden suite passed | Runs passing both suites | Input tokens | Output tokens | Total tokens | Tokens per passed test | Model calls | Minutes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| kit-bare.cart | 5 | 100.0 ± 0.0% | 100.0 ± 0.0% | 5/5 | 3,124 ± 0 | 160 ± 9 | 3,284 ± 9 | 156 | 1.0 ± 0.0 | 1.6 ± 0.1 |
| kit-tests.cart | 5 | 99.0 ± 2.1% | 99.2 ± 1.7% | 4/5 | 3,352 ± 0 | 147 ± 11 | 3,499 ± 11 | 168 | 1.0 ± 0.0 | 1.7 ± 0.1 |
| kit-bare.discount | 5 | 99.0 ± 2.1% | 98.5 ± 3.4% | 4/5 | 3,099 ± 0 | 85 ± 2 | 3,184 ± 2 | 153 | 1.0 ± 0.0 | 1.6 ± 0.1 |
| kit-tests.discount | 5 | 100.0 ± 0.0% | 100.0 ± 0.0% | 5/5 | 3,327 ± 0 | 86 ± 0 | 3,413 ± 0 | 163 | 1.0 ± 0.0 | 1.6 ± 0.1 |
| kit-bare.ledger | 5 | 100.0 ± 0.0% | 100.0 ± 0.0% | 5/5 | 3,148 ± 0 | 114 ± 0 | 3,262 ± 0 | 155 | 1.0 ± 0.0 | 1.6 ± 0.1 |
| kit-tests.ledger | 5 | 100.0 ± 0.0% | 100.0 ± 0.0% | 5/5 | 3,376 ± 0 | 114 ± 0 | 3,490 ± 0 | 166 | 1.0 ± 0.0 | 1.6 ± 0.0 |
| kit-bare.signature | 5 | 76.2 ± 0.0% | 61.5 ± 0.0% | 0/5 | 3,161 ± 0 | 144 ± 4 | 3,305 ± 4 | 207 | 1.0 ± 0.0 | 1.6 ± 0.2 |
| kit-tests.signature | 5 | 75.2 ± 2.1% | 61.5 ± 0.0% | 0/5 | 23,944 ± 462 | 1,130 ± 611 | 25,074 ± 1,071 | 1,587 | 6.0 ± 0.0 | 5.3 ± 0.3 |
| kit-bare.webhook | 5 | 95.2 ± 0.0% | 92.3 ± 0.0% | 0/5 | 3,215 ± 0 | 108 ± 1 | 3,323 ± 1 | 166 | 1.0 ± 0.0 | 1.5 ± 0.1 |
| kit-tests.webhook | 5 | 95.2 ± 0.0% | 92.3 ± 0.0% | 0/5 | 3,443 ± 0 | 108 ± 1 | 3,551 ± 1 | 178 | 1.0 ± 0.0 | 1.6 ± 0.1 |

**Correct at the first attempt** (the hidden suites judged the state after attempt 1, so every arm is scored with the same number of calls; the model never sees this judgement)

| Arm | Correct at the first attempt |
| --- | --- |
| kit-bare.cart | 5 of 5 |
| kit-tests.cart | 4 of 5 |
| kit-bare.discount | 4 of 5 |
| kit-tests.discount | 5 of 5 |
| kit-bare.ledger | 5 of 5 |
| kit-tests.ledger | 5 of 5 |
| kit-bare.signature | 0 of 5 |
| kit-tests.signature | 0 of 5 |
| kit-bare.webhook | 0 of 5 |
| kit-tests.webhook | 0 of 5 |

## nextjs

| Arm | Runs | Hidden tests passed | Second hidden suite passed | Runs passing both suites | Input tokens | Output tokens | Total tokens | Tokens per passed test | Model calls | Minutes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| kit-bare.cart | 5 | 98.1 ± 2.6% | 98.5 ± 2.1% | 3/5 | 3,277 ± 0 | 254 ± 41 | 3,531 ± 41 | 171 | 1.0 ± 0.0 | 1.7 ± 0.4 |
| kit-tests.cart | 5 | 58.1 ± 53.1% | 58.5 ± 53.4% | 1/5 | 14,183 ± 14,623 | 1,583 ± 1,847 | 15,765 ± 16,466 | 1,292 | 3.0 ± 2.7 | 2.5 ± 1.1 |
| kit-bare.discount | 5 | 95.2 ± 0.0% | 92.3 ± 0.0% | 0/5 | 3,238 ± 0 | 113 ± 36 | 3,351 ± 36 | 168 | 1.0 ± 0.0 | 1.7 ± 0.5 |
| kit-tests.discount | 5 | 93.3 ± 4.3% | 92.3 ± 0.0% | 0/5 | 3,466 ± 0 | 151 ± 8 | 3,617 ± 8 | 185 | 1.0 ± 0.0 | 1.6 ± 0.5 |
| kit-bare.ledger | 5 | 80.0 ± 44.7% | 80.0 ± 44.7% | 4/5 | 7,959 ± 10,439 | 327 ± 382 | 8,286 ± 10,820 | 493 | 2.0 ± 2.2 | 2.0 ± 0.8 |
| kit-tests.ledger | 5 | 99.0 ± 2.1% | 98.5 ± 3.4% | 4/5 | 7,712 ± 9,376 | 637 ± 1,058 | 8,349 ± 10,434 | 401 | 2.0 ± 2.2 | 2.7 ± 2.9 |
| kit-bare.signature | 5 | 76.2 ± 0.0% | 61.5 ± 0.0% | 0/5 | 3,299 ± 0 | 119 ± 2 | 3,418 ± 2 | 214 | 1.0 ± 0.0 | 1.7 ± 0.6 |
| kit-tests.signature | 5 | 76.2 ± 0.0% | 61.5 ± 0.0% | 0/5 | 23,329 ± 51 | 715 ± 5 | 24,044 ± 53 | 1,503 | 6.0 ± 0.0 | 4.9 ± 0.7 |
| kit-bare.webhook | 5 | 0.0 ± 0.0% | 0.0 ± 0.0% | 0/5 | 29,458 ± 887 | 2,307 ± 426 | 31,765 ± 1,054 | no test passed | 6.0 ± 0.0 | 2.7 ± 0.5 |
| kit-tests.webhook | 5 | 0.0 ± 0.0% | 0.0 ± 0.0% | 0/5 | 31,159 ± 478 | 2,145 ± 440 | 33,304 ± 915 | no test passed | 6.0 ± 0.0 | 2.7 ± 0.4 |

**Correct at the first attempt** (the hidden suites judged the state after attempt 1, so every arm is scored with the same number of calls; the model never sees this judgement)

| Arm | Correct at the first attempt |
| --- | --- |
| kit-bare.cart | 3 of 5 |
| kit-tests.cart | 1 of 5 |
| kit-bare.discount | 0 of 5 |
| kit-tests.discount | 0 of 5 |
| kit-bare.ledger | 4 of 5 |
| kit-tests.ledger | 4 of 5 |
| kit-bare.signature | 0 of 5 |
| kit-tests.signature | 0 of 5 |
| kit-bare.webhook | 0 of 5 |
| kit-tests.webhook | 0 of 5 |

## All stacks combined

| Arm | Runs | Hidden tests passed | Second hidden suite passed | Runs passing both suites | Input tokens | Output tokens | Total tokens | Tokens per passed test | Model calls | Minutes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| kit-bare.cart | 10 | 99.0 ± 2.0% | 99.2 ± 1.6% | 8/10 | 3,201 ± 81 | 207 ± 57 | 3,408 ± 133 | 164 | 1.0 ± 0.0 | 1.6 ± 0.3 |
| kit-tests.cart | 10 | 78.6 ± 41.5% | 78.8 ± 41.6% | 5/10 | 8,767 ± 11,297 | 865 ± 1,445 | 9,632 ± 12,740 | 584 | 2.0 ± 2.1 | 2.1 ± 0.8 |
| kit-bare.discount | 10 | 97.1 ± 2.5% | 95.4 ± 4.0% | 4/10 | 3,169 ± 73 | 99 ± 28 | 3,268 ± 91 | 160 | 1.0 ± 0.0 | 1.6 ± 0.3 |
| kit-tests.discount | 10 | 96.7 ± 4.5% | 96.2 ± 4.1% | 5/10 | 3,397 ± 73 | 119 ± 35 | 3,515 ± 108 | 173 | 1.0 ± 0.0 | 1.6 ± 0.3 |
| kit-bare.ledger | 10 | 90.0 ± 31.6% | 90.0 ± 31.6% | 9/10 | 5,554 ± 7,407 | 220 ± 278 | 5,774 ± 7,684 | 306 | 1.5 ± 1.6 | 1.8 ± 0.6 |
| kit-tests.ledger | 10 | 99.5 ± 1.5% | 99.2 ± 2.4% | 9/10 | 5,544 ± 6,656 | 375 ± 757 | 5,919 ± 7,413 | 283 | 1.5 ± 1.6 | 2.1 ± 2.0 |
| kit-bare.signature | 10 | 76.2 ± 0.0% | 61.5 ± 0.0% | 0/10 | 3,230 ± 73 | 132 ± 14 | 3,362 ± 59 | 210 | 1.0 ± 0.0 | 1.6 ± 0.4 |
| kit-tests.signature | 10 | 75.7 ± 1.5% | 61.5 ± 0.0% | 0/10 | 23,637 ± 448 | 923 ± 463 | 24,559 ± 897 | 1,545 | 6.0 ± 0.0 | 5.1 ± 0.6 |
| kit-bare.webhook | 10 | 47.6 ± 50.2% | 46.2 ± 48.7% | 0/10 | 16,337 ± 13,844 | 1,207 ± 1,193 | 17,544 ± 15,007 | 1,754 | 3.5 ± 2.6 | 2.1 ± 0.7 |
| kit-tests.webhook | 10 | 47.6 ± 50.2% | 46.2 ± 48.7% | 0/10 | 17,301 ± 14,611 | 1,126 ± 1,113 | 18,427 ± 15,693 | 1,843 | 3.5 ± 2.6 | 2.2 ± 0.7 |

of-code exists only for stacks that have a code piece, so its combined row covers fewer stacks.

## Slot arms: runs with every hidden test passing

In the kit arms the tool installs the reference service and the model writes one function (the slot). Any hidden failure therefore comes from that function. A run counts here only when both hidden suites pass in full. `kit-bare` sees the task and the slot contract; `kit-tests` also sees the public tests and their results.

| Stack | Slot | kit-bare correct | kit-tests correct | kit-bare calls | kit-tests calls | kit-bare tokens | kit-tests tokens |
| --- | --- | --- | --- | --- | --- | --- | --- |
| django | cart | 5/5 | 4/5 | 1.0 | 1.0 | 3,284 | 3,499 |
| django | discount | 4/5 | 5/5 | 1.0 | 1.0 | 3,184 | 3,413 |
| django | ledger | 5/5 | 5/5 | 1.0 | 1.0 | 3,262 | 3,490 |
| django | signature | 0/5 | 0/5 | 1.0 | 6.0 | 3,305 | 25,074 |
| django | webhook | 0/5 | 0/5 | 1.0 | 1.0 | 3,323 | 3,551 |
| nextjs | cart | 3/5 | 1/5 | 1.0 | 3.0 | 3,531 | 15,765 |
| nextjs | discount | 0/5 | 0/5 | 1.0 | 1.0 | 3,351 | 3,617 |
| nextjs | ledger | 4/5 | 4/5 | 2.0 | 2.0 | 8,286 | 8,349 |
| nextjs | signature | 0/5 | 0/5 | 1.0 | 6.0 | 3,418 | 24,044 |
| nextjs | webhook | 0/5 | 0/5 | 6.0 | 6.0 | 31,765 | 33,304 |

## How each run ended

| Cell | Visible checks passed | Budget exhausted | Model error | Final build failed |
| --- | --- | --- | --- | --- |
| django / kit-bare.cart | 5 | 0 | 0 | 0 |
| django / kit-tests.cart | 5 | 0 | 0 | 0 |
| django / kit-bare.discount | 5 | 0 | 0 | 0 |
| django / kit-tests.discount | 5 | 0 | 0 | 0 |
| django / kit-bare.ledger | 5 | 0 | 0 | 0 |
| django / kit-tests.ledger | 5 | 0 | 0 | 0 |
| django / kit-bare.signature | 5 | 0 | 0 | 0 |
| django / kit-tests.signature | 0 | 5 | 0 | 0 |
| django / kit-bare.webhook | 5 | 0 | 0 | 0 |
| django / kit-tests.webhook | 5 | 0 | 0 | 0 |
| nextjs / kit-bare.cart | 5 | 0 | 0 | 0 |
| nextjs / kit-tests.cart | 3 | 2 | 0 | 2 |
| nextjs / kit-bare.discount | 5 | 0 | 0 | 0 |
| nextjs / kit-tests.discount | 5 | 0 | 0 | 0 |
| nextjs / kit-bare.ledger | 4 | 1 | 0 | 1 |
| nextjs / kit-tests.ledger | 4 | 1 | 0 | 0 |
| nextjs / kit-bare.signature | 5 | 0 | 0 | 0 |
| nextjs / kit-tests.signature | 0 | 5 | 0 | 0 |
| nextjs / kit-bare.webhook | 0 | 5 | 0 | 5 |
| nextjs / kit-tests.webhook | 0 | 5 | 0 | 5 |

## Environment and integrity

- Machine: win32/x64, 12 CPUs (AMD Ryzen 5 2600 Six-Core Processor            ), 16 GB RAM, Node v22.19.0
- SHA-256 of suites/lib.mjs: `feb64edbfa3f1620c62be91e4b22086a8a302c5eff9b125070f13b6f291671ed`
- SHA-256 of suites/smoke.mjs: `be6692967eac9a9bc5549076bbf6fc735a8631006bce47bdf9784d098f6eb5e4`
- SHA-256 of suites/public.mjs: `a643785315a1f329e6a5b5f2b4cf4bf177b1024825534bbf198e0b05940b7f28`
- SHA-256 of suites/hidden.mjs: `b920e1d49632fdf9024eb4bdfa274af02303a3eede7502ca18ad0e68ad915b9f`
- SHA-256 of suites/hidden2.mjs: `1e3d4f037597bdea62ec779984fb8b8fdf0b1452b0d16fbd70c01f72d691ed8b`
- The hidden suite was written before any model run and must not change between runs that are compared. Compare the hashes above across reports.
- Raw data: `runs/*/metrics.json` (numbers), `runs/*/transcript.jsonl` (every prompt and answer), `runs/*/workspace` (the code each run produced).
