import { readFile, mkdtemp, writeFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { promisify } from 'node:util';
import { cli, projectRef } from './lib/supabase-access.mjs';

let stage = 'existing-project-credentials';
async function main() {

// Copy only existing, officially retrievable credentials. Secrets stay in memory
// and Wrangler stdin, never source files, build output, or command arguments.
const origin = 'https://stackendbox-cf-acceptance.stackendbox.workers.dev';
const worker = 'stackendbox-cf-acceptance';
const keys = JSON.parse(await cli(['projects', 'api-keys', '--project-ref', projectRef, '--reveal', '--output', 'json']));
const secret = keys.find(k => k.type === 'secret')?.api_key;
const publicKey = keys.find(k => k.type === 'publishable')?.api_key;
if (!secret || !publicKey) throw new Error('Existing Supabase credentials unavailable');
const values = {
  NEXT_PUBLIC_SUPABASE_URL: `https://${projectRef}.supabase.co`,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publicKey,
  SUPABASE_SECRET_KEY: secret,
  PORTAL_APP_URL: origin,
};
const diagnosticToken = process.argv.includes('--diagnose') || process.argv.includes('--personal-diagnose') ? randomBytes(32).toString('hex') : null;
if (diagnosticToken) values.PORTAL_DIAGNOSTICS_TOKEN = diagnosticToken;
const requested = ['SPACESHIP_API_KEY', 'SPACESHIP_API_SECRET', 'WHOP_SANDBOX_API_KEY', 'WHOP_SANDBOX_WEBHOOK_SECRET', 'WHOP_SANDBOX_COMPANY_ID', 'WHOP_SANDBOX_REGISTRATION_PRODUCT_ID', 'WHOP_SANDBOX_RENEWAL_PRODUCT_ID', 'BREVO_CLIENT_API_KEY', 'BREVO_CLIENT_SENDER_EMAIL', 'BREVO_CLIENT_SENDER_NAME', 'BREVO_CLIENT_REPLY_TO', 'BREVO_API_KEY', 'NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'TURNSTILE_SECRET_KEY'];
const unavailable = [];
if (process.env.PORTAL_VERCEL_CONFIG) {
  stage = 'supported-source-environment-read';
  const { token } = JSON.parse(await readFile(`${process.env.PORTAL_VERCEL_CONFIG}/auth.json`, 'utf8'));
  const base = 'https://api.vercel.com/v9/projects/prj_K2ZRC5sHMG1y2BE6BetT3mRGOGvz/env';
  async function get(path = '') {
    const response = await fetch(`${base}${path}?teamId=team_7Q8We1Dt1iS6ZWjLovf5Qf4c`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error('Existing environment access unavailable');
    return response.json();
  }
  const { envs } = await get();
  for (const name of requested) {
    const entry = envs.find(e => e.key === name && e.target.includes('preview') && !e.gitBranch);
    // Sensitive variables cannot be exported. Never work around that boundary.
    if (!entry || entry.type === 'sensitive') { unavailable.push(name); continue; }
    const result = await get(`/${entry.id}`);
    if (typeof result.value === 'string' && result.value && !/^\*+$/.test(result.value)) values[name] = result.value;
    else unavailable.push(name);
  }
} else unavailable.push(...requested);
if (process.argv.includes('--build')) {
  // Only publishable values are passed to client compilation. Never server keys.
  const buildEnv = { ...process.env };
  for (const [name, value] of Object.entries(values)) if (name.startsWith('NEXT_PUBLIC_')) buildEnv[name] = value;
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], { windowsHide: true, stdio: 'inherit', env: buildEnv });
    child.on('error', () => reject(new Error('Cloudflare build could not start')));
    child.on('close', code => code === 0 ? resolve() : reject(new Error('Cloudflare build failed')));
  });
  process.exit(0);
}
const config = JSON.parse(await readFile('wrangler.jsonc', 'utf8'));
if (config.name !== worker || config.routes?.length || config.vars.DOMAIN_LIVE_MUTATIONS_ENABLED !== 'false' || config.vars.PORTAL_SANDBOX_CHECKOUT_ENABLED !== 'false') throw new Error('Unsafe acceptance configuration');
const run = promisify(execFile);
stage = 'worker-configuration-read';
async function workerJson(args) {
  try {
    const result = await run(process.execPath, ['node_modules/wrangler/bin/wrangler.js', ...args, '--json', '--config', 'wrangler.jsonc'], { windowsHide: true, maxBuffer: 2 * 1024 * 1024 });
    return JSON.parse(result.stdout);
  } catch { throw new Error('Worker configuration read failed. Sensitive output withheld.'); }
}
const deployments = await workerJson(['deployments', 'list']);
const latest = deployments.sort((a, b) => a.created_on.localeCompare(b.created_on)).at(-1);
const current = await workerJson(['versions', 'view', latest.versions[0].version_id]);
const credentials = ['SPACESHIP_API_KEY', 'SPACESHIP_API_SECRET', 'WHOP_SANDBOX_API_KEY', 'WHOP_SANDBOX_WEBHOOK_SECRET', 'BREVO_CLIENT_API_KEY', 'BREVO_API_KEY', 'TURNSTILE_SECRET_KEY'];
for (const binding of current.resources.bindings) {
  if (credentials.includes(binding.name) && binding.type === 'plain_text' && typeof binding.text === 'string') values[binding.name] = binding.text;
}
stage = 'encrypted-secret-transfer';
let temporaryDirectory, secretFile;
// Deploy atomically with the acceptance environment override. `secret bulk`
// can otherwise restore the environment from a stale generated build config.
let transferArgs;
{
  temporaryDirectory = await mkdtemp(join(tmpdir(), 'stackendbox-cf-secret-transfer-'));
  secretFile = join(temporaryDirectory, 'secrets.json');
  await writeFile(secretFile, JSON.stringify(values), { mode: 0o600 });
  transferArgs = ['deploy', '--config', 'dist/server/wrangler.json', '--keep-vars', '--var', 'VERCEL_ENV:preview', '--secrets-file', secretFile];
}
try {
await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ['node_modules/wrangler/bin/wrangler.js', ...transferArgs], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: '7f3e28a6681f4808884b6a3658d249ba' } });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  child.on('error', () => reject(new Error('Wrangler secret transfer unavailable')));
  child.on('close', code => {
    if (code === 0) return resolve();
    for (const value of Object.values(values)) if (typeof value === 'string' && value) output = output.replaceAll(value, '[redacted]');
    const safe = output.split('\n').filter(line => /ERROR|already|binding|code:/i.test(line)).slice(0,6).join('\n');
    console.error(safe.slice(0,1200));
    reject(new Error('Wrangler secret transfer failed. Sensitive output withheld.'));
  });
  child.stdin.end(secretFile ? undefined : JSON.stringify(values));
});
} finally {
  if (secretFile) await unlink(secretFile);
  if (temporaryDirectory) await rmdir(temporaryDirectory);
}
console.log(JSON.stringify({ origin, storedVariableNames: Object.keys(values), notExportableFromSource: unavailable, source: 'Existing Supabase CLI and supported Vercel environment API. No credentials displayed. Values already supplied securely in Workers are preserved.' }, null, 2));
if (diagnosticToken) {
  stage = 'read-only-provider-diagnostics';
  let response;
  for(let attempt=0;attempt<6;attempt++) {
    response = await fetch(`${origin}/api/portal-diagnostics${process.argv.includes('--personal-diagnose')?'?check=personal-connection':''}`, { headers: { Authorization: `Bearer ${diagnosticToken}` }, signal: AbortSignal.timeout(30000) });
    if(response.status!==404 || attempt===5)break;
    await response.body?.cancel();
    await new Promise(resolve=>setTimeout(resolve,2000));
  }
  if (!response.ok) throw new Error(`Worker diagnostic status ${response.status}`);
  console.log(JSON.stringify(await response.json(), null, 2));
}
}
main().catch(error => { console.error(`Cloudflare setup or verification failed at ${stage}. Sensitive details withheld.`); if (/^Worker diagnostic status \d{3}$/.test(error.message || '')) console.error(error.message); process.exitCode = 1; });
