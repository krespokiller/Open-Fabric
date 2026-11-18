# Research method

This is how OpenFabric turns an idea into a verdict. Every claim becomes a numbered thesis, every thesis is tested by an experiment whose decision rule is written before it runs, and every result is published whether it helps the idea or not. The research is the means; the end is a decision about what to build.

Three companions go with this document: the equations behind the claim are in [`model.md`](model.md), the statistics are implemented and tested in [`../analysis/`](../analysis/), and the instrument is described in [`architecture.md`](architecture.md).

## The question

Today an AI agent writes every system from scratch and made to measure. OpenFabric claims a factory works better: the agent assembles verified pieces, the model writes only the small gaps, and a gauge decides pass or no pass.

The claim makes three promises, and each one is a thesis to test, not a fact:

1. Fewer tokens to reach correct software.
2. Vague prompts that still work, because pieces bring default decisions.
3. It works in any stack.

## The loop

1. **State** the thesis in [`theses.md`](theses.md).
2. **Design** the experiment: arms, stacks, slots, model, metric, runs per cell.
3. **Control**: show without a model that the experiment can fail and cannot pass by construction.
4. **Explore**: a small exploratory campaign to look for floors, ceilings and a broken loop.
5. **Preregister**: fix the decision rule and freeze the instrument.
6. **Run** the confirmatory campaign.
7. **Report** in [`../experiments/`](../experiments/), whatever the outcome.
8. **Decide**: update the registry and the roadmap, and pick the next thesis.

Steps 3 and 4 exist to save step 6. If a control or the exploratory campaign shows the design cannot discriminate, redesign and go back to step 2.

## Vocabulary

| Term | Meaning |
| --- | --- |
| Research question (`RQ`) | A family of theses about one part of the idea |
| Thesis (`T`) | One falsifiable claim with one primary comparison |
| Experiment (`E`) | One frozen design that tests one or more theses |
| Arm | What the model is given: the treatment |
| Stack | The language and framework the software is built in |
| Task | The software to build and the rules it must follow |
| Task variant | A version of the task with different rules. Today there is one task and no variants |
| Slot | One business rule left open in an installed service, for the model to write |
| Model | The model or agent under test, with its exact version and settings |
| Cell | One combination of arm, stack, slot (when the design has slots), task and model |
| Run | One attempt at one cell, from a prepared workspace to a judged result |
| Block | One run in every cell |
| Campaign | A whole execution of an experiment: the exploratory campaign, the confirmatory campaign |
| Product gauge | In the product: the contract and tests that decide whether a piece fits |
| Visible gauge | In an experiment: the tests a model can see while it works. It is a treatment |
| Judge | The hidden suites that decide the result and that no model ever sees |
| Instrument | The harness in `bench/`: task, arms, stacks, suites and the loop |

## Theses

**Statuses.** A thesis moves through `proposed` → `designed` → `preregistered`, and then receives a verdict: `supported`, `refuted` or `undecidable`. Two more statuses close a thesis without a verdict: `discarded` (it never ran, with the reason) and `superseded` (replaced by another thesis).

**Rules.**

- A thesis names its one primary comparison and what result would refute it.
- A thesis can be edited freely until it is preregistered. After that, any change to the claim, the metric or the decision rule is a new thesis with a new number.
- Numbers are never reused.
- A verdict has a scope: the stacks, slots, models and task it was tested on. No claim goes beyond its scope. A thesis tested again at a new scope gets one more verdict, recorded next to the first with its scope.
- The registry records who set each criterion and when. A criterion proposed by an assistant is `proposed` until the owner confirms it.
- The default decision rule below is for a difference in the proportion of correct runs between two arms. A thesis with a primary comparison of another shape (a cost, a ratio, a rate inside one arm, a consistency across stacks) names its own test and decision rule in the record before the tag. A thesis without a rule that can refute it is not preregistered.

## Experiments

### Design

