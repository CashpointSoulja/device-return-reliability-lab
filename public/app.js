// Ayo Ahmed - Independent concept. All session records are synthetic.
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const stageNames = ['requested','booked','confirmed','collected','received','wiped','redeploy-ready'];
const pretty = value => String(value ?? '').replaceAll('-',' ');
const json = value => JSON.stringify(value, null, 2);
let session, activeId='R-1001', activeTab='flow', busy=false, dialogAction=null, scenarioRun=null, lastFocus=null;
const dialog=$('#action-dialog');
function date(value, detailed=false) {
  if (!value) return 'Not recorded';
  return new Intl.DateTimeFormat('en-GB',{timeZone:session?.state.clock.timeZone || 'Europe/London',day:'numeric',month:'short',...(detailed ? {year:'numeric'} : {}),hour:'2-digit',minute:'2-digit',timeZoneName:'short'}).format(new Date(value));
}
function current() {return session.state.returns.find(record=>record.id===activeId);}
function calculated() {return session.derived.returns.find(record=>record.id===activeId);}
function message(text,error=false) {const target=$('#global-message');target.textContent=text;target.classList.toggle('error',error);target.hidden=false;}
function commandButton(action,label,secondary=false,extra='') {return `<button class="pill${secondary?' secondary':''}" data-action="${esc(action)}" ${extra}>${esc(label)} <span aria-hidden="true">${secondary?'':'→'}</span></button>`;}
function compactButton(action,label) {return `<button class="text-button" data-action="${esc(action)}">${esc(label)}</button>`;}
async function request(path,body) {
  const response=await fetch(path,{method:body === undefined?'GET':'POST',headers:body === undefined?{}:{'Content-Type':'application/json'},...(body === undefined?{}:{body:JSON.stringify(body)}),credentials:'same-origin'});
  const payload=await response.json();
  if (payload.state && payload.derived) session={state:payload.state,derived:payload.derived};
  if (!response.ok) {const error=new Error(payload.error?.message || `Request failed (${response.status}).`);error.code=payload.error?.code || 'HTTP_ERROR';throw error;}
  return payload;
}
function setBusy(value) {busy=value;document.querySelectorAll('button').forEach(button=>button.disabled=value);}
async function send(type,fields={}) {
  if (busy) return false;
  setBusy(true);
  try {
    const payload=await request('/api/command',{id:`CMD-${crypto.randomUUID()}`,type,expectedRevision:session.state.revision,...(type==='advanceClock'?{}:{returnId:activeId}),...fields});
    render();
    const notification=payload.result?.notification;
    let text=payload.result?.duplicateEvent ? 'Duplicate supplier event ignored. No extra transition or message was created.' : `${pretty(type)} accepted. Revision ${session.state.revision}.`;
    if (notification) text+=notification.queued?' One synthetic outbox message queued; nothing was sent.':` Employee message suppressed: ${notification.reason}.`;
    message(text);return true;
  } catch(error) {
    if (session) render();
    const text=`${error.code || 'REQUEST_FAILED'}: ${error.message}`;
    if (dialog.open) {$('#dialog-error').textContent=text;$('#dialog-error').hidden=false;} else message(text,true);
    return false;
  } finally {setBusy(false);}
}
function render() {
  const {state,derived}=session;
  const record=current(), computed=calculated();
  $('#loading').hidden=true;$('#session-app').hidden=false;
  $('#clock-time').textContent=date(state.clock.now,true);
  $('#clock-iso').textContent=`${state.clock.now} · ${state.clock.timeZone}`;
  $('#clock-revision').textContent=`Revision ${state.revision}`;
  $('#return-picker').innerHTML=state.returns.map(r=>`<button class="return-card${r.id===activeId?' active':''}" data-return="${r.id}" aria-pressed="${r.id===activeId}"><span class="card-id">${esc(r.id)} · ${esc(r.assetId)}</span><strong>${esc(r.personName)}</strong><span class="tag">${esc(r.exception?'supplier exception':pretty(r.status))}</span></button>`).join('');
  $('#active-title').textContent=`${record.id} · ${record.device || 'Synthetic laptop'}`;
  $('#active-meta').textContent=`${record.assetId} / ${record.personId} · synthetic records · due ${date(record.dueAt)}`;
  $('#outbox-count').textContent=state.outbox.length;
  const index=stageNames.indexOf(record.status);
  $('#journey').innerHTML=stageNames.map((stage,i)=>`<div class="stage${i<index?' complete':i===index?' current':''}" ${i===index?'aria-current="step"':''}><div class="stage-top"><span class="stage-circle">${i<index?'✓':i+1}</span></div><span class="stage-name">${esc(pretty(stage))}</span><span class="stage-note">${i<index?'verified':i===index?'current':'prerequisites apply'}</span></div>`).join('');
  renderAction(record,computed);renderGates(record,computed);renderSla(record,computed);renderCapacity(derived.slots);renderIdle(record,computed);renderOutbox();renderAudit();selectTab(activeTab,false);
}
function renderAction(record,computed) {
  const titles={requested:'Reserve a real simulated slot.',booked:'Confirm the collection window.',confirmed:record.exception?'The supplier missed. Own the recovery.':'Prove the pickup handover.',collected:'Keep the custody chain intact.',received:'Resolve condition. Attest the wipe.',wiped:'Check every readiness prerequisite.','redeploy-ready':'Ready is a verified state.'};
  const descriptions={requested:'Choose from supplier capacity below. An unavailable slot is rejected on the server, and competing bookings cannot take the same final place.',booked:'A reservation holds capacity. Confirm it, change the slot, or cancel; each release happens exactly once.',confirmed:record.exception?'A missed pickup is a supplier-owned exception. Rebook a replacement before continuing; the employee is not blamed.':'Collection requires a synthetic pickup custody identifier and distinct pickup condition proof. Evidence is selected consciously, never attached automatically.',collected:'Warehouse receipt requires a different custody identifier in the same chain and separate condition evidence. Wrong-asset and mismatched-chain samples are rejected.',received:'Synthetic wipe attestation is blocked until custody is continuous and condition is clear or explicitly repaired. Quarantine stays blocked.',wiped:'The server checks custody, distinct condition proof and synthetic wipe attestation before marking this device ready for another use.','redeploy-ready':'This asset passed the custody, condition and synthetic wipe gates. Ready does not mean allocated: choose an explicit idle decision when there is no next use.'};
  let actions='',secondary='';
  if (record.status==='requested') actions=commandButton('open-book','Choose collection slot');
  if (record.status==='booked') {actions=commandButton('confirm','Confirm collection');secondary=compactButton('open-book','Change collection slot')+compactButton('cancel','Cancel reservation')+compactButton('notify','Retry employee notice');}
  if (record.status==='confirmed') {
    if (record.exception) {actions=commandButton('open-book','Reserve recovery slot');secondary=compactButton('replay-event','Replay supplier event')+compactButton('notify','Retry employee notice');}
    else {actions=commandButton('collect','Record synthetic pickup');secondary=compactButton('missedPickup','Simulate supplier missed pickup')+compactButton('open-book','Change collection slot')+compactButton('cancel','Cancel reservation');}
  }
  if (record.status==='collected') actions=commandButton('receive','Record warehouse receipt');
  if (record.status==='received') {
    actions=commandButton('wipe',computed.gates.condition?'Add synthetic wipe attestation':'Inspect blocked wipe gate');
    if (!computed.gates.condition || ['repair','quarantine'].includes(record.condition.decision)) secondary+=compactButton('resolveCondition','Route condition decision');
    if (record.condition.decision==='repair') secondary+=compactButton('repairComplete','Attest synthetic repair');
    secondary+=compactButton('markReady','Check readiness prerequisites')+compactButton('keepIdle','Keep asset idle with a reason');
  }
  if (record.status==='wiped') {actions=commandButton('markReady','Verify redeploy readiness');secondary=compactButton('keepIdle','Keep asset idle with a reason');}
  if (record.status==='redeploy-ready') actions=commandButton('keepIdle',record.idle?'Review idle decision':'Record an idle decision',true);
  const exception=record.exception ? `<div class="exception" id="supplier-exception"><strong>Supplier-owned missed pickup</strong><p>${esc(record.exception.nextAction)}</p><p>Owner: ${esc(record.exception.owner)}<br>Recovery deadline: ${esc(date(record.exception.deadline))}</p><p>No employee action is needed until a replacement window is proposed.</p></div>` : '';
  $('#action-panel').innerHTML=`<div class="action-header"><div><span class="eyebrow">NEXT ACTION · ONE RETURN</span><h3>${titles[record.status]}</h3></div><span class="tag status-tag${record.exception?' attention':record.status==='redeploy-ready'?' finished':''}">${esc(record.exception?'supplier exception':pretty(record.status))}</span></div><p>${descriptions[record.status]}</p><div class="ownership"><span>Owner: ${esc(computed.owner)}</span>${record.booking?`<span>Booking generation ${record.bookingGeneration} · ${record.booking.active?'capacity reserved':'reservation released'}</span>`:''}</div>${exception}<div class="actions">${actions}</div><div class="secondary-actions">${secondary}</div>`;
}
function renderGates(record,computed) {
  const gates=[['custody','Continuous custody','Pickup + warehouse receipt, with distinct condition proof.'],['condition','Condition cleared','Conflicts and damage require an explicit decision.'],['wipe','Synthetic wipe','An allowlisted attestation. No actual device wipe.']];
  $('#gates-panel').innerHTML=`<span class="eyebrow">READINESS IS EVIDENCE, NOT A GREEN LABEL</span><h3>Three gates. No skipped steps.</h3><div class="evidence-gates">${gates.map(([key,label,fallback])=>`<div class="gate${computed.gates[key]?' pass':''}"><span class="gate-status">${computed.gates[key]?'✓ VERIFIED':'○ MISSING / BLOCKED'}</span><strong>${label}</strong><p>${esc(computed.gateReasons?.[key] || fallback)}</p></div>`).join('')}</div><div class="proof-summary"><dl><dt>Pickup proof</dt><dd>${esc(record.custody.pickup?.id || 'Not selected')} · ${esc(record.custody.pickupConditionIds?.join(', ') || 'Condition proof missing')}</dd><dt>Receipt proof</dt><dd>${esc(record.custody.receipt?.id || 'Not selected')} · ${esc(record.custody.receiptConditionIds?.join(', ') || 'Condition proof missing')}</dd><dt>Condition</dt><dd>${esc(pretty(record.condition.status))}${record.condition.decision?` · decision: ${esc(record.condition.decision)}`:''}</dd><dt>Wipe proof</dt><dd>${esc(record.wipe?.evidenceId || 'Not attested')} · synthetic only</dd></dl></div>${record.condition.rationale?`<p>Condition rationale: ${esc(record.condition.rationale)}</p>`:''}`;
}
function renderSla(record,computed) {
  const minutes=computed.sla.remainingMinutes;
  const amount=minutes>=0?`${Math.floor(minutes/60)}h ${minutes%60}m`:`${Math.floor(-minutes/60)}h ${(-minutes)%60}m`;
  $('#sla-panel').innerHTML=`<div class="action-header"><span class="eyebrow">EXPLAINABLE SLA</span><span class="tag ${computed.sla.risk==='on-track'?'':'yellow'}">${esc(pretty(computed.sla.risk))}</span></div><div class="sla-time">${computed.sla.risk==='complete'?'Verified ready':esc(amount)} <small>${computed.sla.risk==='complete'?'':minutes>=0?'remaining':'overdue'}</small></div><ul class="explanation-list">${computed.sla.reasons.map(reason=>`<li>${esc(reason)}</li>`).join('')}</ul><p>Due ${esc(date(record.dueAt))}. Based on the simulation clock, missed events and ownership; no statistical prediction.</p><div class="route">Simulated support routing<strong>${esc(computed.owner)}</strong>${esc(computed.nextAction)}</div>`;
}
function slotExpired(slot) {return Date.parse(session.state.clock.now)>=Date.parse(slot.end);}
function renderCapacity(slots) {
  $('#capacity-panel').innerHTML=`<span class="eyebrow">ACTUAL SIMULATED CAPACITY</span><h4>Reservations have limits.</h4><div class="capacity-list">${slots.map(slot=>`<div class="capacity-row" data-slot="${esc(slot.id)}"><div><strong>${esc(slot.label)}</strong><span>${esc(date(slot.start))} – ${esc(date(slot.end))}</span><span>${esc(slot.id)} · ${slot.reserved} reserved · ${slot.consumed || 0} serviced / ${slot.capacity} total${slotExpired(slot)?' · window expired':''}</span></div><div class="capacity-count">${slotExpired(slot)?'Closed':slot.available}<small>${slotExpired(slot)?'no new reservations':'available'}</small></div></div>`).join('')}</div><p>Atomic reservation, revision checks and idempotent commands protect the final slot.</p>`;
}
function renderIdle(record,computed) {
  const panel=$('#idle-panel');panel.hidden=!record.idle;
  if (!record.idle) return;
  panel.innerHTML=`<span class="eyebrow">EXPLICIT IDLE DECISION</span><h3>Returned. Ready may still mean idle.</h3><div class="idle-details"><strong>Owner: ${esc(record.idle.owner)}</strong><p>${esc(record.idle.rationale)}</p><p>Recorded ${esc(date(record.idle.at))} · age ${computed.idleAgeMinutes} simulated minutes.</p></div><p>This is a visible allocation decision, not evidence of a redeployment.</p>`;
}
function renderOutbox() {
  const {state,derived}=session;
  const limits=derived.notificationLimits;
  const suppressed=state.notificationLog.filter(item=>item.reason!=='queued');
  $('#panel-outbox').innerHTML=`<div class="panel-heading"><div><span class="eyebrow">VISIBLE, BOUNDED, NEVER SENT</span><h3>Synthetic notification outbox</h3><p>These are proposed employee messages. No email, SMS or supplier connection exists.</p></div></div><div class="limits"><span>Global cap ${state.outbox.length} / ${limits.global}</span><span>Per-person cap ${limits.perPerson}</span><span>Cooldown ${limits.cooldownMinutes} simulated minutes</span><span>Deterministic dedupe keys</span></div>${state.outbox.length?state.outbox.slice().reverse().map(item=>`<article class="outbox-item"><div><strong>${esc(item.returnId)} · ${esc(pretty(item.reason))}</strong><span class="tag">Synthetic only</span></div><p>${esc(item.message)}</p><span class="record-meta">${esc(item.personId)} · ${esc(date(item.at))} · nothing sent</span><code>Dedupe: ${esc(item.dedupeKey)}</code></article>`).join(''):'<div class="empty-state">No messages queued. Only a meaningful booking or missed pickup attempts a notice.</div>'}<details class="suppression-list" open><summary>${suppressed.length} suppressed notification attempts</summary>${suppressed.map(item=>`<div class="suppression-row"><strong>${esc(item.reason)}</strong> · ${esc(item.returnId)} · ${esc(date(item.at))}<br><code>${esc(item.dedupeKey)}</code></div>`).join('') || '<p>No suppression attempts yet.</p>'}</details>`;
}
function renderAudit() {
  $('#panel-audit').innerHTML=`<div class="panel-heading"><div><span class="eyebrow">APPEND-ONLY SESSION HISTORY</span><h3>Every accepted decision leaves a trace.</h3><p>Revision checks reject stale writes. Rejected commands leave state unchanged; accepted mutations append immutable audit events.</p></div></div>${session.state.audit.length?session.state.audit.slice().reverse().map(item=>`<article class="audit-item"><div><strong>#${item.sequence} · ${esc(pretty(item.type))}</strong><span class="tag">Revision ${item.revision}</span></div><span class="record-meta">${esc(item.returnId || 'Simulation clock')} · ${esc(date(item.at))} · ${esc(pretty(item.before))} → ${esc(pretty(item.after))}</span><code>${esc(item.commandId)}</code><details><summary>Inspect event details</summary><pre>${esc(json(item.details))}</pre></details></article>`).join(''):'<div class="empty-state">No accepted commands yet. Start with a constrained booking.</div>'}`;
}
function selectTab(name,moveFocus=true) {
  activeTab=name;
  document.querySelectorAll('[data-tab]').forEach(button=>{const active=button.dataset.tab===name;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
  document.querySelectorAll('.tab-panel').forEach(panel=>panel.hidden=panel.id!==`panel-${name}`);
  if (moveFocus) $('#workspace').focus({preventScroll:true});
}
function option(item) {return `<option value="${esc(item.id)}">${esc(item.label)} · ${esc(item.id)}</option>`;}
function proofSelect(type,id,label,stage=null,mismatch=false) {
  const r=current();
  const items=session.state.evidenceCatalog.filter(item=>item.type===type && (!stage || item.stage===stage) && item.assetId===r.assetId && !item.id.includes('BROKEN'));
  const wrong=mismatch?session.state.evidenceCatalog.filter(item=>['WRONG-ASSET-PICKUP','BROKEN-CHAIN-RECEIPT'].includes(item.id) && !items.some(i=>i.id===item.id)):[];
  return `<label class="form-field"><span>${label}</span><select id="${id}" name="${id}"><option value="">Choose synthetic evidence…</option>${items.map(option).join('')}${wrong.length?`<optgroup label="Intentional rejection examples">${wrong.map(option).join('')}</optgroup>`:''}</select><small>Allowlisted synthetic labels only. No uploads or real personal data.</small></label>`;
}
function openDialog(action) {
  const record=current(),computed=calculated();dialogAction=action;lastFocus=document.activeElement;$('#dialog-error').hidden=true;
  let title='',body='',submit='Submit synthetic action';
  if (action==='open-book') {
    title=record.exception?'Reserve a recovery slot':'Choose collection capacity';submit='Reserve selected slot';
    body=`<p>Capacity is checked atomically by the server. An exhausted slot remains visible so you can inspect a real rejection. Rebooking reserves the replacement before releasing the existing slot.</p><label class="form-field"><span>Supplier collection window · ${esc(session.state.clock.timeZone)}</span><select id="slot-id"><option value="">Choose a synthetic slot…</option>${session.derived.slots.map(slot=>`<option value="${esc(slot.id)}">${esc(slot.label)} · ${slotExpired(slot)?'window expired':`${slot.available} available`}</option>`).join('')}</select></label><div class="slot-summary">${session.derived.slots.map(slot=>`${esc(slot.id)} · ${esc(date(slot.start))} – ${esc(date(slot.end))} · ${slot.available} / ${slot.capacity} available${slotExpired(slot)?' · expired':''}`).join('<br>')}</div><p>All supplier identities are synthetic. No live booking is made.</p>`;
  }
  if (['collect','receive'].includes(action)) {
    title=action==='collect'?'Prove synthetic collection':'Prove warehouse receipt';submit=action==='collect'?'Record pickup proof':'Record receipt proof';
    const type=action==='collect'?'pickup-condition':'condition';
    body=`<p>${action==='collect'?'A pickup needs asset-matched custody and pickup condition documentation.':'A receipt must continue the pickup chain and carry distinct warehouse condition proof.'} Empty, mismatched or reused evidence is rejected. Selecting a label models an attestation, not an actual photograph.</p>${proofSelect('custody','custody-id',action==='collect'?'Pickup custody identifier':'Warehouse custody identifier',action==='collect'?'pickup':'receipt',true)}${proofSelect(type,'condition-id',action==='collect'?'Distinct pickup condition proof':'Distinct warehouse condition proof')}<label class="checkbox-field"><input type="checkbox" id="conflicting-condition"><span>Also attach the other condition outcome for this stage, to inspect an unresolved conflict. This blocks wipe and readiness until an explicit repair decision.</span></label>`;
  }
  if (['wipe','repairComplete'].includes(action)) {
    title=action==='wipe'?'Synthetic wipe attestation':'Synthetic repair attestation';submit=action==='wipe'?'Record synthetic attestation':'Record synthetic repair';
    body=`<p>${action==='wipe'?'This records a synthetic attestation. It never wipes a device. Continuous custody and clear or repaired condition are server-enforced prerequisites.':'An explicit repair decision and allowlisted synthetic repair proof are required.'}</p>${action==='wipe'&&!computed.gates.condition?`<div class="message error">Condition currently blocks wipe: ${esc(pretty(record.condition.status))}. Route a condition decision before recovery.</div>`:''}${proofSelect(action==='wipe'?'wipe':'repair',action==='wipe'?'wipe-id':'repair-id','Choose an attestation label')}`;
  }
  if (action==='resolveCondition') {
    title='Own the condition decision';submit='Record condition decision';
    body=`<p>Current condition: ${esc(pretty(record.condition.status))}. A clear warehouse label does not erase an earlier documented issue. Repair requires synthetic repair proof; quarantine blocks readiness.</p><label class="form-field"><span>Explicit condition disposition</span><select id="condition-decision"><option value="">Choose a decision…</option><option value="repair">Route to repair depot</option><option value="quarantine">Quarantine · Security & repair depot</option><option value="release">Release · only if clear or repaired</option></select></label><label class="form-field"><span>Decision rationale</span><textarea id="condition-rationale" maxlength="240" placeholder="Explain this synthetic operational decision (8–240 characters)"></textarea></label>`;
  }
  if (action==='keepIdle') {
    title='Make idle ownership explicit';submit='Record idle decision';
    body=`<p>A returned asset is not automatically redeployed. Record who owns the allocation decision and why this synthetic device stays idle. Its age follows the explicit simulation clock.</p><label class="form-field"><span>Decision owner</span><input id="idle-owner" value="Synthetic IT operations" readonly></label><label class="form-field"><span>Why keep this asset idle?</span><textarea id="idle-rationale" maxlength="240" placeholder="Enter a synthetic allocation rationale (8–240 characters)"></textarea></label>`;
  }
  if (action==='reset') {title='Reset only your demo session';submit='Reset my session';body='<p>This clears your visitor-isolated synthetic returns, outbox and audit, then restores the fixed seed clock. Other visitors’ sessions are unaffected.</p>';}
  $('#dialog-title').textContent=title;$('#dialog-body').innerHTML=body;$('#dialog-submit').textContent=submit;dialog.showModal();
}
function closeDialog() {dialog.close();dialogAction=null;if(lastFocus?.isConnected) lastFocus.focus({preventScroll:true}); else $('#action-panel button')?.focus({preventScroll:true});}
async function submitDialog(event) {
  event.preventDefault();if (busy) return;
  let type=dialogAction,fields={};
  if (type==='open-book') {type='book';fields={slotId:$('#slot-id').value};}
  if (['collect','receive'].includes(type)) {
    const conditionId=$('#condition-id').value;const typeName=type==='collect'?'pickup-condition':'condition';
    const conditionIds=conditionId?[conditionId]:[];
    if ($('#conflicting-condition').checked) {const other=session.state.evidenceCatalog.find(item=>item.assetId===current().assetId && item.type===typeName && item.id!==conditionId);if(other) conditionIds.push(other.id);}
    fields={custodyId:$('#custody-id').value,conditionIds};
  }
  if (type==='wipe') fields={evidenceId:$('#wipe-id').value};
  if (type==='repairComplete') fields={evidenceId:$('#repair-id').value};
  if (type==='resolveCondition') fields={decision:$('#condition-decision').value,rationale:$('#condition-rationale').value};
  if (type==='keepIdle') fields={owner:$('#idle-owner').value,rationale:$('#idle-rationale').value};
  if (type==='reset') {
    setBusy(true);try {await request('/api/reset',{});activeId='R-1001';activeTab='flow';render();closeDialog();message('Your session was reset to the fixed synthetic seed. Other visitors are unaffected.');}catch(error){$('#dialog-error').textContent=`${error.code}: ${error.message}`;$('#dialog-error').hidden=false;}finally{setBusy(false);}return;
  }
  if (await send(type,fields)) closeDialog();
}
async function runScenarios() {
  const button=$('#run-scenarios');button.disabled=true;button.textContent='Executing domain assertions…';
  try {
    const module=await import('/modules/scenarios.js');scenarioRun=module.runScenarios();
    $('#scenario-results').innerHTML=`<div class="scenario-totals" role="status"><strong>${scenarioRun.passed} / ${scenarioRun.total} scenarios passed</strong><span>${scenarioRun.failed} failed · ${scenarioRun.assertionCount} assertions executed<br>Fixed clock ${esc(scenarioRun.clock)} · ${esc(scenarioRun.timeZone)}</span></div><div class="scenario-grid">${scenarioRun.scenarios.map(item=>`<details id="scenario-${esc(item.id)}" class="scenario-case${item.pass?'':' failed'}"><summary><strong>${esc(item.name)}</strong><span>${item.pass?'PASS':'FAIL'}</span></summary><div class="scenario-body"><p>${esc(item.description)}</p>${item.error?`<div class="message error">${esc(item.error)}</div>`:''}${item.assertions.map(assertion=>`<div class="assertion"><strong>${assertion.pass?'✓':'✕'} ${esc(assertion.name)}</strong><dl><dt>Expected</dt><dd>${esc(json(assertion.expected))}</dd><dt>Actual</dt><dd>${esc(json(assertion.actual))}</dd></dl></div>`).join('')}</div></details>`).join('')}</div>`;
  } catch(error) {$('#scenario-results').innerHTML=`<div class="message error" role="alert">Scenario execution failed: ${esc(error.message)}. No passing result is claimed.</div>`;}
  finally {button.disabled=false;button.innerHTML='Run all 22 scenarios <span aria-hidden="true">→</span>';}
}
document.addEventListener('click',async event=>{
  const returnButton=event.target.closest('[data-return]');if(returnButton && !busy){activeId=returnButton.dataset.return;render();return;}
  const tab=event.target.closest('[data-tab]');if(tab){selectTab(tab.dataset.tab);return;}
  const action=event.target.closest('[data-action]')?.dataset.action;if(!action || busy || !session)return;
  if(['open-book','collect','receive','wipe','repairComplete','resolveCondition','keepIdle'].includes(action)){openDialog(action);return;}
  if(action==='advanceClock'){await send(action,{minutes:60});return;}
  if(action==='missedPickup' || action==='replay-event'){await send('ingestEvent',{eventId:`SYN-EVT-MISSED-${activeId}-G${current().bookingGeneration}`,eventType:'missedPickup'});return;}
  if(action==='notify'){await send(action,{reason:current().exception?'missedPickup':'booked'});return;}
  await send(action);
});
$('#dialog-close').addEventListener('click',closeDialog);$('#dialog-cancel').addEventListener('click',closeDialog);dialog.addEventListener('cancel',()=>{dialogAction=null;});$('#action-form').addEventListener('submit',submitDialog);$('#reset-session').addEventListener('click',()=>openDialog('reset'));$('#run-scenarios').addEventListener('click',runScenarios);
try {await request('/api/session');render();}catch(error){$('#loading').hidden=true;message(`Unable to open the demo session: ${error.message}. The server must be running; no local success state is fabricated.`,true);}

dialog.addEventListener('keydown',event=>{if(event.key!=='Tab')return;const controls=[...dialog.querySelectorAll('button,input,select,textarea,a[href],[tabindex]')].filter(element=>!element.disabled&&element.tabIndex>=0&&!element.hidden);const first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}});
