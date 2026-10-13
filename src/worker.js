import {seed, execute, derive, DomainError} from './domain.js';

const COOKIE='__Host-return_lab';
const TTL=7*86400000;
const MAX_BODY=8192;
const SESSION_REQUESTS=240;
const CSP="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' https://website-media.deel.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";
const responseHeaders = {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':CSP,'Permissions-Policy':'camera=(), microphone=(), geolocation=()'};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:responseHeaders});
const error=(code,message,status)=>json({error:{code,message}},status);
const validCookie=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);
function sessionCookie(request) {
  const matches=(request.headers.get('Cookie')||'').split(';').map(s=>s.trim()).filter(s=>s.startsWith(`${COOKIE}=`));
  if (matches.length!==1) return null;
  const value=matches[0].slice(COOKIE.length+1);
  return validCookie(value)?value:null;
}
async function boundedBody(request) {
  if (!request.headers.get('Content-Type')?.split(';')[0].trim().match(/^application\/json$/i)) throw new DomainError('CONTENT_TYPE','Commands require application/json; personal uploads are not supported.');
  if (Number(request.headers.get('Content-Length'))>MAX_BODY) throw new DomainError('BODY_TOO_LARGE','Request exceeds the demo body limit.');
  const reader=request.body?.getReader();
  if (!reader) throw new DomainError('INVALID_JSON','JSON request body is required.');
  let length=0;
  const chunks=[];
  while (true) {
    const {done,value}=await reader.read();
    if (done) break;
    length+=value.byteLength;
    if (length>MAX_BODY) {await reader.cancel();throw new DomainError('BODY_TOO_LARGE','Request exceeds the demo body limit.');}
    chunks.push(value);
  }
  const bytes=new Uint8Array(length);let offset=0;
  for (const value of chunks) {bytes.set(value,offset);offset+=value.length;}
  try {return JSON.parse(new TextDecoder().decode(bytes));}
  catch {throw new DomainError('INVALID_JSON','A valid JSON command is required.');}
}

export default {
  async fetch(request,env) {
    const url=new URL(request.url);
    if (!url.pathname.startsWith('/api/')) {
      if (!env.ASSETS) return error('NOT_FOUND','This asset is unavailable.',404);
      const asset=await env.ASSETS.fetch(request);
      const headers=new Headers(asset.headers);
      headers.set('Content-Security-Policy',CSP);headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','no-referrer');headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
      return new Response(asset.body,{status:asset.status,headers});
    }
    if (!['/api/session','/api/command','/api/reset'].includes(url.pathname)) return error('NOT_FOUND','Unknown demo endpoint.',404);
    const method=url.pathname==='/api/session'?'GET':'POST';
    if (request.method!==method) return error('METHOD_NOT_ALLOWED',`Use ${method} for this endpoint.`,405);
    let id=sessionCookie(request);
    let minted=false;
    if (method==='POST') {
      if (request.headers.get('Origin')!==url.origin || request.headers.get('Sec-Fetch-Site')==='cross-site') return error('ORIGIN_REJECTED','Write commands require the same origin as this demo.',403);
      if (!id) return error('SESSION_REQUIRED','Open the demo session before sending a command.',401);
    } else if (!id) {id=crypto.randomUUID();minted=true;}
    let payload;
    if (method==='POST') {
      try {payload=await boundedBody(request);}
      catch (cause) {return error(cause.code||'INVALID_JSON',cause.message,cause.code==='BODY_TOO_LARGE'?413:400);}
      if (url.pathname==='/api/reset' && (!payload || typeof payload!=='object' || Array.isArray(payload) || Object.keys(payload).length)) return error('INVALID_COMMAND','Reset accepts an empty JSON object and affects only your demo session.',422);
    }
    const stub=env.SESSIONS.get(env.SESSIONS.idFromName(id));
    const internal=new Request(`https://session.internal${url.pathname}`,{method,headers:method==='POST'?{'Content-Type':'application/json'}:{},...(method==='POST'?{body:JSON.stringify(payload)}:{})});
    let result=await stub.fetch(internal);
    if (result.status===410 && method==='GET') {
      id=crypto.randomUUID();minted=true;
      result=await env.SESSIONS.get(env.SESSIONS.idFromName(id)).fetch(internal);
    }
    const headers=new Headers(result.headers);
    if (minted) headers.set('Set-Cookie',`${COOKIE}=${id}; Path=/; Max-Age=604800; HttpOnly; Secure; SameSite=Strict`);
    return new Response(result.body,{status:result.status,headers});
  },
};

