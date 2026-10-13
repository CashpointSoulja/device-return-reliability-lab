// Ayo Ahmed - Independent concept. All records and attestations are synthetic.
export const LIMITS = Object.freeze({global: 8, perPerson: 2, cooldownMinutes: 60, commands: 500});
export class DomainError extends Error {
  constructor(code, message) { super(message); this.name = 'DomainError'; this.code = code; }
}
const fail = (code, message) => { throw new DomainError(code, message); };
const copy = value => JSON.parse(JSON.stringify(value));
const iso = value => new Date(value).toISOString();
const canonical = value => Array.isArray(value) ? `[${value.map(canonical).join(',')}]` : value && typeof value === 'object' ? `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}` : JSON.stringify(value);
const safeId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(value);
const rationale = value => typeof value === 'string' && value.trim().length >= 8 && value.length <= 240;

export function seed() {
  const evidenceCatalog = [];
  const returns = [1, 2, 3].map(n => {
    const assetId = `SYN-LAP-00${n}`;
    const base = {assetId, synthetic: true};
    evidenceCatalog.push(
      {...base, id:`PICKUP-${n}`,type:'custody',stage:'pickup',from:'synthetic employee',to:'synthetic supplier',chainId:`SYN-CHAIN-${n}`,label:`Synthetic pickup custody ${n}`},
      {...base, id:`RECEIPT-${n}`,type:'custody',stage:'receipt',from:'synthetic supplier',to:'synthetic warehouse',chainId:`SYN-CHAIN-${n}`,label:`Synthetic warehouse custody ${n}`},
      {...base, id:`PICKUP-CONDITION-${n}`,type:'pickup-condition',outcome:'clear',label:`Synthetic pickup photo label ${n}: clear`},
      {...base, id:`PICKUP-DAMAGE-${n}`,type:'pickup-condition',outcome:'repair-needed',label:`Synthetic pickup photo label ${n}: damage`},
      {...base, id:`CONDITION-${n}`,type:'condition',outcome:'clear',label:`Synthetic warehouse photo label ${n}: clear`},
      {...base, id:`DAMAGE-${n}`,type:'condition',outcome:'repair-needed',label:`Synthetic warehouse photo label ${n}: damage`},
      {...base, id:`WIPE-${n}`,type:'wipe',label:`Synthetic wipe attestation ${n} (no actual wipe)`},
      {...base, id:`REPAIR-${n}`,type:'repair',label:`Synthetic repair attestation ${n}`},
    );
    return {id:`R-100${n}`,assetId,personId:`SYN-PER-00${n}`,personName:`Synthetic employee ${n}`,device:`Synthetic laptop ${n}`,status:'requested',dueAt:'2026-10-15T16:00:00.000Z',booking:null,bookingGeneration:0,exception:null,missedEvents:0,custody:{pickup:null,receipt:null,pickupConditionIds:[],receiptConditionIds:[]},condition:{status:'pending',decision:null,evidenceIds:[],rationale:null},wipe:null,idle:null};
  });
  evidenceCatalog.push({id:'BROKEN-CHAIN-RECEIPT',assetId:'SYN-LAP-001',synthetic:true,type:'custody',stage:'receipt',from:'synthetic supplier',to:'synthetic warehouse',chainId:'SYN-WRONG-CHAIN',label:'Synthetic intentionally mismatched custody chain'});
  evidenceCatalog.push({id:'WRONG-ASSET-PICKUP',assetId:'SYN-LAP-002',synthetic:true,type:'custody',stage:'pickup',from:'synthetic employee',to:'synthetic supplier',chainId:'SYN-CHAIN-2',label:'Synthetic intentionally wrong asset custody'});
  return {version:1,revision:0,clock:{now:'2026-10-13T09:00:00.000Z',timeZone:'Europe/London'},returns,slots:[
    {id:'SLOT-LON-1',supplierId:'SYN-SUP-01',label:'Synthetic supplier · final slot',start:'2026-10-13T12:00:00.000Z',end:'2026-10-13T14:00:00.000Z',capacity:1,reserved:0,consumed:0},
    {id:'SLOT-LON-2',supplierId:'SYN-SUP-01',label:'Synthetic supplier · recovery slot',start:'2026-10-14T09:00:00.000Z',end:'2026-10-14T11:00:00.000Z',capacity:2,reserved:0,consumed:0},
    {id:'SLOT-FULL',supplierId:'SYN-SUP-02',label:'Synthetic supplier · no capacity',start:'2026-10-13T15:00:00.000Z',end:'2026-10-13T17:00:00.000Z',capacity:0,reserved:0,consumed:0},
  ],evidenceCatalog,outbox:[],notificationLog:[],audit:[],receipts:{},processedEvents:{}};
}

