import { AsyncLocalStorage } from "node:async_hooks";
const observations = new AsyncLocalStorage<{name:string;ms:number}[]>();
export async function observeLatency<T>(name: string, action: () => PromiseLike<T>): Promise<T> {
  const start = performance.now();
  try { return await action(); }
  finally { observations.getStore()?.push({name,ms:performance.now()-start}); }
}
export async function withLatency(action: () => Promise<Response>) {
  const metrics: {name:string;ms:number}[]=[];
  const start=performance.now();
  return observations.run(metrics,async()=>{
    const response=await action();
    metrics.push({name:"backend",ms:performance.now()-start});
    const headers=new Headers(response.headers);
    headers.set("Server-Timing",metrics.filter(m=>/^[a-z_]+$/.test(m.name)).map(m=>`${m.name};dur=${m.ms.toFixed(1)}`).join(", "));
    return new Response(response.body,{status:response.status,headers});
  });
}
