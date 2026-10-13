import {afterEach,expect,it,vi} from "vitest";
import {selectiveIngress} from "../platform/routing/selective-ingress";
const origins={publicOrigin:"https://original.example",portalOrigin:"https://portal.example"};
afterEach(()=>vi.unstubAllGlobals());
it("forwards original public paths unchanged and keeps private auth cookies away from that application",async()=>{
  const backend=vi.fn(async(url:URL,init:RequestInit)=>{
    expect(url.origin).toBe(origins.publicOrigin);
    expect(new Headers(init.headers).get("cookie")).toBe("public-preference=kept");
    expect(new Headers(init.headers).has("authorization")).toBe(false);
    return new Response("original unchanged bytes",{headers:{"content-type":"text/html","cache-control":"max-age=100"}});
  });vi.stubGlobal("fetch",backend);
  for(const path of ["/","/services","/_next/static/site.js","/api/brief","/administrator"]){
    const result=await selectiveIngress(new Request(`https://www.company.example${path}`,{headers:{Cookie:"sb-project-auth-token.0=private; public-preference=kept",Authorization:"Bearer private"}}),origins);
    expect(await result.text()).toBe("original unchanged bytes");
    expect(result.headers.get("cache-control")).toBe("max-age=100");
    expect(backend.mock.calls.at(-1)![0].pathname).toBe(path);
  }
});
it("routes only portal prefixes with cookies and origin intact, without caching or following redirects",async()=>{
  vi.stubGlobal("fetch",vi.fn(async(url:URL,init:RequestInit)=>{
    expect(url.origin).toBe(origins.portalOrigin);expect(init.redirect).toBe("manual");
    expect(new Headers(init.headers).get("origin")).toBe("https://www.company.example");
    expect(new Headers(init.headers).get("cookie")).toBe("sb-project-auth-token=private");
    return new Response(null,{status:303,headers:{Location:"/admin", "Set-Cookie":"sb-project-auth-token=fresh; Secure; HttpOnly; Path=/"}});
  }));
  for(const path of ["/admin","/admin/clients","/client-portal","/client-portal/api/auth/login"]){
    const response=await selectiveIngress(new Request(`https://www.company.example${path}`,{headers:{Origin:"https://www.company.example",Cookie:"sb-project-auth-token=private"}}),origins);
    expect(response.status).toBe(303);expect(response.headers.get("location")).toBe("/admin");expect(response.headers.get("cache-control")).toBe("private, no-store");expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  }
});
it("rejects a self-referencing origin rather than creating a proxy loop",async()=>{
  const backend=vi.fn();vi.stubGlobal("fetch",backend);
  expect((await selectiveIngress(new Request("https://original.example/"),origins)).status).toBe(503);expect(backend).not.toHaveBeenCalled();
});
