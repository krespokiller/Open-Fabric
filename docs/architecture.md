# Instrument architecture

The instrument is the harness in `bench/`: a Node 22 program with no npm dependencies that gives a model one task, in one stack, under one arm, lets it write files for a fixed number of attempts with build-and-test feedback, and then scores the result with hidden HTTP suites the model never sees. The repository around it has five parts. `docs/` holds the method, the mathematical model, the thesis registry, the decisions and this guide. `experiments/` holds one record per experiment (`E<nn>-<slug>/`) with its design, data and verdict. `research/` holds literature and competitor studies. `bench/` holds the instrument itself: task, arms, stacks, suites and harness. `analysis/` holds a statistics library with tests. It sits outside `bench/` so that changing the analysis never changes the frozen harness hash.

The instrument answers today's experiments and does not yet scale to many theses, stacks, tasks and models. The last section lists what is missing, with evidence.

> **State described here.** This guide describes the instrument as of 2026-11-18: commit `759051f` on `main` plus the hardening of that day (the judge client, the harness hash, the report and `runs.csv`, the resume check, the kit feedback and the unit tests). The loop fixes (`7d84d61`), the references split into slot files (`c20ca1c`) and the kit arms (`bafdac5`, `759051f`) are committed. The kit arms (`kit-bare`, `kit-tests`) have not yet been used in an exploratory or preregistered run. One item is still open: the judge result of each attempt (gap G12).

References name a file and a function or constant, relative to `bench/`. They carry no line numbers, because those go stale with every commit. A change to `bench/` after 2026-11-18 can make a reference out of date. The vocabulary (arm, stack, task, cell, run, gauge, judge) is defined in [`method.md`](method.md).

## Module map

```
bench/
  task/task.md         the task every arm receives
  arms/docs/           per-stack documentation for the docs arm
  arms/openfabric/     the piece (piece.md) and its installable code (code/nextjs)
  arms/kit/<stack>/    unfilled slot stubs for the kit arms
  stacks/<stack>/      stack.json, skeleton/ (starting project), gold/ (reference)
  suites/              lib, smoke and public (visible), hidden and hidden2 (the judge)
  src/                 the harness
  test/                unit tests of the harness, the kit arms and the arm files, no Docker and no model
  results/             run output, ignored by git
```

