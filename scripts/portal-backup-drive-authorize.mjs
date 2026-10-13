// One-time owner authorization only. Scheduled backups do not use this server.
// Credential files must live in a restricted directory outside the repository.
import {createServer} from 'node:http';
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {readFile,writeFile,realpath} from 'node:fs/promises';
import {resolve,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertPrivatePermissions} from './lib/offsite-backup.mjs';

const origin='http://127.0.0.1:8765',redirect=`${origin}/oauth/callback`;
const scope='https://www.googleapis.com/auth/drive.file';
const folder='1myfe2U3XTBILqOVp77dTbSMDGwRkUj7m',owner='mabdullah.built@gmail.com';
const random=()=>randomBytes(32).toString('base64url');
const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const html=(content)=>`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>StackEndBox private backup authorization</title><style>body{font:18px system-ui;max-width:760px;margin:60px auto;padding:24px;line-height:1.6}button{font:inherit;padding:12px}a{color:#174ea6}</style><body><h1>StackEndBox backup authorization</h1>${content}</body></html>`;

export async function startDriveAuthorization(configPath,outputPath,expectedProjectId){
  const repo=await realpath(resolve(dirname(fileURLToPath(import.meta.url)),'..'));
  const input=await realpath(configPath),out=resolve(outputPath);
  for(const path of [input,await realpath(dirname(out))])if(path===repo||path.startsWith(repo+sep))throw Error('credential_path_must_be_outside_repository');
  const config=JSON.parse(await readFile(input,'utf8'));
  if(config.credential_status==='requires_owner_replacement')throw Error('oauth_credential_replacement_required');
  const client=config.web;
  if(typeof expectedProjectId!=='string'||!/^stackendbox-backups(?:-[a-z0-9-]+)?$/.test(expectedProjectId)||client?.project_id!==expectedProjectId||!client.client_id?.endsWith('.apps.googleusercontent.com')||!client.client_secret||!client.redirect_uris?.includes(redirect))throw Error('backup_oauth_client_invalid');
  if(typeof config.picker_key!=='string'||!config.picker_key)throw Error('restricted_picker_key_missing');
  let session=random(),csrf=random(),state,verifier,tokens,expires=Date.now()+30*60*1000,completed=false;
  const request=async(url,options={})=>{const response=await fetch(url,{...options,signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('google_authorization_request_failed');return response.json();};
  const server=createServer(async(req,res)=>{
    res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');
    // Google's Picker needs its own iframe and scripts. No other third-party code.
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' https://apis.google.com 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-src https://docs.google.com https://drive.google.com; connect-src 'self' https://*.googleapis.com; img-src 'self' https://*.googleusercontent.com data:");
    const send=(status,body,type='text/html')=>{res.writeHead(status,{'Content-Type':`${type}; charset=utf-8`});res.end(body);};
    try{
      if(req.headers.host!=='127.0.0.1:8765'||Date.now()>expires)return send(403,html('<p>Authorization session closed. Restart the helper.</p>'));
      const url=new URL(req.url,origin),cookie=req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('backup_session='))?.slice('backup_session='.length);
      if(url.pathname==='/'&&req.method==='GET'){
        res.setHeader('Set-Cookie',`backup_session=${session}; HttpOnly; SameSite=Lax; Path=/; Max-Age=1800`);
        return send(200,html(`<p>Authorize only files selected for this app, then select <strong>StackEndBox/Encrypted-Backups</strong>. The recovery code and private encryption key aren't requested.</p><form method="post" action="/authorize"><input type="hidden" name="csrf" value="${csrf}"><button>Open Google authorization</button></form>`));
      }
      if(!equal(cookie,session))return send(403,html('<p>Invalid authorization session.</p>'));
      if(req.method==='POST'){
        if(req.headers.origin!==origin)return send(403,html('<p>Invalid request origin.</p>'));
        let body='';for await(const chunk of req){body+=chunk;if(body.length>4096)throw Error('request_too_large');}
        const data=new URLSearchParams(body);if(!equal(data.get('csrf'),csrf))return send(403,html('<p>Invalid request token.</p>'));
        if(url.pathname==='/authorize'){
          if(tokens||completed)return send(409,html('<p>Already authorized. Continue with folder selection.</p>'));
          state=random();verifier=random();
          const target=new URL('https://accounts.google.com/o/oauth2/v2/auth');
          target.search=new URLSearchParams({client_id:client.client_id,redirect_uri:redirect,response_type:'code',scope,access_type:'offline',prompt:'consent',state,login_hint:owner,include_granted_scopes:'false',code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'}).toString();
          res.writeHead(303,{Location:target.href});return res.end();
        }
        if(url.pathname==='/select-folder'){
          if(completed||!tokens?.access_token||data.get('folder')!==folder)throw Error('backup_folder_invalid');
          const headers={Authorization:`Bearer ${tokens.access_token}`};
          const about=await request('https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)',{headers});
          if(about.user?.emailAddress!==owner)throw Error('backup_owner_mismatch');
          const metadata=await request(`https://www.googleapis.com/drive/v3/files/${folder}?fields=id,name,mimeType,trashed`,{headers});
          if(metadata.mimeType!=='application/vnd.google-apps.folder'||metadata.trashed||metadata.name!=='Encrypted-Backups')throw Error('backup_folder_invalid');
          const permissions=await request(`https://www.googleapis.com/drive/v3/files/${folder}/permissions?fields=permissions(type,role,emailAddress),nextPageToken`,{headers});
          if(permissions.nextPageToken)throw Error('backup_permissions_incomplete');assertPrivatePermissions(permissions.permissions||[],owner);
          // Inherit the owner-restricted directory ACL on Windows. Never log values.
          await writeFile(out,JSON.stringify({client_id:client.client_id,client_secret:client.client_secret,refresh_token:tokens.refresh_token,scope,folder,owner,authorized_at:new Date().toISOString(),refresh_token_expires_in:tokens.refresh_token_expires_in??null}),{flag:'wx',mode:0o600});
          completed=true;tokens=undefined;expires=Date.now()+60000;
          console.log(JSON.stringify({authorized:true,folderPrivate:true,scope:'drive.file',credentialsSavedOutsideRepository:true}));
          return send(200,html('<p>Owner and private folder verified. The authorization credentials were saved outside the repository. Hosted backup execution is still pending configuration and a verified remote run.</p>'));
        }
      }
      if(url.pathname==='/oauth/callback'&&req.method==='GET'){
        if(!state||!equal(url.searchParams.get('state'),state)||!url.searchParams.get('code')||url.searchParams.has('error'))throw Error('oauth_callback_invalid');
        state=undefined;
        tokens=await request('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id:client.client_id,client_secret:client.client_secret,code:url.searchParams.get('code'),redirect_uri:redirect,grant_type:'authorization_code',code_verifier:verifier})});
        verifier=undefined;
        if(!tokens.refresh_token||!tokens.access_token||tokens.scope!==scope)throw Error('oauth_offline_scope_invalid');
        // Strip the single-use code before loading Google's Picker scripts.
        res.writeHead(303,{Location:'/choose-folder'});return res.end();
      }
      if(url.pathname==='/choose-folder'&&req.method==='GET'&&tokens?.access_token){
        return send(200,html(`<p>Select the existing private <strong>Encrypted-Backups</strong> folder. No sharing permissions will change.</p><button id="pick" disabled>Select private backup folder</button><p id="status">Loading Google Picker...</p><script>
          function pickerLoaded(){gapi.load('picker',()=>{document.getElementById('pick').disabled=false;document.getElementById('status').textContent='Ready';});}
          document.getElementById('pick').onclick=()=>{
            const view=new google.picker.DocsView(google.picker.ViewId.FOLDERS).setIncludeFolders(true).setSelectFolderEnabled(true);
            new google.picker.PickerBuilder().addView(view).setAppId(${JSON.stringify(client.client_id.split('-')[0])}).setDeveloperKey(${JSON.stringify(config.picker_key)}).setOAuthToken(${JSON.stringify(tokens.access_token)}).setOrigin(${JSON.stringify(origin)}).setCallback(async data=>{
              if(data.action!==google.picker.Action.PICKED)return;
              const selected=data.docs?.[0]?.id;if(selected!==${JSON.stringify(folder)}){document.getElementById('status').textContent='Select only the existing Encrypted-Backups folder.';return;}
              const form=document.createElement('form');form.method='POST';form.action='/select-folder';
              for(const [name,value]of Object.entries({csrf:${JSON.stringify(csrf)},folder:selected})){const input=document.createElement('input');input.type='hidden';input.name=name;input.value=value;form.append(input);}document.body.append(form);form.submit();
            }).build().setVisible(true);
          };
          </script><script async defer src="https://apis.google.com/js/api.js" onload="pickerLoaded()"></script>`));
      }
      return send(404,html('<p>Page unavailable. Start at the authorization home.</p>'));
    }catch{
      // No OAuth errors, request URLs, token bodies or private fields in logs.
      send(400,html('<p>Authorization failed safely. No credentials were displayed or uploaded. Check the approved client, Drive API, Picker API, consent status and folder selection.</p>'));
    }
  });
  const timer=setTimeout(()=>server.close(),30*60*1000);timer.unref();
  server.on('close',()=>{clearTimeout(timer);tokens=undefined;session=undefined;csrf=undefined;});
  await new Promise((resolve,reject)=>{server.once('error',()=>reject(Error('loopback_server_failed')));server.listen(8765,'127.0.0.1',resolve);});
  console.log('One-time owner backup authorization ready at http://127.0.0.1:8765. No credential values are logged.');
  return server;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{if(process.argv.length!==5)throw Error('private_paths_and_verified_project_required');await startDriveAuthorization(process.argv[2],process.argv[3],process.argv[4]);}
  catch{console.error('Backup authorization setup failed safely. Check the private configuration paths and restricted Picker key.');process.exitCode=1;}
}
