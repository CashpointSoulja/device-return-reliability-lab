# Device Return Reliability Lab

Ayo Ahmed - Independent concept

**Unofficial concept. Synthetic data. No live integrations.**

I built this independent concept for my unofficial candidacy for Staff Product Manager, Deel IT. The role is a Staff-level stretch. I am making my product judgment reviewable; I do not claim employment, inside access, fabricated experience, measured savings or involvement in Deel's products.

I chose one deep return flow: **requested → booked → confirmed → collected → received → wiped → redeploy-ready**. Supplier capacity actually constrains booking. Missed pickups have a supplier owner, next action and deadline. Matching custody, distinct condition evidence and a synthetic wipe attestation gate readiness. An explicit idle decision shows why a returned device remains unused, who owns it and how long it has waited.

The synthetic outbox exposes deduplication, per-person/global caps and cooldown; it never sends. SLA risk explains time remaining and missed events. All domain dates use an explicit simulation clock, seeded at **13 October 2026, 10:00 Europe/London** (`09:00Z`). Audit, idempotency and revision checks make retries and rejected transitions inspectable.

## Run and review

```sh
npm ci
npm test
npm run build
npm run dev
```

This repository uses Cloudflare Workers and SQLite Durable Objects with visitor-isolated seeded sessions, persistence across reload and reset limited to the current session. No arbitrary uploads, personal data or vendor credentials belong in the demo. Static/build previews are useful for review but do not substitute for a verified public HTTPS demo.

**Deployment status:** no public demo is claimed. `wrangler whoami` reports unauthenticated, and the cloud environment has no configured Cloudflare authorization or account binding. Deployment-ready configuration is included; [the runbook](docs/runbook.md) records the exact blocker and free-tier verification requirements. [Actual test results](docs/test-results.md) report observed checks and any remaining gaps.

## Product package

- [Brand guide](docs/brand-guide.md) — official live-site evidence committed before implementation; visual reference and real transparent logo.
- [PRD](docs/prd.md), [ELI5 + 30-second explanation](docs/explanations.md), [JTBD + 5 Whys](docs/discovery.md), [journey/state diagram](docs/journey.md).
- [Source boundaries](docs/sources.md), [assumptions/non-goals](docs/assumptions.md), [metric definitions](docs/metrics.md), [priorities memo](docs/priorities-memo.md).
- [API/schema](docs/api-schema.md), [threat/abuse limits](docs/limits-and-abuse.md), [decisions/tradeoffs](docs/decisions.md), [test plan](docs/test-plan.md), [actual results](docs/test-results.md).
- [Runbook](docs/runbook.md), [v2 roadmap](docs/roadmap.md), [walkthrough storyboard + capture handoff](docs/walkthrough.md).

The executable failure lab covers twenty deterministic failure scenarios plus happy path and persistence checks using shared domain rules. Its displayed pass/fail results come from executed assertions; failures must remain visible. The walkthrough lane supplies sources for a 90–120 second vertical voiced capture of the actual public HTTPS demo. Public footage remains blocked until that host exists. Ayo must fully watch and listen before future outreach. This build does not send emails, apply for roles or use LinkedIn; future outreach uses Demo + Walkthrough only, without repository links.
