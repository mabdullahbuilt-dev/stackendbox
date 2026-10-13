import {expect,it} from 'vitest';
import {assertPrivatePermissions,retirementCandidates} from '../scripts/lib/offsite-backup.mjs';
import {encryptStream} from '../scripts/lib/offsite-backup.mjs';
import {generateKeyPairSync,privateDecrypt,createDecipheriv} from 'node:crypto';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Readable} from 'node:stream';
it('requires the exact sole owner and rejects shared backup folders',()=>{
  expect(()=>assertPrivatePermissions([{type:'user',role:'owner',emailAddress:'owner@example.com'}],'owner@example.com')).not.toThrow();
  expect(()=>assertPrivatePermissions([{type:'anyone',role:'reader'}],'owner@example.com')).toThrow();
  expect(()=>assertPrivatePermissions([{type:'user',role:'owner',emailAddress:'other@example.com'}],'owner@example.com')).toThrow();
});
it('retains two or more complete app generations without touching manual or failed backups',()=>{
  const files=Array.from({length:16},(_,i)=>({id:String(i),name:`backup-2026-10-${String(i+1).padStart(2,'0')}T00-00`,appProperties:{system:'stackendbox-encrypted-backup',state:'complete'}}));
  const untouched=[{id:'manual',name:'backup-2026-01-01T00',appProperties:{}},{id:'failed',name:'backup-2026-01-02T00',appProperties:{system:'stackendbox-encrypted-backup',state:'incomplete'}}];
  expect(retirementCandidates([...files,...untouched],14).map(f=>f.id)).toEqual(['1','0']);
  expect(()=>retirementCandidates(files,1)).toThrow();
});
it('encrypts before disk and rejects tampered authenticated ciphertext',async()=>{
  const root=await mkdtemp(join(tmpdir(),'stackendbox-backup-fixture-'));
  try{
    const {publicKey,privateKey}=generateKeyPairSync('rsa',{modulusLength:4096,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});
    const path=join(root,'fixture.enc');await encryptStream(Readable.from(['synthetic backup fixture']),path,publicKey);
    const bytes=await readFile(path),end=bytes.indexOf(10)+1,metadata=JSON.parse(bytes.subarray(0,end).toString());
    const key=privateDecrypt({key:privateKey,oaepHash:'sha256'},Buffer.from(metadata.key,'base64'));
    const decrypt=(buffer:Buffer)=>{const cipher=createDecipheriv('aes-256-gcm',key,Buffer.from(metadata.iv,'base64'));cipher.setAAD(buffer.subarray(0,end));cipher.setAuthTag(buffer.subarray(-16));return Buffer.concat([cipher.update(buffer.subarray(end,-16)),cipher.final()]);};
    expect(decrypt(bytes).toString()).toBe('synthetic backup fixture');
    bytes[end]^=1;expect(()=>decrypt(bytes)).toThrow();
  }finally{await rm(root,{recursive:true,force:true});}
});
