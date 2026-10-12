import "server-only";
import { adminDb, checkDb } from "./server";
export async function clientDirectory(after?: string) {
  const db=adminDb();
  let query=db.from("portal_clients").select("*,portal_memberships(user_id),portal_domain_assignments(domain_id,holder_arrangement,legal_holder,portal_domains(name,lifecycle_status)),portal_websites(id,name,url)").order("id").limit(51);
  if(after) query=query.gt("id",after);
  const result=await query; checkDb(result.error);
  const clients=(result.data||[]).slice(0,50);
  const ids=[...new Set(clients.flatMap(c=>(c.portal_memberships||[]).map((m:{user_id:string})=>m.user_id)))];
  const identities=ids.length?await db.from("portal_admin_identities").select("*").in("user_id",ids):{data:[],error:null};
  checkDb(identities.error);
  const incomplete=await db.from("portal_provisioning").select("id,email,input,state,client_id,auth_user_id,last_error,created_at").neq("state","invited").order("created_at",{ascending:false}).limit(50);
  checkDb(incomplete.error);
  return {clients,identities:identities.data,provisioning:incomplete.data,next:(result.data?.length||0)>50?clients.at(-1)?.id:null};
}
export async function operationalHealth() {
  const db=adminDb();
  const names=["clients","accounts","domains","domain_assignments","orders","payments","requests"];
  const counts=await Promise.all(names.map(n=>db.from(`portal_${n}`).select("*",{count:"exact",head:true})));
  counts.forEach(r=>checkDb(r.error));
  const [backups,releases,provisioning,email,jobs,domains,ledger]=await Promise.all([
    db.from("portal_backup_runs").select("*").order("started_at",{ascending:false}).limit(10),
    db.from("portal_schema_releases").select("*").order("version",{ascending:false}).limit(10),
    db.from("portal_provisioning").select("id,email,state,last_error,created_at").neq("state","invited").limit(50),
    db.from("portal_email_outbox").select("id,status,last_error,created_at").in("status",["review_required","retry","sending"]).limit(50),
    db.from("portal_jobs").select("id,order_id,status,created_at").neq("status","completed").limit(50),
    db.from("portal_domains").select("id,name,expiration_date,auto_renew,reconciliation_required").or("reconciliation_required.eq.true,auto_renew.eq.true").limit(50),
    db.from("portal_ledger").select("order_id,category,reconciliation_status").eq("reconciliation_status","unreconciled").limit(50),
  ]);
  [backups,releases,provisioning,email,jobs,domains,ledger].forEach(r=>checkDb(r.error));
  return {checked_at:new Date().toISOString(),counts:Object.fromEntries(names.map((n,i)=>[n,counts[i].count])),backups:backups.data,releases:releases.data,provisioning:provisioning.data,email:email.data,jobs:jobs.data,domain_exceptions:domains.data,unreconciled_ledger:ledger.data};
}
