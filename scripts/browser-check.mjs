import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.LAB_TEST_URL || 'http://127.0.0.1:8787';
const proxy=process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox'],...(proxy?{proxy:{server:proxy,bypass:'127.0.0.1,localhost'}}:{})});
const results=[];
const errors=[];
await mkdir('docs/results',{recursive:true});
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const page=await context.newPage();
page.on('pageerror',e=>errors.push(e.message));
const check=(name,expected,actual)=>{results.push({name,expected,actual,pass:JSON.stringify(expected)===JSON.stringify(actual)});assert.deepEqual(actual,expected,name);};
const state=async()=> (await (await page.request.get(`${base}/api/session`)).json()).state;
async function fits(){
  const bounds=await page.locator('#action-dialog button, #action-dialog input, #action-dialog select, #action-dialog textarea').evaluateAll(elements=>elements.map(el=>{const r=el.getBoundingClientRect();return {id:el.id,left:r.left,top:r.top,right:r.right,bottom:r.bottom};}));
  const size=page.viewportSize();
  check(`All dialog controls fit ${size.width}×${size.height}`,true,bounds.every(r=>r.left>=0&&r.top>=0&&r.right<=size.width&&r.bottom<=size.height));
}
async function action(name){
  const response=page.waitForResponse(r=>r.url().endsWith('/api/command'));
  await page.locator(`#action-panel [data-action="${name}"]`).click();
  await response;
  await page.locator(`#action-panel [data-action]`).first().waitFor();
}
async function submit(){
  const response=page.waitForResponse(r=>r.url().endsWith('/api/command'));
  await page.locator('#dialog-submit').click();
  await response;
}
async function openProof(name,custody,condition){
  await page.locator(`#action-panel [data-action="${name}"]`).click();
  await fits();
  await page.locator('#custody-id').selectOption(custody);
  await page.locator('#condition-id').selectOption(condition);
  await submit();
  await page.locator('#action-dialog').waitFor({state:'hidden'});
}
try{
  await page.goto(base,{waitUntil:'networkidle'});
  await page.locator('#session-app').waitFor({state:'visible'});
  check('Prominent independent synthetic notice',true,await page.locator('.disclosure').isVisible());
  const fontStatus=await page.evaluate(async()=>{await document.fonts.ready;return [...document.fonts].map(f=>f.status);});
  check('Official Bagoss and Inter font faces load',['loaded','loaded','loaded'],fontStatus);
  check('Initial fixed simulation time','2026-10-13T09:00:00.000Z',(await state()).clock.now);
  check('No desktop horizontal overflow',true,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:'docs/results/desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  check('No phone horizontal overflow',true,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:'docs/results/phone.png',fullPage:true});
  await page.locator('#action-panel [data-action="open-book"]').click();await fits();
  await page.locator('#slot-id').selectOption('SLOT-FULL');await submit();
  await page.locator('#dialog-error').waitFor({state:'visible'});
  check('No capacity rejection is visible',true,(await page.locator('#dialog-error').textContent()).includes('NO_CAPACITY'));
  check('Rejected booking remains requested','requested',(await state()).returns[0].status);
  await fits();await page.screenshot({path:'docs/results/phone-booking-rejection.png'});
  await page.locator('#slot-id').selectOption('SLOT-LON-1');await submit();
  await page.locator('#action-dialog').waitFor({state:'hidden'});await action('confirm');
  await action('missedPickup');
  check('Supplier exception visible',true,await page.locator('#supplier-exception').isVisible());
  const missed=await state();check('Missed pickup is supplier-owned',true,missed.returns[0].exception.owner.startsWith('Synthetic supplier'));
  check('Cooldown suppresses immediate missed message','cooldown',missed.notificationLog.at(-1).reason);
  await action('replay-event');check('Duplicate event preserves message count',missed.outbox.length,(await state()).outbox.length);
  await page.screenshot({path:'docs/results/phone-supplier-exception.png'});
  await page.locator('#action-panel [data-action="open-book"]').click();await fits();
  await page.locator('#slot-id').selectOption('SLOT-LON-2');await submit();await page.locator('#action-dialog').waitFor({state:'hidden'});await action('confirm');
  await page.locator('#action-panel [data-action="collect"]').click();await fits();
  await page.locator('#custody-id').selectOption('PICKUP-1');await submit();await page.locator('#dialog-error').waitFor({state:'visible'});
  check('Missing pickup condition is rejected',true,(await page.locator('#dialog-error').textContent()).includes('CONDITION_REQUIRED'));
  await fits();await page.locator('#condition-id').selectOption('PICKUP-CONDITION-1');await submit();await page.locator('#action-dialog').waitFor({state:'hidden'});
  check('Warehouse condition remains blocked after pickup',false,(await (await page.request.get(`${base}/api/session`)).json()).derived.returns[0].gates.condition);
  await page.locator('#action-panel [data-action="receive"]').click();await fits();
  await page.locator('#custody-id').selectOption('BROKEN-CHAIN-RECEIPT');await page.locator('#condition-id').selectOption('CONDITION-1');await submit();await page.locator('#dialog-error').waitFor({state:'visible'});
  check('Mismatched custody is rejected',true,(await page.locator('#dialog-error').textContent()).includes('CUSTODY_MISMATCH'));
  await page.locator('#custody-id').selectOption('RECEIPT-1');await submit();await page.locator('#action-dialog').waitFor({state:'hidden'});
  await action('markReady');check('Missing wipe keeps received status','received',(await state()).returns[0].status);
  await page.locator('#action-panel [data-action="wipe"]').click();await fits();await page.locator('#wipe-id').selectOption('WIPE-1');await submit();await page.locator('#action-dialog').waitFor({state:'hidden'});await action('markReady');
  check('Real simulated recovery completed','redeploy-ready',(await state()).returns[0].status);
  await page.locator('#action-panel [data-action="keepIdle"]').click();await fits();await page.locator('#idle-rationale').fill('Keep this synthetic laptop idle until a training allocation is approved.');await submit();await page.locator('#action-dialog').waitFor({state:'hidden'});
  check('Idle owner visible',true,await page.locator('#idle-panel').isVisible());
  await page.reload({waitUntil:'networkidle'});await page.locator('#session-app').waitFor({state:'visible'});
  check('Reload persists completed recovery','redeploy-ready',(await state()).returns[0].status);
  await page.setViewportSize({width:1440,height:1000});await page.locator('#workspace').scrollIntoViewIfNeeded();await page.screenshot({path:'docs/results/recovered-ready.png'});
  await page.locator('#tab-scenarios').click();await page.locator('#run-scenarios').click();await page.locator('.scenario-totals').waitFor();
  check('Scenario totals reflect execution',true,(await page.locator('.scenario-totals').textContent()).includes('22 / 22'));
  check('No scenario failures',0,await page.locator('.scenario-case.failed').count());
  await page.locator('#scenario-no-capacity summary').click();check('Inspectable actual and expected assertions',true,(await page.locator('#scenario-no-capacity').textContent()).includes('Expected'));
  await page.screenshot({path:'docs/results/scenarios.png',fullPage:true});
  const isolated=await browser.newContext();const otherPage=await isolated.newPage();await otherPage.goto(base,{waitUntil:'networkidle'});await otherPage.locator('#session-app').waitFor({state:'visible'});
  const otherState=await (await otherPage.request.get(`${base}/api/session`)).json();check('Other visitor remains independently seeded',0,otherState.state.revision);
  await page.locator('#reset-session').click();await fits();const resetResponse=page.waitForResponse(r=>r.url().endsWith('/api/reset'));await page.locator('#dialog-submit').click();await resetResponse;await page.locator('#action-dialog').waitFor({state:'hidden'});
  check('Reset restores only current session',0,(await state()).revision);
  check('Other visitor unaffected by reset',otherState.state.revision,(await (await otherPage.request.get(`${base}/api/session`)).json()).state.revision);
  await isolated.close();check('No browser JavaScript errors',[],errors);
}catch(error){results.push({name:'Browser workflow completes',expected:'no unexpected error',actual:error.message,pass:false});throw error;}
finally{await writeFile('docs/results/browser.json',JSON.stringify({context:'Cloud-local Worker UI verification; not public-demo footage',base,results,errors},null,2)+'\n');await context.close();await browser.close();}
console.log(`${results.length} browser assertions passed; desktop, phone, dialog gates, recovery, scenarios, reload and isolation observed.`);
