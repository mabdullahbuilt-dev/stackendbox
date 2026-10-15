// Read-only evidence for one named disposable UI run. Never loads hosted keys.
import {readFile,writeFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
const runId=process.argv[2];
if(!/^[a-f0-9]{8}$/.test(runId||''))throw Error('isolated_run_id_required');
const local=JSON.parse(await readFile('dist/isolated-auth/local-status.json','utf8'));
if(local.runtime!=='native'||!/^http:\/\/127\.0\.0\.1:\d+$/.test(local.env.API_URL))throw Error('local_database_required');
const db=createClient(local.env.API_URL,local.env.SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const check=r=>{if(r.error)throw Error('isolated_read_failed');return r.data;};
const client=check(await db.from('portal_clients').select('id').eq('business_name',`ISOLATED OPERATOR ${runId}`).single());
const invoices=check(await db.from('portal_invoices').select('status').eq('client_id',client.id));
const websites=check(await db.from('portal_websites').select('id').eq('client_id',client.id));
const services=check(await db.from('portal_service_entitlements').select('id,start_date,end_date,billing_arrangement').eq('client_id',client.id));
const history=services.length?check(await db.from('portal_service_history').select('id').in('service_id',services.map(s=>s.id))):[];
const assignments=check(await db.from('portal_domain_assignments').select('client_id').eq('client_id',client.id));
const evidence={at:new Date().toISOString(),scope:'Read-only local database evidence following actual browser actions. Provider transports are fixtures, not live acceptance.',runId,assignmentCount:assignments.length,websiteCount:websites.length,services:services.map(({id,...s})=>s),serviceHistoryCount:history.length,invoiceStates:invoices.map(i=>i.status),credentialsRead:false,businessRecordsChanged:false};
await writeFile(`dist/isolated-operator/${runId}-durable-evidence.json`,JSON.stringify(evidence,null,2));
console.log(JSON.stringify(evidence));
