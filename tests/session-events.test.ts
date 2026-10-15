import {afterEach,expect,it,vi} from "vitest";
import {notifySessionChange,watchSessionChange,notifyAccessRevoked,isAuthorizationRejection} from "../lib/portal/session-events";
afterEach(()=>vi.unstubAllGlobals());
function setup(){
  const target=new EventTarget(),setItem=vi.fn();
  vi.stubGlobal("window",{localStorage:{setItem},dispatchEvent:target.dispatchEvent.bind(target),addEventListener:target.addEventListener.bind(target),removeEventListener:target.removeEventListener.bind(target)});
  vi.stubGlobal("crypto",{randomUUID:()=>"nonce-only"});
  return {target,setItem};
}
it("signals a session change without storing identity or credentials",()=>{
  const {setItem}=setup();notifySessionChange();
  expect(setItem).toHaveBeenCalledExactlyOnceWith("stackendbox-session-change","nonce-only");
});
it("invalidates other tabs only for the session signal and unsubscribes safely",()=>{
  const {target}=setup(),changed=vi.fn(),stop=watchSessionChange(changed);
  function send(key:string){const event=new Event("storage");Object.defineProperty(event,"key",{value:key});target.dispatchEvent(event);}
  send("unrelated-setting");expect(changed).not.toHaveBeenCalled();
  send("stackendbox-session-change");expect(changed).toHaveBeenCalledTimes(1);
  stop();send("stackendbox-session-change");expect(changed).toHaveBeenCalledTimes(1);
});
it("doesn't fail login when browser storage is blocked",()=>{
  const {setItem}=setup();setItem.mockImplementation(()=>{throw new Error("storage blocked");});
  expect(()=>notifySessionChange()).not.toThrow();
});
it("immediately clears the requesting workspace and signals other tabs on revocation",()=>{
 const {setItem}=setup(),changed=vi.fn(),stop=watchSessionChange(changed);notifyAccessRevoked();
 expect(changed).toHaveBeenCalledOnce();expect(setItem).toHaveBeenCalledWith("stackendbox-session-change","nonce-only");stop();notifyAccessRevoked();expect(changed).toHaveBeenCalledOnce();
});
it("doesn't treat fresh-MFA or a denied tenant resource as session revocation",()=>{
 for(const code of ["administrator_fresh_mfa_required","administrator_mfa_required","access_denied"])expect(isAuthorizationRejection(403,code)).toBe(false);
 for(const code of ["account_not_authorized","staff_permission_denied","administrator_required"])expect(isAuthorizationRejection(403,code)).toBe(true);
 expect(isAuthorizationRejection(401,"sign_in_required")).toBe(true);expect(isAuthorizationRejection(503,"portal_database_unavailable")).toBe(false);
});
