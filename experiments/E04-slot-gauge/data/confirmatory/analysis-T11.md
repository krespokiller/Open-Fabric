## experiments/E04-slot-gauge/data/confirmatory/runs.csv

100 runs; arms: kit-bare, kit-tests; stacks: django, nextjs; slots: cart, discount, ledger, signature, webhook.
Mean wall time per run: 2.2 min.
Not in this file: seed.

### Correct runs

| Arm | Runs | Correct | Rate | 95% Wilson | 95% Clopper-Pearson | With no correct run (one-sided 95%) |
| --- | --- | --- | --- | --- | --- | --- |
| kit-bare | 50 | 21 | 42.0% | 29.4% to 55.8% | 28.2% to 56.8% |  |
| kit-tests | 50 | 19 | 38.0% | 25.9% to 51.8% | 24.7% to 52.8% |  |
| all arms | 100 | 40 | 40.0% | 30.9% to 49.8% | 30.3% to 50.3% |  |

### Tokens and cost per correct run

| Arm | Tokens | Mean tokens per run | Cost per correct run |
| --- | --- | --- | --- |
| kit-bare | 333,548 | 6,671 | 15,883 (limits 7,784 to 33,322) |
| kit-tests | 620,531 | 12,411 | 32,660 (limits 17,397 to 64,267) |
| all arms | 954,079 | 9,541 | 23,852 (limits 14,913 to 38,740) |

Each limit holds with 95% confidence on its own; with few runs the bootstrap part of it is approximate. An arm with no correct runs has no estimate, no upper limit and no ratio against another arm.

### Hidden pass fraction (secondary, no verdict)

| Arm | Mean | 95% bootstrap interval |
| --- | --- | --- |
| kit-bare | 80.0% | 70.7% to 88.3% |
| kit-tests | 77.8% | 67.8% to 86.6% |
| all arms | 78.9% | 72.3% to 85.0% |

### Correct runs per stack

| Arm | Stack | Runs | Correct | 95% Wilson |
| --- | --- | --- | --- | --- |
| kit-bare | django | 25 | 14 | 37.1% to 73.3% |
| kit-bare | nextjs | 25 | 7 | 14.3% to 47.6% |
| kit-tests | django | 25 | 14 | 37.1% to 73.3% |
| kit-tests | nextjs | 25 | 5 | 8.9% to 39.1% |

### Gauge against judge

| Arm | Slot | Both pass | Gauge passes, judge fails | Gauge fails, judge passes | Both fail | False confidence | At least half |
| --- | --- | --- | --- | --- | --- | --- | --- |
| kit-bare | cart | 8 | 2 | 0 | 0 | 2 of 10, 20.0% (Wilson 5.7% to 51.0%; Clopper-Pearson 2.5% to 55.6%) | not shown |
| kit-bare | discount | 4 | 6 | 0 | 0 | 6 of 10, 60.0% (Wilson 31.3% to 83.2%; Clopper-Pearson 26.2% to 87.8%) | not shown |
| kit-bare | ledger | 9 | 0 | 0 | 1 | 0 of 9, 0.0% (Wilson 0.0% to 29.9%; Clopper-Pearson 0.0% to 33.6%) | not shown |
| kit-bare | signature | 0 | 10 | 0 | 0 | 10 of 10, 100.0% (Wilson 72.2% to 100.0%; Clopper-Pearson 69.2% to 100.0%) | yes |
| kit-bare | webhook | 0 | 5 | 0 | 5 | 5 of 5, 100.0% (Wilson 56.6% to 100.0%; Clopper-Pearson 47.8% to 100.0%) | not shown |
| kit-tests | cart | 5 | 3 | 0 | 2 | 3 of 8, 37.5% (Wilson 13.7% to 69.4%; Clopper-Pearson 8.5% to 75.5%) | not shown |
| kit-tests | discount | 5 | 5 | 0 | 0 | 5 of 10, 50.0% (Wilson 23.7% to 76.3%; Clopper-Pearson 18.7% to 81.3%) | not shown |
| kit-tests | ledger | 9 | 0 | 0 | 1 | 0 of 9, 0.0% (Wilson 0.0% to 29.9%; Clopper-Pearson 0.0% to 33.6%) | not shown |
| kit-tests | signature | 0 | 0 | 0 | 10 | not estimable | not estimable |
| kit-tests | webhook | 0 | 5 | 0 | 5 | 5 of 5, 100.0% (Wilson 56.6% to 100.0%; Clopper-Pearson 47.8% to 100.0%) | not shown |

False confidence is the share of gauge passes that the judge fails. These are final-state tables: the loop stops when the gauge passes, so they do not give sensitivity or specificity, and a rate is never moved from one arm to another.

