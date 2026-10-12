import { randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
const run = promisify(execFile);
const cli = process.env.PORTAL_VERCEL_BIN;
const config = process.env.PORTAL_VERCEL_CONFIG;
if (!cli || !config) throw new Error('Provide PORTAL_VERCEL_BIN and PORTAL_VERCEL_CONFIG.');
const token = randomBytes(32).toString('hex');
const options = { maxBuffer: 4 * 1024 * 1024, windowsHide: true };
try {
  const deployment = await run(process.execPath, [cli, 'deploy', '--yes', '--global-config', config, '--env', `PORTAL_DIAGNOSTICS_TOKEN=${token}`], options);
  const urls = deployment.stdout.match(/https:\/\/[a-z0-9-]+\.vercel\.app/g);
  const url = urls?.at(-1);
  if (!url) throw new Error('Deployment URL missing');
  console.log(`Preview deployed: ${url}`);
  const auth = JSON.parse(await readFile(`${config}/auth.json`,'utf8'));
  const check = await run(process.execPath, [cli, 'curl', '/api/portal-diagnostics', '--deployment', url, '--', '--silent', '--show-error', '--header', `Authorization: Bearer ${token}`], {...options,env:{...process.env,VERCEL_TOKEN:auth.token}});
  const result = JSON.parse(check.stdout);
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  // Never dump child arguments, env, or error objects containing the token.
  console.error('Preview verification failed. Inspect deployment build logs in Vercel.');
  if (error.stderr) console.error(String(error.stderr).replaceAll(token, '[redacted]').slice(-6000));
  process.exitCode = 1;
}
