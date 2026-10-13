import { createHash } from 'node:crypto';
import { projectClients } from './lib/supabase-access.mjs';
const expected=new Set(['f8842e099b34','29c4be9a96d7','46621d374040','54d536910014']);
try {
  const {admin}=await projectClients();
  const result=await admin.from('portal_email_outbox').select('id,status,attempts,provider_id,last_error').eq('status','review_required').eq('attempts',1).is('provider_id',null).eq('last_error','configuration_required:BREVO_CLIENT_SENDER_EMAIL');
  if(result.error) throw Error('read_failed');
  const rows=result.data.filter(row=>expected.has(createHash('sha256').update(row.id).digest('hex').slice(0,12)));
  if(rows.length!==4) throw Error('reviewed_batch_changed');
  const recovered=await admin.rpc('portal_recover_predispatch_emails',{target_ids:rows.map(row=>row.id)});
  if(recovered.error || recovered.data!==4) throw Error('recovery_not_complete');
  const again=await admin.rpc('portal_recover_predispatch_emails',{target_ids:rows.map(row=>row.id)});
  if(again.error || again.data!==0) throw Error('idempotency_not_verified');
  console.log(JSON.stringify({confirmedUnsentRecovered:4,repeatRecoveryChanged:0,providerSends:0,status:'retry',otherRecordsChanged:false}));
}catch{console.error('Guarded recovery stopped. Sensitive output withheld.');process.exitCode=1;}
