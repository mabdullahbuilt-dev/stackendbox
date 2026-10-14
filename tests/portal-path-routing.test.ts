import {afterEach,expect,it,vi} from "vitest";
import portals from "../platform/cloudflare/portal-path-gateway";
const assets=vi.fn(async(_req: Request)=>new Response("portal asset"));
const env={ASSETS:{fetch:assets},EDGE_BACKEND_URL:"https://project.supabase.co/functions/v1/stackendbox-acceptance",STACKENDBOX_BRIDGE_SECRET:"test-only"};
afterEach(()=>{vi.unstubAllGlobals();vi.clearAllMocks();});
it("cannot intercept the original homepage, contact form or public assets",async()=>{
  const backend=vi.fn();vi.stubGlobal("fetch",backend);
  for(const path of ["/","/api/brief","/api/portal/auth/identity","/site.css","/brand/mark.png","/administrator","/client-portals","/client-portal/unknown","/client-portal/domains/buy"])
    expect((await portals.fetch(new Request(`https://portal.example${path}`),env)).status).toBe(404);
  expect(assets).not.toHaveBeenCalled();expect(backend).not.toHaveBeenCalled();
});
it("serves both portal shells and only their namespaced assets",async()=>{
  for(const path of ["/admin","/admin/clients/new","/client-portal","/client-portal/domains/example.test"]){
    await portals.fetch(new Request(`https://portal.example${path}`),env);
    expect(new URL(assets.mock.calls.at(-1)![0].url).pathname).toBe("/portal.html");
  }
  await portals.fetch(new Request("https://portal.example/client-portal/_assets/fonts/geist.woff2"),env);
  expect(new URL(assets.mock.calls.at(-1)![0].url).pathname).toBe("/fonts/geist.woff2");
  expect((await portals.fetch(new Request("https://portal.example/client-portal/_assets/not-present"),env)).status).toBe(404);
  const shell=await portals.fetch(new Request("https://portal.example/client-portal/account"),env);
  expect(shell.headers.get("x-frame-options")).toBe("DENY");
  expect(shell.headers.get("referrer-policy")).toBe("no-referrer");
});
it("preserves POST bodies, origin and cookies through the private API prefix",async()=>{
  const backend=vi.fn(async(target:URL,init:RequestInit)=>{
    expect(target.pathname).toBe("/functions/v1/stackendbox-acceptance/api/portal/auth/login");
    expect(new Headers(init.headers).get("origin")).toBe("https://www.stackendbox.com");
    expect(new Headers(init.headers).get("cookie")).toBe("session=fixture");
    expect(await new Response(init.body).text()).toBe('{"fixture":true}');
    return new Response('{}',{headers:{"Set-Cookie":"session=refreshed; HttpOnly; Secure; SameSite=Lax; Path=/"}});
  });vi.stubGlobal("fetch",backend);
  const response=await portals.fetch(new Request("https://www.stackendbox.com/client-portal/api/auth/login",{method:"POST",body:'{"fixture":true}',headers:{Origin:"https://www.stackendbox.com",Cookie:"session=fixture"}}),env);
  expect(response.headers.get("set-cookie")).toContain("HttpOnly; Secure");
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});
it("keeps legacy callback session exchange inside the portal prefix",async()=>{
  vi.stubGlobal("fetch",vi.fn(async()=>new Response("url='/api/portal/auth/session';",{headers:{"content-type":"text/html"}})));
  const response=await portals.fetch(new Request("https://portal.example/client-portal/auth/callback"),env);
  expect(await response.text()).toContain("'/client-portal/api/auth/session'");
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});
it("preserves approved backup OAuth notices only on the isolated production origin",async()=>{
  for(const file of ["backup-privacy.html","backup-authorization.html"]){
    expect((await portals.fetch(new Request(`https://stackendbox-production.stackendbox.workers.dev/${file}`),env)).status).toBe(200);
    expect((await portals.fetch(new Request(`https://www.stackendbox.com/${file}`),env)).status).toBe(404);
    expect((await portals.fetch(new Request(`https://portal.example/${file}`),env)).status).toBe(404);
  }
});