### Run classes

| Arm | Delivered correct | Known failure | Silent defect | False rejection | Unclassified | Runs | Right decisions | Right-decision rate | 95% Wilson |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| kit-bare | 21 | 6 | 23 | 0 | 0 | 50 | 27 | 54.0% | 40.4% to 67.0% |
| kit-tests | 19 | 18 | 13 | 0 | 0 | 50 | 37 | 74.0% | 60.4% to 84.1% |

### Run classes per stack

| Arm | Stack | Delivered correct | Known failure | Silent defect | False rejection | Unclassified | Runs | Right decisions | Right-decision rate | 95% Wilson |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| kit-bare | django | 14 | 0 | 11 | 0 | 0 | 25 | 14 | 56.0% | 37.1% to 73.3% |
| kit-bare | nextjs | 7 | 6 | 12 | 0 | 0 | 25 | 13 | 52.0% | 33.5% to 70.0% |
| kit-tests | django | 14 | 5 | 6 | 0 | 0 | 25 | 19 | 76.0% | 56.6% to 88.5% |
| kit-tests | nextjs | 5 | 13 | 7 | 0 | 0 | 25 | 18 | 72.0% | 52.4% to 85.7% |

Delivered correct: the gauge passes and the judge passes. Known failure: the gauge fails and the judge fails. Silent defect: the gauge passes and the judge fails. False rejection: the gauge fails and the judge passes. The decision is right in the first two. The rate is right decisions over classified runs, with a 95% Wilson interval; a run with no gauge result is Unclassified and counts as neither right nor wrong. Descriptive: a gauge that always fails scores one minus the correct rate, so read this rate next to the correct rate.

### kit-tests against kit-bare

| Stratum | Correct, kit-tests | Correct, kit-bare | Difference (points) | Newcombe interval (points) |
| --- | --- | --- | --- | --- |
| stack django | 14 of 25 | 14 of 25 | 0.0 | -25.7 to +25.7 |
| stack nextjs | 5 of 25 | 7 of 25 | -8.0 | -30.5 to +15.5 |
| slot cart | 5 of 10 | 8 of 10 | -30.0 | -60.0 to +10.7 |
| slot discount | 5 of 10 | 4 of 10 | +10.0 | -29.0 to +45.1 (against the pooled direction) |
| slot ledger | 9 of 10 | 9 of 10 | 0.0 | -31.5 to +31.5 |
| slot signature | 0 of 10 | 0 of 10 | 0.0 | -27.8 to +27.8 |
| slot webhook | 0 of 10 | 0 of 10 | 0.0 | -27.8 to +27.8 |
| pooled | 19 of 50 | 21 of 50 | -4.0 | -23.1 to +15.5 (z_R = 2.05) |

Stack and slot rows use 95% intervals. A slot against the pooled direction is a flag, never a gate.

- Exact stratified test (Cochran-Mantel-Haenszel, 4 informative strata of 10): one-sided p = 0.8843, two-sided p = 0.6931.
- Interaction between stacks: none flagged.
- Secondary, no verdict: posterior P(D > 0) = 33.8%, P(D >= d*) = 0.0% (uniform prior per stack and arm).
- Cost per correct run, kit-tests over kit-bare: 2.06 (limits 0.430 to 9.63); log ratio 0.72 = structural 0.62 + retry 0.10.

**Verdict: refuted.** Cause: the upper limit of the difference (0.1555) is below d* (0.3).

Look 1 of 1, 5 runs per cell, 100 runs. d* = +30.0 points, a = 0.025, z_R = 2.05.
Upper limit of the difference: +15.5 points. Exact one-sided p: 0.8843. Positive in every stack: no.
Estimate at least d*: no (reported, never required).

### At the first attempt (calls held equal)

Every run is scored at its first attempt (first_correct), so both arms are compared with the same number of calls.

| Stratum | Correct, kit-tests | Correct, kit-bare | Difference (points) | Newcombe interval (points) |
| --- | --- | --- | --- | --- |
| stack django | 14 of 25 | 14 of 25 | 0.0 | -25.7 to +25.7 |
| stack nextjs | 5 of 25 | 7 of 25 | -8.0 | -30.5 to +15.5 |
| pooled | 19 of 50 | 21 of 50 | -4.0 | -22.4 to +14.7 |

All rows use 95% intervals. Secondary result: no verdict.

### Gauge against judge, per attempt

#### kit-bare

