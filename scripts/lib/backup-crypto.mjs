import { spawn } from 'node:child_process';
import { randomBytes, generateKeyPairSync, publicEncrypt, privateDecrypt, createCipheriv, createDecipheriv } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
export async function protect(bytes, decrypt=false) {
  const operation=decrypt?'Unprotect':'Protect';
  return new Promise((resolve,reject)=>{
    const script=`Add-Type -AssemblyName System.Security; $b=[Convert]::FromBase64String([Console]::In.ReadToEnd()); [Console]::Out.Write([Convert]::ToBase64String([Security.Cryptography.ProtectedData]::${operation}($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)))`;
    const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,stdio:['pipe','pipe','pipe']});
    const chunks=[]; child.stdout.on('data',d=>chunks.push(d)); child.stderr.resume();
    child.on('error',()=>reject(new Error('Windows key protection failed')));
    child.on('close',code=>code===0?resolve(Buffer.from(Buffer.concat(chunks).toString(),'base64')):reject(new Error('Windows key protection failed')));
    child.stdin.end(bytes.toString('base64'));
  });
}
export async function backupKeys(directory) {
  await mkdir(directory,{recursive:true});
  const publicPath=join(directory,'recipient.pem'), privatePath=join(directory,'recipient-private.dpapi');
  try { return {publicKey:await readFile(publicPath),privatePath}; }
  catch(error) { if(error.code!=='ENOENT') throw error; }
  const {publicKey,privateKey}=generateKeyPairSync('rsa',{modulusLength:4096,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});
  await writeFile(privatePath,await protect(Buffer.from(privateKey)),{flag:'wx',mode:0o600});
  await writeFile(publicPath,publicKey,{flag:'wx'});
  return {publicKey,privatePath};
}
export function encryptor(publicKey) {
  const key=randomBytes(32),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);
  const header=Buffer.from(JSON.stringify({version:1,algorithm:'AES-256-GCM+RSA-OAEP-SHA256',iv:iv.toString('base64'),key:publicEncrypt({key:publicKey,oaepHash:'sha256'},key).toString('base64')})+'\n');
  cipher.setAAD(header);
  return {cipher,header};
}
export async function decryptArtifact(path,privatePath) {
  const bytes=await readFile(path),line=bytes.indexOf(10),header=bytes.subarray(0,line+1);
  const metadata=JSON.parse(header.toString());
  if(metadata.version!==1 || metadata.algorithm!=='AES-256-GCM+RSA-OAEP-SHA256') throw new Error('Unsupported encrypted artifact');
  const privateKey=await protect(await readFile(privatePath),true);
  const key=privateDecrypt({key:privateKey,oaepHash:'sha256'},Buffer.from(metadata.key,'base64'));
  const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(metadata.iv,'base64'));
  decipher.setAAD(header); decipher.setAuthTag(bytes.subarray(-16));
  return Buffer.concat([decipher.update(bytes.subarray(line+1,-16)),decipher.final()]);
}
