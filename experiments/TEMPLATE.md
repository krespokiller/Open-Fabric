# Experiment record template

Copy the block below into `experiments/E<nn>-<slug>/README.md` and fill it in. The seven sections are the ones listed under "Reporting" in [`docs/method.md`](../docs/method.md); keep their order and their numbers in every record, so a reader always finds the verdict in section 1.

## Rules for filling it in

- **Lead with the answer.** The first paragraph states the verdict, or what the experiment will decide if it has not run.
- **Keep every section, even when empty.** Write "Not run yet" or "None" instead of deleting a section.
- **Counts before percentages.** Write "0 of 18", then the 95% Wilson interval for the primary metric.
- **Per stack first, pooled second.**
- **Say who set what.** A criterion or design choice proposed by an assistant is labelled as a proposal until the owner confirms it.
- **Never edit a result to improve a verdict.** Append corrections with a date under "Corrections".
- **Data next to the record.** `data/runs.csv` and the harness report go in `data/`. Raw workspaces and transcripts stay outside git.
- **Keep the judge hidden.** Do not copy hidden test names, values or code into a record. Test IDs are fine.
- **No private details.** No usernames, emails, local paths or hostnames.

## Status values

| Status | Meaning |
| --- | --- |
| `proposed` | A sketch. Arms, metric or criterion are still open |
| `designed` | Arms, metric and controls are written. The criterion is not confirmed |
| `preregistered` | The criterion is fixed and the design is frozen with a tag and a hash |
| `reported` | It ran and the record holds the results |

## The block to copy

Links inside the block are written for a file at `experiments/E<nn>-<slug>/README.md`.

````markdown
# E<nn>: <title>

<One paragraph. The verdict per thesis and the reason, or what this experiment will decide. No background first.>

| Field | Value |
| --- | --- |
| Status | `proposed`, `designed`, `preregistered` or `reported` |
| Kind | confirmatory, exploratory or control |
| Dates | <when it ran, or "not run"> |
| Theses | <T numbers>, defined in [`docs/theses.md`](../../docs/theses.md) |
| Research questions | <RQ numbers> |
| Scope | <stacks, model, task> |
| Tag and hash | <`prereg/E<nn>` and the harness hash, or "none"> |
| Data | <files in [`data/`](data/), or where the raw data is kept> |

## 1. Verdict per thesis

| Thesis | Claim | Primary comparison and criterion | Verdict | Reason |
| --- | --- | --- | --- | --- |
| T<n> | <claim> | <comparison and criterion, and who set it> | `supported`, `refuted`, `undecidable` or "none yet" | <one line> |

Scope of the verdicts: <stacks, model, task, loop>.

## 2. Design as preregistered

| Item | Value |
| --- | --- |
| Arms | <what each arm gives the model> |
| Stacks | <stacks> |
| Model and settings | <exact version, temperature, output cap, context> |
| Task | <task and variants> |
| Runs per cell and call budget | <numbers> |
| Primary metric | <metric> |
| Secondary metrics | <metrics> |
| Analysis | <pooling and test> |
| Stopping rule | <rule> |
| Tag, commit and hash | <tag, commit, harness hash> |

## 3. Controls and the exploratory run

| Control | Result |
| --- | --- |
| Reference | <does the correct solution pass every suite in every stack?> |
| Empty | <what an unfilled or trivial solution scores> |
| Can it fail | <a plausible outcome that misses the criterion> |
| Denominator | <is every ratio defined when an arm scores zero?> |
| Exploratory run | <one run per cell: floor or ceiling?> |

## 4. Results per stack, then pooled

### <Stack>

| Arm | Runs | Correct runs | 95% Wilson interval | Hidden tests passed | Tokens | Calls |
| --- | --- | --- | --- | --- | --- | --- |

### Pooled

<Pooled counts, the test on the primary comparison, and whether the sign is the same in every stack.>

### Corrections

<Dated corrections. Leave "None" until there is one.>

## 5. Deviations from the preregistration

<Every difference between what was fixed and what ran. "None" if there is none.>

## 6. Limits

<What this result cannot say: scope, authorship of the judge, confounds, sample size.>

## 7. What changes

- **Registry:** <status of each thesis touched, for [`docs/theses.md`](../../docs/theses.md)>
- **Roadmap:** <what this unblocks or kills, for [`docs/roadmap.md`](../../docs/roadmap.md)>
- **Next:** <the next thesis or experiment>

For a record that has not run, add here the open design questions and what the owner must decide.
````

## After writing the record

1. Add a row to the index in [`README.md`](README.md).
2. Update the thesis registry and the roadmap as described under "Deciding" in [`docs/method.md`](../docs/method.md).
