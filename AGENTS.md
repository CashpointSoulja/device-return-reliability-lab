# Repository context

This file applies only to `CashpointSoulja/device-return-reliability-lab` and its directory tree. Keep CleanSL8, Corgi and all unrelated repositories/resources untouched. Work only in the cloud execution environment.

Credit public pages, documentation, metadata, footers and commits as **Ayo Ahmed - Independent concept**. Do not add tool, model or AI authorship attribution. Keep the notice **Unofficial concept. Synthetic data. No live integrations.** prominent. Never imply endorsement, employment or a live Deel integration. No fabricated experience, impact metrics, savings or inside information.

## Product boundaries

- One flow: requested → booked → confirmed → collected → received → wiped → redeploy-ready.
- Shared domain functions must power API and executable scenarios. Validate on the server; do not paint statuses green when prerequisites fail.
- Booking capacity is atomic and idempotent. Release on cancellation/rebooking/missed pickup exactly once. Revision checks reject stale commands.
- Require matching distinct synthetic custody/condition evidence with chain continuity. Wipe is only a synthetic attestation. Quarantine prevents readiness.
- Missed pickups remain supplier-owned with next action/deadline. Keep employee messages bounded in a visible synthetic outbox with deterministic keys, caps and cooldown.
- Use the explicit seed clock and labelled timezone for domain calculations. Wall time may serve expiry/rate limits only.
- Audit events are append-only through the domain API. Reset clears only the visitor's synthetic session.
- Reject arbitrary uploads and unsupported evidence. No personal data, supplier keys, real sends or fake connected badges.

## Working boundaries

Brand evidence was committed first. Use `docs/brand-guide.md` and its visual reference as the visual source of truth, retaining clear unofficial status. Record source URLs for new claims and distinguish evidence from hypotheses.

Use `work/` for ignored intermediate material. Keep credentials, `.env*`, `.dev.vars*`, generated dependencies and deployment state out of git. Tests must be deterministic with no arbitrary sleeps and report actual expected-versus-actual assertions honestly. Run the appropriate package scripts and update `docs/test-results.md` from observed output.

Deployment targets free Cloudflare Workers + SQLite Durable Objects only. No paid plan, card, paid APIs, D1 changes, destructive existing-resource actions or unauthenticated shared writes. Deploy only with existing appropriately scoped authorization. Otherwise retain a precise blocker; never claim an unobserved public URL. Free-tier platform limits must be verified before publication.

The recording must show the actual public HTTPS demo, mouse/actions, visible dialog controls and synchronized narration. Normalize sparse source timestamps to constant frame rate before trimming/composition, inspect scenes/boundaries, and record review gaps. Never substitute localhost footage or slides and call it a public walkthrough. Require Ayo's full watch/listen handoff before future outreach.

Never send emails, apply for roles or use LinkedIn from this build. Any future outreach uses Demo + Walkthrough only, without repository links.
