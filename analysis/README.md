# Analysis

**What this is.** The statistics for OpenFabric's experiments: a decision rule that says `supported`, `refuted` or `undecidable` to the question "does the treatment arm build correct software more often than the control arm", the simulator that calibrates it, and a command line that analyzes a `runs.csv`. It lives outside `bench/` because the harness there is frozen by a hash. Plain Node 22, no dependencies, every random number seeded. The specification is [`SPEC.md`](SPEC.md); the words arm, stack, cell, run, gauge and judge are defined in [`../docs/method.md`](../docs/method.md).

**The answer it gives.** With 2 stacks and 5 slots, a plan of 3 runs per cell (60 runs) supports a true 40-point difference 84% of the time, supports a world with no effect at most 1.3% of the time, and refutes a true 40-point difference at most 2.3% of the time (the limit is 2.5%). A 20-point difference needs 10 runs per cell (200 runs) for 78% power. The tables at the end are the full evidence.

## Run it

Everything is run from the repository root.

```
node --test analysis/                      # the tests
node analysis/cli.mjs design               # the plan table, about 2.5 minutes
node analysis/cli.mjs analyze experiments/E01-pilot-full-task/data/runs.csv
node analysis/cli.mjs analyze experiments/E03-exploratory-loop-fixes/data/runs.csv
node analysis/cli.mjs analyze experiments/E01-pilot-full-task/data/runs.csv experiments/E03-exploratory-loop-fixes/data/runs.csv
node analysis/cli.mjs help
```

`analyze` takes one or more files and, with several, adds an "All files together" section. A column a file lacks is named in the output, never guessed: the two pilot files have no slot, seed or gauge column, so each stack is one stratum and the gauge tables say "Not available". When an arm has no correct run, the cost per correct run is printed as "at least N tokens per correct run" and no ratio is formed, so nothing divides by zero. To compare two arms add `--treatment ARM --control ARM`; to apply the decision rule to that comparison also add `--d-star 30 --looks 5` with `--z-r 2.05` or `--delta X` (and `--look`, `--hash`, `--plan-hash` for the instrument checks).

## The decision rule

In words. Every arm runs in every stack and slot, in complete blocks (one run in every cell). At each preregistered look, in this order:

1. The instrument hash changed, a block is incomplete or the look was not planned: `undecidable` (broken instrument).
2. Every run failed, or every run passed: stop, `undecidable` (floor or ceiling).
3. The upper limit of the difference is below d* and the stacks do not clearly disagree: `refuted`.
4. The exact stratified test is significant and the difference is positive in every stack: `supported`.
5. Otherwise continue; after the last look, `undecidable`, with its cause.

In formulas. Strata are stack x slot, a cell is arm x stratum, d* is the smallest difference that matters, alpha = 0.025 one-sided.

- Support: p_S = P(T >= t), where T is the number of correct treatment runs summed over strata, under the convolution of one hypergeometric per stratum given its margins (the exact conditional Cochran-Mantel-Haenszel test). Supported when p_S <= a_j. With one stratum this is Fisher's test. Its false-support rate is at most alpha for any base rates, by theorem.
- Refutation: U_j, the upper Newcombe limit of the pooled difference D (the equal-weight mean over strata of p_T - p_C) with constant z_Rj, is below d*.
- Spending: a_j = alpha (t_j^3 - t_(j-1)^3) with t_j = m_j / m_J, so one look spends 0.025, and two looks at half and full spend 0.003125 then 0.021875. z_Rj = Phi^-1(1 - a_j) + delta.
- delta comes from simulation: the smallest value that keeps the worst-case P(refuted | D = d*) at or below 2.5%, with two Monte Carlo standard errors of margin.
- Interaction flag: two stacks with opposite observed signs whose contrast D_k - D_k' has a 95% square-and-add interval (Bonferroni over pairs) that excludes 0.

`supported` means D > 0 with d* not excluded; it does not mean D >= d*. "20 points at 80% power within 200 runs" is not claimed. A refutation near the floor means the task was too hard, not that the treatment is useless. Section 10 of `SPEC.md` lists everything that must not be claimed.

## Functions

`stats.mjs`

