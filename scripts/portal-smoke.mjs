import {readFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const run=promisify(execFile), cli=process.env.PORTAL_VERCEL_BIN, config=process.env.PORTAL_VERCEL_CONFIG;
if(!cli||!config)throw new Error('Missing CLI configuration');
const {token}=JSON.parse(await readFile(`${config}/auth.json`,'utf8'));
const url=process.env.PORTAL_PREVIEW_DEPLOYMENT||'https://stackendbox-portal-preview.vercel.app';
for(const test of [
  {path:'/api/portal/data',method:'GET',expected:401},
  {path:'/api/portal/orders',method:'POST',expected:403},
  {path:'/api/portal/upload',method:'POST',expected:403},
  {path:'/api/webhooks/whop',method:'POST',expected:401},
  {path:'/api/portal-jobs',method:'GET',expected:401},
  {path:'/api/portal-diagnostics',method:'GET',expected:404},
]) {
  const result=await run(process.execPath,[cli,'curl',test.path,'--deployment',url,'--','--silent','--show-error','--request',test.method,'--write-out','\n%{http_code}'],{env:{...process.env,VERCEL_TOKEN:token},windowsHide:true,maxBuffer:1024*1024});
  const status=Number(result.stdout.trim().split('\n').at(-1));
  if(status!==test.expected)throw new Error(`${test.path}: expected ${test.expected}, received ${status}`);
  console.log(`${test.method} ${test.path}: ${status} as expected`);
}