const evidence = (state, id, record, type, stage) => {
  const item = state.evidenceCatalog.find(e => e.id === id);
  if (!item || item.type !== type || (stage && item.stage !== stage) || !item.synthetic) fail('INVALID_EVIDENCE','Select a valid allowlisted synthetic evidence label for this stage.');
  if (item.assetId !== record.assetId) fail(type === 'custody' ? 'CUSTODY_MISMATCH' : 'INVALID_EVIDENCE','Evidence belongs to a different synthetic asset.');
  return item;
};
function conditions(state, ids, record, type) {
  if (!Array.isArray(ids) || !ids.length) fail('CONDITION_REQUIRED','Distinct synthetic condition proof is required for this stage.');
  if (ids.length > 4 || new Set(ids).size !== ids.length) fail('INVALID_EVIDENCE','Condition evidence must be distinct and bounded.');
  return ids.map(id => evidence(state,id,record,type));
}
function release(state, record) {
  if (!record.booking?.active) return;
  const slot = state.slots.find(s => s.id === record.booking.slotId);
  if (!slot || slot.reserved < 1) fail('CAPACITY_INVARIANT','Reservation ledger is inconsistent.');
  slot.reserved -= 1;
  record.booking.active = false;
}
const cleanCondition = record => ['clear','repaired'].includes(record.condition.status) && record.condition.decision !== 'quarantine' && record.condition.decision !== 'repair';
const hasCustody = record => Boolean(record.custody.pickup && record.custody.receipt && record.custody.pickup.id !== record.custody.receipt.id && record.custody.pickup.assetId === record.assetId && record.custody.receipt.assetId === record.assetId && record.custody.pickup.chainId === record.custody.receipt.chainId && record.custody.pickup.to === record.custody.receipt.from && record.custody.pickupConditionIds.length && record.custody.receiptConditionIds.length);

export function notificationAttempt(state, record, reason) {
  if (reason === 'booked' && record.status !== 'booked') fail('NOTIFICATION_NOT_MEANINGFUL','Booking messages require a current booking change.');
  if (reason === 'missedPickup' && !record.exception) fail('NOTIFICATION_NOT_MEANINGFUL','Missed pickup messages require a current supplier exception.');
  if (!['booked','missedPickup'].includes(reason)) fail('INVALID_COMMAND','Unsupported synthetic notification reason.');
  const dedupeKey = `${record.id}:${reason}:${record.bookingGeneration}`;
  const personMessages = state.outbox.filter(m => m.personId === record.personId);
  let suppression = null;
  if (state.outbox.some(m => m.dedupeKey === dedupeKey)) suppression = 'duplicate';
  else if (state.outbox.length >= LIMITS.global) suppression = 'global-cap';
  else if (personMessages.length >= LIMITS.perPerson) suppression = 'person-cap';
  else if (personMessages.length && (Date.parse(state.clock.now)-Date.parse(personMessages.at(-1).at))/60000 < LIMITS.cooldownMinutes) suppression = 'cooldown';
  state.notificationLog.push({at:state.clock.now,returnId:record.id,personId:record.personId,dedupeKey,reason:suppression || 'queued',synthetic:true});
  if (!suppression) state.outbox.push({id:`SYN-MSG-${state.outbox.length+1}`,dedupeKey,personId:record.personId,returnId:record.id,at:state.clock.now,reason,synthetic:true,status:'synthetic-only',message:reason === 'booked' ? 'Your synthetic return slot is reserved. Review the proposed collection window.' : 'The synthetic supplier missed collection. The supplier owns rebooking; no employee action is required until a replacement window is proposed.'});
  return {queued:!suppression,reason:suppression || 'queued',dedupeKey};
}

