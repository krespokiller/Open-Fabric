# Experiments

**No thesis has a verdict for or against the idea yet.** Three experiments have run. A 7B local model scored zero hidden tests in all 34 full-task runs, in every arm, so nothing could be compared. T8 to T10 were discarded after controls that used no model. The next experiment to run is E04. Its exploratory campaign ran on 2026-11-18: both arms had 4 of 10 runs correct, with no verdict. The owner confirmed the criteria on 2026-11-21, and E04 was preregistered with the tag `prereg/E04` on the same day. The confirmatory campaign of 100 runs is next.

Each folder holds one record. The rules are in [`docs/method.md`](../docs/method.md), the theses in [`docs/theses.md`](../docs/theses.md) and the order of work in [`docs/roadmap.md`](../docs/roadmap.md).

## Index

| ID | Date | Theses | Status | Verdict | Finding |
| --- | --- | --- | --- | --- | --- |
| [E01](E01-pilot-full-task/README.md) | 2026-11-09 | T1, T2, T3, T4 | `reported` | T1 to T3 `undecidable` (floor effect). T4 never ran | All 18 runs scored 0 of 21 and 0 of 26 hidden tests in every arm, so no arm can be compared |
| [E02](E02-no-model-controls/README.md) | 2026-11-10 and 11 | T8, T9, T10 | `reported` (control) | None. T8 to T10 `discarded` before running | T8 was met by construction and T9 divided by zero. Two separate hidden suites caught the same rounding error |
| [E03](E03-exploratory-loop-fixes/README.md) | 2026-11-11 (UTC) | None (exploratory) | `reported` (exploratory) | None | After the loop fixes, 16 of 16 full-task runs still scored zero. The 7B is not an instrument for the full task |
| [E04](E04-slot-gauge/README.md) | Not run | T11, T12, T13, T22 | `preregistered` | None yet | Unfilled-slot controls are done. The criteria were revised on 2026-11-18 (proposed by the assistant) and the five instrument problems are closed, including per-attempt judge results. The exploratory campaign ran on 2026-11-18: 4 of 10 correct runs in each arm, no verdict. T22 was proposed from it. The owner confirmed the criteria on 2026-11-21, and E04 was preregistered with the tag `prereg/E04` on the same day. The confirmatory campaign of 100 runs is next |
| [E05](E05-line-vs-workshop/README.md) | Not run | T14, T15, T16, T20 | `proposed` | None yet | The central comparison: assembling against writing from scratch, inside the same stack. Arms are an assistant proposal |
| [E06](E06-piece-questions/README.md) | Not run | T17 | `proposed` | None yet | Do a piece's questions recover the rules a client left out? The harness has no question channel yet |
| [E07](E07-independent-gauge/README.md) | Not run | T18 | `proposed` | None yet | Does a gauge by another author detect more than the model's own tests? "Detects" is not defined yet |
| [E08](E08-composition/README.md) | Not run | T19 | `proposed` | None yet | Do pieces that pass alone pass together? Only one piece exists |

T5 (superseded by T17), T6, T7 and T21 have no experiment. Their status is in [`docs/theses.md`](../docs/theses.md). E05's arms, the revision of T15, T20 and T21 are assistant proposals from 2026-11-17 that the owner has not confirmed.

## What has been spent

Recounted from the `data/` folders of E01 and E03.

| Experiment | Runs | Correct runs | Tokens |
| --- | --- | --- | --- |
| E01, counted runs | 18 | 0 | 953,818 |
| E03 | 16 | 0 | 872,057 |
| Total | 34 | 0 of 34 (95% Wilson interval 0% to 10.2%) | 1,825,875 |
| E01, aborted first attempt (not counted) | 4 | 0 | 182,597 |

## Status values

| Status | Meaning |
| --- | --- |
| `proposed` | A sketch. Arms, metric or criterion are still open |
| `designed` | Arms, metric and controls are written. The criterion is not confirmed |
| `preregistered` | The criterion is fixed and the design is frozen with a tag and a hash |
| `reported` | It ran and the record holds the results |

Verdicts belong to theses, not to experiments: `supported`, `refuted` or `undecidable`, as defined in [`docs/method.md`](../docs/method.md).

## How to read a record

Every record has the same seven sections, in the same order:

1. Verdict per thesis.
2. Design as preregistered.
3. Controls and the exploratory run.
4. Results per stack, then pooled.
5. Deviations from the preregistration.
6. Limits.
7. What changes.

A record that has not run keeps the seven sections and adds, under section 7, the open design questions and what the owner must decide.

## Data

| File | Content |
| --- | --- |
| `data/runs.csv` | One row per run. A byte-identical copy of the harness output |
| `data/report.md` | The harness report. Two things are changed: the endpoint URL is replaced by a description, and the table that names every hidden test is left out |
| `data/attempts.csv` | One row per run with attempt counts, derived by script from the raw per-run data |

Raw workspaces, transcripts and per-run metrics stay outside git. The hidden suites are the judge: no record copies their test names, values or code.

## Adding a record

1. Take the next free number. Numbers are never reused.
2. Copy the block in [`TEMPLATE.md`](TEMPLATE.md) into `E<nn>-<slug>/README.md`.
3. Add a row to the index above.
4. Before the confirmatory run, tag the commit that holds the record as `prereg/E<nn>` and write the harness hash in the record.
