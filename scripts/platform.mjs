import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const config=process.env.XDG_CONFIG_HOME || resolve('work/platform-config');
await mkdir(config,{recursive:true});
const child=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js',...process.argv.slice(2)],{stdio:'inherit',detached:true,env:{...process.env,XDG_CONFIG_HOME:config,WRANGLER_SEND_METRICS:'false'}});
for (const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>{try{process.kill(-child.pid,signal);}catch(error){if(error.code!=='ESRCH')throw error;}});
child.on('exit',code=>process.exit(code??1));