const FIELDS = {
  book:['slotId'],cancel:[],confirm:[],missedPickup:[],collect:['custodyId','conditionIds'],receive:['custodyId','conditionIds'],resolveCondition:['decision','rationale'],repairComplete:['evidenceId'],wipe:['evidenceId'],markReady:[],keepIdle:['owner','rationale'],notify:['reason'],advanceClock:['minutes'],ingestEvent:['eventId','eventType','custodyId','conditionIds'],
};
function validate(command) {
  if (!command || typeof command !== 'object' || Array.isArray(command) || !safeId(command.id) || !Number.isSafeInteger(command.expectedRevision) || command.expectedRevision < 0 || !Object.hasOwn(FIELDS,command.type)) fail('INVALID_COMMAND','A supported command, safe id and expectedRevision are required.');
  const permitted = new Set(['id','type','expectedRevision','returnId',...FIELDS[command.type]]);
  if (Object.keys(command).some(k => !permitted.has(k))) fail('INVALID_COMMAND','Unexpected command fields are rejected; uploads and personal records are unsupported.');
  if (command.type !== 'advanceClock' && !safeId(command.returnId)) fail('INVALID_COMMAND','A synthetic return identifier is required.');
  if (JSON.stringify(command).length > 4096) fail('INVALID_COMMAND','Command is too large.');
}

