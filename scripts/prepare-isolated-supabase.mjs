// Disposable WSL native Supabase stack. No linked project or customer data.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const run=promisify(execFile),version='2.121.0',archive=`supabase_${version}_linux_amd64.tar.gz`;
const output=resolve('dist/isolated-auth');
const shortLivedAuth=process.argv.includes('--short-lived-auth');
const linuxPath=path=>'/mnt/'+path[0].toLowerCase()+path.slice(2).replaceAll('\\','/');
const wsl=async args=>(await run('wsl',['-d','Ubuntu','--',...args],{windowsHide:true,timeout:600000,maxBuffer:4194304})).stdout;
let stage='download';
try{
  await mkdir(output,{recursive:true});
  const base=`https://github.com/supabase/cli/releases/download/v${version}/`;
  const checks=await (await fetch(base+'checksums.txt')).text();
  const expected=checks.split('\n').find(line=>line.trim().endsWith(' '+archive))?.split(/\s+/)[0];
  if(!/^[a-f0-9]{64}$/.test(expected||''))throw Error('checksum_missing');
  const bytes=Buffer.from(await (await fetch(base+archive)).arrayBuffer());
  if(createHash('sha256').update(bytes).digest('hex')!==expected)throw Error('checksum_mismatch');
  await writeFile(resolve(output,archive),bytes);
  stage='workspace';
  let state;
  try{state=JSON.parse(await readFile(resolve(output,'stack-location.json'),'utf8'));}catch{}
  if(!state){
    const root=(await wsl(['mktemp','-d','/tmp/stackendbox-auth-XXXXXX'])).trim();
    if(!/^\/tmp\/stackendbox-auth-[a-zA-Z0-9]+$/.test(root))throw Error('workspace_invalid');
    state={root,version};await writeFile(resolve(output,'stack-location.json'),JSON.stringify(state));
  }
  if(state.version!==version||!/^\/tmp\/stackendbox-auth-[a-zA-Z0-9]+$/.test(state.root))throw Error('workspace_invalid');
  const root=state.root;
  await wsl(['mkdir','-p',root+'/bin',root+'/project/supabase']);
  await wsl(['tar','-xzf',linuxPath(resolve(output,archive)),'-C',root+'/bin']);
  let fixtureConfig=await readFile('tests/fixtures/isolated-supabase/config.toml','utf8');
  if(shortLivedAuth)fixtureConfig=fixtureConfig.replace('[auth]','[auth]\njwt_expiry = 60');
  await writeFile(resolve(output,'runtime-config.toml'),fixtureConfig);
  await wsl(['cp',linuxPath(resolve(output,'runtime-config.toml')),root+'/project/supabase/config.toml']);
  await wsl(['cp','-r',linuxPath(resolve('supabase/migrations')),root+'/project/supabase/']);
  stage='start';console.log(JSON.stringify({stage,runtime:'native',cliVersion:version,isolated:true}));
  await wsl([root+'/bin/supabase','--workdir',root+'/project','start','--runtime','native','--exclude','realtime,functions,studio,mail,analytics,pooler','--eager']);
  stage='status';
  const status=await wsl([root+'/bin/supabase','--workdir',root+'/project','status','--output-format','json']);
  const config=JSON.parse(status);
  if(config.runtime!=='native'||!/^http:\/\/(127\.0\.0\.1|localhost):/.test(config.env?.API_URL||''))throw Error('local_endpoint_required');
  await writeFile(resolve(output,'local-status.json'),JSON.stringify(config),{mode:0o600});
  console.log(JSON.stringify({ready:true,runtime:'native',cliVersion:version,configurationSavedLocally:true,hostedProjectChanged:false}));
}catch(error){
  // The CLI prints local credentials at startup. Never forward its raw output.
  const safe=String(error.stderr||error.message||'').split('\n').filter(line=>/error|failed|unsupported|unknown|invalid|download|checksum/i.test(line)&&!/(key|token|password|secret|postgres:\/\/)/i.test(line)).slice(-5).map(line=>line.slice(0,300));
  console.error(JSON.stringify({error:'isolated_runtime_setup_failed',stage,details:safe,credentialsWithheld:true}));process.exitCode=1;
}
