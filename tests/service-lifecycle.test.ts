import {it,expect,vi} from "vitest";
vi.mock("server-only",()=>({}));
vi.mock("@/lib/portal/server",()=>({adminDb:vi.fn(),checkDb:vi.fn(error=>{if(error)throw Error("database_operation_failed");})}));
import {serviceLifecycleSchema,saveServiceLifecycle} from "@/lib/portal/service-lifecycle";
import {adminDb} from "@/lib/portal/server";
import {clientRow} from "@/lib/portal/client-response";
import {routePermission,rolePermissions} from "@/lib/portal/permissions";
const id="00000000-0000-4000-8000-000000000001",input={idempotency_key:id,service_id:id,client_id:id,expected_revision:0,start_date:"2026-10-15",end_date:"2027-10-15",billing_arrangement:"annual",staff_note:"Private operations note"};
it("checks dates, billing arrangement and unknown privilege fields",()=>{
 expect(serviceLifecycleSchema.safeParse(input).success).toBe(true);
 for(const change of [{end_date:"2026-09-01"},{start_date:"2026-02-30"},{billing_arrangement:"paid"},{actor_id:id}])expect(serviceLifecycleSchema.safeParse({...input,...change}).success).toBe(false);
});
it("exposes reviewed lifecycle fields but excludes internal notes and history",()=>{
 expect(clientRow("service_entitlements",{id,start_date:input.start_date,end_date:input.end_date,billing_arrangement:"annual",staff_note:input.staff_note,portal_service_internal:{staff_note:"private"},history:[input]})).toEqual({id,start_date:input.start_date,end_date:input.end_date,billing_arrangement:"annual"});
});
it("saves lifecycle using one audited atomic RPC",async()=>{
 const rpc=vi.fn().mockResolvedValue({error:null});vi.mocked(adminDb).mockReturnValue({rpc} as never);await saveServiceLifecycle(id,input);
 expect(rpc).toHaveBeenCalledWith("portal_service_lifecycle",expect.objectContaining({p_actor:id,p_service:id,p_client:id,p_revision:0,p_note:input.staff_note}));
});
it("reports stale revisions without claiming success",async()=>{
 vi.mocked(adminDb).mockReturnValue({rpc:vi.fn().mockResolvedValue({error:{code:"P0001",message:"Service revision changed"}})} as never);
 await expect(saveServiceLifecycle(id,input)).rejects.toMatchObject({code:"service_changed_refresh_required"});
});
it("keeps lifecycle writes away from support, billing, domain staff and auditors",()=>{
 for(const role of ["support_staff","billing_manager","domain_manager","auditor"] as const)expect(rolePermissions[role] as readonly string[]).not.toContain(routePermission("admin/service-lifecycle","POST"));
 expect(routePermission(`admin/service-lifecycle/${id}`,"GET")).toBe("services.read");
});
