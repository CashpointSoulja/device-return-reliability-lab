import * as domain from './domain.js';

export const scenarioCatalog = [
  ['no-capacity', 'No supplier capacity', 'A full slot cannot accept a reservation.'],
  ['last-slot-race', 'Last-slot race', 'Competing requests cannot consume the final slot twice.'],
  ['duplicate-booking', 'Duplicate booking command', 'Retrying a command preserves its original reservation.'],
  ['cancel-twice', 'Cancel twice', 'Repeated cancellation releases capacity once.'],
  ['rebook-capacity', 'Rebook capacity', 'Moving a reservation releases the old slot and reserves the new one.'],
  ['missed-pickup', 'Missed supplier pickup', 'The supplier owns recovery and employee messages stay bounded.'],
  ['duplicate-event', 'Duplicate event', 'A repeated supplier event changes state once.'],
  ['out-of-order-event', 'Out-of-order event', 'An early event cannot skip a prerequisite.'],
  ['stale-revision', 'Stale revision', 'A stale writer cannot overwrite a later decision.'],
  ['wrong-asset-custody', 'Wrong asset custody', 'Custody proof for another asset is rejected.'],
  ['absent-condition', 'Absent condition proof', 'Collection needs valid condition evidence.'],
  ['conflicting-condition', 'Conflicting condition', 'Conflicting evidence cannot manufacture a clean condition.'],
  ['wipe-missing', 'Missing wipe attestation', 'An unwiped device cannot become ready to redeploy.'],
  ['wipe-before-receipt', 'Wipe before receipt', 'An attestation cannot precede verified receipt.'],
  ['quarantine-block', 'Quarantine blocks redeploy', 'Condition issues require an explicit operational decision.'],
  ['notification-duplicate', 'Notification dedupe', 'An identical meaningful event creates one synthetic message.'],
  ['person-cap', 'Per-person message cap', 'Employee messages cannot exceed the session limit.'],
  ['cooldown', 'Message cooldown', 'Closely spaced updates do not create repeated messages.'],
  ['sla-boundary', 'SLA deadline boundary', 'Time remaining and ownership explain risk exactly at the boundary.'],
  ['idle-decision', 'Idle asset decision', 'A returned idle asset has a rationale, owner, and visible age.'],
  ['happy-path', 'Complete return', 'Every prerequisite supports the complete sequence to redeploy-ready.'],
  ['persistence-reload', 'Persistence / reload', 'Reload retains custody, reservations, audit, and command dedupe.'],
];

export function executeScenario(catalogEntry, implementation) {
  const [id, name, description] = catalogEntry;
  const assertions = [];
  const check = (label, expected, actual) => assertions.push({
    name: label, expected, actual,
    pass: JSON.stringify(expected) === JSON.stringify(actual),
  });
  let error;
  try { implementation(check); }
  catch (cause) {
    error = String(cause.message || cause);
    check('Scenario executes without an unexpected exception', 'no unexpected exception', error);
  }
  if (!assertions.length) check('Scenario performs an invariant assertion', true, false);
  return {id, name, description, assertions, pass: assertions.every(a => a.pass), ...(error ? {error} : {})};
}


