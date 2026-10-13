import "server-only";
import {z} from "zod";
import {adminDb,audit,checkDb} from "./server";
import {assertCustomerDomain,domainName,PortalError} from "./rules";
import {importDomain,notifyClient} from "./services";
import {verifyPortalAssignment} from "./registrant";
import {provisionClient} from "./provisioning";

export const handoffSchema=z.object({idempotency_key:z.uuid(),domain:z.string().max(253),email:z.email().max(254),name:z.string().trim().min(1).max(100),business_name:z.string().trim().max(150).optional(),initial_password:z.string().min(8).max(128).optional(),holder_arrangement:z.enum(["client_owned","licensed"]),rights_confirmed:z.literal(true)}).strict();
export async function activateDomainClient(actor:string,raw:unknown){
  const input=handoffSchema.parse(raw),name=domainName(input.domain),email=input.email.toLowerCase();
  assertCustomerDomain(name);
  const {domain}=await importDomain(actor,name);
  assertCustomerDomain(name,domain.protected);
  if(domain.lifecycle_status!=="registered"||!domain.expiration_date||domain.reconciliation_required)
    throw new PortalError("domain_registration_unverified",409);
  const db=adminDb();
  const account=await db.from("portal_accounts").select("user_id,role,active").eq("approved_email",email).maybeSingle();
  checkDb(account.error);
  let clientId:string|undefined;
  if(account.data){
    if(account.data.role!=="client"||!account.data.active)throw new PortalError("existing_account_requires_review",409);
    const membership=await db.from("portal_memberships").select("client_id,portal_clients(status)").eq("user_id",account.data.user_id).single();
    checkDb(membership.error);
    if(!membership.data || (membership.data.portal_clients as unknown as {status:string})?.status!=="active")throw new PortalError("existing_client_requires_review",409);
    clientId=membership.data.client_id;
  }
  const assigned=await db.from("portal_domain_assignments").select("client_id").eq("domain_id",domain.id).maybeSingle();
  checkDb(assigned.error);
  if(assigned.data&&assigned.data.client_id!==clientId)throw new PortalError("domain_already_assigned",409);
  if(clientId){
    const holder=await verifyPortalAssignment(name);
    checkDb((await db.rpc("portal_assign_verified_domain",{p_domain:domain.id,p_client:clientId,p_holder:holder.holder,p_arrangement:input.holder_arrangement,p_actor:actor})).error);
    await audit(actor,"existing_client_domain_handoff",domain.id,{client_id:clientId,contact_id:holder.contact_id,verification_status:holder.verification_status,checked_at:holder.checked_at,registered_holder_unchanged:true,registrar_custody_unchanged:true,password_unchanged:true});
    await notifyClient(clientId,"Your domain is available in StackEndBox",`${name} is assigned to your StackEndBox account for authorized management. Your existing password is unchanged. This does not change the registered holder or registrar account.`,`domain-assigned:${domain.id}:${clientId}`);
    return {client_id:clientId,domain_id:domain.id,message:"Verified domain assigned to the existing client. Their password and registrar ownership are unchanged."};
  }
  if(!input.initial_password)throw new PortalError("initial_password_required",422);
  // Existing durable provisioning owns Auth creation, membership, unique
  // assignment and scanner-safe account-ready email. Password never reaches SQL.
  return provisionClient(actor,{idempotency_key:input.idempotency_key,name:input.name,business_name:input.business_name||input.name,email,status:"active",credential_mode:"initial_password",temporary_password:input.initial_password,domain_id:domain.id,holder_arrangement:input.holder_arrangement,rights_confirmed:true});
}
