import "server-only";
import {z} from "zod";
import {adminDb,audit,checkDb} from "./server";
import {dnsAcceptanceGrant,oneAssignedClient} from "./dns-acceptance-grant";
import {readDomainState,domainStateVersion} from "./domain-operations";
import {spaceship} from "./spaceship";
import {planDnsChange,recordKey,type ProviderRecord} from "./dns";
import {PortalError} from "./rules";
const inputSchema=z.object({action:z.enum(["add","delete"]),idempotency_key:z.uuid(),expected_version:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
export async function readDnsAcceptance(name:string,actor:string){
  const grant=dnsAcceptanceGrant(name,actor),state=await readDomainState(grant.domain);
  if(!state.managed)throw new PortalError("external_authoritative_dns",409);
  return {record:{type:"TXT" as const,name:grant.name,value:grant.value,ttl:grant.ttl},version:state.version,expires_at:grant.expires_at,dns:state.dns};
}
export async function executeDnsAcceptance(name:string,actor:string,raw:unknown){
  const grant=dnsAcceptanceGrant(name,actor),input=inputSchema.parse(raw),record={type:"TXT" as const,name:grant.name,value:grant.value,ttl:grant.ttl};
  const db=adminDb();
  const d=await db.from("portal_domains").select("id,protected,portal_domain_assignments(client_id)").eq("name",grant.domain).eq("provider_account","primary").single();checkDb(d.error);
  const client=oneAssignedClient(d.data?.portal_domain_assignments);
  if(!d.data||d.data.protected||!client)throw new PortalError("domain_not_assigned",403);
  const previous=await db.from("portal_domain_operations").select("*").eq("idempotency_key",input.idempotency_key).maybeSingle();checkDb(previous.error);
  const savedInput={acceptance:true,action:input.action,record};
  if(previous.data){
    if(previous.data.actor_id!==actor||previous.data.domain_id!==d.data.id||previous.data.input?.acceptance!==true||previous.data.input?.action!==input.action||recordKey(previous.data.input?.record||{},true)!==recordKey(record,true))throw new PortalError("idempotency_conflict",409);
    if(previous.data.status!=="verified")throw new PortalError("domain_change_requires_reconciliation",409);
    return previous.data.result;
  }
  const op=await db.from("portal_domain_operations").insert({domain_id:d.data.id,client_id:client,actor_id:actor,idempotency_key:input.idempotency_key,kind:"dns",status:"applying",expected_version:input.expected_version,input:savedInput}).select("id").single();
  if(op.error?.code==="23505")throw new PortalError("domain_operation_in_progress",409);checkDb(op.error);
  if(!op.data)throw new PortalError("domain_operation_unavailable",503);
  let attempted=false;
  try{
    const state=await readDomainState(grant.domain);
    if(!state.managed||state.version!==input.expected_version)throw new PortalError("domain_state_changed",409);
    planDnsChange(state.dns.items as ProviderRecord[],input.action,input.action==="delete"?record:undefined,input.action==="add"?record:undefined);
    await audit(actor,"approved_txt_acceptance_started",d.data.id,{operation_id:op.data.id,action:input.action,record});
    attempted=true;await spaceship.acceptanceTxt(grant.domain,input.action,record);
    const dns=await spaceship.dns(grant.domain),present=dns.items.some(r=>recordKey(r,input.action==="add")===recordKey(record,input.action==="add"));
    if(present!==(input.action==="add"))throw new PortalError("dns_change_unverified",409);
    const unrelated=(items:Record<string,unknown>[])=>items.filter(r=>recordKey(r)!==recordKey(record)).map(r=>recordKey(r,true)).sort();
    if(JSON.stringify(unrelated(dns.items))!==JSON.stringify(unrelated(state.dns.items)))throw new PortalError("dns_baseline_changed",409);
    const result={status:"verified",operation_id:op.data.id,message:input.action==="add"?"Approved TXT record added and provider-verified.":"Approved TXT record removed and DNS baseline restored.",version:domainStateVersion(state.detail,dns.items),dns};
    checkDb((await db.from("portal_domain_operations").update({status:"verified",result,updated_at:new Date().toISOString()}).eq("id",op.data.id)).error);
    await audit(actor,"approved_txt_acceptance_verified",d.data.id,{operation_id:op.data.id,action:input.action});return result;
  }catch(error){
    checkDb((await db.from("portal_domain_operations").update({status:attempted?"review_required":"rejected",result:{error:error instanceof PortalError?error.code:"provider_request_failed"},updated_at:new Date().toISOString()}).eq("id",op.data.id)).error);throw error;
  }
}
