# E03: Exploratory full-task run after the loop fixes

**The loop fixes did not lift the floor.** 16 of 16 runs scored 0 of 21 and 0 of 26 hidden tests. The 7B local model cannot serve as the instrument for the full task, so `tests` against `bare` stays unreadable at this task size. The comparison moves to slot level in [E04](../E04-slot-gauge/README.md).

| Field | Value |
| --- | --- |
| Status | `reported` |
| Kind | exploratory. No criterion, no verdict, never pooled with confirmatory data |
| Dates | 2026-11-11, 02:55 UTC to 05:43 UTC |
| Theses | None preregistered. It informs the design of T11 to T13. See [`docs/theses.md`](../../docs/theses.md) |
| Research questions | RQ1 Gauge: `tests` against `bare`, at full-task size |
| Scope | Django and Next.js; Qwen2.5-Coder 7B (Q4_K_M) on a local GPU; the checkout task; arms `bare` and `tests` |
| Tag and hash | No tag. Commit `c90c80a` plus uncommitted changes; harness hash `94393a0e352d5b282b6aabe7c8d1b1ec4c90e97a62c2ada386286cacd1dce06d` |
| Earlier names | The run label `exploratorio-7b-loop2`, which is the title of [`data/report.md`](data/report.md), and the branch `bench/loop-history-django-migrations`, on which the two fixes were developed |
| Data | [`data/runs.csv`](data/runs.csv), [`data/report.md`](data/report.md), [`data/attempts.csv`](data/attempts.csv) |

## 1. Verdict per thesis

None. An exploratory run gives no verdict. Its job is to find a floor or a ceiling before a criterion is fixed, and it found a floor in both arms: 0 of 8 correct runs in `bare` and 0 of 8 in `tests`.

## 2. Design as preregistered

Nothing was preregistered. This is what ran:

| Item | Value |
| --- | --- |
| Arms | `bare` (the task only) and `tests` (the task, the list of public tests and their results) |
| Stacks | Django and Next.js, in Docker |
| Model and settings | `hf.co/bartowski/Qwen2.5-Coder-7B-Instruct-GGUF:Q4_K_M`, temperature 0.2, at most 8,192 output tokens per call |
| Task | The checkout service of [E01](../E01-pilot-full-task/README.md) |
| Runs per cell and call budget | 4 runs per cell, 4 cells, 16 runs; at most 6 calls per run |
| Fix 1, attempt history | The prompt carries one line per earlier attempt and a warning when an answer is identical to the previous one |
| Fix 2, Django migrations | Start-up runs `makemigrations` and then `migrate --run-syncdb`, so the model no longer writes migrations by hand |
| Harness state | Commit `c90c80a` with uncommitted changes in six files under `bench/`: the Django documentation of the `docs` arm, `src/matrix.mjs`, `src/prompts.mjs`, the Django skeleton `Dockerfile` and `README.md`, and the Django `stack.json` |

## 3. Controls and the exploratory run

| Control | Result |
| --- | --- |
| Reference | With the fixes, the Django reference stays at 59 of 59, also with its migration deleted ([`docs/context.md`](../../docs/context.md)) |
| Selftest | Passed with the fixes. The source is working notes kept outside the repository |
| Empty, can it fail, denominator | Not applicable. There is no criterion |

## 4. Results per stack, then pooled

The numbers are recounted from [`data/runs.csv`](data/runs.csv) and [`data/attempts.csv`](data/attempts.csv). How runs ended comes from the raw per-run data, which stays outside git.

### Django

| Arm | Runs | Correct runs | `hidden` passed | `hidden2` passed | Tokens | Attempts compiled | With new files | At the output cap | Identical retries |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `bare` | 4 | 0 | 0 of 84 | 0 of 104 | 219,216 | 15 of 24 | 5 of 24 | 12 of 24 | 2 of 20 |
| `tests` | 4 | 0 | 0 of 84 | 0 of 104 | 223,722 | 11 of 24 | 6 of 24 | 5 of 24 | 3 of 20 |
| Total | 8 | 0 | 0 of 168 | 0 of 208 | 442,938 | 26 of 48 | 11 of 48 | 17 of 48 | 5 of 40 |

### Next.js

| Arm | Runs | Correct runs | `hidden` passed | `hidden2` passed | Tokens | Attempts compiled | With new files | At the output cap | Identical retries |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `bare` | 4 | 0 | 0 of 84 | 0 of 104 | 213,661 | 1 of 24 | 0 of 24 | 1 of 24 | 6 of 20 |
| `tests` | 4 | 0 | 0 of 84 | 0 of 104 | 215,458 | 0 of 24 | 0 of 24 | 1 of 24 | 6 of 20 |
| Total | 8 | 0 | 0 of 168 | 0 of 208 | 429,119 | 1 of 48 | 0 of 48 | 2 of 48 | 12 of 40 |

