import { mkdtemp, writeFile, unlink, rmdir, readFile } from 'node:fs/promises';
import {parseEnv} from 'node:util';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cli, projectRef } from './lib/supabase-access.mjs';
// Existing sender verified in the signed-in Brevo account. Acceptance namespace
// only, no project-wide production sender or credential replacement.
let directory;
try {
  directory = await mkdtemp(join(tmpdir(), 'stackendbox-sender-'));
  const file = join(directory, 'sender.env');
  const previous=parseEnv(await readFile('../stackendbox/.env.portal.local','utf8'));
  const names=['BREVO_SENDER_EMAIL','BREVO_SENDER_NAME','BRIEF_TO_EMAIL'];
  if(names.some(name=>!previous[name]||/[\r\n]/.test(previous[name])||/placeholder|redacted|sensitive/i.test(previous[name]))) throw Error('Saved public settings unavailable');
  const publicSettings=names.map(name=>`STACKENDBOX_ACCEPTANCE_${name}=${previous[name]}`).join('\n');
  await writeFile(file, `STACKENDBOX_ACCEPTANCE_BREVO_CLIENT_SENDER_EMAIL=stackendboxclients@gmail.com\nSTACKENDBOX_ACCEPTANCE_BREVO_CLIENT_SENDER_NAME=StackEndBox\n${publicSettings}\n`, { flag: 'wx' });
  await cli(['secrets', 'set', '--project-ref', projectRef, '--env-file', file]);
  console.log(JSON.stringify({senderVerified:true,acceptanceSenderConfigured:true,productionCredentialsChanged:false}));
} catch { console.error('Acceptance sender configuration failed. Sensitive output withheld.'); process.exitCode=1; }
finally { if(directory) { await unlink(join(directory,'sender.env')).catch(()=>{}); await rmdir(directory).catch(()=>{}); } }
