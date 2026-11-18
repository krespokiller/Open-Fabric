# The model of the claim

The claim becomes one inequality: the expected tokens to get one correct result, $CPC = c/p$, are fewer on the line than in the workshop. The model gives a reason and a price. The reason is compounding: a result is correct only if every part the model wrote is correct, so the workshop multiplies the success of the glue and of every rule, while the line multiplies only the open slots. The price is that a gauge is an imperfect classifier: its sensitivity decides how many delivered results are wrong, and it does not change how many attempts a correct one costs. From these follow predictions that can fail: correctness falls on a straight line in logs as slots open (testable only once a design opens three or more dose levels), pieces that pass alone pass together ($R = 1$), the cost ratio splits into a part that stays and a part that vanishes as models improve, and a piece pays for itself after $N^{\ast}$ uses. Some statements in section 9 are consistency checks or open questions, not predictions, and the table says which. None has been tested. The only data, 0 correct runs in 34, say that the full task costs the 7B model at least about 494,000 tokens per correct result, and say nothing about the line.

**Status.** Proposed by the assistant on 2026-11-18. The owner has not confirmed it, and no prediction has been tested.

| Question | The model's answer | Section |
| --- | --- | --- |
| What does one correct result cost? | $CPC = c/p$ | [2](#2-cost-per-correct-result) |
| What does a gauge change? | How many delivered results are wrong, and how many attempts a run takes. Not the attempts per correct result | [3](#3-the-gauge-as-an-imperfect-classifier) |
| Why would the line win? | It removes factors from a product of probabilities | [4](#4-compounding-workshop-against-line) |
| How does difficulty grow with open slots? | Geometrically, and $R = 1$ if pieces do not interfere | [5](#5-dose-response-and-the-composition-check) |
| Where does the saving come from? | A structural term that stays and a retry term that vanishes | [6](#6-cost-decomposition-structural-and-retry) |
| What can be said when an arm never succeeds? | A lower bound, $c_{\text{lo}}/p_{\text{hi}}$, and nothing else | [7](#7-zero-correct-runs-a-lower-bound) |
| When does a piece pay for itself? | After $N^{\ast} = F/(CPC_W - CPC_L)$ uses | [8](#8-break-even-uses-of-a-piece) |

## How to read this document

Every statement is one of six kinds.

| Kind | Meaning |
| --- | --- |
| Identity | Arithmetic. True whatever the data say |
| Assumption | It may be false. [Section 10](#10-assumptions) says which experiment checks it |
| Prediction | It follows from the assumptions and an observation could contradict it. [Section 9](#9-predictions) says which one, and which experiment records it |
| Consistency check | Near-identity between two estimates from the same runs. It can fail only if an assumption fails, so it checks the assumption and predicts nothing about the world |
| Open question | The model has no sign to give. It is listed so that nobody mistakes it for a prediction |
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
| $c_{\text{lo}}$, $c_{\text{hi}}$, $p_{\text{lo}}$, $p_{\text{hi}}$ | Lower and upper interval limits of $c$ and $p$ |
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
| $J$ | Number of rules in the task. The open slots are some of them, so $\lvert S_{\text{all}} \rvert \le J$ |
| $S$, $S_{\text{all}}$ | Set of open slots, with $\lvert S \rvert$ elements; the set of every slot the design can open |
| $q_j$ | Probability that a run with only slot $j$ open is correct |
| $\gamma$ | Interference for each added open slot; 1 means none, below 1 is loss, above 1 is clustering of successes |
| $\phi$ | Probability that the glue is correct when the model writes it |
| $\rho$ | Probability that one part is correct, in illustrations with equal parts |
| $P_{\text{all}}$ | Probability that a run with every slot open is correct |
| $R$ | Composition ratio, $P_{\text{all}}$ over the product of the $q_j$ |
| $F$ | Tokens spent once to author a piece and its gauge |
| $N^{\ast}$ | Break-even number of uses of a piece |
| $r_j$, $q_j^{0}$ | Probability that an omitted rule $j$ is recovered, and probability of getting it right without knowing it |

One letter is used twice, as in the analysis it comes from: $c$ is a cell of the gauge table in section 3 and the mean tokens per run everywhere else.

The subscript $L$ always means the line arm. The interval limits that `analysis/SPEC.md` and `method.md` write $c_L$, $c_U$, $p_L$ and $p_U$ are written $c_{\text{lo}}$, $c_{\text{hi}}$, $p_{\text{lo}}$ and $p_{\text{hi}}$ here, so that they cannot be mistaken for the line arm.

## 2. Cost per correct result

**Setting.** Runs of one arm are independent. Each is correct with probability $p$ and costs tokens with mean $c$. Correct runs cost $m_1$ on average and failed runs $m_0$, so $c = p m_1 + (1-p) m_0$.

**Identity.** To get one correct result, repeat runs until the judge passes one. The number of runs $N$ is geometric with $\mathbb{E}[N] = 1/p$. The total tokens $K$ add up the cost of those runs, and stopping at the first success does not bias the mean cost of a run (Wald's identity):

$$ CPC = \mathbb{E}[K] = \frac{c}{p} = m_1 + m_0 \frac{1-p}{p} $$

The second form reads: one correct run, plus $(1-p)/p$ failed runs on average.

**Why the bench metric estimates it.** "Cost per correct run" is the total tokens of an arm over its correct runs. Dividing both by $n$ gives the mean tokens per run over the share of correct runs. Each tends to its true value as runs accumulate, so the ratio tends to $c/p$. `costPerCorrect` computes it with the interval $[c_{\text{lo}}/p_{\text{hi}}, c_{\text{hi}}/p_{\text{lo}}]$.

Three things to keep in mind:

| Limit | Size |
| --- | --- |
| It is undefined when no run is correct | That happens with probability $(1-p)^n$. Section 7 covers it |
| It overestimates in small samples | In the check, at $p = 0.25$, the mean of the estimates was 24% too high with 20 runs, 10% with 40 and 4% with 100. The median was within about 1% |
| It assumes an inspector that never errs | The hidden judge. A user has only the gauge: section 3 |

**Illustration.** With $p = 0.25$, $m_1 = 22{,}600$ and $m_0 = 40{,}700$: $c = 36{,}200$ and $CPC = 144{,}700$ tokens, the cost of four runs.

## 3. The gauge as an imperfect classifier

**Convention.** Positive means the judge fails: the attempt has a fault. Each attempt, and each final state of a run, falls in one cell. The cells are counts in the data and expected shares in the formulas. A run's output is its last attempt: the attempt the gauge passed, or the last attempt of the budget if none passed. The judge's verdict on a run is its verdict on that attempt, and "final state" means the gauge and judge results of that attempt.

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

The row "attempts per correct delivery" divides by cell $a$ only: a delivery is a run that stopped because the gauge passed, and a correct delivery is one the judge also passes. A correct run is wider: $p = a + c$ adds cell $c$, a correct last attempt that the gauge failed when the budget ended. So attempts per correct run are $\mathbb{E}[A]/(a+c)$, and the two ratios agree only when $\mathrm{Sp} = 1$, where $c = 0$.

### What follows

1. **Final-state tables give false confidence and nothing else.** $b/(a+b)$ of the final states equals the per-attempt $\mathrm{FC}$. But $d/(b+d)$ is not $\mathrm{Se}$: the loop keeps drawing until the gauge passes, so failures the gauge caught are overwritten. In the check, with $\pi = 0.3$, $\mathrm{Sp} = 0.9$ and $B = 6$, a gauge with $\mathrm{Se} = 0.8$ showed 0.1091 in the final-state table ($d = 0.0400$ against $b = 0.3271$). Sensitivity and specificity need the gauge and judge result of every attempt.
2. **The gauge raises correctness by buying attempts.** When the gauge never rejects correct work ($\mathrm{Sp} = 1$, A4), $p = \pi \mathbb{E}[A]$. A more sensitive gauge makes the loop continue, and that is the whole gain unless the gauge also raises $\pi$.
3. **Sensitivity does not make a correct result cheaper.** With $\mathrm{Sp} = 1$ (where correct runs and correct deliveries coincide), attempts per correct run are $\mathbb{E}[A]/p = 1/\pi$, whatever $\mathrm{Se}$ and $B$. In tokens, $CPC = \tau/\pi$. Retrying inside a run and repeating the run cost the same.
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

**The product law (assumption A5).** Slots combine with one constant factor $\gamma$ for each slot added to the first; $\gamma = 1$ is the case with no interference, and it is what P11 tests. A run with the slots $S$ open is correct with probability

$$ p_L(S) = \gamma^{\lvert S \rvert - 1} \prod_{j \in S} q_j $$

**The workshop (assumption A7).** The same law over every rule, times the glue:

$$ p_W = \phi \gamma^{J-1} \prod_{j=1}^{J} q_j $$

If the glue has several parts that succeed independently, $\phi$ is the product of their probabilities.

**The ratio.**

$$ \frac{p_L(S)}{p_W} = \frac{1}{\phi \gamma^{J - \lvert S \rvert} \prod_{j \notin S} q_j} \ge 1 $$

The inequality $\ge 1$ needs the denominator to be at most 1. That holds when $\gamma \le 1$, because $\phi$ and every $q_j$ are probabilities. If $\gamma > 1$ (successes cluster) the ratio can fall below 1, and then the line need not be correct more often.

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

**Composition check.** With every slot of the design open ($S = S_{\text{all}}$, not necessarily every rule of the task) the law gives $P_{\text{all}} = \gamma^{\lvert S_{\text{all}} \rvert - 1} \prod_{j \in S_{\text{all}}} q_j$, so

$$ R = \frac{P_{\text{all}}}{\prod_{j \in S_{\text{all}}} q_j} = \gamma^{\lvert S_{\text{all}} \rvert - 1} $$

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

Only gross failures are visible, and near the floor none is. There the interval also covered the true $R$ less often, down to about 94% in the worst listed cell (0.5 each, $R = 1/3$).

**A confound to design out (A6).** If a run with five open slots gets the same call budget as a run with one, each slot gets fewer retries and $R$ falls with no interference at all. Illustration: five slots, one slot written per call, $\pi = 0.5$ and $\mathrm{Se} = 0.8$ per slot. Against single-slot runs with 6 calls, a shared budget of 6 calls gives $R = 0.24$, 10 calls give 0.85 and 30 calls give 1.02. The record of [E05](../experiments/E05-line-vs-workshop/README.md) already notes that five files leave almost no retries in six calls.

**Where the doses come from.** One open slot: E04. All open (five): the `line` arm of the E05 local variant, and [E08](../experiments/E08-composition/README.md) for whole pieces. Two to four open slots are in no design yet.

**Why two doses cannot test the line.** Any two points lie on a straight line, so with doses at 1 and 5 open slots the linearity of $\log p$ cannot fail. A test needs at least three dose levels, here 1, 3 and 5 open slots. "Equally hard" is not assumed: the sum form above predicts $p_L(S)$ for any subset $S$ from the single-slot rates $q_j$ of E04 and one $\gamma$, and the straight line is the special case of equal $q_j$.

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

**Which term is larger.** In this illustration the retry term is the larger only below $\rho \approx 0.82$ (where $\pi_W = 0.82^{17} = 0.034$ and $\pi_L = 0.82^{5} = 0.37$). At $\rho = 0.81$ the retry term is 1.99 against 1.82, and at $\rho = 0.82$ it is 1.82 against 1.84. Every row of the table above, which starts at $\rho = 0.90$, is already past the crossover and has the structural term larger. The crossover depends on the invented parts, tokens and budget, so for a real model it is read from the two reported terms and is not a prediction of its own. What the model does predict is that the retry term falls as models improve (P7).

**Dollars.** $\tau$ adds input and output tokens, as `total_tokens` does. With prices the two weigh differently, so the terms are recomputed in dollars. The identity is the same.

## 7. Zero correct runs: a lower bound

In this section the subscripts $L$ and $U$ are interval limits.

**Derivation.** When no run of $n$ is correct, $c/p$ has no estimate. It still has a floor.

- $p \le p_{\text{hi}}$ with probability at least 97.5%, where $p_{\text{hi}}$ is the one-sided Clopper-Pearson limit. At zero correct runs it solves $(1-p_{\text{hi}})^{n} = 0.025$, so $p_{\text{hi}} = 1 - 0.025^{1/n}$.
- $c \ge c_{\text{lo}}$ with probability about 97.5%, where $c_{\text{lo}}$ is the 2.5% percentile of the seeded bootstrap mean.
- Both hold together with probability about 95% or more, whatever the dependence between tokens and success.

$$ CPC = \frac{c}{p} \ge \frac{c_{\text{lo}}}{p_{\text{hi}}} $$

It is reported as "at least", with no upper limit.

**Worked example: the project's own numbers.** The pool is all 34 full-task runs of the 7B in [E01](../experiments/E01-pilot-full-task/README.md) (18 runs) and [E03](../experiments/E03-exploratory-loop-fixes/README.md) (16 runs). It is not only "from scratch": it includes the arms of E01 that were given the piece as a specification (`of-spec`) or as code (`of-code`), next to `bare`, `docs` and `tests`.

| Quantity | Value |
| --- | --- |
| Runs | 34 (18 and 16) |
| Correct runs | 0 |
| Tokens | 1,825,875 |
| Mean per run | 53,702 |
| $p_{\text{hi}} = 1 - 0.025^{1/34}$ | 0.1028 |
| $c_{\text{lo}}$, 10,000 resamples | About 50,850 (50,800 to 50,879 over seven seeds) |
| Bound, $c_{\text{lo}}/p_{\text{hi}}$ | At least about 494,000 tokens per correct run (494,082 to 494,850 over the same seven seeds) |

The pooled sample supports this statement: a correct full-task result costs the 7B at least about 494,000 tokens, more than nine runs of 53,702. The 95% level holds for the pooled sample under the Bonferroni argument above, with the caveat in the next table: all 34 runs used the whole budget of 6 calls, and a correct run could stop earlier and cost less. The data are also compatible with never.

**Limits of this number.**

| Limit | Detail |
| --- | --- |
| It pools what was run | Five arms, two stacks and two versions of the harness, treated as one $p$ and one $c$ (A9). One arm alone gives a weaker bound |
| It assumes a correct run is not cheap | Every observed run failed, so the sample estimates $m_0$, not $c$, and all 34 used the whole 6-call budget. A correct run could stop earlier and cost less. If a correct run could cost nothing, the bound is $c_{\text{lo}}(1-p_{\text{hi}})/p_{\text{hi}}$, about 444,000. In a simulated check with $p = 0.10$ and correct runs at a tenth of the cost, $c_{\text{lo}}/p_{\text{hi}}$ held in 99% of all experiments but in 55% of those with no correct run. The smaller bound held in all of them. A second simulation, which resamples the 34 observed token counts and keeps only experiments with no correct run, gives the coverage by how much a correct run costs relative to a failed one: about 100% at the same cost, 97% at three quarters, 84% at half ("about 85%"), 55% at a quarter and 34% at a tenth, at a true rate of 10%. The figures depend on the spread of run costs. So the 95% level is not guaranteed if correct runs cost half of failed ones, and holds less still if they cost far less |
| It is tied to the budget | Every run used its 6 calls. Another budget changes $c$ and $p$ |
| It supports no ratio estimate | Against another arm it gives a one-sided statement only ("the ratio is at least"), and it gives no upper cost |

Two other figures are not used. 637,000 divides the mean per run (53,702) by the one-sided 95% limit of the rate (0.0843) and treats $c$ as known. 609,000 divides the total tokens (1,825,875) by 3, the rule-of-three limit on the count of correct runs; it uses no interval for $c$.

## 8. Break-even uses of a piece

**Identity.** A piece and its gauge cost $F$ tokens once. Each use must end in one correct result. After $N$ uses the workshop has spent $N \cdot CPC_W$ on average and the line $F + N \cdot CPC_L$. The line is cheaper when $N$ exceeds

$$ N^{\ast} = \frac{F}{CPC_W - CPC_L} $$

If $CPC_W \le CPC_L$ there is no break-even. `breakEven` computes it.

**What follows.**

- With section 6, as models improve $CPC$ tends to $\tau$ in each arm and $N^{\ast}$ tends to $F/(\tau_W - \tau_L)$: the piece is repaid only by the tokens it saves per attempt, and $N^{\ast}$ grows.
- When the workshop has no correct run, $CPC_W$ has only the lower bound of section 7. Then $N^{\ast}$ has only an upper limit and no estimate.
- $F$ is not recorded by any experiment today, and the records of E05 and E08 have no field for it. A piece written by a person costs hours, and the model has no rate to turn hours into tokens. Until the record of each experiment that builds a piece carries $F$ in tokens (the piece and its gauge, authoring only), $N^{\ast}$ cannot be computed.

**Illustration.** $F = 2{,}400{,}000$, $CPC_W = 300{,}000$ and $CPC_L = 20{,}000$ give $N^{\ast} = 8.6$: the line is ahead from the ninth use.

## 9. Predictions

The verdict on a thesis follows the rules in [`method.md`](method.md#verdicts): an interval that includes the null value is `undecidable`, never `refuted`, and a refutation needs the interval to lie entirely on the wrong side. This table adds what would refute the model. A model prediction that fails does not refute its thesis, and the reverse. Theses are in [`theses.md`](theses.md).

Each row has a kind: a prediction, a consistency check (it checks an assumption and cannot fail unless the assumption does), or a prediction that is not testable yet. "Refuted by" names the single observation that would contradict the row and the experiment that records it. When no experiment records it today, the row says "not testable yet" and what is missing.

| # | Kind | Statement | Thesis | Experiment | Refuted by |
| --- | --- | --- | --- | --- | --- |
| P1 | Prediction | With the gauge in view more runs are correct, $D > 0$, because the loop spends more attempts: $p = \pi \mathbb{E}[A]$. The gain is expected to be largest in `signature`, `webhook` and `ledger`, where `kit-bare` stops after one attempt | T11 | E04 | The upper limit of $D$ below $d^{\ast}$, from the correct-run counts of E04. The slot clause is weaker: it compares 15 runs per arm in three slots with 10 in the other two, and the per-slot pass rate $\pi_s$ differs by slot (a slot with $\pi_s$ near 1 leaves no room for a gain). It would be refuted only by an interval for the contrast (gain in the three slots minus gain in the other two) lying entirely below 0. With 5 runs per cell that interval is wide, so the clause will almost always be `undecidable`: read it as an expectation, not a test |
| P2 | Consistency check | In the discount slot, the false confidence read from final states, $b/(a+b)$, equals the per-attempt value $(1-\pi)(1-\mathrm{Se})/g$. The non-trivial part is that both estimates agree, which holds only under A2 and A3. The statement that false confidence reaches one half only if $(1-\pi)(1-\mathrm{Se}) \ge \pi \mathrm{Sp}$ is arithmetic (section 3), not a prediction. T12's own criterion, at least half of the runs, is the thesis's verdict and not a model prediction | T12 | E04 | The interval of the final-state false confidence excludes the per-attempt value computed from the pooled attempts of the same runs. That would show $\pi$ or $\mathrm{Se}$ drifting with the attempt. Not testable yet: it needs the gauge and judge result of every attempt (section 11), and E04 records only the final state of each run. This is an instrument change |
| P3 | Consistency check | With $\mathrm{Sp} = 1$, $CPC_T/CPC_C = (\tau_T/\tau_C)(\pi_{1C}/\pi_{1T})$, where $\pi_1$ is the judge pass rate of first attempts. The gauge lowers the cost per correct run only if it raises the per-attempt pass rate by more than it raises tokens per attempt. The non-trivial part is that $\pi$ does not rise with later attempts (A2) | T13 | E04 | The interval of the observed cost ratio excludes the product computed from first-attempt $\pi$ and mean tokens per attempt. A gap would show that the feedback raises $\pi_t$ (section 3, "If attempts improve"): a finding about A2, not a refutation of $CPC = c/p$. Not testable yet: it needs the judge result and tokens of every attempt, an instrument change |
| P4 | Prediction | The line is correct more often: $p_L/p_W \ge 1$ by the ratio of section 4, which holds when $\gamma \le 1$. With the 7B, $\phi$ is near 0 and $D$ is close to $p_L$ | T14 | E05 | The upper limit of $D$ below $d^{\ast}$, from the correct-run counts of E05. E05 is not designed; in its local variant the workshop is expected at the floor, so $D$ is then the line's rate. If P11 finds $R > 1$ ($\gamma > 1$) the ratio is no longer guaranteed above 1 |
| P5 | Prediction, partly not testable yet | The arms are ordered: workshop, then workshop with the gauge, then line. The gauge buys attempts and may raise $\phi$ through feedback on the glue (in E03 the only visible check any attempt passed was the health check). Assembly removes the factor $\phi$ and the glue's retries altogether | T15 | E05 | Two parts. Workshop with the gauge below workshop: the interval for their difference lies entirely below 0. Line not above workshop with the gauge: not testable yet. T15's criterion ("more correct runs") has no size, and the rule of `method.md` needs a $d^{\ast}$ to refute, so as written the thesis can come out `supported` or `undecidable` and never `refuted`. The `workshop-gauge` arm is also not specified (E05, open question 4) |
| P6 | Prediction | The line costs less per correct result: $\log(CPC_W/CPC_L)$, structural plus retry, is above 0. Which term is larger depends on the model. In the illustration of section 6 the retry term is the larger only below $\rho \approx 0.82$, and this is read from the two reported terms, not predicted | T16 | E05 | The interval for $\log(CPC_W/CPC_L)$ lies entirely below 0. Testable only when both arms have at least one correct run. With no correct workshop run (expected with the 7B: 0 of 34 on the full task) the instrument gives only "the ratio is at least", so the interval cannot lie entirely below 0 and the result is `supported` or `undecidable`. With no correct line run it gives "at most", which can refute. T16's criterion ("at most the same, in tokens and in dollars") is the thesis's verdict |
| P7 | Prediction, not testable yet | With a stronger model the retry term $\log(p_L/p_W)$ shrinks toward 0 and the structural term tends to $\log(\tau_W/\tau_L)$, whose sign is not guaranteed (section 6) | T16, at the model scale of T6 | None registered | The retry term at the stronger model is not smaller than at the weaker model, on the same task and design, with both arms having correct runs at both scales. Not testable yet: T6 has no experiment and no criterion, E05 is not designed, and the instrument reports the two terms as point estimates with no interval, so "does not shrink" has no decision rule. Needed: a registered two-scale design and an interval for the change in the retry term |
| P8 | Prediction, not testable yet | A piece repays its authoring after a finite $N^{\ast}$. Beyond P6 this adds only that $F$ is finite and known | T16 | E05, with $F$ recorded | The interval for $CPC_W/CPC_L$ lies entirely below 1 (the workshop is not dearer, so no break-even exists). An interval that includes 1 is `undecidable`, not refuted. Not testable yet: no experiment records $F$ (the records of E05 and E08 have no field for it), so $N^{\ast}$ cannot be computed and the verdict reduces to P6's |
| P9 | Prediction, not testable yet | Correct runs follow $\prod_j (r_j q_j + (1-r_j) q_j^{0})$: questions help through $r_j$, and only for rules a default does not already satisfy | T17 | E06 | Recovered rules double and correct runs do not rise; or correct runs rise with no more rules recovered. Not testable yet: the harness cannot ask a question and E06 is not designed |
| P10 | Prediction, not testable yet | An independent gauge has higher sensitivity than the model's own, so false confidence is lower at equal $\pi$ | T18 | E07 | The own gauge at least as sensitive, measured per attempt or on a fixed set of faulty versions. Not testable yet: E07 is not designed and its primary metric is open |
| P11 | Prediction | Pieces that pass alone pass together: $R = 1$ | T19 | E08. The `line` arm of the E05 local variant reads it earlier, at slot level | An interval for $R$ that excludes 1. Above 1 refutes the law and not T19; below 1 puts T19 in trouble. It is valid only if the call budget grows with the open slots (A6); with a shared budget $R$ falls without interference. E08 has only one piece today |
| P12 | Prediction, not testable yet | $\log p$ adds up over open slots as in section 5: $\log p_L(S) = (\lvert S \rvert - 1)\log\gamma + \sum_{j \in S}\log q_j$, a straight line in $\lvert S \rvert$ when the slots are equally hard | T19 | E04 for one slot; E05 and E08 for all. Not testable with the current designs | With three dose levels (1, 3 and 5 open slots): the observed $\log p$ at 3 open slots lies off the line through the other two, or off the value the sum form predicts from the single-slot rates and the $\gamma$ of the five-slot runs, with an interval that excludes it. With doses at 1 and 5 only, two points are always collinear and the line cannot fail. Needed: a design with runs at 3 open slots, with the call budget scaled to the slots (A6) |
| P13 | Prediction | The difference has the same sign in every stack when $\gamma_k \le 1$ in each, since then $p_{L,k}/p_{W,k} \ge 1$ | T20 | E05 | The interaction flag: two stacks with opposite signs whose contrast excludes 0, in E05. This is T20's own rule |
| P13b | Prediction, not testable yet | The size is $D_k = p_{L,k}\,(1 - \phi_k \gamma_k^{J-\lvert S \rvert} \prod_{j \notin S} q_{jk})$. It is larger where $\phi_k$ is smaller only at equal $p_{L,k}$, and the per-slot rates $q_{jk}$ differ by stack | T20 | E05 | A larger gain in the stack with the better glue rate, after allowing for $p_{L,k}$ and the $q_{jk}$. Not testable yet: it needs $\phi_k$ per stack (the share of workshop runs that pass the glue checks, A7; in E03 no run passed the health check in either stack, so $\phi_k$ cannot be told from 0) and the $q_{jk}$ per stack from E04, which has not run |

### Open questions

These are not predictions. The model gives no sign, so nothing here can be refuted by it.

| # | Question | Thesis | Why the model is silent |
| --- | --- | --- | --- |
| Q1 | Does a purpose-built stack add anything beyond the line? | T21 | $p_L$ contains no $\phi$, so a stack can add only through $q_j$, $\gamma$, $\tau$ or $F$, and the model has no value for any of them in a stack that does not exist yet. T21 has no criterion and no experiment (formerly P14) |

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
| A5 | Slots combine by the product law with one constant $\gamma$ per added open slot. $\gamma = 1$, no interference, is the case P11 tests; sections 4 and 5 keep $\gamma$ free | 4, 5 | The law does not hold, or $R$ differs from 1 | E08; the E05 local `line` arm |
| A6 | The call budget grows with the number of open slots | 5 | $R$ falls below 1 without interference | A design choice of E05 and E08 |
| A7 | A rule is as hard in the workshop as on the line, and the glue fails independently of the rules | 4 | The ratio is not $1/\phi$ | E05: among workshop runs past the health check, the hidden tests tied to each slot |
| A8 | Tokens per attempt have the same mean at every attempt | 6 | $c$ is not $\tau \mathbb{E}[A]$. Mildly false: the prompt gains one line per earlier attempt | E04, E05: tokens against attempt index |
| A9 | The 34 full-task runs share one $p$ and one $c$, whatever the arm (including `of-spec` and `of-code`) and with the budget of 6 calls | 7 | The pooled bound is too strong | Cannot be checked: every run failed |
| A10 | $F$ is paid once, and every use costs the same; no maintenance | 8 | $N^{\ast}$ is too low | No current experiment. $F$ must be added to the records of E05 and E08 before it can be recorded |
| A11 | A stronger model raises $\pi$ toward 1 and keeps the ratio of $\tau$ | 6 | The limit of the structural term moves | No registered experiment: T6 has none. It would need E05 at a second model scale |
| A12 | Omitted rules are recovered independently | P9 | The product of P9 fails | E06 |

## 11. What the bench must record

Today `runs.csv` has no slot, seed or gauge column, and only the final state of a run is judged. The model needs:

| Level | Fields | Gives |
| --- | --- | --- |
| Attempt | Tokens in and out, output cap hit, gauge result, judge result | $\pi$, $\mathrm{Se}$, $\mathrm{Sp}$, $\tau$, and the check of A2, A3, A8 |
| Run | Slot, seed, final gauge result | The gauge table per arm and slot |
| Run with several open slots | Each slot judged alone, with the reference in the others | Whether a failure is one slot or the fit between slots |
| Piece | Tokens spent to author it and its gauge, written in the record of the experiment that builds it | $F$ |
| Workshop run | Result of each glue check (build, start, health) | $\phi_k$ per stack, for P13 and A7 |
| Design | Runs at 1, 3 and 5 open slots, with the call budget scaled to the open slots | P12, A6 |

Judging an attempt costs build time and no model tokens.

## 12. What the model does not support

- That the product law holds. Only "not rejected", with the interval of $R$.
- Sensitivity or specificity read from final-state tables.
- A cost ratio estimate, or an upper cost, against an arm with no correct run.
- That the retry saving survives stronger models. The model predicts that it does not.
- Any illustration as a result.
- Anything beyond the slots, stacks and model that were run.

## 13. Numerical check

Every derivation was compared with a seeded simulation on 2026-11-18. The simulation script was not kept. The check can be reproduced from the formulas of sections 2 to 8 and the functions of [`analysis/stats.mjs`](../analysis/stats.mjs) (`gaugeLoop`, `costPerCorrect`, `costRatio`, `breakEven`, `productLaw`): draw runs with the stated parameters and compare the simulated means with the formula values below.

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
| Cost per correct delivery with damage ($\pi = 0.3$, $\mathrm{Se} = 0.8$, $\mathrm{Sp} = 0.9$). The formula depends on $\tau$ and $\lambda$ only through $\tau + 0.14\lambda = 10{,}000$, with $0.14 = (1-\pi)(1-\mathrm{Se})$ | 37,037 | 36,988 |
| Attempts per run with rising $\pi_t$ ($\mathrm{Se} = 0.8$, $\mathrm{Sp} = 0.9$, $B = 6$). The formula reproduces 2.3776 with $\pi_t = 0.2, 0.3, \dots, 0.7$ | 2.3776 | 2.3764 |
| Workshop success, illustration of section 4 | 0.0739 | 0.0740 |
| Line success, five and two open slots | 0.2617, 0.6412 | 0.2615, 0.6412 |
| Correct with five open slots ($q = 0.8$, $\gamma = 0.9$) | 0.2150 | 0.2150 |
| Slope of log-correctness | -0.3285 | -0.3284 |
| Structural and retry terms at $\rho = 0.9$ | 1.892, 0.653 | 1.893, 0.653 |
| Log cost ratio at $\rho = 0.999$ | 1.293 | 1.293 |
| First use at which the line is cheaper | 9 | 9 |
| Correct runs with questions, illustration of P9 | 0.3142 | 0.3140 |
| Wrong deliveries per correct one ($\pi = 0.3$, $\mathrm{Se} = 0.8$, $\mathrm{Sp} = 0.9$) | 0.5185 | 0.5176 |
| Ratio $p_L/p_W$ with every slot open, $1/\phi$ with $\phi = 0.9^{12}$ | 3.5407 | 3.5321 |
| Lower bound $c_{\text{lo}}/p_{\text{hi}}$ holds, eight simulated scenarios with 34 runs | At least 95% | 98.0% to 100% |
| Lower bound from the project's 34 runs, seven bootstrap seeds (1 to 7), reproducible with `costPerCorrect` | $c_{\text{lo}} / 0.10282$ | 494,082 to 494,850 |
