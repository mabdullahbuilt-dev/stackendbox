import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createClient } from '@supabase/supabase-js';
const run=promisify(execFile);
export const projectRef='irzjkdxxfvobtabwkqmz';
export async function cli(args) {
  if(!process.env.SUPABASE_CLI_JS && !process.env.SUPABASE_CLI_BIN) throw new Error('SUPABASE_CLI_BIN is required');
  const binary=process.env.SUPABASE_CLI_BIN||process.execPath;
  const parameters=process.env.SUPABASE_CLI_BIN?args:[process.env.SUPABASE_CLI_JS,...args];
  try { return (await run(binary,parameters,{windowsHide:true,maxBuffer:16*1024*1024,timeout:90000})).stdout; }
  catch { throw new Error('Supabase CLI command failed. Sensitive command output withheld.'); }
}
export async function projectClients() {
  const keys=JSON.parse(await cli(['projects','api-keys','--project-ref',projectRef,'--reveal','--output','json']));
  const secret=keys.find(k=>k.type==='secret')?.api_key;
  const publicKey=keys.find(k=>k.type==='publishable')?.api_key;
  if(!secret || !publicKey) throw new Error('Existing project keys unavailable');
  const options={auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,options)=>fetch(url,{...options,signal:AbortSignal.timeout(30000)})}};
  return {admin:createClient(`https://${projectRef}.supabase.co`,secret,options),newSession:()=>createClient(`https://${projectRef}.supabase.co`,publicKey,options)};
}
export async function postgresEnv() {
  // Capture the supported CLI dry-run privately. NEVER log its output or errors.
  const script=await cli(['db','dump','--linked','--project-ref',projectRef,'--dry-run']);
  const values=Object.fromEntries([...script.matchAll(/^export (PGHOST|PGPORT|PGUSER|PGPASSWORD|PGDATABASE)="([^"\r\n]+)"$/gm)].map(m=>[m[1],m[2]]));
  if(Object.keys(values).length!==5) throw new Error('CLI database connection unavailable');
  return {...process.env,...values,PGSSLMODE:'require',PGCONNECT_TIMEOUT:'20'};
}
export async function query(sql) {
  const value=JSON.parse(await cli(['db','query','--linked','--project-ref',projectRef,sql]));
  if(!Array.isArray(value.rows)) throw new Error('Database query failed');
  return value.rows;
}
