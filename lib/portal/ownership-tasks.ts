import "server-only";
import {z} from "zod";
import {adminDb,checkDb} from "./server";
import {assertCustomerDomain,domainName,PortalError} from "./rules";
import {readRegistrant} from "./registrant";
export const ownershipKinds=["registered_holder","registrar_custody","external_registrar"] as const;
export const ownershipStages=["awaiting_consent","consent_recorded","awaiting_registrar_confirmation","review_required","cancelled"] as const;
const reference=z.string().trim().min(3).max(200);
function taskError(error:{code?:string;message:string}|null){
  if(error?.code==="23505")throw new PortalError("ownership_task_already_open",409);
  if(error?.code==="P0001"){
    const codes:Record<string,string>={"Task request conflict":"idempotency_conflict","Task changed, refresh before updating":"ownership_task_changed","Invalid task transition":"ownership_stage_invalid","Record consent before registrar follow-up":"ownership_consent_reference_required"};
    if(codes[error.message])throw new PortalError(codes[error.message],409);
  }
  checkDb(error);
}
export const ownershipTaskSchema=z.object({idempotency_key:z.uuid(),domain:z.string().max(253).transform(domainName),kind:z.enum(ownershipKinds),request_reference:reference}).strict();
export const ownershipProgressSchema=z.object({idempotency_key:z.uuid(),task_id:z.uuid(),expected_revision:z.number().int().nonnegative(),status:z.enum(ownershipStages),evidence_reference:reference,consent_confirmed:z.boolean().optional()}).strict();
export async function ownershipTasks(){
  const db=adminDb();
  const tasks=await db.from("portal_ownership_tasks").select("id,domain,kind,status,revision,request_reference,created_at,updated_at").order("updated_at",{ascending:false}).limit(100);checkDb(tasks.error);
  const ids=(tasks.data||[]).map(row=>row.id);
  const events=ids.length?await db.from("portal_ownership_task_events").select("id,task_id,status,evidence_reference,created_at").in("task_id",ids).order("created_at",{ascending:false}).limit(500):{data:[],error:null};checkDb(events.error);
  return {tasks:tasks.data||[],events:events.data||[],registrar_execution_enabled:false,legal_completion_available:false};
}
export async function createOwnershipTask(actor:string,raw:unknown){
  const input=ownershipTaskSchema.parse(raw);assertCustomerDomain(input.domain);
  if(input.domain.endsWith(".stackendbox.com"))throw new PortalError("protected_company_domain",403);
  const db=adminDb(),prior=await db.from("portal_ownership_tasks").select("*").eq("id",input.idempotency_key).maybeSingle();checkDb(prior.error);
  if(prior.data){
    if(prior.data.created_by!==actor||prior.data.domain!==input.domain||prior.data.kind!==input.kind||prior.data.request_reference!==input.request_reference)throw new PortalError("idempotency_conflict",409);
    return {task:prior.data,message:"Existing review task retained. No registrar operation performed."};
  }
  const saved=await db.from("portal_domains").select("protected").eq("name",input.domain).maybeSingle();checkDb(saved.error);assertCustomerDomain(input.domain,saved.data?.protected);
  const verified=await readRegistrant(input.domain);
  if(verified.lifecycle_status!=="registered"||!verified.expiration_date)throw new PortalError("domain_registration_unverified",409);
  const baseline={contact_id:verified.contact_id,lifecycle_status:verified.lifecycle_status,expiration_date:verified.expiration_date,verification_status:verified.verification_status,nameservers:verified.nameservers,custody:verified.custody,checked_at:verified.checked_at};
  const result=await db.rpc("portal_create_ownership_task",{p_id:input.idempotency_key,p_actor:actor,p_domain:input.domain,p_kind:input.kind,p_reference:input.request_reference,p_baseline:baseline});taskError(result.error);
  return {task:result.data,message:"Review task saved. Portal access and registrar settings are unchanged."};
}
export async function progressOwnershipTask(actor:string,raw:unknown){
  const input=ownershipProgressSchema.parse(raw);
  if(input.status==="consent_recorded"&&input.consent_confirmed!==true)throw new PortalError("ownership_consent_reference_required",422);
  const result=await adminDb().rpc("portal_progress_ownership_task",{p_id:input.idempotency_key,p_actor:actor,p_task:input.task_id,p_revision:input.expected_revision,p_status:input.status,p_reference:input.evidence_reference});taskError(result.error);
  return {task:result.data,message:"Task progress saved. This records follow-up only, not a completed ownership transfer."};
}
