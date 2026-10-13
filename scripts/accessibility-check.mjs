import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.LAB_TEST_URL || 'http://127.0.0.1:8787';
await mkdir('docs/results',{recursive:true});
const proxy=process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox'],...(proxy?{proxy:{server:proxy,bypass:'127.0.0.1,localhost'}}:{})});
const results=[];const layouts=[];
try {
for (const [width,height] of [[320,844],[390,844],[540,960]]) {
 const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});const page=await context.newPage();
 await page.goto(base);await page.locator('#session-app').waitFor({state:'visible'});
 const api=async fields=>page.evaluate(async fields=>{const {state}=await(await fetch('/api/session')).json();const response=await fetch('/api/command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:crypto.randomUUID(),returnId:'R-1001',expectedRevision:state.revision,...fields})});const payload=await response.json();if(!response.ok)throw Error(JSON.stringify(payload));return payload;},fields);
 const fits=async label=>{const controls=await page.locator('#action-dialog button,#action-dialog input,#action-dialog select,#action-dialog textarea').evaluateAll(nodes=>nodes.map(el=>{const r=el.getBoundingClientRect();return {id:el.id,left:r.left,right:r.right,top:r.top,bottom:r.bottom};}));const pass=controls.every(r=>r.left>=0&&r.top>=0&&r.right<=width&&r.bottom<=height);results.push({width,height,label,pass,controls});assert.ok(pass,label+JSON.stringify(controls));};
 await page.locator('[data-action="open-book"]').click();await fits('booking');
 const focus=[];for(let i=0;i<8;i++){focus.push(await page.evaluate(()=>document.activeElement.id));await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.querySelector('dialog').contains(document.activeElement)),true,'Native dialog keeps keyboard focus inside');}
 results.push({width,label:'keyboard dialog trap',focus,pass:true});await page.keyboard.press('Escape');await page.locator('#action-dialog').waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>document.activeElement.dataset.action),'open-book');
 await api({type:'book',slotId:'SLOT-LON-1'});await api({type:'confirm'});await page.reload();await page.locator('[data-action="collect"]').click();await fits('pickup proof');await page.screenshot({path:`docs/results/${width}-pickup-dialog.png`});await page.keyboard.press('Escape');
 await api({type:'collect',custodyId:'PICKUP-1',conditionIds:['PICKUP-DAMAGE-1']});await page.reload();await page.locator('[data-action="receive"]').click();await fits('receipt proof');await page.keyboard.press('Escape');
 await api({type:'receive',custodyId:'RECEIPT-1',conditionIds:['DAMAGE-1']});await page.reload();await page.locator('[data-action="resolveCondition"]').click();await fits('condition decision');await page.keyboard.press('Escape');
 await api({type:'resolveCondition',decision:'repair',rationale:'Synthetic damage needs depot review.'});await page.reload();await page.locator('[data-action="repairComplete"]').click();await fits('repair attestation');await page.keyboard.press('Escape');
 await api({type:'repairComplete',evidenceId:'REPAIR-1'});await page.reload();await page.locator('[data-action="wipe"]').click();await fits('wipe attestation');await page.keyboard.press('Escape');
 await api({type:'wipe',evidenceId:'WIPE-1'});await api({type:'markReady'});await page.reload();await page.locator('[data-action="keepIdle"]').click();await fits('idle decision');await page.keyboard.press('Escape');
 await page.locator('#reset-session').click();await fits('session reset');await page.keyboard.press('Escape');
 const overflow=await page.evaluate(()=>({width:innerWidth,doc:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('body *')].filter(el=>{const r=el.getBoundingClientRect();return r.right>innerWidth && getComputedStyle(el).position!=='absolute';}).map(el=>({tag:el.tagName,id:el.id,class:el.className,text:el.textContent.slice(0,70),right:el.getBoundingClientRect().right})).slice(0,20)}));layouts.push({width,height,pass:overflow.doc<=width,documentWidth:overflow.doc});await page.screenshot({path:`docs/results/${width}-recovered-layout.png`,fullPage:true});assert.ok(overflow.doc<=width,'No page overflow');await context.close();
}
console.log(`${results.length} dialog/focus cases and ${layouts.length} viewport-overflow checks passed.`);
} finally {
 await writeFile('docs/results/accessibility.json',JSON.stringify({context:'Cloud-local UI checks; not a formal assistive technology audit',base,results,layouts},null,2)+'\n');
 await browser.close();
}