// Each opaque visitor session owns one SQLite Durable Object. Nothing is shared
// between visitors; domain mutation and persistence execute synchronously together.
export class ReturnSession {
  constructor(ctx,env) {
    this.ctx=ctx;this.env=env;
    this.ensureTables();
  }
  ensureTables() {
    this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS snapshot (id INTEGER PRIMARY KEY CHECK (id=1), value TEXT NOT NULL)');
    this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS audit_events (sequence INTEGER PRIMARY KEY, value TEXT NOT NULL)');
    this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS controls (id INTEGER PRIMARY KEY CHECK (id=1), created INTEGER NOT NULL, hour INTEGER NOT NULL, requests INTEGER NOT NULL)');
  }
  async fetch(request) {
    const path=new URL(request.url).pathname;
    let command;
    if (request.method==='POST') {
      try {command=await request.json();}
      catch {return error('INVALID_JSON','A valid JSON command is required.',400);}
    }
    const now=Date.now();
    let reply;
    // An expiry alarm may have cleared SQL while this instance remains warm.
    this.ensureTables();
    this.ctx.storage.transactionSync(()=> {
      const sql=this.ctx.storage.sql;
      const controls=sql.exec('SELECT created, hour, requests FROM controls WHERE id=1').toArray()[0];
      const hour=Math.floor(now/3600000);
      if (controls&&now-controls.created>=TTL) {reply=error('SESSION_EXPIRED','This demo session has expired. Reload to start a fresh visitor session.',410);return;}
      const count=controls?.hour===hour?controls.requests+1:1;
      if (count>SESSION_REQUESTS) {reply=error('RATE_LIMIT','This visitor session reached 240 requests in a real hour. Wait for the next hour.',429);return;}
      sql.exec('INSERT INTO controls(id,created,hour,requests) VALUES(1,?,?,?) ON CONFLICT(id) DO UPDATE SET hour=excluded.hour,requests=excluded.requests',controls?.created??now,hour,count);
      const stored=sql.exec('SELECT value FROM snapshot WHERE id=1').toArray()[0];
      let state=stored?JSON.parse(stored.value):seed();
      let result;
      if (path==='/api/reset') {
        state=seed();sql.exec('DELETE FROM audit_events');result={reset:true,scope:'current-visitor-session'};
      } else if (path==='/api/command') {
        try {
          const oldLength=state.audit.length;
          const executed=execute(state,command);state=executed.state;result=executed.result;
          for (const event of state.audit.slice(oldLength)) sql.exec('INSERT INTO audit_events(sequence,value) VALUES(?,?)',event.sequence,JSON.stringify(event));
        } catch (cause) {
          if (!(cause instanceof DomainError)) throw cause;
          reply=json({error:{code:cause.code,message:cause.message},state,derived:derive(state)},cause.code==='STALE_REVISION'||cause.code==='IDEMPOTENCY_CONFLICT'||cause.code==='EVENT_CONFLICT'?409:422);return;
        }
      } else if (path!=='/api/session') {reply=error('NOT_FOUND','Unknown demo endpoint.',404);return;}
      const serialized=JSON.stringify(state);
      if (serialized.length>1048576) throw new Error('Demo snapshot storage ceiling exceeded.');
      sql.exec('INSERT INTO snapshot(id,value) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value',serialized);
      reply=json({state,derived:derive(state),...(result?{result}:{})});
    });
    if (!(await this.ctx.storage.getAlarm())) await this.ctx.storage.setAlarm(now+TTL);
    return reply;
  }
  async alarm() {await this.ctx.storage.deleteAll();}
}
