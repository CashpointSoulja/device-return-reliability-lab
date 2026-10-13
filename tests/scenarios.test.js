import test from 'node:test';
import assert from 'node:assert/strict';
import * as domain from '../src/domain.js';
import {runScenarios, scenarioCatalog} from '../src/scenarios.js';

const report = runScenarios();
for (const scenario of report.scenarios) {
  test(`executable invariant: ${scenario.name}`, () => {
    assert.ok(scenario.assertions.length > 0, 'Every scenario must execute assertions');
    for (const assertion of scenario.assertions) {
      assert.equal(assertion.pass, true,
        `${assertion.name}: expected ${JSON.stringify(assertion.expected)}, actual ${JSON.stringify(assertion.actual)}`);
    }
    assert.equal(scenario.pass, true);
  });
}

test('all twenty requested failure scenarios plus happy path and reload are executed', () => {
  assert.equal(scenarioCatalog.length, 22);
  assert.equal(report.total, 22);
  assert.equal(report.passed, 22);
  assert.equal(report.failed, 0);
  assert.ok(report.assertionCount >= 60);
});

test('fresh seeds and fixed simulation clock yield identical reports', () => {
  assert.deepEqual(runScenarios(), report);
  assert.equal(report.clock, domain.seed().clock.now);
  assert.equal(report.timeZone, 'Europe/London');
});

test('the visible runner reports failed assertions when a capacity rule is broken', () => {
  const faultyReport = runScenarios({
    execute(state, command) {
      if (command.type === 'book' && command.slotId === 'SLOT-FULL') {
        return {state:structuredClone(state),result:{accepted:true}};
      }
      return domain.execute(state,command);
    },
  });
  const failedCase = faultyReport.scenarios.find(s=>s.id==='no-capacity');
  assert.equal(failedCase.pass, false);
  assert.ok(faultyReport.failed > 0);
  assert.equal(failedCase.assertions[0].expected, 'NO_CAPACITY');
  assert.equal(failedCase.assertions[0].actual, 'accepted');
  assert.equal(failedCase.assertions[0].pass, false);
});

test('unexpected runner exceptions appear as inspectable failures', () => {
  const faultyReport = runScenarios({seed() {throw new Error('Synthetic injected seed failure');}});
  assert.equal(faultyReport.failed, 22);
  assert.equal(faultyReport.scenarios[0].error, 'Synthetic injected seed failure');
  assert.equal(faultyReport.scenarios[0].assertions[0].pass, false);
});

test('commands append audit history without mutating previous state or events', () => {
  const initial = domain.seed();
  const initialSnapshot = JSON.stringify(initial);
  const booked = domain.execute(initial, {
    id:'IMMUTABLE-BOOK',type:'book',returnId:'R-1001',slotId:'SLOT-LON-1',expectedRevision:0,
  }).state;
  const bookedSnapshot = JSON.stringify(booked);
  const priorAudit = structuredClone(booked.audit);
  const confirmed = domain.execute(booked, {
    id:'IMMUTABLE-CONFIRM',type:'confirm',returnId:'R-1001',expectedRevision:booked.revision,
  }).state;
  assert.equal(JSON.stringify(initial), initialSnapshot);
  assert.equal(JSON.stringify(booked), bookedSnapshot);
  assert.deepEqual(confirmed.audit.slice(0,priorAudit.length), priorAudit);
  assert.equal(confirmed.audit.length, priorAudit.length+1);
});

test('the shared notification rule enforces the global cap across distinct synthetic people', () => {
  const state = domain.seed();
  for (let n=1;n<=9;n++) {
    const syntheticRecord = {
      ...structuredClone(state.returns[0]),id:`SYN-RETURN-GLOBAL-${n}`,
      personId:`SYN-PER-GLOBAL-${n}`,personName:`Synthetic global-cap person ${n}`,
      status:'booked',bookingGeneration:1,
    };
    const result = domain.notificationAttempt(state,syntheticRecord,'booked');
    assert.equal(result.queued,n<=domain.LIMITS.global);
    assert.equal(result.reason,n<=domain.LIMITS.global?'queued':'global-cap');
  }
  assert.equal(state.outbox.length,8);
  assert.equal(state.notificationLog.at(-1).reason,'global-cap');
});

test('a new command for the same active slot is not a meaningful notification change', () => {
  let state = domain.seed();
  const act = (id,type,fields={}) => {
    state=domain.execute(state,{id,type,expectedRevision:state.revision,...(type==='advanceClock'?{}:{returnId:'R-1001'}),...fields}).state;
  };
  act('SAME-BOOK','book',{slotId:'SLOT-LON-1'});
  act('SAME-CLOCK','advanceClock',{minutes:60});
  const generation=state.returns[0].bookingGeneration;
  const messageCount=state.outbox.length;
  act('SAME-BOOK-NEW-KEY','book',{slotId:'SLOT-LON-1'});
  assert.equal(state.returns[0].bookingGeneration,generation);
  assert.equal(state.outbox.length,messageCount);
  assert.equal(state.slots[0].reserved,1);
});

function returnDriver(prefix) {
  let state=domain.seed();
  let sequence=0;
  const command=(type,fields={})=>({
    id:`${prefix}-${++sequence}`,type,expectedRevision:state.revision,
    ...(type==='advanceClock'?{}:{returnId:'R-1001'}),...fields,
  });
  const dispatch=cmd=>{const output=domain.execute(state,cmd);state=output.state;return output;};
  const act=(type,fields={})=>dispatch(command(type,fields));
  const collect=(conditionIds=['PICKUP-CONDITION-1'])=>{
    act('book',{slotId:'SLOT-LON-1'});act('confirm');
    return act('collect',{custodyId:'PICKUP-1',conditionIds});
  };
  const receive=(pickup=['PICKUP-CONDITION-1'],warehouse=['CONDITION-1'])=>{
    collect(pickup);act('receive',{custodyId:'RECEIPT-1',conditionIds:warehouse});
  };
  return {get state(){return state;},command,dispatch,act,collect,receive};
}

