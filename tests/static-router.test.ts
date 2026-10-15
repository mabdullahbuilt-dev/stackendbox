import {it,expect,vi} from "vitest";
import {createFullPageRouter} from "@/platform/static/full-page-router";
it.each(["replace","push"] as const)("doesn't cancel a %s with the subsequent Next-style refresh",method=>{
 const location={assign:vi.fn(),replace:vi.fn(),reload:vi.fn()},router=createFullPageRouter(()=>location);
 router[method]("/client-portal/settings");router.refresh();
 expect(location[method==="push"?"assign":"replace"]).toHaveBeenCalledWith("/client-portal/settings");expect(location.reload).not.toHaveBeenCalled();
});
it("still reloads a page for an independent refresh",()=>{
 const location={assign:vi.fn(),replace:vi.fn(),reload:vi.fn()},router=createFullPageRouter(()=>location);router.refresh();expect(location.reload).toHaveBeenCalledOnce();
});
