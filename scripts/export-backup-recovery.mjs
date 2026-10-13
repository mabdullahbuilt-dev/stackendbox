import {readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createPrivateKey,createPublicKey,randomBytes} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {protect} from './lib/backup-crypto.mjs';
const root=resolve(process.env.PORTAL_BACKUP_DIR||'');
if(!process.env.PORTAL_BACKUP_DIR||root.startsWith(process.cwd()))throw Error('Recovery material must stay outside repository');
const directory=join(root,'keys'),keyPath=join(directory,'portable-recovery-key.pem'),codePath=join(directory,'portable-recovery-code.txt');
try {
  const privatePem=await protect(await readFile(join(directory,'recipient-private.dpapi')),true);
  const code=randomBytes(32).toString('base64url');
  const key=createPrivateKey(privatePem);
  const encrypted=key.export({type:'pkcs8',format:'pem',cipher:'aes-256-cbc',passphrase:code});
  // Both private files stay ACL protected. Owner must put encrypted key and
  // recovery code in separate independent locations, never Git or chat.
  const run=promisify(execFile),identity=await run('whoami.exe',['/user','/fo','csv','/nh'],{windowsHide:true});
  const sid=identity.stdout.match(/S-1-5-[0-9-]+/)?.[0];if(!sid)throw Error('identity_unavailable');
  await writeFile(codePath,code+'\n',{flag:'wx'});
  await run('icacls.exe',[codePath,'/inheritance:r','/grant:r',`*${sid}:F`,'*S-1-5-18:F'],{windowsHide:true});
  await writeFile(keyPath,encrypted,{flag:'wx'});
  await run('icacls.exe',[keyPath,'/inheritance:r','/grant:r',`*${sid}:F`,'*S-1-5-18:F'],{windowsHide:true});
  const recovered=createPrivateKey({key:await readFile(keyPath),passphrase:(await readFile(codePath,'utf8')).trim()});
  const expected=createPublicKey(await readFile(join(directory,'recipient.pem'))).export({type:'spki',format:'der'});
  if(!expected.equals(createPublicKey(recovered).export({type:'spki',format:'der'})))throw Error('portable_recovery_mismatch');
  privatePem.fill(0);
  console.log(JSON.stringify({portableRecoveryVerified:true,windowsIdentityNeededForRecovery:false,encryptedKey:keyPath,recoveryCode:codePath,independentOffsiteCustodyConfirmed:false,secretsPrinted:false}));
}catch{console.error('Portable recovery export stopped. Existing keys remain unchanged and sensitive output is withheld.');process.exitCode=1;}