function transition(state, record, command) {
  const requireState = statuses => { if (!statuses.includes(record.status)) fail('INVALID_STATE',`Action requires ${statuses.join(' or ')}; current state is ${record.status}.`); };
  switch (command.type) {
    case 'book': {
      requireState(['requested','booked','confirmed']);
      const slot = state.slots.find(s=>s.id===command.slotId);
      if (!slot) fail('INVALID_COMMAND','Select an allowlisted synthetic supplier slot.');
      const sameReservation = record.booking?.active && record.booking.slotId === slot.id;
      if (sameReservation && !record.exception) return {unchanged:true,reason:'The same active slot is already reserved; no meaningful booking change.'};
      if (!sameReservation && Date.parse(slot.end)<=Date.parse(state.clock.now)) fail('SLOT_EXPIRED','This synthetic supplier window has ended according to the simulation clock. Choose a future slot; the current reservation is preserved.');
      if (!sameReservation && slot.reserved + slot.consumed >= slot.capacity) fail('NO_CAPACITY','Supplier capacity is exhausted. Choose another slot; the current reservation is preserved.');
      if (!sameReservation) {release(state,record);slot.reserved+=1;}
      record.bookingGeneration += 1;
      record.booking={slotId:slot.id,supplierId:slot.supplierId,generation:record.bookingGeneration,active:true,at:state.clock.now};
      record.status='booked';record.exception=null;
      return {notification:notificationAttempt(state,record,'booked')};
    }
    case 'cancel':
      requireState(['requested','booked','confirmed']);
      release(state,record);record.status='requested';record.exception=null;
      return {cancelled:true};
    case 'confirm':
      requireState(['booked']);
      if (!record.booking?.active) fail('INVALID_STATE','Confirmation requires an active reservation.');
      record.status='confirmed';return {confirmed:true};
    case 'missedPickup':
      requireState(['confirmed']);
      if (record.exception || !record.booking?.active) fail('INVALID_STATE','The missed pickup was already recorded or there is no active reservation.');
      release(state,record);record.missedEvents+=1;
      record.exception={type:'missed-pickup',supplierId:record.booking.supplierId,owner:`Synthetic supplier ${record.booking.supplierId}`,nextAction:'Propose and reserve a replacement collection window.',deadline:iso(Date.parse(state.clock.now)+4*3600000),at:state.clock.now};
      return {notification:notificationAttempt(state,record,'missedPickup'),owner:record.exception.owner};
    case 'collect': {
      requireState(['confirmed']);
      if (record.exception || !record.booking?.active) fail('INVALID_STATE','Resolve the supplier exception through rebooking and confirmation first.');
      const custody = evidence(state,command.custodyId,record,'custody','pickup');
      const proof = conditions(state,command.conditionIds,record,'pickup-condition');
      record.custody.pickup={...custody,at:state.clock.now};record.custody.pickupConditionIds=proof.map(p=>p.id);
      record.condition.evidenceIds=proof.map(p=>p.id);
      record.condition.status=new Set(proof.map(p=>p.outcome)).size>1?'conflict':proof[0].outcome;
      const servicedSlot=state.slots.find(s=>s.id===record.booking.slotId);
      release(state,record);servicedSlot.consumed+=1;record.booking.consumed=true;
      record.status='collected';return {custodyId:custody.id,conditionIds:command.conditionIds};
    }
    case 'receive': {
      requireState(['collected']);
      const custody = evidence(state,command.custodyId,record,'custody','receipt');
      const pickup=record.custody.pickup;
      if (!pickup || pickup.id===custody.id || pickup.chainId!==custody.chainId || pickup.to!==custody.from || pickup.assetId!==custody.assetId) fail('CUSTODY_MISMATCH','Receipt custody does not continue the verified pickup chain.');
      const proof=conditions(state,command.conditionIds,record,'condition');
      if (proof.some(p=>record.custody.pickupConditionIds.includes(p.id))) fail('INVALID_EVIDENCE','Receipt requires distinct warehouse evidence.');
      const all=[...record.custody.pickupConditionIds.map(id=>state.evidenceCatalog.find(e=>e.id===id)),...proof];
      record.custody.receipt={...custody,at:state.clock.now};record.custody.receiptConditionIds=proof.map(p=>p.id);
      record.condition.evidenceIds=all.map(p=>p.id);
      record.condition.status=new Set(all.map(p=>p.outcome)).size>1?'conflict':all[0].outcome;
      record.status='received';return {custodyId:custody.id,condition:record.condition.status};
    }
    case 'resolveCondition':
      requireState(['received']);
      if (!['quarantine','repair','release'].includes(command.decision) || !rationale(command.rationale)) fail('INVALID_COMMAND','Choose a condition decision and a rationale of 8–240 characters.');
      if (command.decision==='release' && !['clear','repaired'].includes(record.condition.status)) fail('CONDITION_BLOCKED','A condition conflict or issue requires repair evidence before release.');
      if (command.decision==='repair' && !['repair-needed','conflict','quarantined'].includes(record.condition.status)) fail('CONDITION_BLOCKED','Repair routing requires a documented issue.');
      record.condition.decision=command.decision;record.condition.rationale=command.rationale.trim();record.condition.decidedAt=state.clock.now;
      if (command.decision==='quarantine') record.condition.status='quarantined';
      return {decision:command.decision};
    case 'repairComplete':
      requireState(['received']);
      if (record.condition.decision!=='repair') fail('CONDITION_BLOCKED','Synthetic repair must be explicitly routed first.');
      evidence(state,command.evidenceId,record,'repair');
      record.condition.status='repaired';record.condition.decision='release';record.condition.repair={evidenceId:command.evidenceId,at:state.clock.now,synthetic:true};return {repaired:true};
    case 'wipe':
      requireState(['received']);
      if (!hasCustody(record)) fail('CUSTODY_MISMATCH','Continuous pickup and warehouse custody is required.');
      if (!cleanCondition(record)) fail('CONDITION_BLOCKED','Resolve condition issues or quarantine before synthetic wipe attestation.');
      evidence(state,command.evidenceId,record,'wipe');
      record.wipe={evidenceId:command.evidenceId,at:state.clock.now,synthetic:true};record.status='wiped';return {syntheticAttestation:true};
    case 'markReady':
      if (!cleanCondition(record)) fail('CONDITION_BLOCKED','Condition evidence must be clear or explicitly repaired; quarantine blocks redeployment.');
      if (!hasCustody(record)) fail('CUSTODY_MISMATCH','Continuous custody and distinct condition proof are required.');
      if (!record.wipe?.synthetic) fail('WIPE_REQUIRED','A valid synthetic wipe attestation is required.');
      requireState(['wiped']);record.status='redeploy-ready';return {ready:true};
    case 'keepIdle':
      requireState(['received','wiped','redeploy-ready']);
      if (command.owner!=='Synthetic IT operations' || !rationale(command.rationale)) fail('INVALID_COMMAND','Idle decisions need the synthetic operations owner and a rationale of 8–240 characters.');
      record.idle={owner:command.owner,rationale:command.rationale.trim(),at:state.clock.now};return {idle:true};
    case 'notify':return {notification:notificationAttempt(state,record,command.reason)};
    default:fail('INVALID_COMMAND','Unsupported transition.');
  }
}

