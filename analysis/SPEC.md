# Merged analysis specification

## 1 Notation
- Arms T (treatment), C (control); stacks k; slots s; stratum h=(k,s); cell = arm x stratum.
- m: runs per cell. Block: one run in every cell. Look j follows m_j complete blocks; t_j=m_j/m_J.
- x_ah: correct runs of n_ah. T: sum of x_Th over strata.
- D: equal-weight mean over strata of p_Th-p_Ch (the pooled difference when balanced); D_k per stack.
- d*: preregistered smallest difference that matters. alpha=0.025, one-sided, per error.

## 2 Primary decision rule
**Choice.** Support by the exact conditional Cochran-Mantel-Haenszel test (frequentist); refutation by a Newcombe upper bound with a simulated constant (model). Its false-support rate stays at or below alpha for any stack and slot base rates, at every look, by theorem and not on a simulated grid, and with one stratum it is the Fisher test `method.md` already uses. It was also the strongest rule when slots differ in difficulty (0.89 against 0.82 in the frequentist's simulation), which the no-model controls say they do.

**Statistics**, from per-cell counts:
- p_S=P(T>=t) under the convolution over strata of hypergeometrics given each stratum's margins.
- U_j: upper Newcombe limit of the pooled difference with constant z_Rj.
- Interaction flag: two stacks with opposite observed signs whose contrast D_k-D_k' has a 95% square-and-add interval (per-stack Newcombe limits, Bonferroni over pairs) excluding 0.

**Thresholds.** a_j=alpha(t_j^3-t_(j-1)^3): 0.025 with one look; 0.003125 then 0.021875 at half and full. z_Rj=Phi^-1(1-a_j)+delta.

**Looks.** Preregistered, complete blocks only; one by default. A second at half costs 3 points of power to save 10% of runs, so it comes with extra blocks.

**At each look, in order:**
1. Hash changed, incomplete block or unplanned look: `undecidable` (broken instrument).
2. Every run failed, or every run passed: stop, `undecidable` (floor or ceiling).
3. U_j<d* and no interaction flag: `refuted`.
4. p_S<=a_j and a positive observed difference in every stack: `supported`.
5. Otherwise continue; after the last look, `undecidable` with its cause.

`supported` means D>0 with d* not excluded; `refuted` means D<d*. "Estimate>=d*" is reported, never required: all three proposals found that gate caps power at 50-62%.

**Calibrated by simulation:** delta, the smallest value keeping worst-case P(refuted | D=d*) at or below 2.5%, and the section 9 table. Support needs none.

**Resolved.** Not primary: posterior thresholds (bayesian) and a calibrated z for support (model), guaranteed only on the simulated grid. Dropped: Miettinen-Nurminen refutation, which needed simulation anyway and is harder to implement.

## 3 Strata
- The test stratifies by stack x slot, not stack alone (bayesian): collapsing is valid but loses power when slots differ.
- Equal weights, never inverse-variance. A lost run is rerun with its seed.
- Report per stack, per slot, then pooled, each with a Newcombe interval. A slot opposing the pooled direction is flagged, never a gate.
- Judge's change: the contrast flag replaces "both stacks significant in opposite directions". Simulated, a +d*/-d* reversal is called `refuted` 5-22% of the time instead of 60-78%, for 3-6 points of P(refuted | D=0).

## 4 Estimates and intervals
- Proportion: count and 95% Wilson, as today; Clopper-Pearson where the number serves as a bound. At 0/n add the one-sided bound 1-0.05^(1/n): 0/34 gives at most 8.4% (Wilson 10.2%).
- One table: Newcombe. Pooled D: Newcombe at the z_R of the stopping look; an estimate after an early stop is labelled biased upward.
- Secondary, never gated: Beta(1,1) posterior per stack and arm; P(D>0) and P(D>=d*) by 200-bin convolution.
- Dropped: partial pooling of slots; its gain reverses when slots spread.
- Hidden pass fraction: mean per arm, seeded bootstrap interval, no verdict.

## 5 Cost per correct run
- Estimand: CPC=c/p=m1+m0(1-p)/p; c mean tokens per run, m1 and m0 means of correct and failed runs. Estimator: total tokens over correct runs.
- Interval: [c_L/p_U, c_U/p_L]; c limits are the 2.5% and 97.5% percentiles of the seeded bootstrap mean (10,000 resamples of the arm's runs), p limits Clopper-Pearson at 97.5% one-sided each. Bonferroni keeps 95% under any dependence between tokens and success; the bootstrap limit is approximate at small n.
- Zero correct runs: the same formula gives [c_L/p_U, infinity), worded "at least". Today (34 runs, 1,825,875 tokens, 0 correct): at least 495,000 tokens per correct run (reproduced: 494,641). Note: the current CLI prints 494,601 for this arm; the difference of 40 tokens is bootstrap seed noise in the lower limit, and 494,601 is the current number. Not used: 637,000 (ignores c), 598,000 (prior-dependent), 415,000 (did not reproduce).
- Between arms: log(CPC_T/CPC_C)=log(c_T/c_C)+log(p_C/p_T); one-sided only when an arm has zero correct runs.
- Cross-checks, coverage simulation only: posterior with Bayesian bootstrap; log-linearization.

## 6 Gauge against judge
- Positive means the judge fails (the model proposal's reversed convention is rejected). Cells: a both pass; b gauge passes, judge fails; c gauge fails, judge passes; d both fail.
- Sensitivity=d/(b+d); specificity=a/(a+c); false confidence=b/(a+b).
- Counts with Wilson and Clopper-Pearson, per arm and slot, never pooled across arms; empty denominator: "not estimable".
- "At least half" needs a Clopper-Pearson lower limit of 0.5 (9 of 10).
- The loop stops when the gauge passes, so final-state tables support only false confidence; sensitivity and specificity need per-attempt gauge and judge results, bootstrapped by run. Per-attempt tables are now computed from `attempts.csv` (`attemptGaugeTable`), with percentile bootstrap intervals that resample whole runs.

### 6.1 The decision is right
- Second outcome of a run, besides `correct` (the run passes every test of both hidden suites). At the end of a run the gauge says pass or no pass (`gauge_pass`); the decision is right when it agrees with the hidden judge: `gauge_pass == correct`.
- Four classes: delivered correct (gauge 1, correct 1, right), known failure (0, 0, right), silent defect (1, 0, wrong), false rejection (0, 1, wrong).
- A run with no gauge result has no class. The comparison on this outcome is refused if any run of the two arms has none; in the class table such runs are `Unclassified` and out of the rate. Never counted as right or wrong.
- Same machinery as the primary rule: x_ah counts right decisions instead of correct runs, and the strata, the exact CMH test, the Newcombe limits, the looks, d*, the thresholds and the verdict are those of section 2, unchanged. The verdict names the outcome. Only `--outcome decision-right` selects it; the default stays `correct`.
- Per arm, and per arm and stack: the counts of the four classes and the right-decision rate with its Wilson interval (descriptive, no verdict of its own).
- An always-failing gauge (`gauge_pass = 0` in every run) scores a right-decision rate of 1 minus the correct rate. The outcome must be read next to the correct rate, never alone.

## 7 Model of the claim
- Cost: log(CPC_W/CPC_L)=log(c_W/c_L)+log(p_L/p_W), structural plus retry (W workshop, L line). Prediction: the retry term shrinks with stronger models, the structural term stays (E05).
- Product law: P(correct | open slots S)=gamma^(|S|-1) x product of q_j. Prediction: R=P_all/product of q_j is 1; interval on add-half logs (E04 gives q_j, E08 P_all).
- Gauge loop per attempt, pi=P(judge passes): g=pi*Sp+(1-pi)(1-Se); false confidence=(1-pi)(1-Se)/g; attempts within budget B=(1-(1-g)^B)/g; attempts per correct delivery=1/(pi*Sp). Prediction: observed false confidence and calls match (E04, E07).
- Break-even uses: N*=F/(CPC_W-CPC_L), F the authoring cost of piece and gauge.

## 8 Functions
- `readRuns(csv)`: runs with arm, stack, slot, seed, correct, gaugePass, tokens (`runs.csv` lacks slot, seed and gauge columns today)
- `exactCmh(strata)`: one-sided and two-sided p
- `wilson(x,n,z)`, `clopperPearson(x,n,level)`, `newcombe(x1,n1,x2,n2,z)`: limits
- `interactionFlag(stackCounts)`: boolean
- `decide(cells,plan,look)`: verdict, cause, statistics
- `simulatePlan(plan,scenario,reps,seed)`: verdict rates, mean runs
- `calibrate(plan,grid,reps,seed)`: z_R per look, plan table
- `costPerCorrect(runs,seed)`: estimate, limits, m1, m0
- `gaugeTable(runs)`: cells, three rates with intervals
- `readAttempts(csv)`: attempts with stack, arm, slot, run, attempt, built, gaugePass, judgeCorrect, tokens
- `attemptGaugeTable(attempts,{seed,resamples})`: per-attempt cells, three rates with bootstrap-by-run intervals, unjudged count
- `firstAttemptCells(runs,t,c)`: cells with every run scored at its first attempt, or null when a run has no result
- `runClass(run)`: delivered_correct, known_failure, silent_defect, false_rejection, or null without a gauge result
- `classCounts(runs)`: counts of the four classes and unclassified, right decisions, rate with Wilson interval
- `decisionRightCells(runs,t,c)`: cells counting right decisions (the helper shared with `cellsFromRuns` and `firstAttemptCells`), or null when a run of either arm has no gauge result
- `posteriorDifference(cells,dStar)`: P(D>0), P(D>=d*)
- `productLaw(q,xAll,nAll)`: R with interval
- `gaugeLoop(pi,se,sp,budget)`: gauge pass rate, false confidence, attempts
- `rng(seed)`: generator behind every simulation and bootstrap

Test anchors (all reproduced): Fisher 10/25 vs 15/25, 0.2578; Newcombe 56/70 vs 48/80, (0.0524, 0.3339); Wilson 0/34 upper, 0.1015; 1-0.05^(1/34), 0.0843; I_0.5(2,3), 0.6875; P(Beta(4,3)>Beta(2,5)), 29/33.

## 9 Simulations and tables
`calibrate` runs 100,000 seeded replicates per scenario: no effect (5-95%, mixed slots, unequal stacks); D=d* (centred, from 10%, mixed, control at 0 or 1-d*); d*/2; one stack only; reversal. No proposal simulated this combination; my run (40,000 replicates, 2 stacks x 5 slots):

| d* | Runs per cell (max runs) | z_R | Supported at D=d* (centred/from 10%/mixed) | Refuted at D=0 |
| --- | --- | --- | --- | --- |
| 50 | 2 (40) | 2.44 | 0.85/0.90/0.89 | 0.82 |
| 40 | 3 (60) | 2.14 | 0.83/0.91/0.89 | 0.83 |
| 30 | 5 (100) | 2.06 | 0.81/0.92/0.89 | 0.82 |
| 30 | 3 then 6 (120) | 2.89/2.18 | 0.87/0.96/0.94 | 0.86 |
| 20 | 10 (200) | 2.06 | 0.78/0.93/0.88 | 0.75 |
| 20 | 6 then 12 (240) | 2.77/2.06 | 0.84/0.96/0.93 | 0.83 |

Note: this table is from the 40,000-replicate run above. `README.md` is the current table, from 100,000 replicates (`cli.mjs design`), and prints 2.17 for the 40-run plan where this table has 2.44. z_R is the smallest grid value that keeps the worst false refutation at or below 2.5%, so with few runs it moves between replicate counts; the README value is current.

- Worst false support 1.2-1.7%, worst false refutation 1.7-2.3%; two-look plans average 98 and 203 runs at D=0.
- At d*/2: supported 25-29%, refuted 25-33%, undecidable 38-50%.
- Full-task runs took 9.1 and 10.5 minutes (E01, E03), so 200 runs is about 33 hours; slot runs are unmeasured.
- Also: interval coverage by enumeration (n=10-50); cost-interval coverage with capped heavy-tailed tokens; product-law power.
- `method.md` changes: the verdict rules and the 97/43/24/15 table (exact Fisher needs 102/49/29/18).

## 10 Must not be claimed
- A right-decision rate read alone: an always-failing gauge scores 1 minus the correct rate.
- That `supported` means D>=d*.
- 20 points at 80% power within 200 runs.
- A cost ratio or upper cost bound against an arm with zero correct runs.
- That the product law holds: only "not rejected", with R's interval.
- Sensitivity or specificity from final-state tables; a false-confidence rate moved between arms.
- Verdicts on secondary metrics; exploratory runs as confirmatory data or prior.
- Any error rate after an unplanned look or incomplete block.
- Anything beyond these slots, stacks and model; a refutation near the floor means the task was too hard, not that the treatment is useless.