test('collection consumes final-slot throughput and cancellation cannot reopen serviced capacity', () => {
  const d=returnDriver('CONSUMED');
  d.act('book',{slotId:'SLOT-LON-1'});d.act('confirm');
  const collection=d.command('collect',{custodyId:'PICKUP-1',conditionIds:['PICKUP-CONDITION-1']});
  d.dispatch(collection);
  assert.equal(d.state.slots[0].reserved,0);
  assert.equal(d.state.slots[0].consumed,1);
  assert.equal(domain.derive(d.state).slots[0].available,0);
  assert.equal(d.state.returns[0].booking.consumed,true);
  const before=JSON.stringify(d.state);
  assert.throws(()=>d.act('book',{returnId:'R-1002',slotId:'SLOT-LON-1'}),{code:'NO_CAPACITY'});
  assert.throws(()=>d.act('cancel'),{code:'INVALID_STATE'});
  assert.equal(JSON.stringify(d.state),before);
  d.dispatch(collection);
  assert.equal(d.state.slots[0].consumed,1,'Retry cannot consume throughput twice');
  assert.equal(domain.derive(d.state).slots[0].available,0);
});

test('a missed pickup releases active capacity once and recovery consumes only its replacement slot', () => {
  const d=returnDriver('MISSED-CAPACITY');
  d.act('book',{slotId:'SLOT-LON-1'});d.act('confirm');
  const missed=d.command('ingestEvent',{eventId:'SYN-EVT-MISSED-CAPACITY',eventType:'missedPickup'});
  d.dispatch(missed);
  d.act('ingestEvent',{eventId:'SYN-EVT-MISSED-CAPACITY',eventType:'missedPickup'});
  assert.equal(d.state.slots[0].reserved,0);
  assert.equal(d.state.slots[0].consumed,0);
  assert.equal(domain.derive(d.state).slots[0].available,1);
  d.act('book',{slotId:'SLOT-LON-2'});d.act('confirm');
  d.act('collect',{custodyId:'PICKUP-1',conditionIds:['PICKUP-CONDITION-1']});
  assert.equal(d.state.slots[0].consumed,0);
  assert.equal(d.state.slots[1].reserved,0);
  assert.equal(d.state.slots[1].consumed,1);
  assert.equal(domain.derive(d.state).slots[1].available,1);
  assert.equal(d.state.returns[0].missedEvents,1);
});

test('documented damage requires repair routing and a synthetic repair attestation before readiness', () => {
  const d=returnDriver('REPAIR');
  d.receive(['PICKUP-DAMAGE-1'],['DAMAGE-1']);
  assert.equal(d.state.returns[0].condition.status,'repair-needed');
  assert.throws(()=>d.act('wipe',{evidenceId:'WIPE-1'}),{code:'CONDITION_BLOCKED'});
  assert.throws(()=>d.act('repairComplete',{evidenceId:'REPAIR-1'}),{code:'CONDITION_BLOCKED'});
  d.act('resolveCondition',{decision:'repair',rationale:'Synthetic damage needs a documented depot repair.'});
  d.act('repairComplete',{evidenceId:'REPAIR-1'});
  assert.equal(d.state.returns[0].condition.status,'repaired');
  d.act('wipe',{evidenceId:'WIPE-1'});d.act('markReady');
  assert.equal(d.state.returns[0].status,'redeploy-ready');
  assert.equal(domain.derive(d.state).returns[0].gates.ready,true);
});

test('quarantine can recover only through an explicit repair decision and valid repair proof', () => {
  const d=returnDriver('QUARANTINE-RECOVERY');
  d.receive(['PICKUP-DAMAGE-1'],['DAMAGE-1']);
  d.act('resolveCondition',{decision:'quarantine',rationale:'Synthetic security review requires quarantine pending repair.'});
  assert.throws(()=>d.act('resolveCondition',{decision:'release',rationale:'Trying to bypass the documented quarantine issue.'}),{code:'CONDITION_BLOCKED'});
  assert.throws(()=>d.act('markReady'),{code:'CONDITION_BLOCKED'});
  d.act('resolveCondition',{decision:'repair',rationale:'Security review authorizes a documented synthetic depot repair.'});
  assert.throws(()=>d.act('repairComplete',{evidenceId:'REPAIR-2'}),{code:'INVALID_EVIDENCE'});
  d.act('repairComplete',{evidenceId:'REPAIR-1'});
  d.act('wipe',{evidenceId:'WIPE-1'});d.act('markReady');
  assert.equal(d.state.returns[0].status,'redeploy-ready');
  assert.equal(d.state.returns[0].condition.repair.synthetic,true);
});

test('another asset or a condition label cannot manufacture a wipe attestation', () => {
  const d=returnDriver('WIPE-PROOF');d.receive();
  const before=JSON.stringify(d.state);
  for (const evidenceId of ['WIPE-2','CONDITION-1','REAL-UPLOADED-WIPE']) {
    assert.throws(()=>d.act('wipe',{evidenceId}),{code:'INVALID_EVIDENCE'});
    assert.equal(JSON.stringify(d.state),before);
  }
  assert.equal(d.state.returns[0].wipe,null);
  assert.equal(domain.derive(d.state).returns[0].gates.wipe,false);
  d.act('wipe',{evidenceId:'WIPE-1'});
  assert.equal(d.state.returns[0].wipe.synthetic,true);
});