- **One difference per comparison.** Two arms that are compared differ in the treatment and in nothing else that the record does not name.
- **Calls are held equal or reported at equal calls.** Both arms stop by the same rule, or the record shows the primary comparison again with calls held equal (every arm scored at its first attempt). An arm that sees more checks may keep working longer; that is part of what is being measured only if the record says so.
- **Equal runs per cell.** The design is balanced, so results can be combined across stacks and slots without one of them dominating. A lost run is rerun with its seed.
- **Same run indexes in every arm.**

### Stacks

- A stack is an experimental factor, not a product decision. The product stack is chosen from the results.
- A thesis that claims anything general runs in at least two stacks from different families.
- Results are reported per stack first and combined second.
- A new stack enters the instrument when its reference passes every suite. See [`architecture.md`](architecture.md).

### Models

- The model is part of the scope. A result with a 7B local model says nothing about a frontier agent, and the reverse.
- Generality is earned in this order: two stacks, then two models, then two tasks.
- Help for agents tends to matter less as models improve. [`model.md`](model.md) separates the part of the saving that should shrink with stronger models from the part that should stay, and both are measured.

### Judges

- The hidden suites are the judge. Their contents and values never reach a model under test or any arm's context, including examples inside a piece.
- At least one suite is written by someone who never saw the piece under test. The record states the primary result on that suite alone, next to the verdict.
- A visible gauge is never the judge. A run that passes every visible check and fails a hidden test is counted: it is the false-confidence rate.

### Controls before preregistering

Every design passes these without spending a token:

| Control | Question it answers |
| --- | --- |
| Reference | Does the correct solution pass every suite in every stack, repeatedly? An unstable judge is fixed before anything runs |
| Empty | What does an unfilled or trivial solution score? This is the floor |
| Wrong solution | Does the most likely wrong solution still meet the criterion? If it does, the criterion is met by construction |
| Can it fail | Is there a plausible result of a real attempt that misses the criterion? |
| Denominator | Is every ratio in the criterion defined when an arm scores zero? |

### Exploratory campaign

A small campaign before the decision rule is fixed, with at least five runs per arm.

- **Floor and ceiling.** Redesign when both arms sit at the same extreme, or when the control arm is already at the ceiling. A control at the floor with a treatment above it is a readable result. A binary metric cannot show a floor with a handful of runs, so the hidden pass fraction is read as well.
- **The loop.** Read the transcripts: the rate of repeated answers, attempts that hit the token cap, and the compile rate. A loop that feeds the model nothing new is fixed before the confirmatory campaign.
- **Speed.** Measure minutes per run. The plan below is chosen with that number.

Exploratory runs are reported and are never added to the confirmatory data, nor used as a prior.

## Preregistration

The record of the experiment fixes, before the confirmatory campaign:

- the theses tested and, for each, the primary comparison, the smallest difference that matters and the decision rule;
- the primary metric and the secondary metrics;
- arms, stacks, slots, model and settings, runs per cell, call budget and stop rule;
- the looks: how many times the data is examined, and after which blocks;
- the exact command that launches the campaign.

Then the design is frozen:

- a git tag `prereg/E<nn>` on the commit that holds the record, with a clean working tree;
- the harness hash of `task/`, `arms/`, `suites/`, `src/` and `stacks/`. The harness refuses to resume a campaign when the hash changes;
- a results directory used only for the confirmatory campaign.

The hash is not the whole freeze. What it covers and what it leaves out is listed under "What the harness hash freezes" in [`architecture.md`](architecture.md). Until the harness checks the rest, the record carries it: the commit, the command and the directory.

A change after the tag means a new experiment number.

## Analysis

The rules here are implemented in [`../analysis/`](../analysis/), with tests against known values. Its README explains each formula and prints the tables below.

### Metrics

| Metric | Definition | Role |
| --- | --- | --- |
| Correct run | The run passes every test of every hidden suite | Primary, unless the record says otherwise |
| Hidden pass fraction | Tests passed over tests in each hidden suite | Secondary, more sensitive |
| Cost per correct run | Total tokens of an arm over its correct runs | Secondary |
| False confidence | Among runs that pass the visible gauge, the share the judge fails | Secondary |
| Calls, compile rate, repeated answers | Counted per run | Diagnostic |

