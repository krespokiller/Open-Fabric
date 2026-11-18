# The model of the claim

The claim becomes one inequality: the expected tokens to get one correct result, $CPC = c/p$, are fewer on the line than in the workshop. The model gives a reason and a price. The reason is compounding: a result is correct only if every part the model wrote is correct, so the workshop multiplies the success of the glue and of every rule, while the line multiplies only the open slots. The price is that a gauge is an imperfect classifier: its sensitivity decides how many delivered results are wrong, and it does not change how many attempts a correct one costs. From these follow predictions that can fail: correctness falls on a straight line in logs as slots open, pieces that pass alone pass together ($R = 1$), the cost ratio splits into a part that stays and a part that vanishes as models improve, and a piece pays for itself after $N^{\ast}$ uses. None has been tested. The only data, 0 correct runs in 34, say that the full task costs the 7B model at least about 495,000 tokens per correct result, and say nothing about the line.

**Status.** Proposed by the assistant on 2026-11-18. The owner has not confirmed it, and no prediction has been tested.

| Question | The model's answer | Section |
| --- | --- | --- |
| What does one correct result cost? | $CPC = c/p$ | [2](#2-cost-per-correct-result) |
| What does a gauge change? | How many delivered results are wrong, and how many attempts a run takes. Not the attempts per correct result | [3](#3-the-gauge-as-an-imperfect-classifier) |
| Why would the line win? | It removes factors from a product of probabilities | [4](#4-compounding-workshop-against-line) |
| How does difficulty grow with open slots? | Geometrically, and $R = 1$ if pieces do not interfere | [5](#5-dose-response-and-the-composition-check) |
| Where does the saving come from? | A structural term that stays and a retry term that vanishes | [6](#6-cost-decomposition-structural-and-retry) |
| What can be said when an arm never succeeds? | A lower bound, $c_L/p_U$, and nothing else | [7](#7-zero-correct-runs-a-lower-bound) |
| When does a piece pay for itself? | After $N^{\ast} = F/(CPC_W - CPC_L)$ uses | [8](#8-break-even-uses-of-a-piece) |

## How to read this document

Every statement is one of four kinds.

| Kind | Meaning |
| --- | --- |
| Identity | Arithmetic. True whatever the data say |
| Assumption | It may be false. [Section 10](#10-assumptions) says which experiment checks it |
| Prediction | It follows from the assumptions. [Section 9](#9-predictions) says what would refute it |
| Illustration | Invented numbers that show the size of an effect. Never a result |

Terms are those of [`method.md`](method.md#vocabulary). Three are added here:

- A **part** is anything the model has to write: a slot, or a piece of glue.
- **Glue** is what the line installs without the model: routes, schema, migrations and wiring.
- A run is **delivered** when its loop stops because the gauge passed.

The functions named in this document are in [`analysis/stats.mjs`](../analysis/stats.mjs).

## 1. Notation

| Symbol | Meaning |
| --- | --- |
| $T$, $C$ | Treatment and control arm of a comparison |
| $W$, $L$ | Workshop and line, the arms of the central comparison |
| $k$, $s$, $h = (k, s)$ | Stack, slot, and stratum |
| $n$, $x$ | Runs and correct runs of an arm; $n_{ah}$ and $x_{ah}$ for arm $a$ in stratum $h$ |
| $D$, $D_k$ | Equal-weight mean over strata of $p_{Th} - p_{Ch}$; the same inside stack $k$ |
| $d^{\ast}$ | Smallest difference that matters, preregistered |
| $p$ | Probability that a run is correct |
| $c$ | Mean tokens per run, failed runs included |
| $m_1$, $m_0$ | Mean tokens of a correct run and of a failed run |
| $CPC$ | Expected tokens per correct result, $c/p$ |
| $c_L$, $c_U$, $p_L$, $p_U$ | Lower and upper interval limits of $c$ and $p$ |
| $\tau$ | Mean tokens per attempt, input and output together |
| $A$ | Attempts (model calls) in a run |
| $B$ | Call budget of a run |
| $\pi$ | Probability that the judge passes one attempt |
| $\mathrm{Se}$ | Sensitivity: probability that the gauge fails an attempt the judge fails |
| $\mathrm{Sp}$ | Specificity: probability that the gauge passes an attempt the judge passes |
| $g$ | Probability that the gauge passes one attempt |
| $\mathrm{FC}$ | False confidence: probability that the judge fails what the gauge passed |
| $a$, $b$, $c$, $d$ | Cells of the gauge-by-judge table |
| $\lambda$ | Damage of one wrong delivery, in tokens. The bench does not measure it |
| $J$ | Number of rules in the task |
| $S$ | Set of open slots, with $\lvert S \rvert$ elements |
| $q_j$ | Probability that a run with only slot $j$ open is correct |
| $\gamma$ | Interference for each added open slot; 1 means none |
| $\phi$ | Probability that the glue is correct when the model writes it |
| $\rho$ | Probability that one part is correct, in illustrations with equal parts |
| $P_{\text{all}}$ | Probability that a run with every slot open is correct |
| $R$ | Composition ratio, $P_{\text{all}}$ over the product of the $q_j$ |
| $F$ | Tokens spent once to author a piece and its gauge |
| $N^{\ast}$ | Break-even number of uses of a piece |
| $r_j$, $q_j^{0}$ | Probability that an omitted rule $j$ is recovered, and probability of getting it right without knowing it |

Two letters are used twice, as in the analysis they come from:

- **Subscripts $L$ and $U$.** On $c$ and $p$ they are interval limits in sections 2 and 7, and $L$ is the line arm in sections 4, 6 and 8.
- **The letter $c$.** It is a cell of the gauge table in section 3 and the mean tokens per run everywhere else.

## 2. Cost per correct result

**Setting.** Runs of one arm are independent. Each is correct with probability $p$ and costs tokens with mean $c$. Correct runs cost $m_1$ on average and failed runs $m_0$, so $c = p m_1 + (1-p) m_0$.

**Identity.** To get one correct result, repeat runs until the judge passes one. The number of runs $N$ is geometric with $\mathbb{E}[N] = 1/p$. The total tokens $K$ add up the cost of those runs, and stopping at the first success does not bias the mean cost of a run (Wald's identity):

$$ CPC = \mathbb{E}[K] = \frac{c}{p} = m_1 + m_0 \frac{1-p}{p} $$

The second form reads: one correct run, plus $(1-p)/p$ failed runs on average.

**Why the bench metric estimates it.** "Cost per correct run" is the total tokens of an arm over its correct runs. Dividing both by $n$ gives the mean tokens per run over the share of correct runs. Each tends to its true value as runs accumulate, so the ratio tends to $c/p$. `costPerCorrect` computes it with the interval $[c_L/p_U, c_U/p_L]$.

Three things to keep in mind:

| Limit | Size |
| --- | --- |
| It is undefined when no run is correct | That happens with probability $(1-p)^n$. Section 7 covers it |
| It overestimates in small samples | In the check, at $p = 0.25$, the mean of the estimates was 24% too high with 20 runs, 10% with 40 and 4% with 100. The median was within about 1% |
| It assumes an inspector that never errs | The hidden judge. A user has only the gauge: section 3 |

**Illustration.** With $p = 0.25$, $m_1 = 22{,}600$ and $m_0 = 40{,}700$: $c = 36{,}200$ and $CPC = 144{,}700$ tokens, the cost of four runs.

## 3. The gauge as an imperfect classifier

**Convention.** Positive means the judge fails: the attempt has a fault. Each attempt, and each final state of a run, falls in one cell. The cells are counts in the data and expected shares in the formulas.

| | Judge passes | Judge fails |
| --- | --- | --- |
| Gauge passes | $a$ | $b$ |
| Gauge fails | $c$ | $d$ |

$$ \mathrm{Se} = \frac{d}{b+d} \qquad \mathrm{Sp} = \frac{a}{a+c} \qquad \mathrm{FC} = \frac{b}{a+b} $$

**The loop.** A run makes attempts until the gauge passes one or the budget $B$ ends. The model assumes that every attempt passes the judge with the same probability $\pi$, independently (A2), and that the gauge looks only at whether the attempt is correct (A3).

**Per attempt.**

$$ g = \pi \mathrm{Sp} + (1-\pi)(1-\mathrm{Se}) \qquad \mathrm{FC} = \frac{(1-\pi)(1-\mathrm{Se})}{g} $$

Delivered correctness is $1 - \mathrm{FC} = \pi \mathrm{Sp} / g$.

**Per run.**

| Quantity | Formula |
| --- | --- |
| Delivery rate | $1 - (1-g)^{B}$ |
| Expected attempts | $\mathbb{E}[A] = \sum_{t=0}^{B-1} (1-g)^{t} = \dfrac{1-(1-g)^{B}}{g}$ |
| Attempts per correct delivery | $\dfrac{1}{\pi \mathrm{Sp}}$ |
| Final state in cell $a$ | $\dfrac{1-(1-g)^{B}}{g} \pi \mathrm{Sp}$ |
| Final state in cell $b$ | $\dfrac{1-(1-g)^{B}}{g} (1-\pi)(1-\mathrm{Se})$ |
| Final state in cell $c$ | $(1-g)^{B-1} \pi (1-\mathrm{Sp})$ |
| Final state in cell $d$ | $(1-g)^{B-1} (1-\pi) \mathrm{Se}$ |
| Correct run rate, the primary metric | $p = a + c$ |

`gaugeLoop` computes the first three and `gaugeTable` counts the cells.

### What follows

1. **Final-state tables give false confidence and nothing else.** $b/(a+b)$ of the final states equals the per-attempt $\mathrm{FC}$. But $d/(b+d)$ is not $\mathrm{Se}$: the loop keeps drawing until the gauge passes, so failures the gauge caught are overwritten. In the check a gauge with $\mathrm{Se} = 0.8$ showed 0.11 in the final-state table. Sensitivity and specificity need the gauge and judge result of every attempt.
2. **The gauge raises correctness by buying attempts.** When the gauge never rejects correct work ($\mathrm{Sp} = 1$, A4), $p = \pi \mathbb{E}[A]$. A more sensitive gauge makes the loop continue, and that is the whole gain unless the gauge also raises $\pi$.
3. **Sensitivity does not make a correct result cheaper.** With $\mathrm{Sp} = 1$, attempts per correct run are $\mathbb{E}[A]/p = 1/\pi$, whatever $\mathrm{Se}$ and $B$. In tokens, $CPC = \tau/\pi$. Retrying inside a run and repeating the run cost the same.
4. **Sensitivity buys trust.** Wrong deliveries per correct delivery are $(1-\pi)(1-\mathrm{Se})/(\pi \mathrm{Sp})$. If each wrong delivery costs $\lambda$ later, the full cost per correct delivery is

$$ \frac{\tau + \lambda (1-\pi)(1-\mathrm{Se})}{\pi \mathrm{Sp}} $$

The bench measures $\tau$ and not $\lambda$. So the value of a sensitive gauge shows in false confidence (T12, T18) and cannot show in cost per correct run (T13).

**Illustration.** $\pi = 0.3$, $\mathrm{Sp} = 1$, $B = 6$.

| $\mathrm{Se}$ | Attempts per run | Correct runs | False confidence | Attempts per correct run |
| --- | --- | --- | --- | --- |
| 0 | 1.00 | 30% | 70% | 3.33 |
| 0.5 | 1.54 | 46% | 54% | 3.33 |
| 0.8 | 2.20 | 66% | 32% | 3.33 |
| 1 | 2.94 | 88% | 0% | 3.33 |

**Three readings for E04.**

- In `signature`, `webhook` and `ledger` the basic checks of `kit-bare` pass with the slot unfilled ([E04](../experiments/E04-slot-gauge/README.md)). The model sets $\mathrm{Se}$ near 0 there: one attempt, and $p = \pi$. That is the first row of the table.
- False confidence reaches one half only when $(1-\pi)(1-\mathrm{Se}) \ge \pi \mathrm{Sp}$. With $\mathrm{Sp} = 1$ this needs $\pi < 1/2$ and $\mathrm{Se} \le (1-2\pi)/(1-\pi)$. T12 can be met only if the model gets the discount rule wrong in most attempts.
- T12 is written as a share of all runs. That is cell $b$ itself, which is false confidence times the delivery rate. The criterion must name one of the two before it is preregistered.

**If attempts improve.** When success changes with the attempt, $\pi_t$, write $g_t$ for the gauge pass rate of attempt $t$ and $v_t$ for the probability of reaching it, the product of $1 - g_u$ over earlier attempts. Then $\mathbb{E}[A]$ is the sum of the $v_t$, cell $a$ is the sum of $v_t \pi_t \mathrm{Sp}$ and cell $b$ the sum of $v_t (1-\pi_t)(1-\mathrm{Se})$. Result 3 no longer holds: a gauge whose feedback raises $\pi_t$ does lower the cost.

## 4. Compounding: workshop against line

**Parts.** In the workshop the model writes the glue and all $J$ rules. On the line the tool installs the glue and the pieces, and the model writes only the open slots $S$.

**The product law (assumption A5).** A run with the slots $S$ open is correct with probability

$$ p_L(S) = \gamma^{\lvert S \rvert - 1} \prod_{j \in S} q_j $$

**The workshop (assumption A7).** The same law over every rule, times the glue:

$$ p_W = \phi \gamma^{J-1} \prod_{j=1}^{J} q_j $$

If the glue has several parts that succeed independently, $\phi$ is the product of their probabilities.

**The ratio.**

$$ \frac{p_L(S)}{p_W} = \frac{1}{\phi \gamma^{J - \lvert S \rvert} \prod_{j \notin S} q_j} \ge 1 $$

| Case | Ratio | Reading |
| --- | --- | --- |
| Every slot open | $1/\phi$ | The gain is exactly the glue the tool took over |
| Some rules come inside the piece | Larger | Each closed slot removes one more factor |

**Why it bites.** With $n$ parts of equal reliability $\rho$, $p = \rho^{n}$. Half the runs are correct only if $\rho \ge 0.5^{1/n}$: 0.871 for 5 parts, 0.960 for 17 and 0.977 for 30.

**What the data say.** The 7B scored 0 correct runs in 34 full-task runs, and in [E03](../experiments/E03-exploratory-loop-fixes/README.md) no run got past the health check. In the model that puts the zero in $\phi$: in E03 no rule was ever reached. The 34 runs say nothing about the $q_j$; [E04](../experiments/E04-slot-gauge/README.md) measures them.

**Illustration.** Twelve glue parts at 0.9 give $\phi = 0.28$. With $q = (0.9, 0.85, 0.8, 0.75, 0.7)$ and $\gamma = 0.95$: $p_W = 0.074$, the line with five open slots reaches 0.262, and with two open slots (the first and the fourth) 0.641.

## 5. Dose-response and the composition check

**Prediction.** Taking logs of the product law:

$$ \log p_L(S) = (\lvert S \rvert - 1) \log \gamma + \sum_{j \in S} \log q_j $$

Each slot that opens adds $\log q_j + \log \gamma$, whatever the others are. When slots are equally hard, $\log p$ against the number of open slots is a straight line with slope $\log(q \gamma)$ and intercept $-\log \gamma$. Since tokens per run do not fall when slots open, $CPC$ grows at least geometrically.

**Composition check.** With every slot open the law gives $P_{\text{all}} = \gamma^{J-1} \prod q_j$, so

$$ R = \frac{P_{\text{all}}}{\prod_{j} q_j} = \gamma^{J-1} $$

"Pieces that pass alone pass together" is $R = 1$.

**Estimate.** From $x_j$ correct of $n_j$ runs with only slot $j$ open, and $x_{\text{all}}$ of $n_{\text{all}}$ with all open, on add-half logs:

$$ \log \hat R = \log \frac{x_{\text{all}} + 1/2}{n_{\text{all}} + 1/2} - \sum_{j} \log \frac{x_j + 1/2}{n_j + 1/2} $$

$$ V = \frac{1}{x_{\text{all}} + 1/2} - \frac{1}{n_{\text{all}} + 1/2} + \sum_{j} \left( \frac{1}{x_j + 1/2} - \frac{1}{n_j + 1/2} \right) $$

The 95% interval is $\exp(\log \hat R \pm 1.96 \sqrt{V})$. `productLaw` computes it.

| Interval for $R$ | Reading |
| --- | --- |
| Contains 1 | The law is not rejected. That is all that can be said |
| Below 1 | Pieces interfere: they pass alone and fail together. T19 is in trouble |
| Above 1 | Successes cluster: a good run is good at everything. The law fails, T19 does not |

**What the check can see.** Simulated with five slots, 20,000 replicates per cell:

| Slot success | Runs per slot | All-slot runs | Covers $R$ when $R = 1$ | Rejects when $R = 0.5$ | Rejects when $R = 1/3$ |
| --- | --- | --- | --- | --- | --- |
| 0.8 each | 10 | 20 | 96% | 12% | 19% |
| 0.8 each | 10 | 40 | 95% | 29% | 49% |
| 0.8 each | 20 | 50 | 96% | 39% | 66% |
| 0.5 each | 20 | 50 | 96% | 1% | 0% |

Only gross failures are visible, and near the floor none is. There the interval also covered the true $R$ less often, 91% in the worst cell.

**A confound to design out (A6).** If a run with five open slots gets the same call budget as a run with one, each slot gets fewer retries and $R$ falls with no interference at all. Illustration: five slots, one slot written per call, $\pi = 0.5$ and $\mathrm{Se} = 0.8$ per slot. Against single-slot runs with 6 calls, a shared budget of 6 calls gives $R = 0.24$, 10 calls give 0.85 and 30 calls give 1.02. The record of [E05](../experiments/E05-line-vs-workshop/README.md) already notes that five files leave almost no retries in six calls.

**Where the doses come from.** One open slot: E04. All open: the `line` arm of the E05 local variant, and [E08](../experiments/E08-composition/README.md) for whole pieces. Two to four open slots are in no design yet.

## 6. Cost decomposition: structural and retry

**Identity.** For any two arms, here workshop and line:

$$ \log \frac{CPC_W}{CPC_L} = \log \frac{c_W}{c_L} + \log \frac{p_L}{p_W} $$

| Term | Name | What it counts |
| --- | --- | --- |
| $\log(c_W/c_L)$ | Structural | Tokens per run |
| $\log(p_L/p_W)$ | Retry | Runs per correct result, $1/p$ |

`costRatio` reports the two terms.

**A finer split.** Tokens per run are tokens per attempt times attempts, $c = \tau \mathbb{E}[A]$ (A8). So

$$ \log \frac{c_W}{c_L} = \log \frac{\tau_W}{\tau_L} + \log \frac{\mathbb{E}[A_W]}{\mathbb{E}[A_L]} $$

The retries inside a run are counted in the structural term. With $\mathrm{Sp} = 1$ the total is

$$ \log \frac{CPC_W}{CPC_L} = \log \frac{\tau_W}{\tau_L} + \log \frac{\pi_L}{\pi_W} $$

The budget and the sensitivity move cost between the structural and the retry term. They do not change the sum.

**As models improve.** Both $\pi_W$ and $\pi_L$ tend to 1.

| Term | Tends to | Why |
| --- | --- | --- |
| Retry | 0 | Every run is correct |
| Structural | $\log(\tau_W/\tau_L)$ | One attempt per run in both arms |

What stays is the ratio of tokens per attempt: writing the whole service against reading the contracts and writing the slots. Its sign is not guaranteed. One published run found a kit of copied components costing 37% more tokens than writing from scratch ([`research/README.md`](../research/README.md)).

**Illustration.** The workshop writes 17 parts at 9,000 tokens per attempt, the line 5 parts at 2,500. Each part is right with probability $\rho$; $\mathrm{Se} = 0.8$, $\mathrm{Sp} = 1$, $B = 6$.

| $\rho$ | $\pi_W$ | $\pi_L$ | Structural | Retry | $CPC_W/CPC_L$ |
| --- | --- | --- | --- | --- | --- |
| 0.90 | 0.167 | 0.590 | 1.89 | 0.65 | 12.7 |
| 0.97 | 0.596 | 0.859 | 1.55 | 0.10 | 5.2 |
| 0.99 | 0.843 | 0.951 | 1.38 | 0.03 | 4.1 |
| 0.999 | 0.983 | 0.995 | 1.29 | 0.00 | 3.6 |

The limit is $\log(9000/2500) = 1.28$, a ratio of 3.6.

**Dollars.** $\tau$ adds input and output tokens, as `total_tokens` does. With prices the two weigh differently, so the terms are recomputed in dollars. The identity is the same.

## 7. Zero correct runs: a lower bound

In this section the subscripts $L$ and $U$ are interval limits.

**Derivation.** When no run of $n$ is correct, $c/p$ has no estimate. It still has a floor.

- $p \le p_U$ with probability at least 97.5%, where $p_U$ is the one-sided Clopper-Pearson limit. At zero correct runs it solves $(1-p_U)^{n} = 0.025$, so $p_U = 1 - 0.025^{1/n}$.
- $c \ge c_L$ with probability about 97.5%, where $c_L$ is the 2.5% percentile of the seeded bootstrap mean.
- Both hold together with probability about 95% or more, whatever the dependence between tokens and success.

$$ CPC = \frac{c}{p} \ge \frac{c_L}{p_U} $$

It is reported as "at least", with no upper limit.

**Worked example: the project's own numbers.** Full-task runs of the 7B in [E01](../experiments/E01-pilot-full-task/README.md) and [E03](../experiments/E03-exploratory-loop-fixes/README.md).

| Quantity | Value |
| --- | --- |
| Runs | 34 (18 and 16) |
| Correct runs | 0 |
| Tokens | 1,825,875 |
| Mean per run | 53,702 |
| $p_U = 1 - 0.025^{1/34}$ | 0.1028 |
| $c_L$, 10,000 resamples | About 50,850 (50,811 to 50,894 over four seeds) |
| Bound, $c_L/p_U$ | About 495,000 tokens per correct run |

With 95% confidence, a correct full-task result costs the 7B at least 495,000 tokens, more than nine runs. The data are also compatible with never.

**Limits of this number.**

| Limit | Detail |
| --- | --- |
| It pools what was run | Five arms, two stacks and two versions of the harness, treated as one $p$ and one $c$ (A9). One arm alone gives a weaker bound |
| It assumes a correct run is not cheap | Every observed run failed, so the sample estimates $m_0$, not $c$. If a correct run could cost nothing, the bound is $c_L(1-p_U)/p_U$, about 444,000. In a simulated check with $p = 0.10$ and correct runs at a tenth of the cost, $c_L/p_U$ held in 99% of all experiments but in 55% of those with no correct run. The smaller bound held in all of them |
| It is tied to the budget | Every run used its 6 calls. Another budget changes $c$ and $p$ |
| It supports no ratio estimate | Against another arm it gives a one-sided statement only ("the ratio is at least"), and it gives no upper cost |

Two other figures are not used: 637,000 divides the mean by the 95% limit and treats $c$ as known, and 609,000 is the total over three.

## 8. Break-even uses of a piece

**Identity.** A piece and its gauge cost $F$ tokens once. Each use must end in one correct result. After $N$ uses the workshop has spent $N \cdot CPC_W$ on average and the line $F + N \cdot CPC_L$. The line is cheaper when $N$ exceeds

$$ N^{\ast} = \frac{F}{CPC_W - CPC_L} $$

If $CPC_W \le CPC_L$ there is no break-even. `breakEven` computes it.

**What follows.**

- With section 6, as models improve $CPC$ tends to $\tau$ in each arm and $N^{\ast}$ tends to $F/(\tau_W - \tau_L)$: the piece is repaid only by the tokens it saves per attempt, and $N^{\ast}$ grows.
- When the workshop has no correct run, $CPC_W$ has only the lower bound of section 7. Then $N^{\ast}$ has only an upper limit and no estimate.
- $F$ is not measured today. A piece written by a person costs hours, and the model has no rate to turn hours into tokens.

**Illustration.** $F = 2{,}400{,}000$, $CPC_W = 300{,}000$ and $CPC_L = 20{,}000$ give $N^{\ast} = 8.6$: the line is ahead from the ninth use.

## 9. Predictions

The verdict on a thesis follows the rules in [`method.md`](method.md#verdicts). This table adds what would refute the model. A model prediction that fails does not refute its thesis, and the reverse. Theses are in [`theses.md`](theses.md).

| # | Prediction | Thesis | Experiment | Refuted by |
| --- | --- | --- | --- | --- |
| P1 | With the gauge in view more runs are correct, $D > 0$, because the loop spends more attempts: $p = \pi \mathbb{E}[A]$. The gain is largest in `signature`, `webhook` and `ledger` | T11 | E04 | The upper limit of $D$ below $d^{\ast}$. For the model alone: no larger gain in those three slots |
| P2 | In the discount slot, false confidence is $(1-\pi)(1-\mathrm{Se})/g$. It reaches one half only if $(1-\pi)(1-\mathrm{Se}) \ge \pi \mathrm{Sp}$ | T12 | E04 | A false confidence whose interval excludes the value computed from per-attempt $\pi$, $\mathrm{Se}$ and $\mathrm{Sp}$ |
| P3 | The gauge lowers the tokens per correct run only if it raises per-attempt success by more than tokens per attempt: $CPC_T/CPC_C = (\tau_T/\tau_C)(\pi_C/\pi_T)$ | T13 | E04 | A cost ratio whose interval excludes that product |
| P4 | The line is correct more often: $p_L/p_W \ge 1$ by the ratio of section 4. With the 7B, $\phi$ is near 0 and $D$ is close to $p_L$ | T14 | E05 | The upper limit of $D$ below $d^{\ast}$ |
| P5 | The arms are ordered: workshop, then workshop with the gauge, then line. The gauge buys attempts; only assembly removes $\phi$ | T15 | E05 | The upper limit of line minus workshop-gauge below $d^{\ast}$, or workshop-gauge below workshop |
| P6 | The line costs less per correct result: structural plus retry is above 0, and with a weak model the retry term is the larger | T16 | E05 | An interval for $\log(CPC_W/CPC_L)$ entirely below 0. With no correct workshop run there is no ratio estimate, only the one-sided bound of section 7 |
| P7 | With a stronger model the retry term shrinks toward 0 and the structural term tends to $\log(\tau_W/\tau_L)$ | T16, at the model scale of T6 | E05 repeated with a stronger model | A retry term that does not shrink, or a structural term at or below 0 |
| P8 | A piece repays its authoring after a finite $N^{\ast}$ | T16 | E05, with $F$ recorded | An interval for $CPC_W - CPC_L$ that includes 0 or lies below it |
| P9 | Correct runs follow $\prod_j (r_j q_j + (1-r_j) q_j^{0})$: questions help through $r_j$, and only for rules a default does not already satisfy | T17 | E06 | Recovered rules double and correct runs do not rise; or correct runs rise with no more rules recovered |
| P10 | An independent gauge has higher sensitivity than the model's own, so false confidence is lower at equal $\pi$ | T18 | E07 | The own gauge at least as sensitive, measured per attempt or on a fixed set of faulty versions |
| P11 | Pieces that pass alone pass together: $R = 1$ | T19 | E08. The `line` arm of the E05 local variant reads it earlier, at slot level | An interval for $R$ that excludes 1 |
| P12 | Log-correctness adds up over open slots: a straight line when slots are equally hard | T19 | E04 for one slot; E05 and E08 for all. Two to four slots: no design | A dose whose interval lies off the line, such as a cliff at two slots |
| P13 | The difference has the same sign in every stack, since $\phi_k \le 1$ in each. With equal slot success it is larger where $\phi_k$ is smaller | T20 | E05 | The interaction flag: two stacks with opposite signs whose contrast excludes 0. For the model alone: a larger gain in the stack with the better glue rate |
| P14 | No sign is predicted. $p_L$ contains no $\phi$, so a purpose-built stack can add only through $q_j$, $\gamma$, $\tau$ or $F$ | T21 | Not assigned | For the model: a gap between stacks in the `line` arm that does not appear one slot at a time |

**Extensions used above.**

- **P9.** An omitted rule is a slot without its contract. If it is recovered (probability $r_j$) the run gets it right with probability $q_j$; if not, with $q_j^{0}$, the chance that a default guess matches. Illustration: three rules, $q = 0.8$, $q^{0} = (0.2, 0.1, 0.3)$. Raising $r$ from 0.2 to 0.8 raises correct runs from 3% to 31%.
- **P10.** One paper reports that tests written by the same model detect 14% of faults against 25% when written independently ([`research/README.md`](../research/README.md)). Read as sensitivities, with $\pi = 0.5$ and $\mathrm{Sp} = 1$, false confidence is 46% against 43%. The figures come from other tasks; this is an illustration.
- **P13.** Stacks enter through $\phi_k$ and through the $q_j$ of each language. The line removes $\phi_k$, which is where E03 saw the stacks differ most: 26 of 48 attempts compiled in Django and 1 of 48 in Next.js.

## 10. Assumptions

| # | Assumption | Used in | If it fails | Checked by |
| --- | --- | --- | --- | --- |
| A1 | Runs of a cell are independent, with one $p$ and one $c$ | Everything | Intervals are too narrow | Any experiment: outcome against run index within a cell |
| A2 | Attempts in a run are independent with the same $\pi$ | 3, 6 | $\mathbb{E}[A]$, $p = \pi \mathbb{E}[A]$ and P3 change. Known to fail: 17 of 80 retries in E03 repeated the previous answer | E04 with per-attempt judge results: first-attempt pass rate against correct runs per call |
| A3 | The gauge depends on an attempt only through whether it is correct; $\mathrm{Se}$ and $\mathrm{Sp}$ are constant per arm and slot | 3 | False confidence drifts with the attempt | E04 and E07: per-attempt table by slot |
| A4 | The gauge never rejects correct work, $\mathrm{Sp} = 1$ | Results 2 and 3 of section 3; section 6 | Those results gain the cell $c$ term | E04: the count in cell $c$ |
| A5 | Slots are independent, $\gamma = 1$ | 4, 5 | $R$ differs from 1 | E08; the E05 local `line` arm |
| A6 | The call budget grows with the number of open slots | 5 | $R$ falls below 1 without interference | A design choice of E05 and E08 |
| A7 | A rule is as hard in the workshop as on the line, and the glue fails independently of the rules | 4 | The ratio is not $1/\phi$ | E05: among workshop runs past the health check, the hidden tests tied to each slot |
| A8 | Tokens per attempt have the same mean at every attempt | 6 | $c$ is not $\tau \mathbb{E}[A]$. Mildly false: the prompt gains one line per earlier attempt | E04, E05: tokens against attempt index |
| A9 | The 34 full-task runs share one $p$ and one $c$ | 7 | The pooled bound is too strong | Cannot be checked: every run failed |
| A10 | $F$ is paid once, and every use costs the same; no maintenance | 8 | $N^{\ast}$ is too low | No current experiment. $F$ is recorded when pieces are written, in E05 and E08 |
| A11 | A stronger model raises $\pi$ toward 1 and keeps the ratio of $\tau$ | 6 | The limit of the structural term moves | E05 repeated with a stronger model |
| A12 | Omitted rules are recovered independently | P9 | The product of P9 fails | E06 |

## 11. What the bench must record

Today `runs.csv` has no slot, seed or gauge column, and only the final state of a run is judged. The model needs:

| Level | Fields | Gives |
| --- | --- | --- |
| Attempt | Tokens in and out, output cap hit, gauge result, judge result | $\pi$, $\mathrm{Se}$, $\mathrm{Sp}$, $\tau$, and the check of A2, A3, A8 |
| Run | Slot, seed, final gauge result | The gauge table per arm and slot |
| Run with several open slots | Each slot judged alone, with the reference in the others | Whether a failure is one slot or the fit between slots |
| Piece | Tokens spent to author it and its gauge | $F$ |

Judging an attempt costs build time and no model tokens.

## 12. What the model does not support

- That the product law holds. Only "not rejected", with the interval of $R$.
- Sensitivity or specificity read from final-state tables.
- A cost ratio estimate, or an upper cost, against an arm with no correct run.
- That the retry saving survives stronger models. The model predicts that it does not.
- Any illustration as a result.
- Anything beyond the slots, stacks and model that were run.

## 13. Numerical check

Every derivation was compared with a seeded simulation on 2026-11-18. The script was a scratch file and is not in the repository.

| Derivation | Formula | Simulated |
| --- | --- | --- |
| Tokens until the first correct run, $c/p$ | 144,677 | 144,650 |
| Gauge pass rate $g$ ($\pi = 0.3$, $\mathrm{Se} = 0.8$, $\mathrm{Sp} = 0.9$, $B = 6$) | 0.4100 | 0.4100 |
| False confidence | 0.3415 | 0.3413 |
| Attempts per run | 2.3361 | 2.3360 |
| Delivery rate | 0.9578 | 0.9577 |
| Attempts per correct delivery | 3.7037 | 3.7028 |
| Cells $a$, $b$, $c$, $d$ | 0.6308, 0.3271, 0.0021, 0.0400 | 0.6309, 0.3268, 0.0021, 0.0402 |
| Attempts per correct run at $\mathrm{Sp} = 1$, six pairs of $\mathrm{Se}$ and $B$ | 3.3333 | 3.3284 to 3.3375 |
| Cost per correct delivery with damage ($\mathrm{Se} = 0.8$) | 37,037 | 36,988 |
| Attempts per run with rising $\pi_t$ | 2.3776 | 2.3764 |
| Workshop success, illustration of section 4 | 0.0739 | 0.0740 |
| Line success, five and two open slots | 0.2617, 0.6412 | 0.2615, 0.6412 |
| Correct with five open slots ($q = 0.8$, $\gamma = 0.9$) | 0.2150 | 0.2150 |
| Slope of log-correctness | -0.3285 | -0.3284 |
| Structural and retry terms at $\rho = 0.9$ | 1.892, 0.653 | 1.893, 0.653 |
| Log cost ratio at $\rho = 0.999$ | 1.293 | 1.293 |
| First use at which the line is cheaper | 9 | 9 |
| Correct runs with questions, illustration of P9 | 0.3142 | 0.3140 |
| Wrong deliveries per correct one ($\mathrm{Se} = 0.8$) | 0.5185 | 0.5176 |
| Ratio $p_L/p_W$ with every slot open, $1/\phi$ | 3.5407 | 3.5321 |
| Lower bound $c_L/p_U$ holds, eight simulated scenarios with 34 runs | At least 95% | 98.0% to 100% |
| Lower bound from the project's 34 runs, four bootstrap seeds | $c_L / 0.10282$ | 494,182 to 494,991 |
