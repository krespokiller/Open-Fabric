# OpenFabric

**An open-source factory of verified software pieces that AI coding agents assemble instead of writing from scratch.**

[Español](README.es.md)

> Status: research. We are testing the thesis with a public, reproducible experiment before building the product. Nothing here is production software yet.

## The idea

AI made writing code cheap, but not shipping correct software. OpenFabric proposes that developers plug a catalog of verified pieces into the agent they already use:

- **Pieces at several levels:** atoms (money, HMAC checks), molecules (idempotency, webhook receivers, ledgers), organisms (checkout, OTP login, monthly billing), architectures and blueprints.
- **The agent selects and assembles.** The tool copies verified code; the model only writes small, specified gaps.
- **A verifier decides.** Every piece ships with a contract and tests, so what the model writes is judged by code, not by trust.
- **Any stack.** A piece's contract and tests work for any stack, legacy included; ready-made code starts with one or two stacks.

The expected result: fewer tokens, vaguer prompts that still work, and fewer bugs in the parts that matter (money, idempotency, concurrency, security).

## First step: does it actually help?

[`bench/`](bench) is the experiment. A small model builds the same checkout service in Next.js, Django, Spring Boot and Laravel, with and without an OpenFabric piece, and a hidden suite of 21 HTTP tests judges every result. It measures tokens per passed test. See [bench/README.md](bench/README.md).

## Repository layout

```
bench/      the experiment: task, arms, judge, harness and reference implementations
docs/       context and decisions
LICENSE     Apache 2.0
```

## License

Apache 2.0. See [LICENSE](LICENSE).