| File | Responsibility | Where to look |
| --- | --- | --- |
| [`src/cli.mjs`](../bench/src/cli.mjs) | Entry point. Parses flags and dispatches `validate-gold`, `run`, `selftest`, `report` | `HELP` and the `parseArgs` options, then the dispatch on `cmd` |
| [`src/matrix.mjs`](../bench/src/matrix.mjs) | The matrix and the run loop: iterates runs, stacks and arms, runs one cell, enforces the resume rules, writes `meta.json` (with the slot list and the kit arms) | `runOne`, `runMatrix`, `COMPARED` |
| [`src/prompts.mjs`](../bench/src/prompts.mjs) | Arm definitions and the prompt: which arms exist, where each applies, what context each gets, and the filter that keeps installed code out of the feedback of a kit run | `ARMS`, `KIT_ARMS`, `kitSelectionProblem`, `armContext`, `buildMessages`, `kitFeedbackText` |
| [`src/workspace.mjs`](../bench/src/workspace.mjs) | Stack discovery, workspace creation, the project snapshot shown in the prompt, safe application of the model's files | `listStacks`, `createWorkspace`, `snapshot`, `applyChanges` |
| [`src/protocol.mjs`](../bench/src/protocol.mjs) | The answer format (`<<<FILE ... >>>FILE`) and its tolerant parser | `FORMAT_RULES`, `parseAnswer` |
| [`src/model.mjs`](../bench/src/model.mjs) | OpenAI-compatible chat client: retries, token accounting, context-overflow detection | `chat` |
| [`src/runner.mjs`](../bench/src/runner.mjs) | Builds and starts the app under test, with Docker Compose (PostgreSQL, mock payment provider, app) or natively | `startApp`, `startDocker`, `startNative` |
| [`src/judge.mjs`](../bench/src/judge.mjs) | Suite registry, suite hashes, the harness hash (which includes the references in `stacks/*/gold`), and suite execution against a running app | `SUITES`, `hashableBytes`, `experimentHash`, `judge` |
| [`src/gold.mjs`](../bench/src/gold.mjs) | `validate-gold`: runs every suite against each stack's reference | `validateGold` |
| [`src/fakemodel.mjs`](../bench/src/fakemodel.mjs) | Fake model server for `selftest`: answers with the reference, a planted build break and a planted bug. Also holds the kit-arm checks of the selftest | `goldFiles`, `kitSelftestProblems`, `startFakeModel` |
| [`src/report.mjs`](../bench/src/report.mjs) | Aggregates every `metrics.json` into `report.md` and `runs.csv`. A run is correct only when it passes both hidden suites | `bothSuitesPerfect`, `armRow`, `writeReport`, which also writes the CSV |
| [`src/psp.mjs`](../bench/src/psp.mjs), [`src/psp-server.mjs`](../bench/src/psp-server.mjs) | Mock payment provider that the task calls, and its container entry point | `createPspServer`, `pspClient` |
| [`src/util.mjs`](../bench/src/util.mjs) | Shell, process, port, file and statistics helpers. `InfraError` marks failures of the environment | `InfraError`, `sh` |
| [`suites/lib.mjs`](../bench/suites/lib.mjs) | Assertions, the HTTP test context for the checkout task, the sequential suite runner. The judge client sends `Connection: close` on every request | `makeCtx` (its inner `req`), `runSuite` |
| [`suites/smoke.mjs`](../bench/suites/smoke.mjs) | 4 checks that every arm sees (S1 to S4) | the exported `tests` |
| [`suites/public.mjs`](../bench/suites/public.mjs) | 8 public tests, the visible gauge (P1 to P8) | the exported `tests` |
| `suites/hidden.mjs`, `suites/hidden2.mjs` | The judge: 21 and 26 hidden tests. Never shown to a model and never opened to write documentation | imported at the top of `src/judge.mjs` |
| [`test/kit.test.mjs`](../bench/test/kit.test.mjs) | 15 unit tests of the kit arms: slot files, arm expansion, the one-file write rule, the kit prompt, the `of-code` prompt carrying the rules of the piece, and the refusal of a bad selection of arms or slots. They need no Docker and no model | `npm test`, which runs `node --test "test/*.test.mjs"` |
| [`test/harness.test.mjs`](../bench/test/harness.test.mjs) | 16 unit tests of the harness: the judge client sends `Connection: close`; the hash covers the references, ignores dependency folders and line endings, and treats binary files byte for byte; the report counts a correct run over both suites; `runs.csv` keeps its columns and adds `slot`, `gauge_pass` and `correct`; `meta.json` keeps the slot list and the resume with another slot list is refused; `kitFeedbackText` | the same command |
| [`test/arms-leak.test.mjs`](../bench/test/arms-leak.test.mjs) | 2 unit tests: no amount asserted by a hidden suite appears in any file under `arms/`, and the check itself finds a planted one. It reports locations, never values | the same command |
| [`task/task.md`](../bench/task/task.md) | The task text, sent to every arm | read in `buildMessages` |
| [`arms/openfabric/piece.md`](../bench/arms/openfabric/piece.md) | The piece `commerce.checkout`. Arm contexts are cut from it by heading text | `publicTestsContext` and the `of-spec` and `of-code` branches of `armContext` |

### What `stack.json` configures

| Field | Used for | Read in |
| --- | --- | --- |
| `label` | Stack name in the system prompt | `buildMessages` |
| `healthPath`, `buildTimeoutSec`, `startTimeoutSec` | Health URL and timeouts. Defaults: `/health`, 900 s, 180 s | `startDocker`, `startNative` |
| `readOnly` | Files the model may not write | `readOnlyFor` in `src/matrix.mjs` |
| `snapshotIgnore` | Paths left out of the prompt | `buildMessages` |
| `codePiece` | The installable piece for `of-code`: `dir`, `slotFile` and `hideFromPrompt` (files hidden from the prompt) | `runOne`, `readOnlyFor`, `buildMessages` |
| `kit.slots` | Slot name to slot file, for the kit arms | `runOne`, `expandArm`, `buildMessages` |
| `native` | `install`, `build` and `start` commands, `manifests` (the files whose change triggers a new install) and `env`, for runs without Docker | `startNative` |
| `docker.env` | Extra environment for the app container. No stack sets it today | `startDocker` |
| `selftestBreak` | `{file, append}`: text appended to a file in attempt 1 of the selftest to break the build | `startFakeModel` |
| `selftestBug` | `{file, content}`: the file replaced in the `bare` arm after attempt 1, a plausible bug that passes the smoke checks | `startFakeModel` |

### The arms that exist in code

