import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { createHash } from 'node:crypto';
import { projectClients } from './lib/supabase-access.mjs';
try {
  const { admin } = await projectClients();
  const { data, error } = await admin.from('portal_email_outbox').select('id,status,provider_id,last_error,attempts,created_at,claimed_at,recipient').eq('status','review_required').limit(10);
  if (error) throw Error('outbox_read_failed');
  const config = process.env.PORTAL_PRIVATE_ENV ? parseEnv(await readFile(process.env.PORTAL_PRIVATE_ENV, 'utf8')) : {};
  const key = config.BREVO_CLIENT_API_KEY;
  const usableKey = !!key && !/redacted|sensitive|placeholder|^\*+$/i.test(key);
  const results = [];
  for (const row of data) {
    const record = createHash('sha256').update(row.id).digest('hex').slice(0,12);
    // This exact legacy exception occurred while constructing the request body,
    // before fetch. Other errors and repeated attempts remain uncertain.
    if (row.attempts === 1 && !row.provider_id && row.last_error === 'configuration_required:BREVO_CLIENT_SENDER_EMAIL') {
      results.push({record, status:row.status, attempts:row.attempts, conclusion:'FAILED_BEFORE_DISPATCH_MISSING_SENDER', providerQueried:false});
      continue;
    }
    if (!usableKey) {
      results.push({record, status:row.status, conclusion:'UNKNOWN_PROVIDER_CONFIGURATION_UNAVAILABLE', providerQueried:false});
      continue;
    }
    const query = new URLSearchParams({ days:'3', limit:'100', sort:'desc' });
    if (row.provider_id) query.set('messageId',row.provider_id);
    else query.set('email',row.recipient);
    const response = await fetch('https://api.brevo.com/v3/smtp/statistics/events?' + query, { headers: { 'api-key':key }, signal:AbortSignal.timeout(20000) });
    const payload = response.ok ? await response.json() : {};
    const events = Array.isArray(payload.events) ? payload.events : [];
    results.push({ record: createHash('sha256').update(row.id).digest('hex').slice(0,12), status:row.status, providerIdPresent:!!row.provider_id, claimedAt:row.claimed_at, createdAt:row.created_at, providerStatus:response.status, exactMessageMatch:!!row.provider_id, events:events.map(e=>({event:e.event,date:e.date,messageFingerprint:e.messageId?createHash('sha256').update(e.messageId).digest('hex').slice(0,12):null})), conclusion:row.provider_id?'provider_events_require_interpretation':'UNKNOWN_NO_STABLE_MESSAGE_CORRELATION' });
  }
  console.log(JSON.stringify({ mode:'read-only', records:results, resends:0, databaseChanges:0 },null,2));
} catch { console.error('Email evidence inspection failed. Sensitive output withheld.'); process.exitCode=1; }
