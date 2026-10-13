# Decisions and tradeoffs

Ayo Ahmed - Independent concept

**Unofficial concept. Synthetic data. No live integrations.**

| Decision I made | Why | Cost / production follow-up |
| --- | --- | --- |
| One return state machine | Makes the consequential prerequisites testable | Does not model all procurement, support or international logistics |
| Supplier capacity participates in mutation rules | A visible slot must constrain booking; collection consumes its throughput rather than reselling it | Real capacity needs expiry, geographic routing and supplier reconciliation |
| Visitor-isolated Durable Object | Serializes demo commands and persists reload state | Separate sessions do not compete against a shared real supplier; production needs tenant/supplier boundaries |
| Explicit revisions + idempotency keys | Retry safety and conflict visibility | Clients must recover from stale state and keys require lifecycle rules |
| Proof-bearing handoffs | Stops wrong-asset and fabricated readiness paths | Real evidence requires authenticated provenance and storage policy |
| Synthetic wipe attestation | Demonstrates prerequisite logic without touching devices | Production attestation needs an authoritative security integration |
| Synthetic notification outbox | Shows dedupe and suppression without sending | Production channels require consent, delivery reconciliation and provider failure handling |
| Rule-based SLA explanation | A reviewer can understand time and ownership | Thresholds are illustrative; regional policies must be validated |
| Visible quarantine / repair / idle decisions | A returned asset may still require a human choice | Inventory demand and disposition economics are outside this lab |
| No arbitrary uploads or integration credentials | Keeps the public concept synthetic | Real workflows need validated file handling, identity and retention controls |
| Brand evidence before implementation | Grounds the visual language in official current sources | Visual resemblance never establishes affiliation; unofficial status remains prominent |

I chose free-tier deployment configuration without paid APIs or plan changes. The [runbook](runbook.md) records operational constraints and observed deployment status. I do not treat deployment configuration as proof of a public deployment.
