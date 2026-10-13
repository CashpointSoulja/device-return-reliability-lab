# Device Return Reliability Lab: PRD

Ayo Ahmed - Independent concept

**Unofficial concept. Synthetic data. No live integrations.**

I built this independent concept to make my product judgment inspectable for an unofficial candidacy for Staff Product Manager, Deel IT. This is a Staff-level stretch. I do not claim employment, operational access, experience I have not earned, or involvement in Deel's products.

## Why I chose this slice

The [current official role](https://www.deel.com/careers/job/607441dd-c469-43d1-b2cf-5e0c6b7ec20b/) says Deel's existing internal and supplier platforms work and handle scale. It identifies the next mandate as automating remaining manual work, expanding supplier capability, and surfacing SLA risk. It names labels, tracking aggregation, condition documentation and support routing as examples. I take that as a mandate to examine; it is not evidence that today's return workflow is broken.

The [one-year reflection](https://www.deel.com/blog/one-year-of-deel-it/) discusses onboarding delays, customs/vendor complexity and devices missing or idle in customer contexts. [Borderless IT](https://www.deel.com/blog/borderless-it/) describes automated offboarding, secure return and reuse. Those public narratives give me context, not current incident rates or a savings baseline.

I chose one deep flow: **requested → booked → confirmed → collected → received → wiped → redeploy-ready**. My hypothesis is that making ownership, capacity and proof explicit will reduce avoidable coordination work while preserving necessary human decisions. I cannot establish business impact without operational data and interviews.

## Users and jobs

| Person | Job in the concept | What I need to make visible |
| --- | --- | --- |
| Operations coordinator | Recover a device without chasing ambiguous statuses | Next valid action, owner, deadline, exceptions and rejected prerequisites |
| Supplier operator | Accept work only when actual slot capacity exists | Available slots, reservation/release, custody handoff and missed-pickup accountability |
| Departing employee | Complete a predictable handoff | Bounded actionable messages and a clear appointment; supplier failures do not become employee blame |
| Warehouse operator | Receive the correct asset with sufficient proof | Custody continuity and distinct condition evidence |
| IT/security operator | Decide whether an asset may re-enter inventory | Synthetic wipe attestation, condition disposition and explicit idle decision |

## What must be true

- Booking consumes supplier capacity atomically. A duplicate command cannot consume twice; cancellation or rebooking releases once.
- Every mutation is validated on the server against the current revision and allowed state transition.
- A missed pickup creates a supplier-owned exception with next action and deadline. Messages are synthetic, visible and bounded.
- Collection and receipt require distinct synthetic custody and condition evidence with asset match and chain continuity.
- Wipe is a synthetic attestation after receipt. Redeployment requires custody, acceptable condition and wipe proof. Quarantine prevents redeployment.
- Keeping a returned device idle records rationale, owner and age. Physical return alone is not business completion.
- SLA risk reports time remaining, missed events and ownership. It is a rule explanation, not a predicted probability.
- Visitors get isolated seeded sessions that survive reload. Reset affects only the current session.
- The executable scenario runner reports actual assertions, expected versus actual values and failures honestly.

## Acceptance evidence

I will accept the concept when the same domain rules power the API, interface and deterministic scenarios; all requested failure cases plus happy path and reload persistence have executable checks; and a reviewer can recover a missed pickup to redeploy-ready while inspecting proof and audit events. The [test report](test-results.md) records observed results and limitations, not planned successes.

## Non-goals

Real supplier calls, live tracking, shipping labels accepted by a courier, actual wiping, production security certification, financial impact claims, arbitrary uploads, a broad IT platform, authentication into customer systems, and a production rollout are outside this concept. The public demo opens without login but exposes only its visitor's synthetic session.