| Arm | Workspace at the start | Context besides the task | Checks it sees | Status |
| --- | --- | --- | --- | --- |
| `bare` | skeleton | none | smoke | committed |
| `docs` | skeleton | `arms/docs/<stack>.md` and `arms/docs/_postgres.md` | smoke | committed |
| `tests` | skeleton | the list of public tests | smoke and public | committed |
| `of-spec` | skeleton | the whole piece | smoke and public | committed |
| `of-code` | skeleton plus the piece code, read-only except its slot | the piece rules and the public tests | smoke and public | committed, Next.js only. Until 2026-11-18 its prompt held only the heading of the rules section (see [E01](../experiments/E01-pilot-full-task/README.md#4-results-per-stack-then-pooled)) |
| `kit-bare.<slot>` | skeleton plus the reference, with one slot replaced by its stub; only the slot is writable | the slot job | smoke | committed, not yet used in a run |
| `kit-tests.<slot>` | the same | the slot job and the public tests | smoke and public | committed, not yet used in a run |

Contexts are built in `armContext`. The visible suites are chosen in `runOne` (`visibleSuites`, from `armSeesPublicTests`) and the workspace overlay in `runOne` (`overlay`).

## The run loop

One run goes from an empty workspace to a judged result in `runOne`.

1. **Matrix setup.** `runMatrix` validates the arm names (`isKnownArm`) and, when a kit arm or `--slots` is given, the selection of slots (`kitSelectionProblem`). It refuses an unknown slot, `--slots` without a kit arm, and kit arms when none of the selected stacks has slots, all before anything is written. Then it computes the harness hash once (`experimentHash`), refuses to resume a results directory whose settings differ (`COMPARED`, which includes the sorted `--slots` list and the kit arms with their slots) and writes `meta.json` only if it does not exist.
2. **Order of cells.** The loops go run index, then stack, then arm. A kit arm expands to one arm per slot (`expandArm`). Cells that do not apply to the stack are skipped (`armApplies`), and so are cells that already have a `metrics.json`.
3. **Workspace.** The run directory is deleted and the stack's `skeleton/` is copied in (`createWorkspace`). `of-code` adds the piece code. Kit arms add the reference and then replace the slot file with its unfilled stub.
4. **Attempt loop**, at most `--budget` attempts:
   1. *Prompt.* The system message states the stack, that the model cannot run commands, the read-only files and the answer format. The user message carries the task, the arm context, the file tree with file contents, the feedback from the last attempt and, from the third attempt on, one line per earlier attempt (`buildMessages`). When an answer is identical to the one before it, the feedback adds a warning (`formatFeedback`). Installed code is listed in the tree with its contents left out (`snapshot`). In a kit run the build output and the app logs pass through `kitFeedbackText` first: lines that quote files other than the slot file are removed and replaced by one note, because a code frame of an installed file (Next.js) or a source line in a traceback (Python) would show the model code it cannot edit.
   2. *Model call.* One stateless chat completion, with seed `run × 1000 + attempt`. Tokens come from the server's usage report, or from characters divided by 4 when the server gives none (`chat`).
   3. *Apply.* The answer is parsed into file and delete blocks (`parseAnswer`) and written with path safety, the read-only list and, for kit arms, a one-file allow-list (`applyChanges`, its `writable` option).
   4. *Build and start.* In the default Docker runtime, a fresh Compose project starts an empty PostgreSQL, the mock payment provider and the app built from the workspace `Dockerfile`, then waits for the health check (`startDocker`).
   5. *Visible checks.* If the app is up, the smoke suite runs, plus the public suite when the arm sees the gauge (`judge`). The containers are removed.
   6. *Stop rule.* The run stops when the app is up and every visible check passes. Otherwise the feedback text is built (`formatFeedback`) and the loop continues until the budget is used.
5. **Final judgement.** The workspace is built and started again with an empty database, and only the hidden suites run: `hidden`, then `hidden2`. If the app does not build or start, every hidden test is recorded as failed.
6. **Record.** Each attempt is appended to `transcript.jsonl`. Heavy build folders are removed from the workspace. `metrics.json` is written last, so an interrupted run has none and is retried on resume.
7. **Errors of the environment.** A failing model server, Docker daemon or database raises an `InfraError`. The run gets an `error.json`, is not counted and is retried on resume. A context overflow or a configuration error stops the whole matrix.
8. **Selftest checks.** In `selftest` only, each finished kit cell goes through `kitSelftestProblems`.
9. **Report.** `report.md` and `runs.csv` are rebuilt when the matrix ends, also after an error (`writeReport`). `runs.csv` ends with the columns `slot`, `gauge_pass` (1 when the run stopped because every visible check passed) and `correct` (1 when both hidden suites pass in full). After the report, `runMatrix` throws if the selftest found a problem, and the CLI exits 1.

## The three checks

Every extension below ends with some of these. Run the first two from `bench/`.

| Check | Command | What it shows | When it passes |
| --- | --- | --- | --- |
| `validate-gold` | `node src/cli.mjs validate-gold --stacks <a,b>` | The judge is fair: the reference passes everything in each stack | Each stack reports every test passed (59 of 59: 4 smoke, 8 public, 21 and 26 hidden) and at least one charge request reached the mock provider (`validateGold`). The exit code is 0 only then |
| `selftest` | `node src/cli.mjs selftest --stacks nextjs,django` | The whole loop works with a fake model and no tokens. Since `759051f` it also asserts the slot rules of two kit cells, `kit-bare.cart` and `kit-tests.discount`, when a selected stack has slots | Exit code 0. For the two kit cells, `kitSelftestProblems` checks that attempt 1 wrote the slot and rejected the write to installed code, that the project built and the hidden suites ran (a non-zero total), that installed files are unchanged, that the first prompt shows the unfilled slot and that no reference code appears in a prompt. Any problem makes the command exit 1. Not asserted: the full-task arms and every hidden score. Read those in the report: in the full-task arms the first attempt fails to build, every arm except `bare` should end with all hidden tests passing, and `bare` should fail the hidden tests that catch the planted bug (gap G9) |
| Unit tests | `npm test`, or `node --test "test/*.test.mjs"` (the form `node --test test/` fails on Node 22 on Windows) | The kit arms, the judge client, the hash, the report, `runs.csv`, the resume check, the kit feedback filter and the leak check hold without Docker and without a model | All 33 tests pass |

## Extension points

Any change under `task/`, `arms/`, `suites/`, `src/` or `stacks/` (the references in `gold/` included) changes the harness hash. A change to `test/` or `package.json` does not. For a preregistered experiment a hashed change means a new experiment number, as [`method.md`](method.md) requires.

### Add a stack

No list of stacks exists in code: a stack is any directory under `stacks/` with a `stack.json` (`listStacks`).

1. Create `stacks/<name>/stack.json` with `label`, `readOnly`, `snapshotIgnore` and, if they differ from the defaults, `healthPath` and the timeouts.
2. Create `stacks/<name>/skeleton/`, the starting project. It needs a `Dockerfile` at its root that builds the app and serves it on port 8080 (`startDocker`), and the app must read the environment the harness provides (the `env` object in `startDocker`) and answer the health path with 200.
3. Create `stacks/<name>/gold/`, the reference, as files copied over the skeleton (`createWorkspace`).
4. Check that the stack's source file extensions are in `TEXT_EXT` (`src/workspace.mjs`). Files with other extensions appear in the prompt's tree without their contents, except files named `Dockerfile`, `.dockerignore`, `manage.py` or `artisan` (`snapshot`). `.go`, `.mod` and `.rs` are not in the list today, so a Go or Rust stack needs this edit to `src/`.
5. Review the other four lists that hold stack knowledge in `src/` (gap G10): the infrastructure-error pattern in `startDocker`, which names only the PostgreSQL and Node images, so a failed pull of the new stack's base image would be scored as a build failure of the model's attempt; the heavy folders removed from a stored workspace in `runOne` (`node_modules`, `.next`, `vendor`, `target`, `.venv`, `__pycache__`), where a skeleton folder named `vendor` or `target` would be deleted; the same names skipped by `experimentHash`; and the text extensions of step 4.
6. Add `selftestBreak` and `selftestBug` to `stack.json` so `selftest` exercises a build failure and a wrong answer in the new stack. The file named in `selftestBreak` must exist in the reference, or the planted break silently does nothing.
7. Optional: `arms/docs/<name>.md` so the `docs` arm applies (`armApplies`); `native` commands for runs without Docker; `kit.slots`, the stubs under `arms/kit/<name>/` and an update to `test/kit.test.mjs`, which hard-codes the stacks and the five slot names, for the kit arms.
8. **Checks:** `validate-gold --stacks <name>` must pass, then `selftest --stacks <name>`. This is the rule in `method.md`: a stack enters the instrument when its reference passes every suite.

### Add a task

The instrument has exactly one task. A second task cannot sit next to the first today (gap G1). The list below is what was known at commit `759051f`; gap G1 lists the checkout-specific parts. Replacing the task means changing all of these together:

1. `task/task.md`, read by a fixed path in `buildMessages`.
2. The four suite files, imported by fixed names at the top of `src/judge.mjs`, and the task-specific helpers in `suites/lib.mjs` (`makeCtx`).
3. `stacks/<stack>/gold/` for every stack.
4. `arms/openfabric/piece.md`, keeping the headings that the prompt builder cuts on (`publicTestsContext`, `armContext`); the per-stack docs; the slot stubs and `kit.slots`; and `selftestBug` in each `stack.json`.
5. `src/psp.mjs` and the secrets in `SECRETS` in `src/runner.mjs`, if the new task needs a different external service or different credentials.
6. The installable piece code for `of-code`, which is a default arm: the folder `arms/openfabric/code/nextjs/` (handlers and `MOUNT.md`) and `codePiece` in `stacks/nextjs/stack.json`. The fake model also filters the reference by that folder (`goldFiles`).
7. Checkout text written into the harness: `publicTestsContext` removes one sentence of the piece's section 3 by its exact text, and the `of-code` branch of `armContext` names `lib/of/` and `lib/of/MOUNT.md`. `src/report.mjs` writes "the 8 public tests", the id prefix of the second hidden suite and a note on `of-code` into every report.
8. `test/kit.test.mjs`, which hard-codes the two stacks and the five slot names, so `npm test` fails after the slots change.
9. `selftestBreak.file` in each `stack.json`: it must still exist in the new reference, or the planted build break silently does nothing.
10. **Checks:** `validate-gold` on every stack, then `selftest`, then `npm test`.

### Add an arm

An arm is defined in code, in several files (gap G2).

1. Add the name to `ARMS`, and to `DEFAULT_ARMS` if it should run when `--arms` is not given (`src/prompts.mjs`).
2. Add its context in `armContext`. An arm without a branch throws `unknown arm`.
3. If it only applies to some stacks, add the condition to `armApplies`.
4. If it sees the gauge, add it to `armSeesPublicTests`. This also changes when its runs stop, because the stop rule waits for every visible check.
5. If it installs code, set the overlay in `runOne`, the read-only or writable rules (`readOnlyFor`, the `writable` option of `applyChanges`) and what the prompt hides (`buildMessages`).
6. Teach the fake model which files this arm writes (`goldFiles`), and add the arm to the selftest list if it is not a default arm (`selftestArms` in `runMatrix`).
7. Add its label and position in the report (`ARM_LABEL`, `ARM_ORDER` in `src/report.mjs`) and its line in the help text (`HELP` in `src/cli.mjs`) and in both `bench/README.md` and `bench/README.es.md`. Neither README lists the kit arms today.
8. **Check:** `selftest --stacks nextjs,django`. Then compare the arm's context size and feedback with the arm it will be compared against: `method.md` asks for one difference per comparison.

**An arm that fills slots**, like the kit arms, takes more steps. It is registered in `KIT_ARMS`, not in `ARMS`, and the kit family is matched by name in several places: `parseArm` and `kitSelectionProblem` (the error text), `armSeesPublicTests` (`base === 'kit-tests'`), `goldFiles` (`startsWith('kit-')`), and the slot section of `writeReport` (`/^kit-/`, `kit-bare.` and `kit-tests.`). Arm prose is also written into `src/report.mjs` (`ARM_LABEL` and the notes in `writeReport`). Update `test/kit.test.mjs` as well.

### Add a model or an agent

**A model needs no code change**, as long as it is served behind an OpenAI-compatible `/chat/completions` endpoint (`chat`).

1. Pass `--model`, `--base-url` and `--api-key`, or set `OF_BASE_URL` and `OF_API_KEY` (the `parseArgs` options in `src/cli.mjs`). `--temperature` and `--max-tokens` are the only other model settings.
2. Give the model enough context. An overflow stops the matrix with a clear error and is not scored as a model failure (`CONTEXT_ERROR` in `src/model.mjs`).
3. Use a new `--out` directory. One results directory holds one model: resuming with another model name or base URL is refused (`COMPARED`).
4. Write in the experiment record what the harness does not store: the exact weights or quantisation, the server and its version, the context size. The harness stores the model name, base URL, temperature and token limit (`params` in `runMatrix`) and, in the transcript, the model name the server returns (`raw` in `chat`).
5. **Checks:** `selftest` before the run, then one exploratory run per cell. Read the token warnings in the report (`writeReport`).

**A coding agent is not supported** (gap G7). The loop is one chat completion per attempt, the answer is text in a fixed format, and the model cannot run commands (the system message in `buildMessages`). An agent that edits files and runs commands needs a different driver in place of steps 4.1 to 4.3 of the run loop (the start of the attempt loop in `runOne`).

### Add a suite

1. Create `suites/<name>.mjs` that exports `tests`, a list of `{ id, name, fn }`, like `suites/smoke.mjs`. Tests talk HTTP to the app through the context from `makeCtx` in `suites/lib.mjs` and never look inside it.
2. Give the test ids a prefix no other suite uses. The report merges results by id (the per-test table in `writeReport`).
3. Import the suite next to the others at the top of `src/judge.mjs`, register it in `SUITES` and in the list that `suiteHashes` covers.
4. Give it a role. A visible suite goes in the list of visible suites (`visibleSuites` in `runOne`). A judge suite touches every place where `hidden2` appears in `src/matrix.mjs` and `src/report.mjs`:
   - in `src/matrix.mjs`: the initial `metrics` object (`hidden: [], hidden2: []`), the split of the final results by suite name, the all-failed record for an app that does not build, and the `hiddenPassed`, `hiddenTotal`, `hidden2Passed`, `hidden2Total` fields;
   - in `src/report.mjs`: `bothSuitesPerfect`, the fully correct runs in `armRow`, `HEADER`, the per-test table, and the CSV columns in `writeReport`;
   - in `src/fakemodel.mjs`: `kitSelftestProblems`, which reads the hidden total.

   Without these a third judge suite runs, but it does not count towards a correct run and does not appear in the per-test table.
5. Add it to the list that `validate-gold` runs (`validateGold`).
6. **Checks:** `validate-gold` on every stack, because the reference must pass the new suite everywhere, then `selftest`. A new judge suite also needs the controls from `method.md`: an empty or wrong solution must fail it.

## What the harness hash freezes

**The harness hash is one SHA-256 over the path and the bytes of every file under `task/`, `arms/`, `suites/`, `src/` and `stacks/`**, read from the working tree (`experimentHash`). Since 2026-11-18 this includes the references in `stacks/*/gold`, because the kit arms install them. A text file is hashed with CRLF turned into LF (`hashableBytes`), so one commit gives one hash on any checkout; a file with a NUL byte is hashed as it is. It is computed once per `run` or `selftest` invocation, before the first cell. It skips any entry named `node_modules`, `.venv`, `__pycache__`, `.next`, `target` or `vendor`. A results directory created before this change stored a hash without the references, so it refuses to resume.

| Frozen by the hash | Not frozen by the hash |
| --- | --- |
| The task text | The CLI flags that pick stacks, arms, slots and runs per cell. The slot list and the kit arms are compared on resume instead (`COMPARED`) |
| Every arm context, the piece code and the slot stubs | Line endings of text files |
| All four suites and their helpers | Model weights, the model server, container base images, the host |
| The harness source | `bench/package.json`, `bench/test/`, `bench/README.md`, `docs/`, `experiments/`, `analysis/` |
| Each stack's `stack.json`, `skeleton/` and the reference in `gold/` | |

**Where it is used.** It is stored in `meta.json` and in every `metrics.json`, and its first 16 characters are printed in the report under the label "Experiment hash" (`writeReport`). When a results directory is reused, the harness compares it, together with the model, base URL, temperature, token limit, budget, runtime, the sorted slot list and the kit arms with their slots, against the stored values and refuses to continue if any differs (`COMPARED`). The report also prints one SHA-256 per suite file (`suiteHashes`), and `meta.json` keeps the short commit and the list of uncommitted files (the `git rev-parse` call in `runMatrix`).

### How the preregistration tag relates to it

The tag and the hash are two separate locks, and only the record connects them.

| | Preregistration tag | Harness hash |
| --- | --- | --- |
| What it is | A git tag `prereg/E<nn>` on the commit that holds the record | A digest computed from files on disk at run time |
| What it covers | The whole repository at that commit: record, docs, instrument, references | The instrument files listed above |
| Who enforces it | Nobody. The harness never reads tags (its only git call is the `git rev-parse` call in `runMatrix`) | The harness, and only when a results directory is resumed |
| What it catches | Any later change, by comparing against the tag | A changed instrument file between two invocations on the same `--out` |

The record of an experiment cites both. The tag says which commit was preregistered. The hash, the commit and the dirty-file list in `meta.json` say whether the run used that commit's instrument. Two limits follow from the code:

- A run on a tree with uncommitted changes is recorded, not refused. E03 ran this way: its report reads "Harness commit `c90c80a` (with uncommitted changes)".
- No command prints the hash alone. To get the hash of a tagged commit, check it out, run `selftest` and read the hash in its report.

The two tags that exist, `piloto-preregistro` and `piloto-preregistro-2`, predate the `prereg/E<nn>` convention. E01 ran at `piloto-preregistro-2` (commit `c90c80a`) with hash `e3cd4befe3a7b2e4`. That hash was computed before the references and the line-ending rule entered the function, so the same commit gives another hash today.

## Scaling gaps

**Everything in this section is a proposal, and none of it is decided. Only the parts marked closed are done.** Each gap lists the evidence in the code and one suggested direction, written by the assistant on 2026-11-17 and not confirmed by the owner. The gaps G6, G8 and G9 were updated on 2026-11-18 for commit `759051f`. On 2026-11-18, after the hardening of the instrument, G6 and G8 were marked closed in part, G3 and G4 were corrected, and G12 was added. The numbering is kept.

| # | Gap | Evidence | Suggested direction |
| --- | --- | --- | --- |
| G1 | **One hardcoded task.** There is no task dimension and no task variant | The task is read by a fixed path in `buildMessages`. The suites are four fixed imports at the top of `src/judge.mjs`. The test helpers, the secrets and the mock provider are checkout-specific (`makeCtx`, `SECRETS`). The installable piece code, the checkout text in `src/prompts.mjs` and `src/report.mjs` and the unit tests are checkout-specific too (see "Add a task"). Each stack has one reference. `method.md` asks for one task variant per run | A folder per task (`tasks/<task>/`) with its text, variants, suites, piece and per-stack reference, and the task in the cell id |
| G2 | **Arms are code, not data.** | Arm names, applicability, context, visible suites, overlay, write rules, fake answers, report labels and help text live in five source files (`ARMS` and `armContext` in `src/prompts.mjs`, `runOne` in `src/matrix.mjs`, `goldFiles` in `src/fakemodel.mjs`, `ARM_LABEL` in `src/report.mjs`, `HELP` in `src/cli.mjs`). The kit arms touch six files under `src/`: `cli`, `fakemodel`, `matrix`, `prompts`, `report` and `workspace` | One manifest per arm (`arms/<arm>/arm.json`): context parts, overlay, writable files, visible suites, stop rule. The harness interprets it |
| G3 | **The design of an experiment is a command line.** | Stacks, arms, slots, runs and budget are flags (the `parseArgs` options in `src/cli.mjs`). The resume check ignores stacks, arms and runs (`COMPARED`; since 2026-11-18 it compares the slot list and the kit arms with their slots), and `meta.json` is written only by the first invocation, so a later invocation with other stacks, arms or runs extends the directory silently. Nothing in `experiments/E<nn>-*/` drives a run | A versioned `design.json` in each experiment folder (theses, arms, stacks, model and settings, task, runs per cell, budget, phase) and `run --experiment E<nn>`, which reads only that file |
| G4 | **The results layout has no experiment, model or task in it.** | The default output is `results/run-<timestamp>` (`outDir` in `runMatrix`) and a run directory is `<stack>__<arm>__<run>`. `runs.csv` has no model, task, phase or hash column. A kit slot is part of the arm name, and since 2026-11-18 it is also in the `slot` column (`writeReport`). Local results folders are named by hand with `--out`, and the data in `experiments/E01-*/data/` is a copy made outside the harness: the CLI has no command for it. The root `.gitignore` ignores any folder named `results` | `results/E<nn>/<phase>/<model>/runs/<stack>__<task>__<arm>__<run>`, one CSV row per run with experiment, phase, model, task, arm, slot and hash, and a command that copies the report and the CSV into the experiment folder |
| G5 | **Versions are not fully pinned.** | Laravel is created from `laravel/laravel:^12.0` with `composer:2` (`stacks/laravel/skeleton/Dockerfile`). Base images use moving tags (the `Dockerfile` of `django`, `nextjs` and `spring`, and `postgres:16-alpine` and `node:22-alpine` in `startDocker`). Next.js installs with `npm install`, not `npm ci` (`stacks/nextjs/skeleton/Dockerfile`). The model is a tag name, with no digest stored. Already exact: Django's requirements, the Next.js dependencies, the Spring Boot parent | Pin images by digest, commit a Composer lock file, and store the resolved image digests, the Docker version and the model digest in `meta.json` |
| G6 | **The hash has blind spots.** **Closed in part on 2026-11-18.** The reference in `gold/` and the line endings are closed: `experimentHash` now includes `stacks/*/gold` (the kit arms install the reference into the workspace in `runOne` and the judge scores it) and hashes text files with CRLF turned into LF (`hashableBytes`). Results directories created before the change refuse to resume. What is still open: a dirty tree is accepted. It is compared only on resume. It is computed once per invocation, so an input edited during a long matrix is not detected, although task text, arm text, `stack.json`, the skeleton, the reference and the mock provider files are read again for each run or attempt. It covers every file on disk under its five roots, so a stray file that git ignores, such as `.DS_Store` or `.bench-install`, changes it | Open: hash what git stores, and a confirmatory mode that refuses a dirty tree and checks that HEAD is the `prereg/E<nn>` tag. Done: the reference is included when an arm installs it, and line endings no longer matter |
| G7 | **No driver for a coding agent, and the judge would be within its reach.** | One chat completion per attempt (`runOne`), a text protocol, no commands (`buildMessages`). Workspaces are created under `bench/results/` by default (`outDir` in `runMatrix`), in the repository that holds the hidden suites. Money is not recorded | A driver interface with the chat loop as its first implementation; agent runs in a container that mounts only the workspace; tokens and dollars read from the agent's own usage output |
| G8 | **The report does not compute the method's metrics.** **Closed in part on 2026-11-18.** | The count is closed: `armRow` and the kit section of `src/report.mjs` count a run as correct only when it passes every test of both hidden suites (`bothSuitesPerfect`; the column "Runs passing both suites"), and `runs.csv` has a `correct` column. The headline of the report is still tokens per passed test (`armRow`), and the report has no intervals, no test and no same-sign check. `analysis/` computes them: `node analysis/cli.mjs analyze` reads `runs.csv` (a kit arm written as `kit-bare.cart` is read as arm `kit-bare` with slot `cart`), takes `--stacks` and `--slots`, and returns `undecidable` when a planned cell is missing. Its tests are run with `node --test analysis/` (170 tests). It reads no design file, because none exists (gap G3) | Open: the verdict for each primary comparison comes from `analysis/`, not from the harness report, and the design is passed as flags until G3 is done |
| G9 | **`selftest` asserts only part of what it should.** | Since `759051f` it asserts the slot rules of two kit cells and exits 1 when they fail (`kitSelftestProblems`, `runMatrix`, `src/cli.mjs`). Nothing is asserted for the full-task arms, and no hidden score is checked, even for the kit cells: `kitSelftestProblems` only requires the hidden total to be non-zero. So the selftest can exit 0 while a full-task arm gives a wrong result | Expected outcomes per arm in code, including the hidden scores, and a non-zero exit code when they are not met |
| G10 | **Stack knowledge sits in the harness source.** | Text extensions (`TEXT_EXT` and the extensionless names in `snapshot`), heavy folders (`runOne`), hash exclusions (`experimentHash`) and infrastructure-error patterns (`startDocker`) are lists in `src/`. Adding Go changes `src/`, and with it the hash for every stack | Move these lists into `stack.json`, so that adding a stack is data only |
| G11 | **Runs are strictly sequential.** | Three nested loops await one run at a time (`runMatrix`). The native runtime needs port 8080 (`startNative`). Docker runs already use free ports and separate projects (`startDocker`). `method.md` asks for 62 to 97 runs per arm to detect a 20-point difference | A `--jobs` option for the Docker runtime, limited by what the model server can serve in parallel |
| G12 | **Only the final state of a run is judged.** Added on 2026-11-18 | The hidden suites run once, after the attempt loop (step 5 of the run loop). Nothing records the judge result of each attempt. So no arm can be scored at its first attempt (the "calls held equal" rule of `method.md`), and the sensitivity and specificity of the gauge cannot be estimated, because the loop stops when the gauge passes. `docs/model.md` section 11 lists the fields needed. Judging an attempt costs build time and no model tokens | Open, and next. Judge every attempt and record the result in `metrics.json` and in an attempts file, before the E04 exploratory campaign |

### What the planned experiments would need

This is the assistant's reading of the gaps against the designs in the thesis registry ([`theses.md`](theses.md)), not a plan.

| Experiment | Uses | Gaps that matter most |
| --- | --- | --- |
| E04 slot gauge (T11 to T13) | The kit arms, two stacks, the local 7B model | G12, before the exploratory campaign; G9. G6 and G8 are closed in part for E04 (the reference is in the hash, and the report and `runs.csv` count both suites) |
| E05 line against workshop (T14, T15, T16, T20) | New arms `workshop`, `workshop-gauge` and `line`, at least two stacks, and a task variant if the proposal for T14 in [`context.md`](context.md) is kept | G1, G2 and G3; G7 if the model under test is a coding agent |
| T21 purpose-built stack | A Go plus PostgreSQL stack | G10, then the steps in "Add a stack" |
| Any confirmatory run | Tens of runs per arm | G4, G5 and G11 |
