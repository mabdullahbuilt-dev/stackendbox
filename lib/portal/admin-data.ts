import "server-only";
import { adminDb, checkDb } from "./server";
import { z } from "zod";
import {PortalError} from "./rules";
import {filterCustomerScope,type CustomerScope} from "./customer-scope";
export async function clientOptions(clientId?:string){
  let query=adminDb().from("portal_memberships").select("client_id,portal_clients!inner(name,business_name,status),portal_accounts!inner(approved_email,active,role)").eq("portal_clients.status","active").eq("portal_accounts.active",true).eq("portal_accounts.role","client").limit(500);
  if(clientId)query=query.eq("client_id",z.uuid().parse(clientId));
  const result=await query;
  checkDb(result.error);
  return {clients:(result.data||[]).map(row=>{
    const client=row.portal_clients as unknown as {name:string;business_name:string},account=row.portal_accounts as unknown as {approved_email:string};
    return {client_id:row.client_id,name:client.name,business_name:client.business_name,email:account.approved_email};
  }).sort((a,b)=>a.name.localeCompare(b.name))};
}
export async function clientDirectory(after?: string, search = "", clientId?: string, scope?:CustomerScope) {
  const db=adminDb();
  let query=db.from("portal_clients").select("*,portal_memberships(user_id),portal_domain_assignments(domain_id,holder_arrangement,legal_holder,portal_domains(name,lifecycle_status)),portal_websites(id,name,url),portal_service_entitlements(id,service,status)").order("id").limit(51);
  query=filterCustomerScope(query,scope);
  if(clientId) query=query.eq("id",z.uuid().parse(clientId));
  // Escape PostgREST filter punctuation and SQL wildcard characters. Search is
  // performed across persisted data, never live registrar calls or Auth scans.
  const term=z.string().trim().max(100).parse(search);
  if(term){
    const pattern=`%${term.replace(/[\\%_]/g,"\\$&")}%`;
    const quoted=JSON.stringify(pattern);
    const [names,emails,domains]=await Promise.all([
      db.from("portal_clients").select("id").or(`name.ilike.${quoted},business_name.ilike.${quoted}`).limit(501),
      db.from("portal_memberships").select("client_id,portal_accounts!inner(approved_email)").ilike("portal_accounts.approved_email",pattern).limit(501),
      db.from("portal_domain_assignments").select("client_id,portal_domains!inner(name)").ilike("portal_domains.name",pattern).limit(501),
    ]);
    [names,emails,domains].forEach(r=>checkDb(r.error));
    // Fail explicitly instead of silently hiding matches beyond the search cap.
    if([names,emails,domains].some(r=>(r.data?.length||0)>500)) throw new PortalError("client_search_too_broad",422);
    const ids=[...new Set([...(names.data||[]).map(r=>r.id),...(emails.data||[]).map(r=>r.client_id),...(domains.data||[]).map(r=>r.client_id)])];
    query=query.in("id",ids.length?ids:["00000000-0000-0000-0000-000000000000"]);
  }
  if(after) query=query.gt("id",after);
  const result=await query; checkDb(result.error);
  const clients=(result.data||[]).slice(0,50);
  const ids=[...new Set(clients.flatMap(c=>(c.portal_memberships||[]).map((m:{user_id:string})=>m.user_id)))];
  const identities=ids.length?await db.from("portal_admin_identities").select("*").in("user_id",ids):{data:[],error:null};
  checkDb(identities.error);
  let pending=db.from("portal_provisioning").select("id,email,input,state,client_id,auth_user_id,last_error,created_at").neq("state","invited").order("created_at",{ascending:false}).limit(50);
  pending=filterCustomerScope(pending,scope,"input->>business_name");
  if(clientId) pending=pending.eq("client_id",clientId);
  const incomplete=await pending;
  checkDb(incomplete.error);
  return {clients,identities:identities.data,provisioning:incomplete.data,next:(result.data?.length||0)>50?clients.at(-1)?.id:null};
}
export async function operationalHealth() {
  const db=adminDb();
  const names=["clients","accounts","domains","domain_assignments","orders","payments","requests"];
  const counts=await Promise.all(names.map(n=>db.from(`portal_${n}`).select("*",{count:"exact",head:true})));
  counts.forEach(r=>checkDb(r.error));
  const [backups,releases,provisioning,email,jobs,domains,ledger]=await Promise.all([
    db.from("portal_backup_runs").select("id,kind,status,started_at,completed_at,includes_auth,includes_objects,detail").order("started_at",{ascending:false}).limit(10),
    db.from("portal_schema_releases").select("*").order("version",{ascending:false}).limit(10),
    db.from("portal_provisioning").select("id,email,state,last_error,created_at").neq("state","invited").limit(50),
    db.from("portal_email_outbox").select("id,status,last_error,created_at").in("status",["review_required","retry","sending"]).limit(50),
    db.from("portal_jobs").select("id,order_id,status,created_at").neq("status","completed").limit(50),
    db.from("portal_domains").select("id,name,expiration_date,auto_renew,reconciliation_required").or("reconciliation_required.eq.true,auto_renew.eq.true").limit(50),
    db.from("portal_ledger").select("order_id,category,reconciliation_status").eq("reconciliation_status","unreconciled").limit(50),
  ]);
  [backups,releases,provisioning,email,jobs,domains,ledger].forEach(r=>checkDb(r.error));
  const backupEvidence=(backups.data||[]).map(({detail,...record})=>({...record,detail:{
    offsite:detail?.offsite===true,
    checksum_readback_verified:detail?.checksum_readback_verified===true,
    objects:Number.isSafeInteger(detail?.objects)&&detail.objects>=0?detail.objects:null,
  }}));
  return {checked_at:new Date().toISOString(),counts:Object.fromEntries(names.map((n,i)=>[n,counts[i].count])),backups:backupEvidence,releases:releases.data,provisioning:provisioning.data,email:email.data,jobs:jobs.data,domain_exceptions:domains.data,unreconciled_ledger:ledger.data};
}
