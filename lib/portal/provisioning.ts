import "server-only";
import { z } from "zod";
import { adminDb, audit, checkDb, portalOrigin } from "./server";
import { PortalError, safeWebUrl } from "./rules";
import { sendAuthEmail } from "./auth-email";
export const provisioningSchema = z.object({
  idempotency_key: z.uuid(), name: z.string().trim().min(1).max(100),
  business_name: z.string().trim().min(1).max(150), email: z.email().max(254).transform(s => s.toLowerCase()),
  status: z.enum(["active", "suspended"]).default("active"), existing_client_id: z.uuid().optional(),
  domain_id: z.uuid().optional(), holder_arrangement: z.enum(["client_owned", "licensed"]).optional(),
  legal_holder: z.string().trim().min(1).max(160).optional(),
  website: z.object({name:z.string().trim().min(1).max(120),url:z.url().transform(safeWebUrl)}).strict().optional(),
}).strict().superRefine((value,ctx) => {
  if (value.domain_id && (!value.holder_arrangement || !value.legal_holder)) ctx.addIssue({code:"custom",message:"Domain ownership details are required"});
});
type Provision = { id:string; email:string; state:string; client_id:string|null; auth_user_id:string|null; input: {status:string} };
export async function provisionClient(actor: string, raw: unknown) {
  const { idempotency_key, ...input } = provisioningSchema.parse(raw);
  const db = adminDb();
  const started = await db.rpc("portal_begin_provisioning", {p_id:idempotency_key,p_actor:actor,p_input:input});
  checkDb(started.error);
  let record = started.data as Provision;
  if (!record?.id) throw new PortalError("provisioning_unavailable",503);
  try {
    if (!record.client_id) {
      const found = await db.rpc("portal_provisioning_identity",{p_id:record.id});
      checkDb(found.error);
      let userId = found.data as string | null;
      if (!userId) {
        const created = await db.auth.admin.createUser({email:input.email,email_confirm:false,app_metadata:{portal_provisioning_id:record.id}});
        userId = created.data?.user?.id || null;
        if (!userId) {
          // A lost create response or concurrent retry may already have created it.
          const recovered = await db.rpc("portal_provisioning_identity",{p_id:record.id});
          checkDb(recovered.error); userId = recovered.data;
        }
        if (!userId) throw new PortalError("auth_identity_requires_reconciliation",409);
      }
      const committed = await db.rpc("portal_commit_provisioning",{p_id:record.id,p_user:userId});
      checkDb(committed.error); record = committed.data as Provision;
    }
    if (record.state === "committed" && record.input.status === "active") {
      const claimed = await db.from("portal_provisioning").update({state:"inviting",invitation_attempted_at:new Date().toISOString()}).eq("id",record.id).eq("state","committed").select("id").maybeSingle();
      checkDb(claimed.error);
      if (claimed.data) {
        try {
          if (process.env.PORTAL_AUTH_EMAIL_TRANSPORT === "supabase_smtp") {
            const sent = await db.auth.admin.inviteUserByEmail(record.email,{redirectTo:`${portalOrigin()}/client-portal/auth/callback`});
            if (sent.error) throw new PortalError("invitation_delivery_unconfirmed",502);
          } else {
            const link = await db.auth.admin.generateLink({type:"invite",email:record.email});
            if (link.error || !link.data.properties?.hashed_token) throw new PortalError("invitation_link_failed",502);
            await sendAuthEmail(record.email,link.data.properties.hashed_token,"invite");
          }
          checkDb((await db.from("portal_accounts").update({invitation_status:"sent"}).eq("user_id",record.auth_user_id)).error);
          await audit(actor,"client_invitation_sent",record.client_id!,{provisioning_id:record.id});
          checkDb((await db.from("portal_provisioning").update({state:"invited",last_error:null}).eq("id",record.id)).error);
        } catch {
          checkDb((await db.from("portal_provisioning").update({state:"review_required",last_error:"invitation_delivery_unconfirmed"}).eq("id",record.id)).error);
        }
      }
    }
    const saved = await db.from("portal_provisioning").select("id,client_id,auth_user_id,state,last_error").eq("id",record.id).single();
    checkDb(saved.error);
    if (!saved.data) throw new PortalError("provisioning_unavailable",503);
    return {...saved.data,message:saved.data.state === "invited" ? "Client and membership saved. Invitation accepted for delivery." : "Client saved. Check invitation status before resending."};
  } catch (error) {
    await db.from("portal_provisioning").update({last_error:error instanceof PortalError ? error.code : "provisioning_step_failed"}).eq("id",record.id);
    throw new PortalError(`provisioning_incomplete:${record.id}`,409);
  }
}
