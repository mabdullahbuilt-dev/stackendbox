import { readFile, mkdtemp, writeFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify, parseEnv } from 'node:util';
import { cli, projectRef } from './lib/supabase-access.mjs';
const run = promisify(execFile);
let stage = 'configuration', directory;
async function main() {
  const config = JSON.parse(await readFile('wrangler.static.jsonc', 'utf8'));
  if (config.name !== 'stackendbox-static-acceptance' || config.routes?.length || config.triggers) throw Error('Unsafe deployment scope');
  const origin = 'https://stackendbox-static-acceptance.stackendbox.workers.dev';
  const keys = JSON.parse(await cli(['projects','api-keys','--project-ref',projectRef,'--reveal','--output','json']));
  const values = {
    NODE_ENV: 'production', NEXT_PUBLIC_SUPABASE_URL: `https://${projectRef}.supabase.co`,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: keys.find(k => k.type === 'publishable')?.api_key,
    SUPABASE_SECRET_KEY: keys.find(k => k.type === 'secret')?.api_key,
    PORTAL_APP_URL: origin, STACKENDBOX_BRIDGE_SECRET: randomBytes(32).toString('hex'),
    WHOP_MODE: 'sandbox', PORTAL_SANDBOX_CHECKOUT_ENABLED: 'true', PORTAL_JOBS_ENABLED: 'false',
    DOMAIN_LIVE_PURCHASES_ENABLED: 'false', DOMAIN_LIVE_RENEWALS_ENABLED: 'false', DOMAIN_LIVE_MUTATIONS_ENABLED: 'false', DOMAIN_MUTATION_ALLOWLIST: '', VERCEL_ENV: 'preview',
  };
  if (!values.SUPABASE_SECRET_KEY || !values.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) throw Error('Missing project keys');
  stage = 'existing-provider-configuration';
  const { token } = JSON.parse(await readFile(join(process.env.PORTAL_VERCEL_CONFIG, 'auth.json'), 'utf8'));
  const base = 'https://api.vercel.com/v9/projects/prj_K2ZRC5sHMG1y2BE6BetT3mRGOGvz/env';
  const get = async (suffix = '') => {
    const response = await fetch(`${base}${suffix}?teamId=team_7Q8We1Dt1iS6ZWjLovf5Qf4c`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000) });
    if (!response.ok) { const failure = await response.json().catch(() => ({})); const code = failure.error?.code; console.error(JSON.stringify({ provider: 'vercel_configuration', status: response.status, code: typeof code === 'string' && /^[a-z_]{1,60}$/i.test(code) ? code : 'unknown' })); throw Error('Existing provider configuration unavailable'); }
    return response.json();
  };
  const { envs } = await get();
  const names = ['SPACESHIP_API_KEY','SPACESHIP_API_SECRET','WHOP_SANDBOX_API_KEY','WHOP_SANDBOX_WEBHOOK_SECRET','WHOP_SANDBOX_COMPANY_ID','WHOP_SANDBOX_REGISTRATION_PRODUCT_ID','WHOP_SANDBOX_RENEWAL_PRODUCT_ID','BREVO_CLIENT_API_KEY','BREVO_CLIENT_SENDER_EMAIL','BREVO_CLIENT_SENDER_NAME','BREVO_CLIENT_REPLY_TO','BREVO_API_KEY','NEXT_PUBLIC_TURNSTILE_SITE_KEY','TURNSTILE_SECRET_KEY'];
  const unavailable = [];
  const usable = value => typeof value === 'string' && value.trim() && !/^(?:\[?(?:redacted|sensitive|placeholder)\]?|\*+)$/i.test(value.trim());
  const local = process.env.PORTAL_PRIVATE_ENV ? parseEnv(await readFile(process.env.PORTAL_PRIVATE_ENV, 'utf8')) : {};
  for (const name of names) {
    // Existing owner-provided local input is independent of non-exportable hosted secrets.
    if (usable(local[name])) { values[name] = local[name]; continue; }
    const record = envs.find(e => e.key === name && e.target.includes('preview') && !e.gitBranch);
    if (!record || record.type === 'sensitive') { unavailable.push(name); continue; }
    const result = await get(`/${record.id}`);
    if (usable(result.value)) values[name] = result.value;
    else unavailable.push(name);
  }
  if (!process.argv.includes('--database-only-proof')) for (const required of ['SPACESHIP_API_KEY','SPACESHIP_API_SECRET','WHOP_SANDBOX_API_KEY','TURNSTILE_SECRET_KEY','NEXT_PUBLIC_TURNSTILE_SITE_KEY']) if (!values[required]) { console.error(JSON.stringify({ missingSetting: required })); throw Error('Required provider setting unavailable'); }
  // Keep checkout disabled until the existing signed webhook can be verified here.
  if (!values.WHOP_SANDBOX_WEBHOOK_SECRET) values.PORTAL_SANDBOX_CHECKOUT_ENABLED = 'false';
  stage = 'build';
  await run(process.execPath, ['scripts/build-static-edge.mjs'], { windowsHide: true, timeout: 120000, env: { ...process.env, NEXT_PUBLIC_TURNSTILE_SITE_KEY: values.NEXT_PUBLIC_TURNSTILE_SITE_KEY } });
  stage = 'protected-transfer';
  directory = await mkdtemp(join(tmpdir(), 'stackendbox-edge-transfer-'));
  if (process.platform !== 'win32') throw Error('Windows ACL protection required');
  const { stdout: sidOutput } = await run('whoami.exe', ['/user','/fo','csv','/nh'], { windowsHide: true });
  const sid = sidOutput.match(/S-1-5-[0-9-]+/)?.[0];
  if (!sid) throw Error('Identity verification failed');
  await run('icacls.exe', [directory,'/inheritance:r','/grant:r',`*${sid}:(OI)(CI)F`,'*S-1-5-18:(OI)(CI)F'], { windowsHide: true });
  const envFile = join(directory,'edge.env');
  const workerFile = join(directory,'worker.json');
  // One namespaced secret, inherited only by this function's bootstrap.
  await writeFile(envFile, `STACKENDBOX_ACCEPTANCE_CONFIG='${JSON.stringify(values).replaceAll("'", "\\u0027")}'\n`, { flag: 'wx' });
  await writeFile(workerFile, JSON.stringify({ STACKENDBOX_BRIDGE_SECRET: values.STACKENDBOX_BRIDGE_SECRET }), { flag: 'wx' });
  stage = 'edge-secret-install';
  await cli(['secrets','set','--project-ref',projectRef,'--env-file',envFile]);
  stage = 'edge-deploy';
  await cli(['functions','deploy','stackendbox-acceptance','--project-ref',projectRef,'--no-verify-jwt','--use-api']);
  stage = 'edge-read-only-check';
  const response = await fetch(config.vars.EDGE_BACKEND_URL + '/api/portal/auth/identity', { headers: { 'x-stackendbox-bridge': values.STACKENDBOX_BRIDGE_SECRET }, signal: AbortSignal.timeout(30000) });
  const result = await response.json().catch(() => ({ error: 'non_json_response' }));
  console.log(JSON.stringify({ stage, status: response.status, error: typeof result.error === 'string' && /^[a-z_]+$/.test(result.error) ? result.error : 'unclassified' }));
  if (response.status !== 401 || result.error !== 'sign_in_required') throw Error('Edge authentication boundary failed');
  stage = 'static-deploy';
  const deployed = await run(process.execPath, ['node_modules/wrangler/bin/wrangler.js','deploy','--config','wrangler.static.jsonc','--secrets-file',workerFile], { windowsHide: true, timeout: 120000, maxBuffer: 4*1024*1024 });
  const version = deployed.stdout.match(/Current Version ID:\s*([a-f0-9-]+)/)?.[1] || null;
  console.log(JSON.stringify({ origin, version, edgeUnauthorizedStatus: response.status, jobsEnabled: false, registrarMutationsEnabled: false, unavailableSettings: unavailable }));
}
try { await main(); }
catch { console.error(JSON.stringify({ error: 'static_proof_deployment_failed', stage, sensitiveOutputWithheld: true })); process.exitCode = 1; }
finally { if (directory) { for (const name of ['edge.env','worker.json']) await unlink(join(directory,name)).catch(() => {}); await rmdir(directory).catch(() => {}); } }
