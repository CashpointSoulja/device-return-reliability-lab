# Test plan

Ayo Ahmed - Independent concept

**Unofficial concept. Synthetic data. No live integrations.**

I use the same domain functions for the interface/API and scenario runner. Each scenario starts from a fixed seed clock, executes real commands, and compares an invariant's expected value with actual state or error. The UI must display an assertion failure honestly, not a hard-coded success tile. No arbitrary sleeps are needed.

| Required failure case | Invariant I expect |
| --- | --- |
| No capacity | Booking rejected; capacity and return unchanged |
| Last-slot race | Exactly one winner for capacity one; losing/stale contender cannot consume again |
| Duplicate booking command | Same ID/payload replays; one reservation |
| Cancel twice | Released exactly once; availability never exceeds capacity |
| Rebook capacity | New slot checked atomically; old reservation conserved/released correctly |
| Missed pickup | Supplier-owned exception, actionable deadline, reservation released once |
| Duplicate webhook/event | Event ID does not produce repeated effect/audit/notification |
| Out-of-order event | Invalid transition rejected without state mutation |
| Stale revision | Conflict returned; committed state conserved |
| Wrong asset custody | Mismatch rejected |
| Absent condition proof | Handoff blocked |
| Conflicting condition | Unresolved condition blocks unsafe progress pending explicit decision |
| Wipe missing | Readiness rejected |
| Wipe before receipt | State gate rejects |
| Quarantine blocking redeploy | Quarantine remains a blocker |
| Notification duplicate | One deterministic key, visible suppression |
| Per-person cap | Outbox cannot exceed the person cap |
| Cooldown | Meaningful attempted message suppressed until policy permits |
| SLA boundary | Exact threshold reflects explicit time remaining and owner |
| Idle asset decision | Rationale, owner and deterministic age visible |

Additional checks: collection converts reservation to consumed throughput without reselling a serviced final slot; happy path with distinct valid evidence; recovery from missed pickup through redeploy-ready; serialization/reload state; SQLite Durable Object persistence; two-session isolation; current-session reset; HTTP revision/origin/body limits; and accessible desktop/mobile actions.

A domain last-slot scenario is not sufficient proof of storage atomicity. I also need an API/storage integration check with concurrent requests at the Durable Object boundary. Browser screenshots are evidence of layout, not proof of business correctness or a public host. The [actual report](test-results.md) separates each verification layer and its observed status.