export function execute(input, command) {
  validate(command);
  const hash=canonical(command);
  const prior=Object.hasOwn(input.receipts,command.id)?input.receipts[command.id]:null;
  if (prior) {
    if (prior.hash!==hash) fail('IDEMPOTENCY_CONFLICT','This command id was used for a different payload.');
    return {state:copy(input),result:{...copy(prior.result),duplicateCommand:true}};
  }
  let eventHash;
  if (command.type==='ingestEvent') {
    if (!/^SYN-EVT-[A-Z0-9-]{1,60}$/.test(command.eventId || '') || !['confirm','missedPickup','collect','receive'].includes(command.eventType)) fail('INVALID_COMMAND','Only synthetic event identifiers and supported event types are accepted.');
    const {id,expectedRevision,...eventPayload}=command;eventHash=canonical(eventPayload);
    const event=input.processedEvents[command.eventId];
    if (event) {
      if (event.hash!==eventHash) fail('EVENT_CONFLICT','This synthetic event id was used for a different payload.');
      return {state:copy(input),result:{duplicateEvent:true,eventId:command.eventId}};
    }
  }
  if (command.expectedRevision!==input.revision) fail('STALE_REVISION',`Revision ${command.expectedRevision} is stale; current revision is ${input.revision}. Reload and reconsider the action.`);
  if (input.revision>=LIMITS.commands) fail('SESSION_LIMIT','This demo session reached its command limit. Reset your own session to continue.');
  const state=copy(input);
  const record=state.returns.find(r=>r.id===command.returnId);
  if (command.type!=='advanceClock' && !record) fail('INVALID_COMMAND','Unknown synthetic return.');
  const before=record?.status || 'clock';
  let result;
  if (command.type==='advanceClock') {
    if (!Number.isSafeInteger(command.minutes) || command.minutes<1 || command.minutes>10080) fail('INVALID_COMMAND','Clock movement must be 1–10080 whole simulated minutes.');
    const next=Date.parse(state.clock.now)+command.minutes*60000;
    if (next>Date.parse('2027-01-11T09:00:00.000Z')) fail('INVALID_COMMAND','The simulation clock is bounded to 90 days.');
    state.clock.now=iso(next);result={now:state.clock.now};
  } else if (command.type==='ingestEvent') {
    result=transition(state,record,{...command,type:command.eventType});
    state.processedEvents[command.eventId]={hash:eventHash,at:state.clock.now};
    result={...result,eventId:command.eventId};
  } else result=transition(state,record,command);
  if (state.slots.some(s=>s.reserved<0 || s.consumed<0 || s.reserved+s.consumed>s.capacity)) fail('CAPACITY_INVARIANT','Capacity invariant failed; no changes were committed.');
  for (const slot of state.slots) if (slot.reserved!==state.returns.filter(r=>r.booking?.active&&r.booking.slotId===slot.id).length) fail('CAPACITY_INVARIANT','Capacity reservation ledger failed; no changes were committed.');
  for (const slot of state.slots) if (slot.consumed!==state.returns.filter(r=>r.booking?.consumed&&r.booking.slotId===slot.id).length) fail('CAPACITY_INVARIANT','Serviced slot ledger failed; no changes were committed.');
  state.revision+=1;
  state.audit.push({sequence:state.audit.length+1,revision:state.revision,at:state.clock.now,commandId:command.id,type:command.type,returnId:record?.id || null,before,after:record?.status || 'clock',details:copy(result),synthetic:true});
  state.receipts[command.id]={hash,result:copy(result)};
  return {state,result};
}

