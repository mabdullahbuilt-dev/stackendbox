import {expect,it} from "vitest";
import {portalPageRoute} from "../lib/portal/page-route";
import {bootstrapPath} from "../lib/portal/bootstrap-path";
it("supports the requested client route aliases without broad public fallbacks",()=>{
  expect(portalPageRoute("/client-portal/support")?.section).toBe("requests");
  expect(portalPageRoute("/client-portal/account")?.section).toBe("settings");
  expect(portalPageRoute("/client-portal")?.section).toBe("dashboard");
  expect(portalPageRoute("/admin")).toMatchObject({admin:true,section:"overview",publicPage:false});
  for(const path of ["/","/api/brief","/client-portal/not-real","/client-portal/domains/buy","/client-portal/support/extra","/admin/clients/not-a-uuid"])
    expect(portalPageRoute(path)).toBeNull();
});
it("loads client data through the authenticated scoped endpoint but retains the admin MFA gate",()=>{
  expect(bootstrapPath(portalPageRoute("/client-portal/websites")!)).toBe("data?section=websites");
  expect(bootstrapPath(portalPageRoute("/client-portal/domains/fixture.example")!)).toBe("data?section=domains&domain=fixture.example");
  expect(bootstrapPath(portalPageRoute("/admin/clients")!)).toBe("auth/identity?admin=1");
});
it("accepts exact saved client profile IDs and preserves administrator scope",()=>{
  const route=portalPageRoute("/admin/clients/11111111-1111-4111-8111-111111111111");
  expect(route).toMatchObject({admin:true,section:"clients",publicPage:false});
  expect(portalPageRoute("/admin/clients/new")?.detail).toBe("new");
  expect(portalPageRoute("/client-portal/login")?.publicPage).toBe(true);
});
