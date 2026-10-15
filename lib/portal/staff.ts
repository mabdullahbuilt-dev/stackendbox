import "server-only";
import {z} from "zod";
import {adminDb,audit,checkDb} from "./server";
import {PortalError} from "./rules";
import {sendAuthEmail} from "./auth-email";
import {staffRoles,rolePermissions} from "./permissions";
export const staffInviteSchema=z.object({idempotency_key:z.uuid(),email:z.email().max(254).transform(v=>v.toLowerCase()),name:z.string().trim().min(1).max(100),role:z.enum(staffRoles)}).strict();
export const staffChangeSchema=z.object({idempotency_key:z.uuid(),user_id:z.uuid(),role:z.enum(staffRoles),active:z.boolean(),expected_revision:z.number().int().nonnegative()}).strict();
function checked(error:{code?:string;message:string}|null){
  if(error?.code==="P0001"){
    const codes:Record<string,string>={"Staff request conflict":"idempotency_conflict","Staff revision changed":"staff_changed_refresh_required","Staff target required":"staff_target_required","Owner required":"owner_required","Existing identity requires review":"staff_identity_exists_review_required"};
    throw new PortalError(codes[error.message]||"staff_operation_requires_review",409);
  }checkDb(error);
}
export async function team(){
  const db=adminDb(),results=await Promise.all([
    db.from("portal_accounts").select("user_id,name,approved_email,active,invitation_status").eq("role","staff").order("created_at").limit(200),
    db.from("portal_staff_grants").select("user_id,role,active,revision,updated_at").limit(200),
    db.from("portal_staff_rollout").select("enabled").eq("id",true).single(),
    db.from("portal_staff_invites").select("id,email,name,role,state,created_at").order("created_at",{ascending:false}).limit(50),
  ]);results.forEach(r=>checkDb(r.error));
  return {staff:results[0].data,grants:results[1].data,enabled:results[2].data?.enabled===true,invitations:results[3].data,roles:rolePermissions};
}
export async function changeStaff(actor:string,body:unknown){
  const input=staffChangeSchema.parse(body),result=await adminDb().rpc("portal_change_staff",{p_id:input.idempotency_key,p_actor:actor,p_target:input.user_id,p_role:input.role,p_active:input.active,p_revision:input.expected_revision});checked(result.error);
  return {message:input.active?"Staff role saved. Access still depends on MFA and the rollout gate.":"Staff access disabled. Existing sessions can no longer authorize staff operations."};
}
export async function inviteStaff(actor:string,body:unknown){
  const input=staffInviteSchema.parse(body),db=adminDb();
  const reserved=await db.rpc("portal_reserve_staff_invite",{p_id:input.idempotency_key,p_actor:actor,p_email:input.email,p_name:input.name,p_role:input.role});checked(reserved.error);
  let record=reserved.data as {id:string;user_id:string|null;state:string};
  if(!record.user_id){
    const found=await db.rpc("portal_staff_invite_identity",{p_id:record.id});checkDb(found.error);let user=found.data as string|null;
    if(!user){const created=await db.auth.admin.createUser({email:input.email,email_confirm:false,app_metadata:{portal_staff_invite_id:record.id,portal_password_change_required:true}});user=created.data.user?.id||null;}
    if(!user){const recovered=await db.rpc("portal_staff_invite_identity",{p_id:record.id});checkDb(recovered.error);user=recovered.data;}
    if(!user)throw new PortalError("staff_identity_requires_review",409);
    const committed=await db.rpc("portal_commit_staff_invite",{p_id:record.id,p_user:user});checked(committed.error);
    record={...record,user_id:user,state:"identity_created"};
  }
  if(record.state==="identity_created"){
    const claim=await db.from("portal_staff_invites").update({state:"dispatching"}).eq("id",record.id).eq("state","identity_created").select("id").maybeSingle();checkDb(claim.error);
    if(claim.data){
      try{
        const link=await db.auth.admin.generateLink({type:"invite",email:input.email});
        if(link.error||link.data.user?.id!==record.user_id||!link.data.properties?.hashed_token)throw new Error("invitation_unavailable");
        const messageId=await sendAuthEmail(input.email,link.data.properties.hashed_token,"invite");
        checkDb((await db.from("portal_staff_invites").update({state:"invited",provider_message_id:messageId}).eq("id",record.id)).error);
      }catch{checkDb((await db.from("portal_staff_invites").update({state:"review_required"}).eq("id",record.id)).error);}
    }
  }
  const saved=await db.from("portal_staff_invites").select("id,state").eq("id",record.id).single();checkDb(saved.error);
  await audit(actor,"staff_invitation_result",record.id,{state:saved.data?.state});
  return {...saved.data,message:saved.data?.state==="invited"?"Staff invitation accepted for delivery. The recipient sets their own password and enrolls MFA. Staff privileges remain subject to rollout approval.":"Staff identity saved. Invitation delivery requires review. This request will not resend an uncertain email."};
}
