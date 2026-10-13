# Assumptions and non-goals

Ayo Ahmed - Independent concept

**Unofficial concept. Synthetic data. No live integrations.**

I keep hypotheses visible so a polished interface does not become an unsupported operational claim.

| Assumption | Why I use it in the lab | What would validate or change it |
| --- | --- | --- |
| Supplier slots can be represented as bounded units | Makes overbooking testable | Dispatch capacity models, pickup windows, geographic batching and cutoffs |
| Custody IDs can link handoffs | Makes asset mismatch and chain breaks explicit | Current warehouse/courier scan protocols and evidence retention |
| Condition needs a separate record at each handoff | Avoids a receipt masquerading as inspection | Claims policy, damage evidence and operator workflow |
| Wipe authority is separate from receipt | Prevents unsafe readiness | Security policy, MDM integrations, legal holds and attestation source |
| A missed pickup is supplier-owned | Gives recovery a clear accountable party | Actual contracts and exception taxonomy |
| Rule-based SLA explanations are useful | Makes risk inspectable without training data | Regional SLA definitions and response effectiveness |
| Bounded messages improve experience | Prevents retries from creating spam | Communication consent, preferences and support outcomes |
| Session isolation is adequate for a demo | Avoids shared synthetic writes without login | Production identity, tenancy and retention design |

I have not validated these assumptions with Deel employees or suppliers. Synthetic names, assets, suppliers, timestamps and evidence labels are chosen for determinism. New reservations cannot use a slot at or after its end according to the simulation clock. Supplier event timing is deliberately injected for demonstration rather than validated against appointment time; that limit must be resolved before a real integration. No real photos, personal uploads, vendor keys or customer traces belong in this repository.

The concept does not claim label issuance, real tracking aggregation, actual wiping, real sends, supplier connectivity, savings, failure rates or suitability for production. It exercises one return flow and documents where broader work could follow.