"With new files" counts compiled attempts whose answer applied at least one file. In the others the answer applied nothing, usually because it ran into the output cap, and the files from an earlier attempt compiled again. The one compiled attempt in Next.js is the untouched starting project.

### Pooled

| Measure | Value |
| --- | --- |
| Runs | 16 |
| Correct runs | 0 of 16. 95% Wilson interval: 0% to 19.4% |
| `tests` against `bare` | 0 of 8 against 0 of 8 (each 0% to 32.4%) |
| Hidden tests passed | 0 of 336 in `hidden`, 0 of 416 in `hidden2` |
| Tokens | 872,057: 582,292 input and 289,765 output |
| Calls | 96. Every run used its full budget of 6 |
| Attempts compiled | 27 of 96, of which 11 applied new files |
| Visible checks | Every compiled attempt passed exactly one visible check, the health check. No run got past it |
| Attempts that hit the output cap | 19 of 96. `docs/context.md` records that the model repeats the same line until the cap |
| Retries identical to the previous answer | 17 of 80 |
| How runs ended | Next.js: 8 of 8 did not build. Django: 4 of 8 did not build or start; in 2 every test of `hidden` failed on an HTTP 404 and in 2 on an HTTP 500 |

`docs/context.md` describes the failure from the transcripts: in Django the model writes the models and does not connect the routes; in Next.js it does not get out of the TypeScript errors.

### What the fixes changed

This compares the same two arms before and after the fixes. It is a description, not a controlled comparison: the runs differ in number and in date.

| Measure | E01, `bare` and `tests` | E03 |
| --- | --- | --- |
| Hidden tests passed | 0 | 0 |
| Django attempts compiled | 6 of 24 | 26 of 48 |
| Django attempts compiled with new files | 5 of 24 | 11 of 48 |
| Next.js attempts compiled with new files | 0 of 24 | 0 of 48 |
| Retries identical to the previous answer | 17 of 40 | 17 of 80 |
| Attempts that hit the output cap | 2 of 48 | 19 of 96 |

Identical retries went down and runaway answers went up. More Django attempts compile, but most of the gain is attempts that applied no file. The result did not move.

### Together with E01

A count of what the 7B did on the full task. It is a description, not a pooled analysis: exploratory runs are never added to confirmatory data.

| Measure | E01 and E03 | Adding the 4 runs of E01's aborted first attempt |
| --- | --- | --- |
| Full-task runs | 34 | 38 |
| Correct runs | 0 of 34 (0% to 10.2%) | 0 of 38 (0% to 9.2%) |
| Hidden tests passed | 0 | 0 |
| Tokens | 1,825,875 | 2,008,472 |

### Corrections

None.

## 5. Deviations from the preregistration

None. Nothing was preregistered. Two things differ from the rules now in [`docs/method.md`](../../docs/method.md), which were written later:

- It ran 4 runs per cell. An exploratory run is now 1 run per cell.
- The harness had uncommitted changes, so the run cannot be reproduced from a commit. The hash identifies the files that ran.

## 6. Limits

- **Exploratory.** There is no criterion and no verdict, and these runs are never added to confirmatory data.
- **Before and after is not a control.** The comparison with E01 does not isolate the fixes.
- **One model, one task, a minimal loop.** The model cannot run commands and has at most 6 calls. A real agent may behave differently.
- **Only the counts can be rechecked from this repository.** The description of how the model failed comes from transcripts that stay outside git.
- **Authorship of the judge.** `hidden` has the same author as the piece. `hidden2` is independent. Both read zero here.

## 7. What changes

- **Registry:** no status changes. The floor that made T1 to T3 `undecidable` is confirmed for the same model with a better loop.
- **Instrument:** the 7B model is not an instrument for the full task. `docs/context.md` records this conclusion. Any full-task comparison, such as [E05](../E05-line-vs-workshop/README.md), needs a stronger agent or a design that does not depend on writing the service from scratch.
- **Design:** `tests` against `bare` moves to the size of one slot. On 2026-11-11 the owner agreed to build the slot experiment with its criteria written before running. The assistant had proposed it, and the owner answered "sí". The source is working notes kept outside the repository.
- **Harness:** the two fixes stay in the harness. They were committed on 2026-11-17 in `7d84d61`, after this run.
- **Next:** [E04](../E04-slot-gauge/README.md). See [`docs/roadmap.md`](../../docs/roadmap.md).

## Data files

| File | Content |
| --- | --- |
| [`data/runs.csv`](data/runs.csv) | One row per run. Byte-identical to the harness output |
| [`data/report.md`](data/report.md) | The harness report. The endpoint URL is replaced by a description and the table of hidden test names is omitted |
| [`data/attempts.csv`](data/attempts.csv) | One row per run with attempt counts, derived by script from the per-run metrics and transcripts |

Raw workspaces, transcripts and per-run metrics stay outside git.
