# Runbook

Ayo Ahmed - Independent concept

**Unofficial concept. Synthetic data. No live integrations.**

I keep this procedure scoped to `CashpointSoulja/device-return-reliability-lab`. CleanSL8, Corgi and unrelated repositories/resources must remain untouched.

## Build and verify

```sh
npm ci
npm test
npm run build
```

`npm run test:scenarios` writes the deterministic expected/actual scenario report; `npm run test:browser` checks the cloud-local Worker at desktop/phone sizes. `npm run deploy:check` validates the deployment bundle without publishing. For browser verification, start `npm run dev` in one cloud terminal, then run `npm run test:browser` and `npm run test:accessibility` in another. Set `LAB_TEST_URL` only when using a different cloud-local test port. The browser needs Chromium and the environment’s existing certificate trust for official font assets; do not disable TLS verification. Stop the dev server before a clean build because rebuilding removes its assets directory. `npm run test:scenarios` saves actual assertion results.

The build output is deployment input, not proof of a public deployment. Use the [test report](test-results.md) for actual observed results. The scenario runner is available in the interface and executes the shared rules with fixed seed time, without arbitrary sleeps.

## Deploy only with existing scoped authorization

1. Run `npm run auth:check` to inspect existing authentication without logging in. Confirm existing Cloudflare authorization is scoped to the intended account and Worker; do not start login, add a card, upgrade plans or repurpose another service.
2. Confirm Workers + SQLite Durable Objects free availability and current limits, and review `wrangler.jsonc`.
3. Run `npm run deploy:check` for a build/config dry run, then `npm run deploy` only after the preceding checks. Record its returned HTTPS URL and fetch it successfully before declaring a public demo.
4. Verify without login: visitor isolation, persistence on reload, session-only reset, scenario runner and recovery path.
5. Check free-tier usage and error logs with synthetic identifiers only. Shut down or limit traffic rather than enabling paid overages.

**Observed blocker in this run:** `wrangler 4.149.0 whoami` returned “You are not authenticated. Please run wrangler login.” The cloud environment has no configured `CLOUDFLARE_API_TOKEN`, account binding, runtime identity or outbound identity. The user authorized deployment only with existing appropriately scoped authorization, so no login or deployment occurred. Deployment requires a scoped API authorization and intended account binding through environment configuration. I have not observed a public demo URL or claimed real public recording. Official limits/pricing fetches also returned 403, so current free allowances need verification before publishing.

The prepared configuration names Worker `device-return-reliability-lab`, binds SQLite Durable Object `SESSIONS` to `ReturnSession`, creates migration `v1` with `new_sqlite_classes`, serves `dist` through `ASSETS` with the Worker handling `/api/*` first, and uses compatibility date `2026-08-01` (compatible with the installed runtime, whose supported maximum is `2026-08-06`). Review the actual configuration before deployment; it creates this concept's resources rather than modifying another application.

## Operator recovery

- **Stale revision:** reload current state, inspect intervening audit, retry with a new command ID and current revision. Do not overwrite another tab's decision.
- **Capacity denial:** choose another available slot; do not manufacture capacity. Cancellation and missed pickup release once; rebook checks destination capacity before releasing the old reservation. Collection consumes the serviced slot; it does not return throughput to availability. An ended slot rejects new reservations with `SLOT_EXPIRED` while preserving any existing reservation.
- **Missed pickup:** inspect the supplier-owned exception and deadline, explicitly rebook/confirm, then attach actual selected synthetic proofs.
- **Custody/condition rejection:** inspect asset, evidence stage and chain; use distinct catalog proof. No manual green-state override exists.
- **Condition conflict/damage:** choose repair/quarantine with a reason. Complete allowed synthetic repair before release; quarantine blocks readiness.
- **Notification suppression:** inspect dedupe/cap/cooldown reason. Do not force resend around the policy.
- **Idle inventory:** record rationale and owner; inspect age using the simulation clock.
- **Session ceiling:** reset only the current demo session after preserving any review screenshots needed. Reset removes its synthetic state and audit.

The walkthrough documentation includes reproducible public-host capture and composition sources. Ayo must fully watch and listen before any future outreach; this build sends no outreach. Future outreach uses Demo + Walkthrough only, without repository links.
