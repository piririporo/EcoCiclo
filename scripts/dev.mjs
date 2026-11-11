import {spawn} from 'node:child_process';
const args=process.argv.slice(2);
const value=(key,fallback)=>{const i=args.indexOf(key);return i<0?fallback:args[i+1]??fallback;};
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname',value('--host','0.0.0.0'),'--port',value('--port','3000')],{stdio:'inherit',env:process.env});
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code??0));
