// Failure fixture setup only. Never sends, recovers, or modifies a notification.
import {readFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
const run=process.argv[2];if(!/^[a-f0-9]{8}$/.test(run||''))throw Error('isolated_run_required');
const state=JSON.parse(await readFile('dist/isolated-auth/local-status.json','utf8'));
if(state.runtime!=='native'||!/^http:\/\/127\.0\.0\.1:\d+$/.test(state.env.API_URL))throw Error('local_only');
const db=createClient(state.env.API_URL,state.env.SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}}),check=r=>{if(r.error)throw Error('fixture_setup_failed');return r.data;};
const client=check(await db.from('portal_clients').select('id').eq('business_name',`ISOLATED OPERATOR ${run}`).single()),key=`isolated-notification-ui:${run}`;
const prior=check(await db.from('portal_email_outbox').select('id').eq('dedupe_key',key).maybeSingle());
if(!prior)check(await db.from('portal_email_outbox').insert({client_id:client.id,recipient:`existing-client-${run}@operator.invalid`,subject:`ISOLATED INLINE RECOVERY ${run}`,body:'Synthetic pre-dispatch failure for inline confirmation acceptance. Never sent by fixture setup.',dedupe_key:key,status:'review_required',attempts:1,last_error:'configuration_required:BREVO_CLIENT_SENDER_EMAIL'}));
console.log(JSON.stringify({isolatedFixturePrepared:true,existingNotificationModified:false,sendOrRecoveryPerformed:false}));
