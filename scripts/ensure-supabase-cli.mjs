import {writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const folder=resolve('dist/tools'),version='2.121.0',name=`supabase_${version}_windows_amd64.tar.gz`,base=`https://github.com/supabase/cli/releases/download/v${version}/`;
await mkdir(folder,{recursive:true});
try{execFileSync(resolve(folder,'supabase.exe'),['--version'],{stdio:'ignore',windowsHide:true});}
catch{
  const checks=await (await fetch(base+'checksums.txt')).text(),expected=checks.split('\n').find(line=>line.trim().endsWith(' '+name))?.split(/\s+/)[0];
  const bytes=Buffer.from(await (await fetch(base+name)).arrayBuffer());
  if(!/^[a-f0-9]{64}$/.test(expected||'')||createHash('sha256').update(bytes).digest('hex')!==expected)throw Error('official_cli_checksum_failed');
  await writeFile(resolve(folder,name),bytes);execFileSync('tar.exe',['-xzf',resolve(folder,name),'-C',folder],{windowsHide:true,stdio:'ignore'});
}
console.log(JSON.stringify({version:execFileSync(resolve(folder,'supabase.exe'),['--version'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}).trim(),credentialChanged:false}));
