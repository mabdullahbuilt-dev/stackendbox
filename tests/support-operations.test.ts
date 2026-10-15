import {it,expect,vi,beforeEach} from "vitest";
vi.mock("server-only",()=>({}));
vi.mock("@/lib/portal/server",()=>({adminDb:vi.fn(),checkDb:vi.fn(error=>{if(error)throw Error("database_operation_failed");}),portalOrigin:()=>"https://portal.example"}));
vi.mock("@/lib/portal/services",()=>({notifyClient:vi.fn()}));
import {supportChangeSchema,supportNoteSchema,supportChange,supportNote,supportQueue} from "@/lib/portal/support";
import {adminDb} from "@/lib/portal/server";
import {notifyClient} from "@/lib/portal/services";
import {routePermission,rolePermissions} from "@/lib/portal/permissions";
const id="00000000-0000-4000-8000-000000000001",change={idempotency_key:id,request_id:id,expected_revision:0,priority:"high",assigned_to:null,escalated:false,status:"under_review"};
beforeEach(()=>vi.clearAllMocks());
it("keeps the selected client filter in the bounded support queue",async()=>{
 const q={select:vi.fn(),order:vi.fn(),limit:vi.fn(),eq:vi.fn(),then:(resolve:(result:unknown)=>void)=>resolve({data:[],error:null})};
 for(const method of [q.select,q.order,q.limit,q.eq])method.mockReturnValue(q);
 vi.mocked(adminDb).mockReturnValue({from:vi.fn().mockReturnValue(q)} as never);
 expect(await supportQueue(new URLSearchParams({client_id:id}))).toEqual({items:[],next:null});
 expect(q.eq).toHaveBeenCalledWith("client_id",id);expect(q.limit).toHaveBeenCalledWith(51);
});
it("rejects malformed selected-client filters before reading the queue",async()=>{
 await expect(supportQueue(new URLSearchParams({client_id:"not-a-client"}))).rejects.toThrow();expect(adminDb).not.toHaveBeenCalled();
});
it("rejects unknown fields and malformed private notes",()=>{
 expect(supportChangeSchema.safeParse({...change,client_id:id}).success).toBe(false);
 for(const body of ["", " ","x".repeat(5001)])expect(supportNoteSchema.safeParse({idempotency_key:id,request_id:id,body}).success).toBe(false);
});
it("uses the atomic note RPC without notifying the client",async()=>{
 const rpc=vi.fn().mockResolvedValue({error:null});vi.mocked(adminDb).mockReturnValue({rpc} as never);
 await supportNote(id,{idempotency_key:id,request_id:id,body:"Private follow-up"});
 expect(rpc).toHaveBeenCalledWith("portal_support_note",{p_id:id,p_actor:id,p_request:id,p_body:"Private follow-up"});expect(notifyClient).not.toHaveBeenCalled();
});
it("doesn't send a notification after revision conflict",async()=>{
 vi.mocked(adminDb).mockReturnValue({rpc:vi.fn().mockResolvedValue({error:{code:"P0001",message:"Support revision changed"}})} as never);
 await expect(supportChange(id,change)).rejects.toMatchObject({code:"ticket_changed_refresh_required"});expect(notifyClient).not.toHaveBeenCalled();
});
it("separates support reads and writes from billing and auditor capabilities",()=>{
 expect(routePermission(`admin/support/${id}`,"GET")).toBe("support.read");expect(routePermission("admin/support/note","POST")).toBe("support.write");
 expect(rolePermissions.billing_manager as readonly string[]).not.toContain("support.read");expect(rolePermissions.auditor as readonly string[]).not.toContain("support.write");
});