- `rng(seed, stream)`: the seeded generator behind every simulation and bootstrap.
- `normalCdf`, `normalQuantile`, `logGamma`, `betaCdf`, `betaQuantile`: the distributions the rest needs.
- `wilson(x, n, z)`: Wilson score interval for a proportion.
- `clopperPearson(x, n, level)`: exact binomial limits; `zeroSuccessBound(n)` is the one-sided bound 1 - 0.05^(1/n) for 0 of n.
- `newcombe(x1, n1, x2, n2, z)`: square-and-add interval for a difference of two proportions.
- `hypergeometric`, `exactCmh(strata)`: the exact stratified test, one-sided and two-sided p; `fisherExact` is the one-stratum case.
- `sampleSizeNormal`, `sampleSizeFisher`, `fisherPower`: fixed-sample sizes and exact power.
- `spendingThresholds`, `planThresholds(plan)`: the a_j and z_Rj of a plan.
- `cellsFromRuns`, `stackTotals`, `slotTotals`, `pooledTotals`, `summarizeCells`: counts per cell, and per-stack, per-slot and pooled intervals.
- `stackContrasts`, `interactionFlag(stackCounts)`: the stack contrasts and the opposite-sign flag.
- `decide(cells, plan, look)`: the verdict, its cause and its statistics.
- `posteriorDifference(cells, dStar)`: secondary Beta(1,1) posterior, P(D > 0) and P(D >= d*); never a gate.
- `bootstrapMean(values, seed)`: seeded bootstrap interval for a mean.
- `costPerCorrect(runs, seed)`: cost per correct run with limits, m1 and m0, "at least" when no run is correct; `costRatio` compares two arms; `breakEven` gives N*.
- `gaugeTable(runs)`, `gaugeTables(runs)`, `rateAtLeast`: gauge against judge, with sensitivity, specificity and false confidence.
- `gaugeLoop(pi, se, sp, budget)`: gauge pass rate, false confidence and attempts.
- `productLaw(q, xAll, nAll)`: R with its interval.
- `readRuns(csv)`: runs with arm, stack, slot, seed, correct, gaugePass and tokens; missing columns are reported.

`simulate.mjs`

- `simulatePlan(plan, scenario, reps, seed)`: verdict rates and mean runs.
- `scenarioGrid`, `centredScenario`: the no-effect, D = d*, d*/2, one-stack and reversal scenarios.
- `calibrate(plan, grid, reps, seed)`: delta, z_R per look and the rows of the plan table.
- `operatingCharacteristics`, `designTable`: false support, power and expected runs for the plans in `DEFAULT_PLANS`.
- `coverageTable`, `simulateCostCoverage`, `simulateProductLaw`: exact interval coverage, cost-limit coverage, product-law power.

`cli.mjs`: the commands `sizes`, `design`, `analyze`, `coverage`, `cost-coverage`, `product-law` and `help`.

## Tables