export function derive(state) {
  const returns=state.returns.map(record=> {
    const remainingMinutes=Math.floor((Date.parse(record.dueAt)-Date.parse(state.clock.now))/60000);
    let owner='Synthetic IT operations';
    let nextAction={requested:'Reserve supplier capacity.',booked:'Confirm the reserved collection window.',confirmed:'Attach pickup custody and distinct pickup condition proof.',collected:'Attach warehouse custody and distinct warehouse condition proof.',received:'Review condition and attach a synthetic wipe attestation.',wiped:'Verify prerequisites and mark redeploy-ready.','redeploy-ready':'Choose a redeployment allocation or document an idle decision.'}[record.status];
    if (record.exception) {owner=record.exception.owner;nextAction=record.exception.nextAction;}
    else if (record.condition.status==='quarantined') {owner='Synthetic Security & repair depot';nextAction='Review quarantine; route repair with an explicit rationale.';}
    else if (['conflict','repair-needed'].includes(record.condition.status)) {owner='Synthetic repair depot';nextAction=record.status==='collected'?'Attach warehouse custody and distinct warehouse condition proof before a repair or quarantine decision.':'Resolve condition evidence through repair or quarantine.';}
    else if (remainingMinutes<=1440 && record.status!=='redeploy-ready') owner='Synthetic IT support';
    const risk=record.status==='redeploy-ready'?'complete':remainingMinutes<=0?'overdue':remainingMinutes<=1440||record.missedEvents>0?'at-risk':'on-track';
    const reasons=[`${Math.max(0,remainingMinutes)} simulated minutes remaining${remainingMinutes<0?`; ${-remainingMinutes} minutes overdue`:''}.`,`${record.missedEvents} missed supplier pickup event(s).`,`Action owner: ${owner}.`];
    const conditionVerified=Boolean(record.custody.receipt && record.custody.receiptConditionIds.length && cleanCondition(record));
    const gates={custody:hasCustody(record),condition:conditionVerified,wipe:Boolean(record.wipe?.synthetic),ready:hasCustody(record)&&conditionVerified&&Boolean(record.wipe?.synthetic)};
    return {id:record.id,owner,nextAction,sla:{remainingMinutes,risk,reasons,owner},gates,gateReasons:{custody:gates.custody?'Pickup and receipt have a continuous asset custody chain.':'Both custody stages and distinct condition labels are required.',condition:gates.condition?'Condition is clear or explicitly repaired.':`Condition is ${record.condition.status}; explicit resolution is required.`,wipe:gates.wipe?'Synthetic attestation recorded; no actual wipe performed.':'Synthetic wipe attestation is missing.',ready:gates.ready?'All return prerequisites are satisfied.':'Missing prerequisites block redeploy-ready.'},idleAgeMinutes:record.idle?Math.floor((Date.parse(state.clock.now)-Date.parse(record.idle.at))/60000):null};
  });
  return {returns,slots:state.slots.map(s=>({...s,available:s.capacity-s.reserved-s.consumed})),notificationLimits:{global:LIMITS.global,perPerson:LIMITS.perPerson,cooldownMinutes:LIMITS.cooldownMinutes}};
}
