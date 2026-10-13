# Jobs, causes and validation

Ayo Ahmed - Independent concept

**Unofficial concept. Synthetic data. No live integrations.**

## Jobs to be done

| Situation | My proposed job | Desired progress | Validation needed |
| --- | --- | --- | --- |
| An employee is leaving | When I arrange a return, help me choose an actually available slot | One trustworthy appointment | Observe appointment selection with employees and suppliers |
| A pickup is missed | When a supplier fails to collect, help me route recovery with an owner | A new valid plan without repeated employee nudges | Read anonymized missed-pickup cases and interview frontline ops |
| A warehouse receives a package | When a device changes custody, help me verify its identity and condition | An auditable, safe handoff | Shadow receiving and inspect current evidence requirements |
| A returned device sits unused | When inventory is idle, help me record why and who can act | Intentional reuse, repair or retention | Interview inventory owners and review aging/disposition data |

## 5 Whys: a hypothesis tree, not a diagnosed Deel incident

**Starting hypothesis:** a returned device could remain idle despite its return status looking complete.

1. Why might it remain idle? Readiness may depend on condition, security and inventory decisions beyond receipt.
2. Why might those decisions stall? Evidence or a clear owner may be missing.
3. Why might evidence be missing? Custody milestones could be treated as labels rather than proof-bearing handoffs.
4. Why might that survive retries or exceptions? Recovery rules may not be explicit across participants.
5. Why might local fixes fail to resolve it? Teams might optimize a step's completion rather than end-to-end readiness.

I model explicit gates and ownership as one possible answer. Interviews may invalidate this chain; capacity, commercial terms, legal retention or stock demand could be the binding constraint instead.

## Research I would run before recommending production investment

- Interview 3–5 frontline operations coordinators across regions: which exceptions repeat, what work is judgment versus coordination, and where ownership changes.
- Interview supplier dispatchers and a supplier platform owner: capacity accuracy, reservation expiry, cancellation cutoffs, webhook ordering and contractual remedies.
- Shadow warehouse receiving with an IT/security owner: acceptable custody proof, condition conflicts, wipe authority and quarantine release.
- Interview departing employees about missed appointments and message burden.
- Request anonymized event traces, SLA definitions and timezone policies, supplier capacity histories, exception frequency, support routing outcomes, idle inventory ages, repair dispositions and handoff evidence completeness.

These sample counts are a proposed discovery plan, not completed interviews. I would sample geography and operating model deliberately, not extrapolate from a convenient single supplier.