### The decision rule

Each primary comparison has a treatment arm and a control arm, and a preregistered smallest difference that matters, written $d^*$. The rule separates two questions that a single threshold mixes up: is the treatment better at all, and could it be as much better as claimed.

At each planned look, in this order:

1. **Broken instrument.** The hash changed, a block is incomplete, or the look was not planned: `undecidable`.
2. **Floor or ceiling.** Every run failed or every run passed, in both arms: `undecidable`.
3. **Refuted.** The upper limit of the interval for the combined difference is below $d^*$, and the stacks do not contradict each other: `refuted`. The data exclude a difference as large as the claim.
4. **Supported.** The exact stratified test gives a one-sided p at or below the level of the look, and the observed difference is positive in every stack: `supported`. The treatment is better, and a difference of $d^*$ is not excluded.
5. **Otherwise** continue to the next look. After the last look: `undecidable`, with the cause (too few runs, stacks that disagree, no difference in one stack).

The pieces:

- **The test** is the exact conditional Cochran-Mantel-Haenszel test, with one stratum per stack and slot. With a single stratum it is Fisher's exact test. Its false-support rate stays at or below 2.5% whatever the base rates of the stacks and slots.
- **The interval** is Newcombe's for the difference of two proportions, on equal-weight combined counts. Its width for refutation is calibrated by simulation so that a true difference of exactly $d^*$ is called `refuted` at most 2.5% of the time.
- **Stacks that contradict each other** means two stacks with opposite observed signs whose difference between them is itself distinguishable from zero. It blocks `refuted` and is reported as a finding about the stack.
- **Looks.** One look, at the end, by default. A second look at half the blocks is allowed when preregistered, with stricter levels at each look.

`supported` does not mean the difference is at least $d^*$. The estimate and its interval are always reported next to the verdict, and they say how large the difference is.

### How many runs

The plan is chosen with the smallest difference that matters. For a design of two stacks and five slots, from simulation:

| $d^*$ | Runs per cell | Total runs | `supported` when the true difference is $d^*$ | `refuted` when there is no difference |
| --- | --- | --- | --- | --- |
| 50 points | 2 | 40 | 84 to 90% | 85% |
| 40 points | 3 | 60 | 84 to 90% | 83% |
| 30 points | 5 | 100 | 81 to 92% | 82% |
| 30 points, two looks | 3, then 6 | up to 120 | 87 to 96% | 88% |
| 20 points | 10 | 200 | 78 to 93% | 76% |
| 20 points, two looks | 6, then 12 | up to 240 | 84 to 96% | 83% |

The table is printed by `node analysis/cli.mjs design` (100,000 seeded replicates per scenario). In every plan the rule supports a treatment with no effect at most 2.0% of the time and refutes a true difference of $d^*$ at most 2.4% of the time.

When the true difference is half of $d^*$, the verdict is `undecidable` in 33 to 47% of experiments. That is the rule working: the data cannot say.

For a plain comparison of two arms with no strata, Fisher's exact test at 80% power needs about 102, 49, 29 and 18 runs per arm to detect 20, 30, 40 and 50 points around 50%. Twenty-five runs per arm detect about 40 points and nothing smaller.

A decision rule that the planned runs cannot support is not preregistered.

### Estimates

- Every proportion is reported with its count and its 95% Wilson interval. An arm at zero of $n$ also gets the one-sided bound $1 - 0.05^{1/n}$: zero correct in 34 runs means at most 8.4%.
- Results are reported per stack, per slot, then combined, each difference with its Newcombe interval. A slot that goes against the combined direction is flagged.
- An estimate taken after stopping early is labelled as biased upward.

### Cost per correct run

- The estimate is total tokens over correct runs. It estimates the expected cost of obtaining one correct result by retrying; see [`model.md`](model.md).
- The interval is $[c_L / p_U,\ c_U / p_L]$: bootstrap limits for the mean tokens per run, and exact limits for the proportion of correct runs.
- **Zero correct runs** gives a one-sided statement, worded "at least". Today, writing the whole service from scratch with the 7B costs at least about 495,000 tokens per correct run (34 runs, 1.83 million tokens, none correct).
- Two arms are compared on the log of the ratio. When one arm has no correct runs the comparison is one-sided, and a thesis that needs the ratio itself is `undecidable`.

