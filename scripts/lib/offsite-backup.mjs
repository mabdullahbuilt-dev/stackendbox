import {createHash,createPublicKey} from 'node:crypto';
import {createReadStream,createWriteStream} from 'node:fs';
import {writeFile,appendFile,stat} from 'node:fs/promises';
import {pipeline} from 'node:stream/promises';
import {encryptor} from './backup-crypto.mjs';

export async function sha256File(path){
  const hash=createHash('sha256');for await(const chunk of createReadStream(path))hash.update(chunk);return hash.digest('hex');
}
export async function encryptStream(source,path,publicPem){
  const key=createPublicKey(publicPem);
  if(key.asymmetricKeyType!=='rsa'||key.asymmetricKeyDetails.modulusLength<4096)throw Error('backup_public_key_invalid');
  const {cipher,header}=encryptor(publicPem);
  await writeFile(path,header,{flag:'wx',mode:0o600});
  await pipeline(source,cipher,createWriteStream(path,{flags:'a'}));
  await appendFile(path,cipher.getAuthTag());
  return {bytes:(await stat(path)).size,sha256:await sha256File(path)};
}
export function assertPrivatePermissions(permissions,email){
  if(permissions.length!==1||permissions[0].type!=='user'||permissions[0].role!=='owner'||permissions[0].emailAddress!==email)throw Error('backup_destination_not_owner_only');
}
export function retirementCandidates(files,keep=14){
  if(!Number.isInteger(keep)||keep<2)throw Error('backup_retention_invalid');
  return files.filter(f=>f.appProperties?.system==='stackendbox-encrypted-backup'&&f.appProperties?.state==='complete'&&/^backup-\d{4}-\d{2}-\d{2}T/.test(f.name))
    .sort((a,b)=>b.name.localeCompare(a.name)).slice(keep);
}
