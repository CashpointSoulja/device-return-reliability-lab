# API and schema

Ayo Ahmed - Independent concept

**Unofficial concept. Synthetic data. No live integrations.**

I use one SQLite Durable Object per visitor session. The object performs read → validate → mutate → persist in one synchronous SQLite transaction, without an awaited operation in the critical section. Separate visitors intentionally have separate synthetic suppliers and capacity. This is not a shared real dispatch network.

## HTTP contract

| Endpoint | Result | Access / limits |
| --- | --- | --- |
| `GET /api/session` | `{state, derived}` | Creates opaque visitor UUID cookie if absent; no login |
| `POST /api/command` | `{state, derived, result}` | Existing cookie and same-origin required; JSON body ≤8 KiB |
| `POST /api/reset` | `{state, derived}` | Empty JSON object `{}`; reseeds only the current cookie's object; same-origin required |

Cookie: opaque UUID, HttpOnly, Secure, SameSite=Strict, path `/`, seven-day session. No-cookie POST is rejected. Stale revision, conflicting command-ID reuse and conflicting event-ID reuse return 409; other domain validation returns 422 with `{error:{code,message},state,derived}`. Commands and audit are capped at 500 per session; the object rate guard is 240 requests per real hour. Snapshot storage is bounded to 1 MiB and a seven-day cleanup alarm clears session storage. Real time is used only for expiry/abuse control; domain outcomes use the simulation clock.

Every command includes `id` (1–80 safe characters), `type`, `expectedRevision` and, except clock movement, `returnId`. Domain command payloads are additionally bounded to 4096 serialized characters. Identical replay of an existing ID returns the original receipt before revision validation. Reusing an ID with different payload is `IDEMPOTENCY_CONFLICT`. A rejected command leaves domain state unchanged. Revision is global to the visitor's session, so a changed return can make another browser tab stale.

```json
{
  "id": "book-r1001-attempt1",
  "type": "book",
  "expectedRevision": 0,
  "returnId": "R-1001",
  "slotId": "SLOT-LON-1"
}
```

## Commands

| `type` | Additional fields | Rule |
| --- | --- | --- |
| `book` | `slotId` | Requested/booked/confirmed; check new capacity before releasing old slot; increment generation only for a changed booking; same active slot is an audited no-op; new reservations reject ended windows with `SLOT_EXPIRED` |
| `cancel` | none | Booked/confirmed → requested; release once; already requested is a no-op |
| `confirm` | none | Booked → confirmed |
| `missedPickup` | none | Confirmed → supplier-owned exception; release once, increment missed count; explicit rebooking required |
| `collect` | `custodyId`, `conditionIds[]` | Confirmed, active booking, no exception; matching pickup custody + distinct valid pickup-condition proof |
| `receive` | `custodyId`, `conditionIds[]` | Collected; distinct continuous receipt custody + separate receiving-condition proof |
| `resolveCondition` | `decision`, `rationale` | Received; `quarantine`, `repair` or `release`; rationale 8–240 characters; issues cannot be released without repair completion |
| `repairComplete` | `evidenceId` | Received with repair disposition; allowlisted synthetic repair proof |
| `wipe` | `evidenceId` | Received and safe condition; allowlisted synthetic wipe attestation |
| `markReady` | none | Wiped plus complete custody, safe condition and valid wipe |
| `keepIdle` | `owner`, `rationale` | Received/wiped/redeploy-ready; explicit `Synthetic IT operations` owner and reason; age derives from clock |
| `notify` | `reason` | `booked` or `missedPickup` matching meaningful current state; dedupe/caps/cooldown apply |
| `ingestEvent` | `eventId`, `eventType`, stage fields | Synthetic event namespace validation; dedupe before transition; out-of-order rejected |
| `advanceClock` | `minutes` | Integer 1–10080; explicit deterministic movement, bounded to 90 seeded days |

The UI offers catalog selections, not arbitrary evidence input. It does not attach proof automatically.

## Seed and entities

Clock: `2026-10-13T09:00:00.000Z`, labelled `Europe/London`. Return deadline: `2026-10-15T16:00:00.000Z`. Seed includes returns `R-1001`–`R-1003`, assets `SYN-LAP-001`–`003`, synthetic people, and slots `SLOT-LON-1` (capacity 1), `SLOT-LON-2` (2), `SLOT-FULL` (0).

`state` stores `revision`, `clock`, `returns`, `slots`, `evidenceCatalog`, `outbox`, `notificationLog`, `audit`, command `receipts` and `processedEvents`. A return stores identity, status, booking/generation, exception, custody, condition, wipe, idle decision, missed-event count and deadline. Slots store supplier, window, capacity, `reserved` and `consumed`. Available capacity is `capacity - reserved - consumed`. Cancellation, missed pickup and rebooking release only active reservations exactly once. A successful collection converts its reservation to consumed throughput, so a serviced final slot cannot be sold again; retries cannot consume twice. New reservation attempts require `slot.end > clock.now`; equality is expired and rejection preserves the old reservation. Supplier events are deliberately injected synthetic events: slot windows govern new reservations but do not validate injected event timing.

Each catalog item has `id`, `assetId`, `type`, `label`, `synthetic:true`. Pickup and receipt custody carry `from`, `to`, `chainId`; condition carries outcome. Per-asset allowlists include `PICKUP-n`, `RECEIPT-n`, `PICKUP-CONDITION-n`, `PICKUP-DAMAGE-n`, `CONDITION-n`, `DAMAGE-n`, `WIPE-n`, `REPAIR-n`. Explicit wrong-asset/broken-chain samples exercise rejection. An allowlist prevents pasted real data from becoming valid proof, but cannot authenticate physical reality.

## Derived state and notifications

`derive(state)` exposes owner, next action, gate booleans, idle age and SLA explanation. At-risk means ≤1440 simulated minutes remaining or a missed event. Overdue means ≤0. Complete requires redeploy-ready. Routing rules prefer supplier for missed pickup, Security & repair depot for quarantine, repair depot for condition issues, IT support for ≤24 hours remaining, and ordinary operations otherwise.

Notification key: `returnId:reason:bookingGeneration`. Global cap: 8; per-person cap: 2; cooldown: 60 simulated minutes. Booking and missed pickup attempt messages; suppression is visible in `notificationLog`. A missed warning may be suppressed by cooldown while its supplier-owned exception remains visible. Clock/audit-only changes do not send messages. The outbox never delivers externally.

Accepted commands append audit entries with sequence, revision, simulated timestamp, command ID/type, return ID, before/after and details. Repeat cancellation is audited but does not release again. The API exposes no audit edit route. Session reset deliberately clears this synthetic history; this is not durable compliance evidence.
