import test from 'node:test';
import assert from 'node:assert/strict';
import {Miniflare} from 'miniflare';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';

const origin='https://return-lab.example';
function configuration(directory) {
  return {modules:true,modulesRules:[{type:'ESModule',include:['**/*.js'],fallthrough:true}],scriptPath:resolve('src/worker.js'),compatibilityDate:'2026-08-01',durableObjects:{SESSIONS:{className:'ReturnSession',useSQLite:true}},durableObjectsPersist:directory};
}
async function session(mf,cookie) {
  const response=await mf.dispatchFetch(`${origin}/api/session`,{headers:cookie?{Cookie:cookie}:{}});
  assert.equal(response.status,200);
  const setCookie=response.headers.get('Set-Cookie');
  return {cookie:cookie || setCookie.split(';')[0],setCookie,...await response.json()};
}
async function send(mf,cookie,command,path='/api/command',headers={}) {
  const response=await mf.dispatchFetch(`${origin}${path}`,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,Cookie:cookie,...headers},body:JSON.stringify(command)});
  return {status:response.status,...await response.json()};
}

test('SQLite Durable Object persists one atomic visitor ledger and isolates reset',async()=> {
  const directory=await mkdtemp(join(tmpdir(),'return-lab-sql-'));
  let mf=new Miniflare(configuration(directory));
  try {
    const first=await session(mf);
    const other=await session(mf);
    assert.notEqual(first.cookie,other.cookie);
    assert.match(first.setCookie,/HttpOnly; Secure; SameSite=Strict/);
    assert.equal(first.state.clock.now,'2026-10-13T09:00:00.000Z');
    assert.equal(JSON.stringify(first.state).includes(first.cookie.split('=')[1]),false,'Opaque session credential is never returned in JSON state');
    const commands=[
      {id:'RACE-ONE',type:'book',returnId:'R-1001',slotId:'SLOT-LON-1',expectedRevision:0},
      {id:'RACE-TWO',type:'book',returnId:'R-1002',slotId:'SLOT-LON-1',expectedRevision:0},
    ];
    const raced=await Promise.all(commands.map(command=>send(mf,first.cookie,command)));
    assert.deepEqual(raced.map(r=>r.status).sort(),[200,409]);
    assert.equal(raced.find(r=>r.status===409).error.code,'STALE_REVISION');
    const winner=commands[raced.findIndex(r=>r.status===200)];
    let persisted=await session(mf,first.cookie);
    assert.equal(persisted.state.slots.find(s=>s.id==='SLOT-LON-1').reserved,1);
    assert.equal(persisted.state.audit.length,1);
    const loser=commands.find(c=>c!==winner);
    const retry=await send(mf,first.cookie,{...loser,expectedRevision:1});
    assert.equal(retry.status,422);assert.equal(retry.error.code,'NO_CAPACITY');
    const duplicate=await send(mf,first.cookie,winner);
    assert.equal(duplicate.status,200);assert.equal(duplicate.result.duplicateCommand,true);assert.equal(duplicate.state.revision,1);
    const otherState=await session(mf,other.cookie);
    assert.equal(otherState.state.revision,0);
    assert.equal(otherState.state.slots[0].reserved,0);
    // Restart the local Worker/DO runtime against the same real SQLite storage.
    await mf.dispose();mf=new Miniflare(configuration(directory));
    persisted=await session(mf,first.cookie);
    assert.equal(persisted.state.revision,1);
    assert.equal(persisted.state.slots[0].reserved,1);
    assert.equal((await send(mf,first.cookie,winner)).result.duplicateCommand,true);
    const ownReset=await send(mf,other.cookie,{},'/api/reset');
    assert.equal(ownReset.result.scope,'current-visitor-session');
    assert.equal((await session(mf,first.cookie)).state.revision,1,'Reset does not mutate another visitor');
    const cancel=await send(mf,first.cookie,{id:'CANCEL-ONE',type:'cancel',returnId:winner.returnId,expectedRevision:1});
    assert.equal(cancel.state.slots[0].reserved,0);
    const twice=await send(mf,first.cookie,{id:'CANCEL-TWO',type:'cancel',returnId:winner.returnId,expectedRevision:2});
    assert.equal(twice.state.slots[0].reserved,0);
    assert.deepEqual(twice.state.audit[0],persisted.state.audit[0],'Old immutable audit survives later mutations');
    const reset=await send(mf,first.cookie,{},'/api/reset');
    assert.equal(reset.state.revision,0);assert.equal(reset.state.audit.length,0);
    let revision=0;
    const recovery=[
      {type:'book',slotId:'SLOT-LON-1'},
      {type:'confirm'},
      {type:'ingestEvent',eventId:'SYN-EVT-MISSED-API',eventType:'missedPickup'},
      {type:'book',slotId:'SLOT-LON-2'},
      {type:'confirm'},
      {type:'collect',custodyId:'PICKUP-1',conditionIds:['PICKUP-CONDITION-1']},
      {type:'receive',custodyId:'RECEIPT-1',conditionIds:['CONDITION-1']},
      {type:'wipe',evidenceId:'WIPE-1'},
      {type:'markReady'},
    ];
    for (const [index,command] of recovery.entries()) {
      const step=await send(mf,first.cookie,{id:`RECOVERY-${index}`,returnId:'R-1001',expectedRevision:revision,...command});
      assert.equal(step.status,200,`${command.type} passes server validation`);revision=step.state.revision;
    }
    await mf.dispose();mf=new Miniflare(configuration(directory));
    const recovered=await session(mf,first.cookie);
    assert.equal(recovered.state.returns[0].status,'redeploy-ready');
    assert.equal(recovered.state.returns[0].missedEvents,1);
    assert.deepEqual(recovered.derived.returns[0].gates,{custody:true,condition:true,wipe:true,ready:true});
    assert.equal(recovered.state.slots[1].consumed,1);
    assert.equal(recovered.state.outbox.length,1,'Recovery preserves cooldown suppression rather than manufacturing sends');
  } finally {await mf.dispose();await rm(directory,{recursive:true,force:true});}
});

