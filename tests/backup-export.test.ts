import {expect,it,vi} from 'vitest';
import {backupHandler} from '../supabase/functions/stackendbox-backup-export/handler';
const token='synthetic-backup-token-only-'.padEnd(48,'x');
const config={token,serviceKey:'synthetic-server-key',url:'https://irzjkdxxfvobtabwkqmz.supabase.co'};
const request=(operation:string,body:Record<string,unknown>={})=>new Request('https://irzjkdxxfvobtabwkqmz.supabase.co/functions/v1/stackendbox-backup-export',{method:'POST',headers:{Authorization:`Bearer ${token}`},body:JSON.stringify({operation,...body})});
it('rejects anonymous and browser-origin requests before using the privileged service key',async()=>{
  const provider=vi.fn<typeof fetch>();const handler=backupHandler(config,provider);
  expect((await handler(new Request('https://example.test',{method:'POST',body:'{}'}))).status).toBe(401);
  expect((await handler(new Request('https://example.test',{method:'POST',headers:{Authorization:`Bearer ${token}`,Origin:'https://example.test'},body:'{}'}))).status).toBe(401);
  expect(provider).not.toHaveBeenCalled();
});
it('permits only backup reads and constrained audit records, without arbitrary provider operations',async()=>{
  const provider=vi.fn<typeof fetch>().mockResolvedValue(Response.json([]));const handler=backupHandler(config,provider);
  expect((await handler(request('buckets'))).status).toBe(200);
  expect(provider.mock.calls[0][0]).toBe('https://irzjkdxxfvobtabwkqmz.supabase.co/storage/v1/bucket');
  provider.mockClear();
  for(const operation of ['delete','upload','renew','users','sql'])expect((await handler(request(operation))).status).toBe(400);
  expect((await handler(request('download',{bucket:'portal-documents',path:'../private'}))).status).toBe(400);
  expect((await handler(request('record',{runId:'bad'}))).status).toBe(400);
  expect(provider).not.toHaveBeenCalled();
});
it('withholds upstream error bodies and all credential values',async()=>{
  const provider=vi.fn<typeof fetch>().mockResolvedValue(new Response('synthetic-private-provider-error',{status:500}));
  const result=await backupHandler(config,provider)(request('buckets'));
  expect(result.status).toBe(502);expect(await result.text()).toBe('{"error":"backup_export_failed"}');
});
