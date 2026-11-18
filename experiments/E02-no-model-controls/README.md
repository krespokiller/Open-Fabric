# E02: No-model controls

**Two theses were discarded before spending a token.** With the reference installed and only the discount function changed, T8's criterion is met by construction and T9's ratio has no denominator. T10 depends on T9 and falls with it. The same controls gave the first evidence in favour of the gauge: two hidden suites, written separately, both catch a rounding error.

| Field | Value |
| --- | --- |
| Status | `reported` |
| Kind | control, no model call |
| Dates | 2026-11-10 and 2026-11-11 |
| Theses | T8, T9, T10, defined in [`docs/theses.md`](../../docs/theses.md) |
| Research questions | RQ2 Assembly (T8, T9); RQ6 Model scale (T10) |
| Scope | Next.js and Django; the checkout reference with one function changed; no model |
| Tag and hash | None. Nothing was preregistered and the harness commit was not recorded |
| Data | The raw results are kept outside the repository. The numbers here are carried from [`docs/context.md`](../../docs/context.md) and cannot be recomputed from this repository |

## 1. Verdict per thesis

No thesis gets a verdict. T8, T9 and T10 were `discarded` on 2026-11-11 without running. They belonged to a second round that proposed a new arm, `of-kit`: the tool installs the whole piece with its adapter for the stack, and the model gets the contract of the gaps and the public tests. The criteria were proposals and were never fixed.

| Thesis | Claim | Proposed criterion | Status | Reason |
| --- | --- | --- | --- | --- |
| T8 | With the piece assembled by the tool, a small model reaches correct software | In each stack, `of-kit` passes on average at least 90% of `hidden` and of `hidden2` | `discarded` | It cannot fail. The discount function the 7B wrote in [E01](../E01-pilot-full-task/README.md) already scores 95% and 92% |
| T9 | Assembling is cheaper than manufacturing | In each stack, `of-kit` spends at most 30% of the tokens per passed test of the best from-scratch arm | `discarded` | No denominator. No from-scratch arm passed a single test in E01 |
| T10 | The advantage holds with a larger model | T9 also holds with a 14B model | `discarded` | It is T9 on another model, so it inherits the missing denominator |

## 2. Design as preregistered

Nothing was preregistered. This is step 3 of the loop in [`docs/method.md`](../../docs/method.md): show without a model that the experiment can fail.

| Item | Value |
| --- | --- |
| Procedure | Take the validated reference, change only the discount function, and run both hidden suites in Docker |
| Variants | The function returns 0; the function throws (unfilled); the function as the 7B wrote it in E01, which uses ordinary rounding |
| Stacks | Next.js and Django. The 7B variant ran in Next.js only |
| Judge | `hidden` (21 tests) and `hidden2` (26 tests) |
| Model | None |

## 3. Controls and the exploratory run

The experiment is itself the control. Read against the four controls of `docs/method.md`:

| Control | Result for the second-round design |
| --- | --- |
| Reference | Passes 59 of 59 in each stack, as recorded in [`bench/README.md`](../../bench/README.md) |
| Empty | Unfilled slot: 4 of 21 and 6 of 26. Trivial slot that returns 0: 14 of 21 and 20 of 26 |
| Can it fail | No, for T8. A trivial slot already passes 67% and 77%, and a 7B answer of 87 output tokens passes 95% and 92%, against a criterion of 90% |
| Denominator | No, for T9. The from-scratch arms passed zero tests, so tokens per passed test is undefined |

No exploratory run applies: there is no model.

## 4. Results per stack, then pooled

The two variants without a model gave identical results in both stacks, so there is one table and nothing to pool.

| Discount function | Stack | `hidden` | `hidden2` | Model tokens |
| --- | --- | --- | --- | --- |
| Returns 0 | Next.js and Django, identical | 14 of 21 | 20 of 26 | 0 |
| Throws (unfilled) | Next.js and Django, identical | 4 of 21 | 6 of 26 | 0 |
| As the 7B wrote it in E01 (ordinary rounding) | Next.js | 20 of 21 | 24 of 26 | 87 output |

What the numbers say:

- **Only 7 of the 21 tests of `hidden` depend on the discount slot.** The other 14 pass with a function that returns 0. A mean pass fraction is therefore inflated by the installed code.
- **T8 is met by construction.** The criterion was 90%. The 7B's function reaches 20 of 21 (95%) and 24 of 26 (92%).
- **T9 has no denominator.** E01 has no from-scratch arm with a passed test.
- **The gauge detects a subtle error.** Both suites flag ordinary rounding where the rule asks for half-to-even: H07 in `hidden`, X09 and X10 in `hidden2`. The suites were written separately. This is the first data point in favour of the idea.

The 87 output tokens match the first call of the second `of-code` run of E01 in that run's raw metrics.

### Corrections

None.

## 5. Deviations from the preregistration

None. Nothing was preregistered.

## 6. Limits

- **The raw data is not in the repository**, so the table cannot be recounted here.
- **One slot of one piece.** Only the discount function was changed.
- **The 7B variant ran in one stack.**
- **Authorship.** The reference, the piece and `hidden` have the same author. `hidden2` is independent, and it agrees on the rounding error.
- **A control is not a model result.** It shows what a design cannot measure. It does not show what a model does.

## 7. What changes

- **Registry:** T8, T9 and T10 are `discarded`, with the reasons above.
- **Method:** the "can it fail" and "denominator" controls in [`docs/method.md`](../../docs/method.md) come from this experiment.
- **Design:** [E04](../E04-slot-gauge/README.md) keeps the idea of an installed service with a gap for the model, and changes the metric. Its primary metric is the correct run instead of a mean pass fraction. An unfilled slot does not reach a correct run in any of its five slots.
- **Re-reading of E01:** the pilot was recounted on the same dates and two of its causes were corrected. See "Corrections" in [E01](../E01-pilot-full-task/README.md).
- **Next:** [E03](../E03-exploratory-loop-fixes/README.md) and [E04](../E04-slot-gauge/README.md). See [`docs/roadmap.md`](../../docs/roadmap.md).
