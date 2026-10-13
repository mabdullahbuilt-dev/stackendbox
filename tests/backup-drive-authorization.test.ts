import {it,expect} from 'vitest';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import type {Server} from 'node:http';
import {startDriveAuthorization} from '../scripts/portal-backup-drive-authorize.mjs';

it('restricts the one-time helper to scoped offline consent, protected session and exact local origin',async()=>{
  const root=await mkdtemp(join(tmpdir(),'stackendbox-oauth-fixture-'));
  let server:Server|undefined;
  try{
    const config=join(root,'fake-client.json');
    await writeFile(config,JSON.stringify({web:{project_id:'stackendbox-backups-fixture',client_id:'607048445965-synthetic.apps.googleusercontent.com',client_secret:'synthetic-test-only',redirect_uris:['http://127.0.0.1:8765/oauth/callback']},picker_key:'synthetic-picker-only'}));
    await expect(startDriveAuthorization(config,join(root,'private-output.json'),'focal-maker-509915-r9')).rejects.toThrow('backup_oauth_client_invalid');
    server=await startDriveAuthorization(config,join(root,'private-output.json'),'stackendbox-backups-fixture');
    const initial=await fetch('http://127.0.0.1:8765/');
    const page=await initial.text(),cookie=initial.headers.get('set-cookie')!.split(';')[0];
    expect(page).not.toContain('synthetic-test-only');
    expect(initial.headers.get('cache-control')).toBe('no-store');
    expect(initial.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    const csrf=/name="csrf" value="([^"]+)"/.exec(page)![1];
    const body=new URLSearchParams({csrf});
    expect((await fetch('http://127.0.0.1:8765/authorize',{method:'POST',headers:{cookie,Origin:'https://unrelated.example'},body})).status).toBe(403);
    expect((await fetch('http://127.0.0.1:8765/authorize',{method:'POST',headers:{Origin:'http://127.0.0.1:8765'},body})).status).toBe(403);
    const consent=await fetch('http://127.0.0.1:8765/authorize',{method:'POST',headers:{cookie,Origin:'http://127.0.0.1:8765'},body,redirect:'manual'});
    expect(consent.status).toBe(303);
    const target=new URL(consent.headers.get('location')!);
    expect(target.origin).toBe('https://accounts.google.com');
    expect(target.searchParams.get('scope')).toBe('https://www.googleapis.com/auth/drive.file');
    expect(target.searchParams.get('access_type')).toBe('offline');
    expect(target.searchParams.get('include_granted_scopes')).toBe('false');
    expect(target.searchParams.get('code_challenge_method')).toBe('S256');
    const invalid=await fetch('http://127.0.0.1:8765/oauth/callback?code=synthetic&state=incorrect',{headers:{cookie}});
    expect(invalid.status).toBe(400);
    expect(invalid.headers.get('referrer-policy')).toBe('no-referrer');
    expect(await invalid.text()).not.toContain('synthetic-test-only');
  }finally{
    if(server){const running=server;running.closeAllConnections();await new Promise<void>(done=>running.close(()=>done()));}
    if(dirname(root)!==resolve(tmpdir())||!root.startsWith(join(resolve(tmpdir()),'stackendbox-oauth-fixture-')))throw Error('fixture_cleanup_scope_invalid');
    await rm(root,{recursive:true,force:true});
  }
});
