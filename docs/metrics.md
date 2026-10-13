# Metrics I would define

Ayo Ahmed - Independent concept

**Unofficial concept. Synthetic data. No live integrations.**

I define measurement before claiming impact. The lab has synthetic observations only; it supplies no real baseline, improvement percentage, cost saving or statistical prediction.

| Metric | Definition | Why I would use it | Guardrail / segmentation |
| --- | --- | --- | --- |
| End-to-end readiness within SLA | Returns with valid redeploy-ready event before agreed due time / eligible returns initiated in cohort | Measures usable inventory, not receipt alone | Separate exclusions, legal holds, repair, supplier and geography |
| Manual interventions per completed return | Human-origin recovery/routing decisions / completed returns | Tests coordination reduction hypothesis | Do not remove required safety judgment |
| Missed-pickup recovery time | Valid replacement plan timestamp minus first missed-pickup event timestamp | Tests exception responsiveness | Separate supplier-controlled time and employee availability |
| Capacity rejection rate | Capacity-denied booking attempts / unique valid booking attempts | Reveals constrained demand and data quality | Dedupe retries; segment slot, region and supplier |
| Evidence completeness at handoff | Handoffs with all required valid evidence / attempted eligible handoffs | Measures gate friction and trust | Count rejected proof separately from absent proof |
| Message burden | Sent or queued actionable employee messages per person per return | Tests recovery experience | Duplicate/cap/cooldown suppressions; consent policy |
| Routing accuracy | Reviewed cases assigned to correct accountable team / sampled cases | Tests explicit support rules | Review ambiguity and reassignment cost |
| Idle asset age | Simulation or observed current time minus explicit idle decision time | Makes intentional inventory holds visible | Owner, reason, condition, legal hold and reuse demand |
| Invalid readiness acceptance | Redeploy-ready transitions accepted without prerequisites | Safety invariant | Target zero; prove with tests and audit sampling |
| Capacity conservation violations | Slots whose reservations + consumed throughput exceed capacity or releases create excess availability | Booking integrity | Target zero; verify races and retry semantics |

The official role names on-time device delivery, support response time and revenue per operational/engineering headcount. I would connect return readiness to those broader measures only with agreed denominators and operational data. I would not substitute this demo's scenario pass rate for business outcomes.
