# Description of the runs

## Per pair of stack and slot

| Stack | Slot | kit-bare correct | kit-bare gauge passed | kit-bare decision right | kit-tests correct | kit-tests gauge passed | kit-tests decision right |
| --- | --- | --- | --- | --- | --- | --- | --- |
| django | cart | 5 of 5 | 5 of 5 | 5 of 5 | 4 of 5 | 5 of 5 | 4 of 5 |
| django | discount | 4 of 5 | 5 of 5 | 4 of 5 | 5 of 5 | 5 of 5 | 5 of 5 |
| django | ledger | 5 of 5 | 5 of 5 | 5 of 5 | 5 of 5 | 5 of 5 | 5 of 5 |
| django | signature | 0 of 5 | 5 of 5 | 0 of 5 | 0 of 5 | 0 of 5 | 5 of 5 |
| django | webhook | 0 of 5 | 5 of 5 | 0 of 5 | 0 of 5 | 5 of 5 | 0 of 5 |
| nextjs | cart | 3 of 5 | 5 of 5 | 3 of 5 | 1 of 5 | 3 of 5 | 3 of 5 |
| nextjs | discount | 0 of 5 | 5 of 5 | 0 of 5 | 0 of 5 | 5 of 5 | 0 of 5 |
| nextjs | ledger | 4 of 5 | 4 of 5 | 5 of 5 | 4 of 5 | 4 of 5 | 5 of 5 |
| nextjs | signature | 0 of 5 | 5 of 5 | 0 of 5 | 0 of 5 | 0 of 5 | 5 of 5 |
| nextjs | webhook | 0 of 5 | 0 of 5 | 5 of 5 | 0 of 5 | 0 of 5 | 5 of 5 |

Each entry is a count of runs out of the runs in that pair. The decision is right when the gauge result equals the judge result.

## Agreement inside a cell

| Arm | Cells | Cells with 2 or more runs | Same correct result | Same gauge result |
| --- | --- | --- | --- | --- |
| kit-bare | 10 | 10 | 7 | 9 |
| kit-tests | 10 | 10 | 7 | 8 |

Mixed cells of kit-bare:

- django / discount: 4 of 5 correct
- nextjs / cart: 3 of 5 correct
- nextjs / ledger: 4 of 5 correct

Mixed cells of kit-tests:

- django / cart: 4 of 5 correct
- nextjs / cart: 1 of 5 correct
- nextjs / ledger: 4 of 5 correct

A cell is one arm in one stack and slot. A mixed cell has runs that disagree on correct or wrong, so the same recipe gave different results.

## Detection per run

| Arm | Wrong runs | Never built | Built and rejected | Silent defects | Detection rate | 95% Wilson |
| --- | --- | --- | --- | --- | --- | --- |
| kit-bare | 29 | 6 | 0 | 23 | 6 of 29 (20.7%) | 9.8% to 38.4% |
| kit-tests | 31 | 7 | 11 | 13 | 18 of 31 (58.1%) | 40.8% to 73.6% |

A wrong run is one that fails the hidden judge. It is detected when the run ended without the gauge passing, and it is a silent defect when the gauge passed anyway. The rate is detected runs over wrong runs.

## The loop

| Arm | Runs | Attempts | Runs with more than one attempt | Gauge result changed | Judge result changed | Tokens of first attempts | Tokens of all attempts | Share after the first attempt |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| kit-bare | 50 | 80 | 6 | 0 | 0 | 169,283 | 333,548 | 49.2% |
| kit-tests | 50 | 140 | 18 | 0 | 0 | 180,970 | 620,531 | 70.8% |

Changed means the first and the last attempt of a run gave different results. Tokens are prompt plus completion. The share is the part of all tokens spent after the first attempt.
