import {createHash,createPublicKey,X509Certificate} from 'node:crypto';
import {createReadStream,createWriteStream} from 'node:fs';
import {writeFile,appendFile,stat,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {pipeline} from 'node:stream/promises';
import {encryptor} from './backup-crypto.mjs';

export async function verifiedRootCertificate(){
  // Public CA from the existing project's Download certificate control, not a
  // private credential or a change to operating-system trust settings.
  const path=fileURLToPath(new URL('../assets/supabase-root-ca-2021.crt',import.meta.url));
  const certificate=new X509Certificate(await readFile(path));
  if(!certificate.ca||certificate.fingerprint256!=='80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA'||Date.parse(certificate.validTo)<=Date.now())throw Error('backup_ca_certificate_invalid');
  return path;
}

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
