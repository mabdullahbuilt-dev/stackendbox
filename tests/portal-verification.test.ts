import {afterEach,expect,it,vi} from "vitest";
import {PortalVerificationController,type VerificationOptions,type VerificationRuntime} from "@/lib/portal/turnstile-client";
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
function fixture() {
  const renders:VerificationOptions[]=[];
  const api:VerificationRuntime={render:vi.fn((_el,options)=>{renders.push(options);return `widget-${renders.length}`;}),execute:vi.fn(),reset:vi.fn(),remove:vi.fn()};
  const loader=vi.fn(async()=>api);
  const controller=new PortalVerificationController({} as HTMLElement,"public-site-key",loader,1000);
  return {controller,api,loader,renders};
}
it("one submit runs one challenge and waits for its token",async()=>{
  const {controller,api,renders}=fixture();
  const first=controller.verify(),duplicate=controller.verify();
  expect(duplicate).toBe(first);
  await Promise.resolve();
  expect(api.execute).toHaveBeenCalledTimes(1);
  expect(renders[0]).toMatchObject({execution:"execute",appearance:"interaction-only",retry:"never"});
  renders[0].callback("fixture-only-token");
  await expect(first).resolves.toBe("fixture-only-token");
  controller.dispose();
});
it("a stalled challenge times out, then a new submit can recover",async()=>{
  vi.useFakeTimers();const {controller,renders}=fixture();
  const first=controller.verify(),failed=expect(first).rejects.toThrow("didn't finish");
  await vi.advanceTimersByTimeAsync(1000);await failed;
  const second=controller.verify();await Promise.resolve();
  renders[1].callback("new-fixture-token");
  await expect(second).resolves.toBe("new-fixture-token");controller.dispose();
});
it("doesn't let a late previous callback authenticate a newer attempt",async()=>{
  const {controller,renders}=fixture();
  const first=controller.verify();await Promise.resolve();
  const failed=expect(first).rejects.toThrow("didn't finish");renders[0]["timeout-callback"]();await failed;
  const second=controller.verify(),resolved=vi.fn();void second.then(resolved);await Promise.resolve();
  renders[0].callback("old-fixture-token");await Promise.resolve();expect(resolved).not.toHaveBeenCalled();
  renders[1].callback("current-fixture-token");await expect(second).resolves.toBe("current-fixture-token");controller.dispose();
});
it("surfaces hostname misconfiguration and rejects the attempt",async()=>{
  const {controller,renders}=fixture();const request=controller.verify();await Promise.resolve();
  const failed=expect(request).rejects.toThrow("configuration check");renders[0]["error-callback"]("110200");await failed;controller.dispose();
});
it("returns a usable error when loading fails and allows a fresh attempt",async()=>{
  const {controller,loader,renders}=fixture();loader.mockRejectedValueOnce(new Error("Script couldn't load"));
  await expect(controller.verify()).rejects.toThrow("couldn't load");
  const next=controller.verify();await Promise.resolve();renders[0].callback("fixture-token");await expect(next).resolves.toBe("fixture-token");controller.dispose();
});
it("removes the widget and rejects pending work when the form closes",async()=>{
  const {controller,api}=fixture();const pending=controller.verify();await Promise.resolve();
  const rejected=expect(pending).rejects.toThrow("closed");controller.dispose();await rejected;
  expect(api.remove).toHaveBeenCalledWith("widget-1");
  await expect(controller.verify()).rejects.toThrow("closed");
});
it("shares a script load, removes a failed script and retries without duplicate loaders",async()=>{
  vi.resetModules();
  const scripts:{src:string;async:boolean;dataset:Record<string,string>;onload:(()=>void)|null;onerror:(()=>void)|null;remove:ReturnType<typeof vi.fn>}[]=[];
  vi.stubGlobal("window",{});
  vi.stubGlobal("document",{createElement:()=>{const script={src:"",async:false,dataset:{},onload:null,onerror:null,remove:vi.fn()};scripts.push(script);return script;},head:{appendChild:vi.fn()}});
  const {loadPortalVerification}=await import("@/lib/portal/turnstile-client");
  const one=loadPortalVerification(),two=loadPortalVerification();expect(one).toBe(two);expect(scripts).toHaveLength(1);
  const failed=expect(one).rejects.toThrow("couldn't load");scripts[0].onerror!();await failed;expect(scripts[0].remove).toHaveBeenCalled();
  const retry=loadPortalVerification();expect(scripts).toHaveLength(2);
  const api={render:vi.fn(),execute:vi.fn(),reset:vi.fn(),remove:vi.fn()};window.turnstile=api as never;scripts[1].onload!();await expect(retry).resolves.toBe(api);
});