test('public API rejects unscoped writes, forged proof, cross-origin and uploads',async()=> {
  const directory=await mkdtemp(join(tmpdir(),'return-lab-security-'));
  const mf=new Miniflare(configuration(directory));
  try {
    const current=await session(mf);
    let response=await send(mf,'',{id:'NO-SESSION',type:'book',returnId:'R-1001',slotId:'SLOT-LON-1',expectedRevision:0});
    assert.equal(response.status,401);assert.equal(response.error.code,'SESSION_REQUIRED');
    response=await send(mf,current.cookie,{},'/api/reset',{Origin:'https://foreign.example'});
    assert.equal(response.status,403);assert.equal(response.error.code,'ORIGIN_REJECTED');
    const upload=await mf.dispatchFetch(`${origin}/api/command`,{method:'POST',headers:{Origin:origin,Cookie:current.cookie,'Content-Type':'multipart/form-data'},body:'real-personal-upload'});
    assert.equal(upload.status,400);assert.equal((await upload.json()).error.code,'CONTENT_TYPE');
    response=await send(mf,current.cookie,{id:'BOOK',type:'book',returnId:'R-1001',slotId:'SLOT-LON-1',expectedRevision:0});
    assert.equal(response.status,200);
    response=await send(mf,current.cookie,{id:'CONFIRM',type:'confirm',returnId:'R-1001',expectedRevision:1});
    assert.equal(response.status,200);
    response=await send(mf,current.cookie,{id:'FORGED',type:'collect',returnId:'R-1001',custodyId:'REAL-ASSET',conditionIds:['PICKUP-CONDITION-1'],expectedRevision:2});
    assert.equal(response.status,422);assert.equal(response.error.code,'INVALID_EVIDENCE');
    assert.equal(response.state.revision,2);
    assert.equal(response.state.returns[0].status,'confirmed');
    response=await send(mf,current.cookie,{id:'UNKNOWN-FIELD',type:'cancel',returnId:'R-1001',expectedRevision:2,email:'someone@example.invalid'});
    assert.equal(response.status,422);assert.equal(response.error.code,'INVALID_COMMAND');
    response=await send(mf,current.cookie,{x:'x'.repeat(9000)},'/api/command');
    assert.equal(response.status,413);assert.equal(response.error.code,'BODY_TOO_LARGE');
    response=await send(mf,current.cookie,{allSessions:true},'/api/reset');
    assert.equal(response.status,422);assert.equal(response.error.code,'INVALID_COMMAND');
    assert.equal((await session(mf,current.cookie)).state.revision,2);
  } finally {await mf.dispose();await rm(directory,{recursive:true,force:true});}
});
