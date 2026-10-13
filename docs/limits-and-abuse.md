# Threat and abuse limits

Ayo Ahmed - Independent concept

**Unofficial concept. Synthetic data. No live integrations.**

I designed this as an open demonstration with synthetic state, not a production service. A public visitor may manipulate only their own seeded session; the cookie is possession-based access, not a verified identity.

| Threat / failure | Lab control | Remaining limit |
| --- | --- | --- |
| Cross-visitor writes | Visitor UUID routes to its own Durable Object; no shared-write endpoint | Lost/copied cookie changes session access; no authenticated recovery |
| CSRF | Same-origin POST check + Secure HttpOnly SameSite=Strict cookie | Production would need broader threat modelling and origin policy testing |
| Double booking / retries | Transactional capacity rule, idempotency receipts, revision checks | Separate demo sessions have separate capacities; production shared inventory needs a different boundary |
| Forged custody / wipe | Synthetic evidence allowlist, asset and chain validation, state gates | Synthetic labels prove domain logic, not a real physical handoff or wipe |
| Real uploads / personal data | No upload endpoint or file control; reject unsupported command fields | A determined visitor could still paste data into allowed rationale; UI explicitly forbids personal data |
| Spam / external sends | Synthetic outbox only; dedupe, caps and cooldown | No real communication provider, consent or delivery reconciliation |
| Replay / event disorder | Synthetic event dedupe + transition validation | Real integrations need authenticated provenance, signatures and replay windows |
| Resource exhaustion | Body ≤8 KiB (domain command ≤4096 characters), snapshot ≤1 MiB, command/audit ceiling 500, 240 requests/object/real hour, seven-day expiry/cleanup | Per-session cap cannot fully bound new anonymous sessions; account-wide protection and monitoring are required before broad traffic |
| Silent tampering | Append-only accepted audit through domain API; rejected commands leave state unchanged | Account administrators and reset are trusted; no external tamper-evident anchor |
| Credential leakage | No vendor keys, customer traces or committed environment secrets | Deployment credentials must remain outside repository |

No live integration badges are appropriate. “Synthetic wipe” is a state attestation only. Support routing is an explicit simulated rule, not a support ticket creation. There are no actual notifications, suppliers, photos or device operations.

## Free-tier operational boundary

The configuration targets Cloudflare Workers and SQLite Durable Objects on the free tier with no D1, paid API, plan change or card requirement. Platform allowances can change. Before deployment I would confirm the account remains free and verify current limits at [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [Durable Objects limits](https://developers.cloudflare.com/durable-objects/platform/limits/) and [pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/).

These official documentation URLs returned HTTP 403 from the build environment, so I cannot certify current allowance values from this run. The following are reference allowances to check against the current official account/docs before deployment; they are **unverified in this run**, not certified current limits.

| Free-tier reference | Allowance to reverify | Source |
| --- | --- | --- |
| Workers requests | 100,000 per day | [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) |
| Durable Object requests | 100,000 per day | [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) |
| Durable Object duration | 13,000 GB-s per day | [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) |
| SQLite rows read | 5 million per day | [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) |
| SQLite rows written | 100,000 per day | [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) |
| SQLite storage | 5 GB per account | [Durable Objects limits](https://developers.cloudflare.com/durable-objects/platform/limits/) |

These allowances are not interchangeable: one visitor request may create storage work as well as request/duration usage. The application limits above are code-level bounds, not a guarantee that anonymous traffic stays within account daily allowances. I would confirm the account is free, keep distribution bounded, inspect dashboard usage, and disable the demo if free allowances are approached. I would not add a card, enable paid overages or change plans automatically.
