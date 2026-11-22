# Prompt for the next session

Paste this whole file as the first message of a new session opened in this repository.

---

You are continuing the OpenFabric research project. Work the way the last session did, and tell me what each sub-agent does.

## Read first, in this order

1. `CLAUDE.md`, then your memory for this project and the Engram context of project `open-fabric`.
2. `docs/method.md`, `docs/theses.md`, `docs/product.md`.
3. `experiments/E04-slot-gauge/README.md`, sections 1, 4, 6 and 7.
4. `research/2026-11-abstractions/` (every file). If `manufacturing.md` or `other-fields.md` is missing, the previous session was cut off: ask me before redoing the research.
5. `docs/articles/2026-11-22-primer-experimento.es.md`, the article as it stands.

## Where things stand (2026-11-22)

- **E04 is reported.** T11 refuted (19 of 50 against 21 of 50), T22 supported (37 of 50 against 27 of 50, all of it from the `signature` slot), T12 and T13 undecidable. One 7B model, two stacks, five slots.
- **What the recorded answers showed**, read after the experiment, so they are hypotheses:
  - The `sha256=` prefix was written in the task and appears in 0 of 70 `signature` attempts.
  - The discount code is the same plain `round()` in both stacks: correct 9 of 10 in Django, 0 of 10 in Next.js, because Python rounds half to even by default.
  - The task text is about 12,000 characters. The model wrote the whole service correctly 0 of 34 times, and one gap 40 of 100 times.
- **An informal probe, not evidence** (30 calls, no judge, run without my asking): with the rules of the function placed next to the gap the model used the rule in 14 of 15 answers, against 1 of 15 without.
- **The article** is a draft in my LinkedIn account. I publish it. The next publication goes with video, after the other theses are tested.

## The three theses to work on

They are in the article and only the first is in the registry (T25).

1. **The engine.** A more capable model changes the result. Costs money; estimate the cost before asking me for a budget.
2. **The piece carries the knowledge.** Each piece brings its rules next to the gap and the delicate part already solved.
3. **The full line.** Many stations with a gauge between them. It must not stop: a failed piece is set aside, the rest goes on, and the line says what is waiting, what is missing and what help it needs.

Order I chose: 1 and 2 fix the stations, 3 builds the line.

## References and what each one gives the design

Full entries, sources and confidence are in `research/2026-11-abstractions/`. Do not quote a number from this table without checking it there.

| Abstraction | Field | Thesis | What it gives |
| --- | --- | --- | --- |
| Poka-yoke, source inspection (Shingo) | Manufacturing | 2 | Prevention against detection: an arm with the rule as text, an arm where the wrong answer does not fit |
| Knowledge in the world, forcing functions (Norman) | Design | 2 | The rule next to the gap; a helper that makes the right thing the only easy thing |
| Defaults (Johnson and Goldstein; Madrian and Shea) | Behavioural science | 2 | The discount result is a default effect: make the correct behaviour the default of the piece |
| Checklists (Haynes 2009; Urbach 2014 did not reproduce it) | Medicine | 2 | A list helps only when it is used: measure whether the model uses the rule, not only the outcome |
| Split attention (Chandler and Sweller) | Psychology | 2 | No controlled study compares a rule at the point of use with a long manual. Our experiment would be that test |
| Traveler or route card | Shop practice | 2, 3 | A card that travels with the piece: rules, operations done and pending, inspection results |
| Three sets of gauges (Hall, Harpers Ferry) | Armory practice | 2, 3 | Worker's gauge, inspector's gauge and a master gauge that checks both: public tests, independent gauge, hidden judge |
| Rolled throughput yield | Quality | 3 | The yield of a line is the product of its stations. Our 59% per approved station gives about 7% for five |
| Jidoka and andon (Toyota) | Manufacturing | 3 | Stop on a defect and show what is wrong and what help is needed |
| Control of nonconforming output (ISO 9001, clause 8.7) | Quality | 3 | Set the bad piece aside with a record and a decision, so the line keeps moving |
| Theory of constraints (Goldratt) | Operations | 1, 2, 3 | Find the bottleneck, get the most from it, and only then add capacity: thesis 2 before thesis 1 |
| Gauge R&R, acceptance sampling | Quality | 3 | A gauge has its own error and is qualified before it is trusted |
| Tests in series, signal detection | Medicine, psychophysics | 3 | Gauges in a row cut silent defects and raise false rejections: measure both |
| Swiss cheese (Reason) | Safety science | 3 | Layers help when their holes differ. Our public tests and one hidden suite share an author |
| Common and special causes (Shewhart) | Quality | 1, 2 | A slot that always fails needs a new process; a slot that sometimes fails can be resampled |
| Triage, resilience engineering | Medicine, safety | 1, 3 | Send the hard cases to the stronger worker; respond, monitor, anticipate, learn |
| The dynamo and the computer (David 1990) | Economic history | The idea | The source behind "the factory" paragraph: no gain until the factory was reorganised |

Popular versions the sources do not support: Whitney as the father of interchangeable parts, the 1-10-100 cost rule, the 1935 origin of the checklist, organ donation rates read as donations.

## What I want from this session

1. Register theses 2 and 3 in `docs/theses.md` and `docs/product.md`, with the criterion not set.
2. Design, and do not run, the experiment for thesis 2, using the references. Then outline the one for thesis 3.
3. Ask me before anything runs.

## How to work

- Delegate: Sonnet for code units and research, Haiku for small document syncs. Tell me what each agent does in every update. Check each agent's work before you commit it.
- Do only what I ask. No test, probe or model run unless I ask for it in so many words. "Stop everything" means every agent too.
- Evidence over agreement. Numbers before opinions, also against my thesis.
- One question at a time, then wait.
- Commit and push to `main` as work lands. Conventional commits, no AI attribution.
- The hidden suites and their test names never go into a prompt, a record or your context. No usernames, emails, absolute paths or hostnames in a commit.
- Publications: sarcastic titles, storytelling first, the full technical sheet last, "repeticiones" and never "corridas", no "LÁMINA" inside images. Lead with the idea, use the amount of work only as support.
- Save decisions and discoveries to Engram as you go, and a session summary before you finish.
