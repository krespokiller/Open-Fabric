# E11: Gauge replay

**Proposed, designed in outline.** E11 asks how many of the wrong answers of the [E04](../E04-slot-gauge/README.md) confirmatory campaign each gauge lets through. It calls no model: the answers the 7B wrote are installed again and each gauge judges them. The outcome is the share of wrong answers that pass a gauge, and next to it the share of correct answers that the gauge rejects. Nothing is fixed, and no control has run.

| Field | Value |
| --- | --- |
| Status | `proposed` |
| Kind | confirmatory, planned |
| Dates | Not run |
| Theses | T26, defined in [`docs/theses.md`](../../docs/theses.md) |
| Research questions | RQ1 Gauge |
| Scope | The answers of E04: Qwen2.5-Coder 7B, Next.js and Django, five slots |
| Tag and hash | None |
| Data | None |

Proposed by the assistant on 2026-11-22, at the owner's request of that day. It follows the cheap first step that the assistant proposed on 2026-11-22 in [section 7 of E04](../E04-slot-gauge/README.md#7-what-changes): replay the wrong answers of the campaign against other gauges. The owner has not confirmed the design or a criterion.

## 1. Verdict per thesis

None yet.

| Thesis | Claim | Primary comparison and criterion | Verdict | Reason |
| --- | --- | --- | --- | --- |
| T26 | A gauge written independently from the contract of the piece lets through fewer real wrong answers than the current 12 checks, with the same model | The wrong answers of E04, replayed against `public` and against `independent`. Outcome: the share of wrong answers that pass the gauge. Criterion: not set | None yet | Not run. Proposed by the assistant on 2026-11-22 |

## 2. Design as preregistered

Not preregistered. This is an outline and the items marked "open" are not decided.

What it is: the answers that the model wrote in the E04 confirmatory campaign are replayed against several gauges. No model is called. Each answer is installed in its slot, the service is built and started, and each gauge and the hidden judge run on it.

| Item | Value |
| --- | --- |
| Material | The 220 attempts of E04. Their answers are in the transcripts of the E04 results directory, which git ignores, and the replay reads them from there. Identical answers of the same stack and slot are replayed once and counted with their multiplicity |
| Gauges compared | `basic`: the 4 basic checks. `public`: the 12 checks of E04. `independent`: a new set of checks for each slot |
| Who writes `independent` | An agent that receives only the task text and the contract of the slot. It never sees the hidden suites, the reference code of the slot, or any answer of E04 |
| Judge | The two hidden suites, as in E04. A wrong answer is one that the judge fails |
| Primary metric | For each gauge, the share of wrong answers that pass it, with an interval |
| Reported next to it | For each gauge, the share of correct answers that it rejects. A gauge that rejects everything lets nothing through, so the first number is not read alone |
| Model calls | None |
| Criterion, intervals, test and strata | Open. To be fixed before the first confirmatory replay |
| Cost | No model and no paid service. Docker only |

### What must be built first

| Item | Note |
| --- | --- |
| The replay script | Outside the hashed folders, like the other controls in `bench/controls/`, so that it never changes the harness hash |
| The `independent` gauge | One set of checks per slot, written by the agent above |
| A guard on its author | A check that the author of `independent` was given nothing but the task and the contract |

## 3. Controls and the exploratory run

None of these controls has run. All three are required before any confirmatory run.

| Control | What it needs here |
| --- | --- |
| Reference | The reference passes every gauge |
| Empty | The unfilled slot fails where the unfilled-slot control of E04 says it fails, for each slot and stack |
| Determinism | The replay of `public` gives, for every answer, the same gauge result and the same judge result that E04 recorded. This is the check that the replay is deterministic |
| Can it fail | Open. A plausible outcome where `independent` lets through as many wrong answers as `public` |
| Denominator | Open. A gauge or a slot with no wrong answers has no share to report |
| Exploratory run | Open. Whether one is needed when no model is called |

## 4. Results per stack, then pooled

Not run yet.

## 5. Deviations from the preregistration

None. Nothing is preregistered.

## 6. Limits

Known before running:

- **One 7B model.** The answers come from one model. A stronger model writes other wrong answers.
- **One arm was shaped by `public`.** In `kit-tests` the model wrote with the public tests in view, so its answers were shaped by the `public` gauge. This can favour `public` or hide its blind spots, and the effect is not measured here.
- **Five slots,** each a pure function with one business rule.
- **The author of `independent` is an AI agent.** Its checks carry the blind spots of that agent, and they are not the work of a person who did not see the piece.
- **A wrong answer that E04 never produced is not measured.** The replay says nothing about faults the 7B did not write.
- **The answers are not a sample of future wrong answers.** Identical answers are counted with their multiplicity, so a few frequent mistakes can dominate a share.

## 7. What changes

Nothing yet. What each verdict would justify is in [`docs/decisions.md`](../../docs/decisions.md).

- **Registry:** T26 stays `proposed` until the owner confirms a criterion.
- **Roadmap:** it is proposed as the next step in [`docs/roadmap.md`](../../docs/roadmap.md#next), before E09 and E10, because it needs no model and uses data that already exists.
- **Next:** the controls of section 3, then the criterion.

### Open design questions

1. **The criterion for T26.** What difference between the share of `public` and the share of `independent` counts, and how it is tested.
2. **The unit of count.** Distinct answers, or answers with their multiplicity.
3. **Whether `basic` is a comparison or only a floor.** `basic` is what `kit-bare` used to decide.
4. **How to show the guard.** What record proves the author of `independent` saw nothing else.
5. **How it relates to T12 and T18.** T12 counts runs that pass what they can see and fail the judge. T18 compares gauges during a run. T26 measures gauges on answers that already exist.

### What the owner must decide

- **The criterion of T26.**
- **Whether the author of `independent` may be an AI agent,** given the limit above.
- **The order** relative to [E09](../E09-finding-the-piece/README.md) and [E10](../E10-lessons-from-the-gauge/README.md).