export function runScenarios(overrides = {}) {
  const api = { ...domain, ...overrides };
  const cases = {};
  function context(check) {
    let state = api.seed();
    let counter = 0;
    const command = (type, fields = {}, options = {}) => ({
      id: `SCENARIO-${++counter}`, type, expectedRevision: state.revision,
      ...(type === 'advanceClock' ? {} : { returnId: 'R-1001' }), ...fields, ...options,
    });
    const dispatch = cmd => {
      const output = api.execute(state, cmd);
      state = output.state;
      return output.result;
    };
    const act = (type, fields = {}, options = {}) => dispatch(command(type, fields, options));
    const reject = (name, code, action) => {
      const before = JSON.stringify(state);
      let actual = 'accepted';
      try { action(); } catch (error) { actual = error.code || error.message; }
      check(name, code, actual);
      check(`${name}: rejection preserves state`, 'unchanged', before === JSON.stringify(state) ? 'unchanged' : 'changed');
    };
    const record = (id = 'R-1001') => state.returns.find(r => r.id === id);
    const slot = (id = 'SLOT-LON-1') => state.slots.find(s => s.id === id);
    const derived = (id = 'R-1001') => api.derive(state).returns.find(r => r.id === id);
    const book = (fields = {}) => act('book', {slotId: 'SLOT-LON-1', ...fields});
    const confirmed = () => { book(); act('confirm'); };
    const collected = () => {
      confirmed();
      act('collect', {custodyId: 'PICKUP-1', conditionIds: ['PICKUP-CONDITION-1']});
    };
    const received = (conditionIds = ['CONDITION-1']) => {
      collected(); act('receive', {custodyId: 'RECEIPT-1', conditionIds});
    };
    const ready = () => { received(); act('wipe', {evidenceId: 'WIPE-1'}); act('markReady'); };
    return {get state() {return state;}, set state(value) {state = value;}, check, command, dispatch, act, reject, record, slot, derived, book, confirmed, collected, received, ready};
  }
  cases['no-capacity'] = c => {
    c.reject('Full slot rejects booking', 'NO_CAPACITY', () => c.book({slotId:'SLOT-FULL'}));
    c.check('Full slot remains at zero reservations', 0, c.slot('SLOT-FULL').reserved);
    c.check('Return remains requested', 'requested', c.record().status);
  };
  cases['last-slot-race'] = c => {
    const first = c.command('book', {slotId:'SLOT-LON-1'});
    const competitor = c.command('book', {returnId:'R-1002',slotId:'SLOT-LON-1'});
    c.dispatch(first);
    c.reject('Competing stale writer is rejected', 'STALE_REVISION', () => c.dispatch(competitor));
    c.reject('Retry sees final slot occupied', 'NO_CAPACITY', () => c.book({returnId:'R-1002'}));
    c.check('Final slot reserved once', 1, c.slot().reserved);
    c.check('Competing return remains requested', 'requested', c.record('R-1002').status);
  };
  cases['duplicate-booking'] = c => {
    const cmd = c.command('book',{slotId:'SLOT-LON-1'});
    c.dispatch(cmd);
    const revision = c.state.revision;
    const audit = c.state.audit.length;
    c.dispatch(cmd);
    c.check('Replay retains original revision', revision, c.state.revision);
    c.check('Replay adds no audit mutation', audit, c.state.audit.length);
    c.check('Replay retains one reservation', 1, c.slot().reserved);
    c.reject('Reused key with changed payload rejects', 'IDEMPOTENCY_CONFLICT', () => c.dispatch({...cmd,slotId:'SLOT-LON-2'}));
  };
  cases['cancel-twice'] = c => {
    c.book(); c.act('cancel'); c.act('cancel');
    c.check('Capacity released exactly once', 0, c.slot().reserved);
    c.check('Return requested after repeat cancellation', 'requested', c.record().status);
    c.check('Capacity never becomes negative', true, c.state.slots.every(s=>s.reserved >= 0));
  };
  cases['rebook-capacity'] = c => {
    c.book(); c.book({slotId:'SLOT-LON-2'});
    c.check('Original slot released', 0, c.slot().reserved);
    c.check('Replacement slot reserved', 1, c.slot('SLOT-LON-2').reserved);
    c.reject('Failed move preserves reservation', 'NO_CAPACITY', () => c.book({slotId:'SLOT-FULL'}));
    c.check('Failed move retains previous slot', 'SLOT-LON-2', c.record().booking.slotId);
  };
  cases['missed-pickup'] = c => {
    c.confirmed(); c.act('advanceClock',{minutes:60}); c.act('missedPickup');
    c.check('Missed pickup remains confirmed', 'confirmed', c.record().status);
    c.check('Supplier owns the missed-pickup exception', `Synthetic supplier ${c.record().booking.supplierId}`, c.record().exception.owner);
    c.check('Supplier exception has next action and deadline', true, Boolean(c.record().exception.nextAction && c.record().exception.deadline));
    c.check('Missed reservation released', 0, c.slot().reserved);
    c.check('Employee messages remain bounded', true, c.state.outbox.filter(m=>m.personId===c.record().personId).length <= 2);
    c.check('Every queued message is visibly synthetic and bounded', true, c.state.outbox.every(m=>m.synthetic && m.status==='synthetic-only' && m.message.length<=240));
    c.book({slotId:'SLOT-LON-2'}); c.act('confirm');
    c.act('collect',{custodyId:'PICKUP-1',conditionIds:['PICKUP-CONDITION-1']});
    c.act('receive',{custodyId:'RECEIPT-1',conditionIds:['CONDITION-1']});
    c.act('wipe',{evidenceId:'WIPE-1'}); c.act('markReady');
    c.check('Recovery completes with real prerequisites', 'redeploy-ready', c.record().status);
    c.check('Recovered asset retains missed-event history', 1, c.record().missedEvents);
  };
  cases['duplicate-event'] = c => {
    c.book();
    c.act('ingestEvent',{eventId:'SYN-EVT-CONFIRM-1',eventType:'confirm'});
    const revision = c.state.revision;
    const audit = c.state.audit.length;
    c.act('ingestEvent',{eventId:'SYN-EVT-CONFIRM-1',eventType:'confirm'});
    c.check('Duplicate event preserves revision', revision, c.state.revision);
    c.check('Duplicate event preserves audit', audit, c.state.audit.length);
    c.check('Event applied once', 'confirmed', c.record().status);
  };
  cases['out-of-order-event'] = c => {
    c.reject('Receipt before collection rejects', 'INVALID_STATE', () => c.act('ingestEvent',{eventId:'SYN-EVT-RECEIVE-1',eventType:'receive',custodyId:'RECEIPT-1',conditionIds:['CONDITION-1']}));
    c.check('No skipped stage', 'requested', c.record().status);
  };
  cases['stale-revision'] = c => {
    const stale = c.command('book',{slotId:'SLOT-LON-2'});
    c.book();
    c.reject('Stale revision cannot overwrite booking', 'STALE_REVISION', () => c.dispatch(stale));
    c.check('Successful writer retains reservation', 'SLOT-LON-1', c.record().booking.slotId);
  };
  cases['wrong-asset-custody'] = c => {
    c.confirmed();
    c.reject('Another asset cannot satisfy pickup custody', 'CUSTODY_MISMATCH', () => c.act('collect',{custodyId:'PICKUP-2',conditionIds:['PICKUP-CONDITION-1']}));
    c.check('Status stays confirmed', 'confirmed', c.record().status);
    c.act('collect',{custodyId:'PICKUP-1',conditionIds:['PICKUP-CONDITION-1']});
    c.reject('Receipt must continue the pickup custody chain', 'CUSTODY_MISMATCH', () => c.act('receive',{custodyId:'BROKEN-CHAIN-RECEIPT',conditionIds:['CONDITION-1']}));
    c.check('Broken chain keeps asset collected', 'collected', c.record().status);
  };
  cases['absent-condition'] = c => {
    c.confirmed();
    c.reject('Pickup without condition proof rejects', 'CONDITION_REQUIRED', () => c.act('collect',{custodyId:'PICKUP-1',conditionIds:[]}));
    c.act('collect',{custodyId:'PICKUP-1',conditionIds:['PICKUP-CONDITION-1']});
    c.reject('Receipt without condition proof rejects', 'CONDITION_REQUIRED', () => c.act('receive',{custodyId:'RECEIPT-1',conditionIds:[]}));
    c.check('Missing warehouse proof keeps collected status', 'collected', c.record().status);
    c.reject('Pickup proof cannot also attest warehouse condition', 'INVALID_EVIDENCE', () => c.act('receive',{custodyId:'RECEIPT-1',conditionIds:['PICKUP-CONDITION-1']}));
    c.reject('Condition IDs must be distinct', 'INVALID_EVIDENCE', () => c.act('receive',{custodyId:'RECEIPT-1',conditionIds:['CONDITION-1','CONDITION-1']}));
  };
  cases['conflicting-condition'] = c => {
    c.received(['CONDITION-1','DAMAGE-1']);
    c.check('Conflicting evidence blocks condition gate', false, c.derived().gates.condition);
    c.reject('Conflict blocks wipe', 'CONDITION_BLOCKED', () => c.act('wipe',{evidenceId:'WIPE-1'}));
    c.check('Condition conflict routes explicit support', true, Boolean(c.derived().owner));
  };
  cases['wipe-missing'] = c => {
    c.received();
    c.reject('Missing wipe blocks readiness', 'WIPE_REQUIRED', () => c.act('markReady'));
    c.check('No attestation manufactured', false, Boolean(c.record().wipe));
    c.check('Wipe gate remains false', false, c.derived().gates.wipe);
  };
  cases['wipe-before-receipt'] = c => {
    c.collected();
    c.reject('Wipe before verified receipt rejects', 'INVALID_STATE', () => c.act('wipe',{evidenceId:'WIPE-1'}));
    c.check('Return stays collected', 'collected', c.record().status);
    c.check('Pickup proof alone cannot clear warehouse condition gate', false, c.derived().gates.condition);
  };
  cases['quarantine-block'] = c => {
    c.received(['DAMAGE-1']);
    c.act('resolveCondition',{decision:'quarantine',rationale:'Synthetic screen damage needs a security review.'});
    c.reject('Quarantine blocks wipe', 'CONDITION_BLOCKED', () => c.act('wipe',{evidenceId:'WIPE-1'}));
    c.reject('Quarantine blocks readiness', 'CONDITION_BLOCKED', () => c.act('markReady'));
    c.check('Condition gate stays blocked', false, c.derived().gates.condition);
  };
  cases['notification-duplicate'] = c => {
    c.book(); const count = c.state.outbox.length;
    c.act('notify',{reason:'booked'}); c.act('notify',{reason:'booked'});
    c.check('Meaningful booking appears once', count, c.state.outbox.length);
    c.check('Visible suppression log explains duplicate', true, c.state.notificationLog.some(l=>l.reason==='duplicate'));
    c.check('Outbox keys remain unique', c.state.outbox.length, new Set(c.state.outbox.map(m=>m.dedupeKey)).size);
  };
  cases['person-cap'] = c => {
    c.book(); c.act('advanceClock',{minutes:60}); c.act('cancel'); c.book();
    c.act('advanceClock',{minutes:60}); c.act('cancel'); c.book();
    c.check('Per-person cap enforced', 2, c.state.outbox.filter(m=>m.personId===c.record().personId).length);
    c.check('Cap suppression is visible', true, c.state.notificationLog.some(l=>l.reason==='person-cap'));
  };
  cases['cooldown'] = c => {
    c.confirmed(); c.act('missedPickup');
    c.check('Closely spaced message suppressed', 1, c.state.outbox.length);
    c.check('Cooldown logged visibly', true, c.state.notificationLog.some(l=>l.reason==='cooldown'));
    c.act('advanceClock',{minutes:60}); c.act('notify',{reason:'missedPickup'});
    c.check('Meaningful message allowed at cooldown boundary', 2, c.state.outbox.length);
  };
  cases['sla-boundary'] = c => {
    const initial = c.derived().sla.remainingMinutes;
    c.act('advanceClock',{minutes:initial-1});
    c.check('One minute before deadline is explicit', 1, c.derived().sla.remainingMinutes);
    c.check('Near deadline routes at-risk', 'at-risk', c.derived().sla.risk);
    c.act('advanceClock',{minutes:1});
    c.check('Deadline remaining is exactly zero', 0, c.derived().sla.remainingMinutes);
    c.check('Deadline is overdue at boundary', 'overdue', c.derived().sla.risk);
    c.check('SLA explanation includes owner and reasons', true, Boolean(c.derived().sla.owner && c.derived().sla.reasons.length));
  };
  cases['idle-decision'] = c => {
    c.received();
    c.reject('Idle decision without rationale rejects', 'INVALID_COMMAND', () => c.act('keepIdle',{owner:'Synthetic IT operations',rationale:''}));
    c.act('keepIdle',{owner:'Synthetic IT operations',rationale:'Keep this synthetic device idle until the next training allocation.'});
    c.act('advanceClock',{minutes:90});
    c.check('Idle owner retained', 'Synthetic IT operations', c.record().idle.owner);
    c.check('Idle age follows simulation clock', 90, c.derived().idleAgeMinutes);
    c.check('Keeping idle does not imply redeployment', 'received', c.record().status);
  };
  cases['happy-path'] = c => {
    c.ready();
    c.check('Full sequence completes', 'redeploy-ready', c.record().status);
    c.check('All redeploy prerequisites are verified', {custody:true,condition:true,wipe:true,ready:true}, c.derived().gates);
    c.check('Active reservation ends after collection', 0, c.slot().reserved);
    c.check('Completed collection consumes supplier throughput', 1, c.slot().consumed);
    c.check('Completed collection cannot reopen the serviced final slot', 0, api.derive(c.state).slots.find(s=>s.id==='SLOT-LON-1').available);
    c.check('Audit remains chronological', true, c.state.audit.every((a,i)=>i===0 || a.sequence>c.state.audit[i-1].sequence));
    c.check('Completed SLA is explained', 'complete', c.derived().sla.risk);
  };
  cases['persistence-reload'] = c => {
    const cmd = c.command('book',{slotId:'SLOT-LON-1'}); c.dispatch(cmd);
    const persisted = JSON.stringify(c.state);
    c.state = JSON.parse(persisted);
    c.check('Reload retains complete serializable state', 'identical persisted state', persisted === JSON.stringify(c.state) ? 'identical persisted state' : 'changed persisted state');
    const revision = c.state.revision; c.dispatch(cmd);
    c.check('Reload retains command dedupe', revision, c.state.revision);
    c.check('Reload retains one reservation', 1, c.slot().reserved);
    c.act('confirm'); c.act('collect',{custodyId:'PICKUP-1',conditionIds:['PICKUP-CONDITION-1']});
    c.act('receive',{custodyId:'RECEIPT-1',conditionIds:['CONDITION-1']});
    c.act('wipe',{evidenceId:'WIPE-1'}); c.act('markReady');
    c.state = JSON.parse(JSON.stringify(c.state));
    c.check('Completed return survives another reload', 'redeploy-ready', c.record().status);
    c.check('Custody and wipe gates survive reload', true, c.derived().gates.ready);
  };
  const scenarios = scenarioCatalog.map(entry => executeScenario(entry, check => cases[entry[0]](context(check))));
  return {
    scenarios, total: scenarios.length,
    passed: scenarios.filter(s=>s.pass).length,
    failed: scenarios.filter(s=>!s.pass).length,
    assertionCount: scenarios.reduce((count,s)=>count+s.assertions.length,0),
    clock: '2026-10-13T09:00:00.000Z', timeZone: 'Europe/London',
  };
}
