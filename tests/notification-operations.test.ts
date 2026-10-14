import {beforeEach,afterEach,describe,it,expect,vi} from "vitest";
vi.mock("server-only",()=>({}));
const state=vi.hoisted(()=>({saved:{data:{id:"11111111-1111-4111-8111-111111111111",recipient:"client@example.test",provider_id:"<message@example.test>",status:"accepted"},error:null},update:vi.fn(),rpc:vi.fn(),audit:vi.fn(),rate:vi.fn()}));
vi.mock("@/lib/portal/server",()=>({adminDb:()=>({from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>state.saved})}),update:state.update}),rpc:state.rpc}),audit:state.audit,rateLimit:state.rate,env:(name:string)=>{if(name!=="BREVO_CLIENT_API_KEY")throw Error("wrong integration");return "portal-fixture";},checkDb:(error:unknown)=>{if(error)throw Error("database unavailable");}}));
import {notificationEvidence,reconcileNotification,recoverUnsentNotification} from "@/lib/portal/notification-operations";
const id="11111111-1111-4111-8111-111111111111",messageId="<message@example.test>",recipient="client@example.test";
beforeEach(()=>{vi.clearAllMocks();state.saved.data.provider_id=messageId;state.saved.data.status="accepted";const chain={eq:vi.fn(),then:(resolve:(value:unknown)=>unknown)=>resolve({error:null})};chain.eq.mockReturnValue(chain);state.update.mockReturnValue(chain);});
afterEach(()=>vi.unstubAllGlobals());
describe("provider-backed notification evidence",()=>{
  it("doesn't interpret acceptance or opens as delivery",()=>{
    expect(notificationEvidence({events:[{messageId,email:recipient,event:"requests",date:"2026-10-14T12:00:00Z"}]},messageId,recipient)?.status).toBe("accepted");
    expect(notificationEvidence({events:[{messageId,email:recipient,event:"opened",date:"2026-10-14T12:00:00Z"}]},messageId,recipient)).toBeNull();
  });
  it("requires exact message and recipient correlation",()=>{
    expect(notificationEvidence({events:[{messageId:"different",email:recipient,event:"delivered",date:"2026-10-14T12:00:00Z"},{messageId,email:"other@example.test",event:"delivered",date:"2026-10-14T12:00:00Z"}]},messageId,recipient)).toBeNull();
  });
  it("uses the latest supported event and excludes provider payloads",()=>{
    expect(notificationEvidence({events:[{messageId,email:recipient,event:"deferred",date:"2026-10-14T12:00:00Z",reason:"private"},{messageId,email:recipient,event:"delivered",date:"2026-10-14T12:01:00Z"}]},messageId,recipient)).toEqual({status:"delivered",event:"delivered",event_at:"2026-10-14T12:01:00.000Z"});
  });
  it("never resends or queries unrelated recipient messages when correlation is missing",async()=>{
    state.saved.data.provider_id="";const fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);
    await expect(reconcileNotification("owner",{id})).rejects.toMatchObject({code:"notification_reference_missing_no_resend"});expect(fetcher).not.toHaveBeenCalled();expect(state.update).not.toHaveBeenCalled();
  });
  it("uses only the portal key and saves matched delivery evidence",async()=>{
    const fetcher=vi.fn(async(input:URL|RequestInfo,init?:RequestInit)=>{expect(String(input)).toContain("/v3/smtp/statistics/events?");expect(new URL(String(input)).searchParams.get("messageId")).toBe(messageId);expect(init?.headers).toEqual({"api-key":"portal-fixture"});return Response.json({events:[{messageId,email:recipient,event:"delivered",date:"2026-10-14T12:00:00Z"}]});});vi.stubGlobal("fetch",fetcher);
    expect(await reconcileNotification("owner",{id})).toMatchObject({status:"delivered"});expect(state.update).toHaveBeenCalledWith({status:"delivered"});expect(state.audit).toHaveBeenCalledWith("owner","notification_delivery_reconciled",id,expect.objectContaining({status:"delivered"}));expect(fetcher).toHaveBeenCalledOnce();
  });
  it("preserves state on malformed responses and provider failures",async()=>{
    for(const response of [Response.json({events:[{event:"delivered"}]}),new Response(null,{status:429}),new Response(null,{status:500})]){
      vi.stubGlobal("fetch",vi.fn(async()=>response));await expect(reconcileNotification("owner",{id})).rejects.toMatchObject({status:expect.any(Number)});expect(state.update).not.toHaveBeenCalled();
    }
  });
  it("doesn't downgrade verified delivery to acceptance",async()=>{
    state.saved.data.status="delivered";vi.stubGlobal("fetch",vi.fn(async()=>Response.json({events:[{messageId,email:recipient,event:"requests",date:"2026-10-14T12:00:00Z"}]})));await reconcileNotification("owner",{id});expect(state.update).not.toHaveBeenCalled();
  });
  it("uses only atomic verified-predispatch recovery and rejects a second recovery",async()=>{
    state.rpc.mockResolvedValueOnce({data:1,error:null}).mockResolvedValueOnce({data:0,error:null});expect(await recoverUnsentNotification("owner",{id,confirmed:true})).toMatchObject({message:expect.stringContaining("No email was sent")});await expect(recoverUnsentNotification("owner",{id,confirmed:true})).rejects.toMatchObject({code:"notification_recovery_not_safe"});expect(state.rpc).toHaveBeenCalledWith("portal_recover_predispatch_emails",{target_ids:[id]});
  });
});
