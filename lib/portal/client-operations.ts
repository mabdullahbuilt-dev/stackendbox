import "server-only";
import {z} from "zod";
import {adminDb,audit,checkDb,rateLimit} from "./server";
import {PortalError} from "./rules";
import {sendAuthEmail} from "./auth-email";
export const clientEditSchema=z.object({client_id:z.uuid(),name:z.string().trim().min(1).max(100),business_name:z.string().trim().min(1).max(150),status:z.enum(["active","suspended"])}).strict();
export async function editClient(actor:string,raw:unknown) {
  const input=clientEditSchema.parse(raw);
  checkDb((await adminDb().rpc("portal_edit_client",{p_client:input.client_id,p_name:input.name,p_business:input.business_name,p_status:input.status,p_actor:actor})).error);
  return {message:"Client details saved. Login email, assigned domains and services are unchanged."};
}
export async function sendClientAccess(actor:string,raw:unknown) {
  const input=z.object({user_id:z.uuid(),action:z.enum(["resend_invitation","recovery"])}).strict().parse(raw);
  await rateLimit(`admin-access-email:${input.user_id}`,2,900);
  const db=adminDb();
  const account=await db.from("portal_accounts").select("approved_email,role,active").eq("user_id",input.user_id).maybeSingle();
  checkDb(account.error);
  if (!account.data || account.data.role !== "client" || !account.data.active) throw new PortalError("active_client_identity_required",409);
  const identity=await db.auth.admin.getUserById(input.user_id);
  if (identity.error || identity.data.user?.email?.toLowerCase() !== account.data.approved_email) throw new PortalError("identity_requires_reconciliation",409);
  const user=identity.data.user;
  if (input.action === "resend_invitation" && user.email_confirmed_at) throw new PortalError("account_already_verified_use_recovery",409);
  if (input.action === "recovery" && !user.email_confirmed_at) throw new PortalError("verify_email_before_recovery",409);
  const type=input.action === "recovery" ? "recovery" : "invite";
  const link=await db.auth.admin.generateLink({type,email:account.data.approved_email});
  if (link.error || !link.data.properties?.hashed_token || link.data.user?.id !== input.user_id) throw new PortalError("access_email_generation_failed",502);
  const mode=user.app_metadata?.portal_credential_mode === "initial_password" ? "account_ready" : "invitation";
  const messageId=await sendAuthEmail(account.data.approved_email,link.data.properties.hashed_token,type,mode);
  await audit(actor,"client_access_email_accepted",input.user_id,{type,message_id:messageId,delivery_confirmed:false,password_unchanged:true});
  return {message:"Access email accepted by Brevo. Inbox delivery isn't yet confirmed. The password wasn't changed."};
}