Each table is the unedited output of the command above it. Rates are shares of seeded replicates; "se" is the Monte Carlo standard error, sqrt(p(1 - p) / replicates), the distance a printed rate could move with another seed. The design table uses 100,000 replicates per scenario, as the specification asks. z_R is the smallest grid value that passes the 2.5% limit, so for plans with few runs it can differ between replicate counts (the specification's 40,000-replicate run gave 2.44 for the 40-run plan, this one gives 2.17) while the supported rates stay within about one point of the specification's.

### Plans, harder cases and operating characteristics

`node analysis/cli.mjs design` (about 2.5 minutes; `--reps 20000` takes about 30 seconds)

#### Plans: 2 stacks x 5 slots, 100,000 replicates per scenario, seed 20261118

| d* | Runs per cell (max runs) | z_R | Supported at D = d* (centred / control at 10% / mixed slots) | Refuted at D = 0 | Worst false refutation (fresh replicates) |
| --- | --- | --- | --- | --- | --- |
| 50 | 2 (40) | 2.17 | 0.84 (se 0.001) / 0.90 (se 0.001) / 0.89 (se 0.001) | 0.85 (se 0.001) | 2.4% (se 0.05); fresh 2.4% (se 0.05) |
| 40 | 3 (60) | 2.13 | 0.84 (se 0.001) / 0.90 (se 0.001) / 0.89 (se 0.001) | 0.83 (se 0.001) | 2.2% (se 0.05); fresh 2.3% (se 0.05) |
| 30 | 5 (100) | 2.05 | 0.81 (se 0.001) / 0.92 (se 0.001) / 0.89 (se 0.001) | 0.82 (se 0.001) | 2.4% (se 0.05); fresh 2.4% (se 0.05) |
| 30 | 3 then 6 (120) | 2.87 / 2.16 | 0.87 (se 0.001) / 0.96 (se 0.001) / 0.94 (se 0.001) | 0.88 (se 0.001) | 2.4% (se 0.05); fresh 2.4% (se 0.05) |
| 20 | 10 (200) | 2.05 | 0.78 (se 0.001) / 0.93 (se 0.001) / 0.88 (se 0.001) | 0.76 (se 0.001) | 2.2% (se 0.05); fresh 2.2% (se 0.05) |
| 20 | 6 then 12 (240) | 2.75 / 2.04 | 0.84 (se 0.001) / 0.96 (se 0.001) / 0.93 (se 0.001) | 0.83 (se 0.001) | 2.3% (se 0.05); fresh 2.4% (se 0.05) |

d* is in points. D is the true difference; D = 0 here has every cell at 50%. The worst false refutation is the largest P(refuted) over the scenarios with D = d*, first on the replicates that chose z_R, then on fresh ones.

Every rate is a simulated share of 100,000 replicates; "se" is its Monte Carlo standard error, sqrt(p(1 - p) / 100,000), in percentage points for a percentage. A worst case is a maximum over scenarios, so it is slightly high. Replicates are seeded, so the numbers repeat exactly.

#### Harder cases: probability of supported / refuted / undecidable

| d* | Runs per cell | True difference d*/2 | d* in one stack only | Reversal: +d* in one stack, -d* in the other |
| --- | --- | --- | --- | --- |
| 50 | 2 | 0.25 (se 0.001) / 0.40 (se 0.002) / 0.36 (se 0.002) | 0.20 (se 0.001) / 0.21 (se 0.001) / 0.58 (se 0.002) | 0.00 (se 0.000) / 0.05 (se 0.001) / 0.94 (se 0.001) |
| 40 | 3 | 0.26 (se 0.001) / 0.33 (se 0.001) / 0.42 (se 0.002) | 0.22 (se 0.001) / 0.21 (se 0.001) / 0.57 (se 0.002) | 0.00 (se 0.000) / 0.09 (se 0.001) / 0.90 (se 0.001) |
| 30 | 5 | 0.27 (se 0.001) / 0.32 (se 0.001) / 0.41 (se 0.002) | 0.22 (se 0.001) / 0.22 (se 0.001) / 0.56 (se 0.002) | 0.00 (se 0.000) / 0.11 (se 0.001) / 0.88 (se 0.001) |
| 30 | 3 then 6 | 0.29 (se 0.001) / 0.38 (se 0.002) / 0.33 (se 0.001) | 0.24 (se 0.001) / 0.25 (se 0.001) / 0.51 (se 0.002) | 0.00 (se 0.000) / 0.19 (se 0.001) / 0.81 (se 0.001) |
| 20 | 10 | 0.25 (se 0.001) / 0.28 (se 0.001) / 0.47 (se 0.002) | 0.22 (se 0.001) / 0.20 (se 0.001) / 0.58 (se 0.002) | 0.01 (se 0.000) / 0.15 (se 0.001) / 0.85 (se 0.001) |
| 20 | 6 then 12 | 0.28 (se 0.001) / 0.31 (se 0.001) / 0.41 (se 0.002) | 0.24 (se 0.001) / 0.22 (se 0.001) / 0.54 (se 0.002) | 0.00 (se 0.000) / 0.20 (se 0.001) / 0.79 (se 0.001) |

#### Operating characteristics: false support, power by true difference, expected runs

| d* | Runs per cell (max runs) | Worst false support | Supported at 20 points | Supported at 30 points | Supported at 40 points | Supported at 50 points | Mean runs at D = 0 | Mean runs at D = d* |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 50 | 2 (40) | 1.2% (se 0.03) | 0.16 (se 0.001) | 0.36 (se 0.002) | 0.62 (se 0.002) | 0.85 (se 0.001) | 40 | 40 |
| 40 | 3 (60) | 1.3% (se 0.04) | 0.26 (se 0.001) | 0.56 (se 0.002) | 0.84 (se 0.001) | 0.97 (se 0.001) | 60 | 60 |
| 30 | 5 (100) | 1.7% (se 0.04) | 0.45 (se 0.002) | 0.82 (se 0.001) | 0.98 (se 0.000) | 1.00 (se 0.000) | 100 | 100 |
| 30 | 3 then 6 (120) | 1.4% (se 0.04) | 0.49 (se 0.002) | 0.87 (se 0.001) | 0.99 (se 0.000) | 1.00 (se 0.000) | 97 | 105 |
| 20 | 10 (200) | 2.0% (se 0.04) | 0.78 (se 0.001) | 0.99 (se 0.000) | 1.00 (se 0.000) | 1.00 (se 0.000) | 200 | 200 |
| 20 | 6 then 12 (240) | 1.7% (se 0.04) | 0.84 (se 0.001) | 0.99 (se 0.000) | 1.00 (se 0.000) | 1.00 (se 0.000) | 203 | 212 |

Worst false support is the largest P(supported) over the scenarios with no effect. Power is P(supported) with the arms centred on 50%. Mean runs below the maximum come from stopping at the first look.

### Fixed-sample sizes

`node analysis/cli.mjs sizes`

#### Runs per arm for 80% power at a two-sided 5% level (fixed sample, one stratum)

| Difference to detect | Around 50%: normal approximation | Around 50%: exact Fisher test | From a 10% baseline: normal approximation | From a 10% baseline: exact Fisher test |
| --- | --- | --- | --- | --- |
| 20 points | 97 | 102 | 62 | 69 |
| 30 points | 43 | 49 | 32 | 36 |
| 40 points | 24 | 29 | 20 | 23 |
| 50 points | 15 | 18 | 14 | 17 |

The exact column is the first size that reaches 80%. The power of an exact test is not monotone: for 20 points around 50%, 102 runs reach 80% and the power stays at or above 80% only from 108.

### Interval coverage

`node analysis/cli.mjs coverage`

#### Exact coverage of the 95% intervals: minimum / mean over the true rates

| Runs per arm | Wilson | Clopper-Pearson | Newcombe (difference) |
| --- | --- | --- | --- |
| 10 | 90.4% / 95.5% | 96.2% / 98.3% | 90.9% / 95.2% |
| 20 | 92.5% / 95.4% | 95.9% / 97.6% | 92.1% / 95.1% |
| 30 | 93.0% / 95.2% | 95.4% / 97.4% | 92.2% / 95.0% |
| 50 | 91.1% / 95.0% | 95.3% / 96.8% | 93.7% / 95.2% |

True rates: 1% to 99% in steps of 1% for one proportion; 5% to 95% in steps of 5% in each arm for the difference.

### Cost-limit coverage

`node analysis/cli.mjs cost-coverage`

#### Coverage of the cost-per-correct-run limits: 2,000 replicates per row, 2,000 resamples, seed 20261118

| Runs in the arm | True rate | True cost per correct run | Arms with no correct run | Lower limit holds | Upper limit holds | Both hold |
| --- | --- | --- | --- | --- | --- | --- |
| 20 | 3% | 1,766,929 | 54.2% | 100.0% | 98.1% | 98.1% |
| 20 | 10% | 514,422 | 10.7% | 100.0% | 98.5% | 98.5% |
| 20 | 30% | 156,563 | 0.1% | 99.1% | 98.4% | 97.4% |
| 20 | 60% | 67,099 | 0.0% | 98.6% | 98.9% | 97.4% |
| 40 | 3% | 1,766,929 | 29.6% | 100.0% | 99.2% | 99.2% |
| 40 | 10% | 514,422 | 1.1% | 98.9% | 98.3% | 97.2% |
| 40 | 30% | 156,563 | 0.0% | 98.7% | 98.6% | 97.3% |
| 40 | 60% | 67,099 | 0.0% | 98.9% | 98.3% | 97.2% |
| 100 | 3% | 1,766,929 | 4.0% | 100.0% | 98.7% | 98.7% |
| 100 | 10% | 514,422 | 0.0% | 98.0% | 98.2% | 96.2% |
| 100 | 30% | 156,563 | 0.0% | 97.9% | 98.4% | 96.3% |
| 100 | 60% | 67,099 | 0.0% | 98.7% | 99.0% | 97.7% |

Token model: 6 calls per run at most; each call costs 6,500 prompt tokens plus a log-normal output (median 1,500, sigma 1.2) cut at 8,192; a failed run uses every call, a correct run stops at a call drawn evenly from 1 to 6. An arm with no correct run has no upper limit, which counts as holding.

### Composition check (product law)

`node analysis/cli.mjs product-law`

#### Composition check: how often R = 1 is rejected, 10,000 replicates per cell, seed 20261118

| Single-slot rates | Runs per slot and with all slots | gamma = 1 (the law holds) | gamma = 0.9 | gamma = 0.8 | gamma = 0.7 |
| --- | --- | --- | --- | --- | --- |
| five slots at 90% | 10 | 3.0% | 5.9% | 13.4% | 21.6% |
| five slots at 90% | 20 | 4.7% | 20.9% | 56.0% | 83.8% |
| five slots at 90% | 40 | 4.7% | 43.6% | 90.8% | 99.5% |
| five slots at 80% | 10 | 3.1% | 1.1% | 0.7% | 0.7% |
| five slots at 80% | 20 | 4.0% | 5.1% | 13.1% | 21.7% |
| five slots at 80% | 40 | 5.0% | 16.0% | 52.3% | 82.8% |
| 95%, 90%, 80%, 70%, 60% | 10 | 2.7% | 0.6% | 0.3% | 0.2% |
| 95%, 90%, 80%, 70%, 60% | 20 | 3.8% | 3.3% | 7.5% | 12.0% |
| 95%, 90%, 80%, 70%, 60% | 40 | 4.5% | 13.5% | 42.4% | 73.0% |

The truth in each column is P(all slots) = gamma^4 x product of the single-slot rates. The first column is the false rejection rate; the others are power.
