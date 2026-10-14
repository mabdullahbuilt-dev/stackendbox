import {afterEach,expect,it,vi} from "vitest";
import {readFileSync} from "node:fs";
import fullSite from "../platform/cloudflare/full-site-gateway";
const assets=vi.fn(async(req:Request)=>new Response(new URL(req.url).pathname));
const env={ASSETS:{fetch:assets},EDGE_BACKEND_URL:"https://project.supabase.co/functions/v1/production",STACKENDBOX_BRIDGE_SECRET:"fixture"};
afterEach(()=>{vi.unstubAllGlobals();vi.clearAllMocks();});
it("runs the gateway for homepage requests so the owned apex redirect is not bypassed by static assets",()=>{
  for(const file of ["wrangler.production-candidate.jsonc","wrangler.main-domain.jsonc"]){
    const config=readFileSync(file,"utf8");
    expect(config).toContain('"run_worker_first": ["/", "/index.html"');
  }
});
it("preserves the original homepage and public assets alongside both portal shells",async()=>{
  for(const path of ["/","/site.js","/site.css","/sitemap.xml","/robots.txt"])
    expect(await (await fullSite.fetch(new Request(`https://candidate.example${path}`),env)).text()).toBe(path);
  for(const path of ["/admin","/admin/clients/new","/client-portal/login"])
    expect(await (await fullSite.fetch(new Request(`https://candidate.example${path}`),env)).text()).toBe("/portal.html");
  expect(await (await fullSite.fetch(new Request("https://candidate.example/client-portal/_assets/release.json"),env)).text()).toBe("/release.json");
});
it("keeps public contact and private authentication on their separate backend paths",async()=>{
  const backend=vi.fn(async(_target:URL)=>Response.json({ok:true}));vi.stubGlobal("fetch",backend);
  for(const [path,target] of [["/api/brief","/api/brief"],["/client-portal/api/auth/login","/api/portal/auth/login"]]){
    await fullSite.fetch(new Request(`https://candidate.example${path}`,{method:"POST",body:"{}"}),env);
    expect(String(backend.mock.calls.at(-1)![0])).toContain(`/production${target}`);
  }
});
it("canonicalizes only the actual owned apex without caching rollback-sensitive redirects",async()=>{
  const response=await fullSite.fetch(new Request("https://stackendbox.com/admin?x=1"),env);
  expect(response.status).toBe(307);expect(response.headers.get("location")).toBe("https://www.stackendbox.com/admin?x=1");
  expect(response.headers.get("cache-control")).toBe("no-store");
});
