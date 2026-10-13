# Observed test results

Ayo Ahmed - Independent concept

**Unofficial concept. Synthetic data. No live integrations.**

I report checks executed in the cloud build environment on 13 October 2026. Planned acceptance criteria are in [the test plan](test-plan.md). The browser checks used the cloud-local Worker runtime; no public deployment is claimed.

| Verification | Observed result |
| --- | --- |
| Shared executable failure lab | 22/22 scenarios pass: the 20 required failure cases, happy path and JSON reload; 102 actual expected-versus-actual assertions, 0 failed assertions |
| Domain rules and runner honesty | 35/35 tests pass, including injected broken-capacity and thrown-error checks that produce visible failed assertions |
| SQLite Durable Object integration | 2/2 integration tests pass, including concurrent API booking, runtime restart persistence, visitor isolation and current-session reset |
| Desktop/phone browser flow | 34 assertions pass at 1440 × 1000 and 390 × 844; inspected screenshots saved below |
| Dialog, keyboard and narrow layouts | 27/27 dialog/focus cases plus 3/3 no-overflow checks at 320 × 844, 390 × 844 and 540 × 960 |
| Production build | `npm run build` passes |
| Deployment configuration | `npm run deploy:check` passes Wrangler dry run with static assets and SQLite Durable Object binding; no deployment performed |
| Public HTTPS app | Blocked: `wrangler 4.149.0 whoami` reports unauthenticated; no configured Cloudflare authorization/account binding |
| 90–120 second public-demo voiced recording | Blocked by public host; narration, storyboard and reproducible capture/composition sources supplied; no final MP4 or full watch/listen claimed |

## Executed domain checks

`npm test` executes the domain/scenario and SQLite integration suites. The domain result is **35 tests: 35 pass, 0 fail**. These checks cover the 22 visible scenarios plus deterministic reruns, audit immutability, notification caps/cooldown, meaningful-change no-ops, consumed supplier throughput, repair/quarantine recovery and invalid wipe proof. Pickup-only condition proof cannot make the warehouse condition gate green. A completed collection consumes the slot rather than making its serviced capacity available again. The separate `tests/slot-time.test.js` boundary check passes: a new reservation succeeds just before slot end, is rejected exactly at slot end, and a failed rebook preserves its original reservation. The 35 domain checks are 34 scenario/rule checks plus this one boundary check.

`npm run test:scenarios` uses shared `runScenarios()` rules: **22/22 scenarios, 102 assertions, 0 failed assertions**, seeded at `2026-10-13T09:00:00.000Z` with `Europe/London`. [The saved report](results/scenarios.json) contains actual expected/actual values. Fault-injection tests separately prove the runner reports red when a rule or execution fails; it is not a hard-coded success board.

## Executed API / SQLite checks

The **2 passing integration tests** exercise the actual Worker and Miniflare SQLite Durable Object boundary:

- Concurrent requests for the final slot yield one HTTP 200 winner and one HTTP 409 stale contender. Retrying the loser at the current revision yields HTTP 422 capacity denial. Reservation/consumption remains conserved.
- A supplier missed event is recovered by explicit rebook → confirm → distinct pickup proofs → distinct receipt proofs → synthetic wipe → redeploy-ready. Disposing and restarting the runtime preserves the completed return, missed-event history, all readiness gates, consumed capacity and bounded outbox.
- Duplicate commands, append-only audit, separate visitor cookies and scoped reset preserve their invariants. Same-origin checks, no-cookie writes, unsupported uploads, forged proof and oversized bodies reject invalid requests.

Pure-rule racing and JSON serialization alone would not prove these storage properties. These checks add local-runtime API and SQLite evidence; they do not establish an observed Cloudflare production deployment.

## Executed browser checks and screenshots

`npm run test:browser` passes **34 assertions** across desktop and phone. It checks no page overflow and visible dialog controls, including rejection states; blank collection condition returns `CONDITION_REQUIRED`; broken receipt chain returns `CUSTODY_MISMATCH`; missing wipe blocks readiness. The supplier-owned missed pickup and replay keep messages bounded. The browser completes recovery, reloads persisted state, runs and inspects the actual 22 scenario results, and checks independent second-visitor/current-session reset behavior.

`npm run test:accessibility` additionally passes eight dialog types and keyboard focus loops at each of 320, 390 and 540px: **27 dialog/focus cases plus 3 viewport overflow checks**. Escape restores the opener; eight Tab presses remain inside the dialog. [The layout report](results/accessibility.json) and reproducible script record these checks. All three official Bagoss/Inter faces were observed loaded through the configured proxy and existing trusted certificate store with TLS verification enabled.

The saved [browser report](results/browser.json) records the assertions. These screenshots were visually inspected; they show synthetic cloud-local review, not a public host:

- [Desktop](results/desktop.png) and [phone](results/phone.png).
- [Phone booking rejection](results/phone-booking-rejection.png) and [supplier exception](results/phone-supplier-exception.png).
- [Recovered redeploy-ready return](results/recovered-ready.png) and [executed scenario results](results/scenarios.png).

Passing viewport checks support the reviewed layout and flow; they are not a formal assistive-technology accessibility audit. Synthetic scenario outcomes are not business impact metrics. A configuration dry run is not a public deployment, and capture source files are not finished footage.