### Gauge against judge

Each run gives one cell of a two-by-two table: visible gauge passes or fails, judge passes or fails. The false-confidence rate is read from it, per arm and per slot, with its interval. Sensitivity and specificity of a gauge need the result of every attempt, not only the last one, because the loop stops when the gauge passes.

### Secondary analyses

Posterior probabilities for the difference, the composition check of [`model.md`](model.md), and anything else not named as primary are reported and never produce a verdict.

## Reporting

Each experiment has a folder `experiments/E<nn>-<slug>/` with a `README.md` built from [`../experiments/TEMPLATE.md`](../experiments/TEMPLATE.md):

1. Verdict per thesis, first.
2. Design as preregistered, with the tag, the commit and the hash.
3. Controls and the exploratory campaign.
4. Results per stack and per slot, then combined, with counts.
5. Deviations from the preregistration.
6. Limits.
7. What changes: registry, roadmap, next thesis.

The data behind every number is kept next to the record. Raw workspaces and transcripts stay outside git.

A result is published when it supports the idea and when it does not. A report is never edited to improve a verdict; corrections are appended with a date.

## Deciding

After each report:

1. Update the status of every thesis touched, in [`theses.md`](theses.md).
2. Update [`roadmap.md`](roadmap.md): what the result unblocks, what it kills, what runs next.
3. Check the decision map in [`decisions.md`](decisions.md). It says which combinations of verdicts justify building which thing.

No product code is written before a gate in the decision map is met. Code written to run an experiment lives in `bench/`, and code that analyses results lives in `analysis/`.

## Threats to check in every design

| Threat | Check |
| --- | --- |
| The judge favours the treatment | The result on the independent suite alone is stated next to the verdict |
| Judge values reach an arm | Every arm context, including examples inside a piece, is compared with the hidden suites before the campaign |
| The treatment is correct by construction | The empty and wrong-solution controls |
| One arm gets more calls or more context | Same stop rule, or the comparison repeated at equal calls |
| Information and feedback are confounded | Separate arms, or listed as a limit |
| The model tunes the answer to the visible examples | Hidden tests cover the same rule with different values |
| The same model writes the code and its gauge | The gauge is written by a different author |
| Single task, single model, single stack | The scope is stated and the generality order is followed |
| The instrument has a bug or an unstable judge | `validate-gold` repeated, `selftest`, the unit tests, and the transcripts of the exploratory campaign |

## Why each rule exists

Every rule above was paid for by a mistake in this project or by published evidence.

| Rule | What happened |
| --- | --- |
| Exploratory campaign first | The pilot spent 18 runs to learn that every arm scored 0 of 21 |
| Read the transcripts | The loop gave the model no history of its attempts, and runs repeated the same answer. The selftest could not catch it, because the fake model ignores its prompt |
| Wrong-solution control | T8 asked for 90% of the hidden tests, and an 87-token answer with a rounding mistake already scored 95% |
| Denominator control | T9 divided by the passes of arms that never passed a test |
| Calls held equal | In the slot design, one arm stops after 4 checks and the other continues to 12 |
| Independent judge | The piece and the first hidden suite had the same author; a second suite was written from the task alone |
| Arm contexts compared with the judge | The piece given to two arms contained example values that the independent suite also asserts |
| Reference judged repeatedly | The correct Django reference failed one hidden test in 5 of 13 judgements |
| Two questions, not one threshold | With a single threshold, a true 20-point effect at the planned size was called `refuted` in half of the experiments |
| Runs chosen with the difference | A 20-point criterion with 25 runs per arm cannot be told from noise |
| Gauge by a different author | Published result: tests written by the same model after the code detect 14% of faults, against 25% when written independently |
| Hidden tests next to visible examples | Published result: read-only tests stop a model from editing them, not from special-casing them |
