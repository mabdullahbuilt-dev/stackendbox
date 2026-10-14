import {expect,it} from "vitest";
import proposal from "../platform/routing/vercel.project-routes.proposed.json";
import portals from "../platform/cloudflare/portal-path-gateway";
import {vi} from "vitest";
function route(input:string,rules=proposal.requests){
  const url=new URL(input);
  for(const {route:item} of rules){
    if(!item.enabled||item.route.has.some(condition=>condition.type==="host"&&condition.value!==url.hostname))continue;
    const matched=new RegExp(item.route.src).exec(url.pathname);if(!matched)continue;
    return item.route.dest.replace(/\$(\d+)/g,(_,index)=>matched[Number(index)]||"")+url.search;
  }
  return null;
}
it("preserves exact portal paths, nested routes, query strings and private namespaces",()=>{
  for(const path of ["/admin","/admin/clients/new","/admin/domains#domain-handoff","/client-portal","/client-portal/_assets/portal.js","/client-portal/_assets/portal.css","/client-portal/auth/callback?token_hash=fixture&type=invite","/client-portal/api/auth/login","/client-portal/api/upload","/client-portal/api/documents/fixture","/client-portal/api/invoices/fixture/download"]){
    const target=route(`https://www.stackendbox.com${path}`);const original=new URL(`https://www.stackendbox.com${path}`);
    expect(target).toBe(proposal.origin+original.pathname+original.search);
  }
});
it("cannot capture the homepage, public APIs, public assets, near matches or deployment aliases",()=>{
  for(const path of ["/","/api/brief","/api/contact","/api/portal/auth/login","/api/webhooks/whop","/_next/static/public.js","/styles/site.css","/administrator","/admin-dashboard","/client-portals","/client-portal%2Fapi","/Admin"])
    expect(route(`https://www.stackendbox.com${path}`)).toBeNull();
  for(const host of ["stackendbox.com","stackendbox.vercel.app","preview.vercel.app","portal.stackendbox.com"])
    expect(route(`https://${host}/admin`)).toBeNull();
});
it("requires private uncached responses and does not constrain POST/download methods",()=>{
  expect(proposal.requests).toHaveLength(2);
  for(const {route:item} of proposal.requests){
    expect(item.route.headers["Cache-Control"]).toBe("private, no-store");expect(item.route.respectOriginCacheControl).toBe(true);
    expect(item.route).not.toHaveProperty("methods");expect(item.route).not.toHaveProperty("status");
  }
});
it("restoring the recorded empty baseline removes portal rewrites without affecting website routing",()=>{
  expect(route("https://www.stackendbox.com/admin",[])).toBeNull();expect(route("https://www.stackendbox.com/client-portal/api/auth/login",[])).toBeNull();
  expect(route("https://www.stackendbox.com/",[])).toBeNull();
});
it("passes same-domain authenticated POST fixtures through the proposed route and isolated gateway",async()=>{
  const backend=vi.fn(async(target:URL,options:RequestInit)=>{
    expect(target.pathname).toBe("/functions/v1/stackendbox-production/api/portal/auth/login");expect(target.search).toBe("?fixture=1");
    const headers=new Headers(options.headers);expect(headers.get("origin")).toBe("https://www.stackendbox.com");expect(headers.get("cookie")).toBe("session=isolated-fixture");
    expect(await new Response(options.body).text()).toBe('{"fixture":true}');
    return new Response('{}',{headers:{"Set-Cookie":"session=fixture-refreshed; HttpOnly; Secure; SameSite=Lax; Path=/"}});
  });vi.stubGlobal("fetch",backend);
  try{
    const incoming=new Request("https://www.stackendbox.com/client-portal/api/auth/login?fixture=1",{method:"POST",body:'{"fixture":true}',headers:{Origin:"https://www.stackendbox.com",Cookie:"session=isolated-fixture"}});
    const response=await portals.fetch(new Request(route(incoming.url)!,incoming),{ASSETS:{fetch:vi.fn()},EDGE_BACKEND_URL:"https://project.supabase.co/functions/v1/stackendbox-production",STACKENDBOX_BRIDGE_SECRET:"isolated-fixture"});
    expect(response.headers.get("set-cookie")).toContain("HttpOnly; Secure; SameSite=Lax; Path=/");expect(response.headers.get("cache-control")).toBe("private, no-store");
  }finally{vi.unstubAllGlobals();}
});
it("preserves download and redirect responses without caching private fixtures",async()=>{
  vi.stubGlobal("fetch",vi.fn(async(target:URL)=>target.pathname.endsWith('/download')?new Response('fixture invoice',{headers:{'Content-Disposition':'attachment; filename="invoice.txt"','Content-Type':'text/plain'}}):new Response(null,{status:303,headers:{Location:'https://www.stackendbox.com/client-portal/dashboard'}})));
  const env={ASSETS:{fetch:vi.fn()},EDGE_BACKEND_URL:"https://project.supabase.co/functions/v1/stackendbox-production",STACKENDBOX_BRIDGE_SECRET:"isolated-fixture"};
  try{
    const download=await portals.fetch(new Request(route('https://www.stackendbox.com/client-portal/api/invoices/fixture/download')!),env);
    expect(download.headers.get('content-disposition')).toContain('attachment');expect(await download.text()).toBe('fixture invoice');
    const redirect=await portals.fetch(new Request(route('https://www.stackendbox.com/client-portal/api/auth/session')!),env);
    expect(redirect.status).toBe(303);expect(redirect.headers.get('location')).toBe('https://www.stackendbox.com/client-portal/dashboard');expect(redirect.headers.get('cache-control')).toBe('private, no-store');
  }finally{vi.unstubAllGlobals();}
});
