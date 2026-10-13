import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import dns from 'node:dns/promises';

const [urlArg, planArg = 'recording/scenes.json', outputArg = 'work/recording/capture'] = process.argv.slice(2);
if (!urlArg) throw new Error('Usage: node recording/capture.mjs https://PUBLIC_HOST recording/scenes.json work/recording/capture');
const target = new URL(urlArg);
const privateIP = raw => {const ip=raw.toLowerCase().replace(/^::ffff:/,''); return /^127\.|^10\.|^192\.168\.|^169\.254\.|^0\.|^172\.(1[6-9]|2\d|3[01])\./.test(ip) || ip === '::1' || /^f[cd]|^fe80/i.test(ip);};
async function publicHost(url){
  if (url.protocol !== 'https:' || url.username || url.password || /(^|\.)localhost$|\.local$/.test(url.hostname)) throw new Error('Capture requires a real public HTTPS host.');
  if ((await dns.lookup(url.hostname, { all: true })).some(a => privateIP(a.address))) throw new Error('Private-network host is not a public demo.');
}
await publicHost(target);
const plan = JSON.parse(await fs.readFile(planArg, 'utf8'));
const out = path.resolve(outputArg);
await fs.mkdir(out, { recursive: true });
const proxyAddress=process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.https_proxy || process.env.http_proxy;
const proxyURL=proxyAddress ? new URL(proxyAddress) : null;
const launchOptions={headless:true,executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']};
if(proxyURL)launchOptions.proxy={server:proxyURL.origin,...(proxyURL.username?{username:decodeURIComponent(proxyURL.username),password:decodeURIComponent(proxyURL.password)}:{})};
const browser = await chromium.launch(launchOptions);
const context = await browser.newContext({ viewport: {width:540,height:960}, deviceScaleFactor:1, recordVideo: {dir:out,size:{width:540,height:960}}, reducedMotion:'reduce' });
const page = await context.newPage();
let log;
try {
await page.addInitScript(() => {
  addEventListener('DOMContentLoaded', () => {
    const dot = document.createElement('div');
    dot.id = 'capture-cursor';
    Object.assign(dot.style,{position:'fixed',width:'20px',height:'20px',border:'3px solid #1b1b1b',background:'#ffe7ab',borderRadius:'50%',zIndex:'2147483647',pointerEvents:'none',transform:'translate(-50%,-50%)',left:'270px',top:'900px'});
    document.body.append(dot);
    addEventListener('mousemove',e=>{dot.style.left=`${e.clientX}px`;dot.style.top=`${e.clientY}px`;});
    addEventListener('mousedown',()=>dot.style.background='#beb2ff');
    addEventListener('mouseup',()=>dot.style.background='#ffe7ab');
  });
});
const response = await page.goto(target.href,{waitUntil:'networkidle'});
if (!response || !response.ok() || new URL(page.url()).protocol !== 'https:') throw new Error('Public HTTPS demo did not load successfully.');
await publicHost(new URL(page.url()));
await page.getByText('Unofficial concept. Synthetic data. No live integrations.', {exact:false}).first().waitFor();
log = {requestedUrl:target.href,observedUrl:page.url(),httpStatus:response.status(),viewport:{width:540,height:960},scenes:[],review:{visual:false,audio:false,owner:'Ayo Ahmed'}};
const get = id => page.locator(`[data-recording="${id}"]`);
const savedText = new Map();
async function dialogFits(){
  for(const dialog of await page.locator('[role="dialog"],dialog[open]').all()){
    if(!await dialog.isVisible()) continue;
    for(const control of await dialog.locator('button,input,select,textarea').all()){
      const b=await control.boundingBox();
      if(b && (b.x<0||b.y<0||b.x+b.width>540||b.y+b.height>960)) throw new Error('A dialog control is outside the vertical viewport.');
    }
  }
}
async function action(a){
  const el=(a.role ? page.getByRole(a.role,{name:a.name,exact:true}) : a.selector ? page.locator(a.selector) : get(a.target)).first();
  if(a.kind==='click'){
    await el.waitFor({state:'visible'});await el.scrollIntoViewIfNeeded();await el.click({trial:true});await dialogFits();
    const b=await el.boundingBox();if(!b)throw new Error(`Missing visible ${a.target}`);
    await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:16});await page.mouse.click(b.x+b.width/2,b.y+b.height/2);
    await page.waitForFunction(()=>document.querySelector('#advance-hour')?.disabled===false);
  }else if(a.kind==='fill') await el.fill(a.value);
  else if(a.kind==='select') await el.selectOption(a.value);
  else if(a.kind==='text') {const textNode=(a.selector ? page.locator(a.selector).filter({hasText:a.value}) : page.getByText(a.value,{exact:a.exact??false})).first();await textNode.waitFor({state:'visible'});await textNode.scrollIntoViewIfNeeded();}
  else if(a.kind==='visible') {await el.waitFor({state:'visible'});await el.scrollIntoViewIfNeeded();}
  else if(a.kind==='saveText') {const value=await el.textContent(); if(!value?.trim())throw new Error(`Missing visible invariant ${a.key}`);savedText.set(a.key,value);}
  else if(a.kind==='sameText') {if(await el.textContent()!==savedText.get(a.key)) throw new Error(`Visible invariant changed: ${a.key}`);}
  else if(a.kind==='reload') {await page.reload({waitUntil:'networkidle'});}
  else throw new Error(`Unknown action kind ${a.kind}`);
  await dialogFits();
}
  const captureStart=performance.now();
  let elapsed=0;
  for(const [i,scene] of plan.scenes.entries()){
    const start=performance.now();
    for(const a of scene.actions) {
      if(a.at !== undefined){
        if(a.at < 0 || a.at >= scene.seconds) throw new Error(`Invalid action timestamp in ${scene.id}`);
        const hold=start+a.at*1000-performance.now();
        if(hold>0) await new Promise(resolve=>setTimeout(resolve,hold));
      }
      await action(a);
    }
    const sessionResponse=await page.request.get(new URL('/api/session',page.url()).href);
    if(!sessionResponse.ok())throw new Error('Cannot verify recorded server state.');
    const session=await sessionResponse.json();
    const actualStatus=session.state.returns.find(r=>r.id===(scene.returnId||'R-1001'))?.status;
    if(scene.expectStatus && actualStatus!==scene.expectStatus)throw new Error(`Scene ${scene.id}: expected ${scene.expectStatus}, actual ${actualStatus}`);
    const observedState={revision:session.state.revision,clock:session.state.clock,status:actualStatus,outboxCount:session.state.outbox.length};
    const screenshot=path.join(out,`scene-${String(i+1).padStart(2,'0')}.png`);
    await page.screenshot({path:screenshot,fullPage:false});
    const actionSeconds=(performance.now()-start)/1000;
    if(actionSeconds>=scene.seconds) throw new Error(`Scene ${scene.id} actions exceed allocated duration; revise plan and rerecord.`);
    elapsed+=scene.seconds;
    const remaining=captureStart+elapsed*1000-performance.now();
    if(remaining>0)await new Promise(resolve=>setTimeout(resolve,remaining));
    log.scenes.push({id:scene.id,seconds:scene.seconds,actionSeconds,observedState,screenshot:path.basename(screenshot),actions:scene.actions});
    await fs.writeFile(path.join(out,'capture-manifest.json'),JSON.stringify(log,null,2));
  }
  await context.close();
  const source=await page.video().path();
  await fs.rename(source,path.join(out,'raw.webm'));
} finally { await browser.close(); }
console.log(`Recorded actual public host ${log.observedUrl}; review is still required.`);