| Slot | a: gauge passes, judge correct | b: gauge passes, judge incorrect | c: gauge fails, judge correct | d: gauge fails, judge incorrect | Sensitivity | Specificity | False confidence | Runs | Attempts | Unjudged | Resamples skipped (sensitivity / specificity / false confidence) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| all | 21 | 23 | 0 | 36 | 36 of 59, 61.0% (bootstrap 30.8% to 77.4%) | 21 of 21, 100.0% (bootstrap 100.0% to 100.0%) | 23 of 44, 52.3% (bootstrap 37.5% to 66.7%) | 50 | 80 | 0 | 0 / 0 / 0 |
| cart | 8 | 2 | 0 | 0 | 0 of 2, 0.0% (bootstrap 0.0% to 0.0%) | 8 of 8, 100.0% (bootstrap 100.0% to 100.0%) | 2 of 10, 20.0% (bootstrap 0.0% to 50.0%) | 10 | 10 | 0 | 1074 / 0 / 0 |
| discount | 4 | 6 | 0 | 0 | 0 of 6, 0.0% (bootstrap 0.0% to 0.0%) | 4 of 4, 100.0% (bootstrap 100.0% to 100.0%) | 6 of 10, 60.0% (bootstrap 30.0% to 90.0%) | 10 | 10 | 0 | 0 / 60 / 0 |
| ledger | 9 | 0 | 0 | 6 | 6 of 6, 100.0% (bootstrap 100.0% to 100.0%) | 9 of 9, 100.0% (bootstrap 100.0% to 100.0%) | 0 of 9, 0.0% (bootstrap 0.0% to 0.0%) | 10 | 15 | 0 | 3414 / 0 / 0 |
| signature | 0 | 10 | 0 | 0 | 0 of 10, 0.0% (bootstrap 0.0% to 0.0%) | not estimable | 10 of 10, 100.0% (bootstrap 100.0% to 100.0%) | 10 | 10 | 0 | 0 / 10000 / 0 |
| webhook | 0 | 5 | 0 | 30 | 30 of 35, 85.7% (bootstrap 60.0% to 96.0%) | not estimable | 5 of 5, 100.0% (bootstrap 100.0% to 100.0%) | 10 | 35 | 0 | 0 / 10000 / 11 |

#### kit-tests

| Slot | a: gauge passes, judge correct | b: gauge passes, judge incorrect | c: gauge fails, judge correct | d: gauge fails, judge incorrect | Sensitivity | Specificity | False confidence | Runs | Attempts | Unjudged | Resamples skipped (sensitivity / specificity / false confidence) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| all | 19 | 13 | 0 | 108 | 108 of 121, 89.3% (bootstrap 80.4% to 94.9%) | 19 of 19, 100.0% (bootstrap 100.0% to 100.0%) | 13 of 32, 40.6% (bootstrap 24.0% to 58.1%) | 50 | 140 | 0 | 0 / 0 / 0 |
| cart | 5 | 3 | 0 | 12 | 12 of 15, 80.0% (bootstrap 0.0% to 100.0%) | 5 of 5, 100.0% (bootstrap 100.0% to 100.0%) | 3 of 8, 37.5% (bootstrap 0.0% to 71.4%) | 10 | 20 | 0 | 9 / 11 / 0 |
| discount | 5 | 5 | 0 | 0 | 0 of 5, 0.0% (bootstrap 0.0% to 0.0%) | 5 of 5, 100.0% (bootstrap 100.0% to 100.0%) | 5 of 10, 50.0% (bootstrap 20.0% to 80.0%) | 10 | 10 | 0 | 9 / 11 / 0 |
| ledger | 9 | 0 | 0 | 6 | 6 of 6, 100.0% (bootstrap 100.0% to 100.0%) | 9 of 9, 100.0% (bootstrap 100.0% to 100.0%) | 0 of 9, 0.0% (bootstrap 0.0% to 0.0%) | 10 | 15 | 0 | 3414 / 0 / 0 |
| signature | 0 | 0 | 0 | 60 | 60 of 60, 100.0% (bootstrap 100.0% to 100.0%) | not estimable | not estimable | 10 | 60 | 0 | 0 / 10000 / 10000 |
| webhook | 0 | 5 | 0 | 30 | 30 of 35, 85.7% (bootstrap 60.0% to 96.0%) | not estimable | 5 of 5, 100.0% (bootstrap 100.0% to 100.0%) | 10 | 35 | 0 | 0 / 10000 / 11 |

Positive means the judge fails. Sensitivity is d / (b + d), specificity a / (a + c), false confidence b / (a + b). Limits are 95% percentile bootstrap limits that resample whole runs (10,000 resamples, seed 20261118); a resample whose denominator is empty is skipped and counted. A rate of 0% or 100% gets limits of zero width from the bootstrap: that says the sample showed no variation, not that the rate is known. Attempts with no judge result are left out and counted as unjudged. Tables are never pooled across arms. Secondary result: no verdict.

