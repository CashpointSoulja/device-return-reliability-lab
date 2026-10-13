import test from 'node:test';
import assert from 'node:assert/strict';
import {seed,execute} from '../src/domain.js';

test('new slot reservation expires exactly at its end and a failed rebook retains the original slot',()=> {
  let state=seed();let id=0;
  const act=(type,fields={})=> {
    const result=execute(state,{id:`TIME-${++id}`,type,expectedRevision:state.revision,...(type==='advanceClock'?{}:{returnId:'R-1001'}),...fields});
    state=result.state;return result.result;
  };
  act('advanceClock',{minutes:299});
  assert.equal(state.clock.now,'2026-10-13T13:59:00.000Z');
  act('book',{slotId:'SLOT-LON-1'});
  assert.equal(state.slots[0].reserved,1,'One minute before expiry the final slot remains valid');
  act('advanceClock',{minutes:1});
  assert.equal(state.clock.now,'2026-10-13T14:00:00.000Z');
  const unchanged=act('book',{slotId:'SLOT-LON-1'});
  assert.equal(unchanged.unchanged,true,'An existing same-slot reservation remains a harmless no-op');
  assert.equal(state.returns[0].bookingGeneration,1);
  act('book',{slotId:'SLOT-LON-2'});
  const before=JSON.stringify(state);
  assert.throws(()=>act('book',{slotId:'SLOT-LON-1'}),{code:'SLOT_EXPIRED'});
  assert.equal(JSON.stringify(state),before,'Rejected past-window rebook preserves the complete ledger');
  assert.equal(state.returns[0].booking.slotId,'SLOT-LON-2');
  assert.equal(state.slots[0].reserved,0);
  assert.equal(state.slots[1].reserved,1);
});
