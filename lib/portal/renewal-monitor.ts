import "server-only";
import {z} from "zod";
import {adminDb,checkDb} from "./server";
import {filterCustomerScope,type CustomerScope} from "./customer-scope";

/** Called behind the admin MFA boundary. Paginated saved data, never registrar writes. */
export async function renewalMonitor(after?:string,scope?:CustomerScope) {
  const db=adminDb(),at=new Date().toISOString();
  const assignment=scope?"portal_domain_assignments!inner(client_id,portal_clients!inner(name,business_name))":"portal_domain_assignments(client_id,portal_clients(name,business_name))";
  let query=db.from("portal_domains").select(`id,name,lifecycle_status,expiration_date,auto_renew,last_synced_at,reconciliation_required,${assignment}`).eq("protected",false).order("id").limit(51);
  query=filterCustomerScope(query,scope,"portal_domain_assignments.portal_clients.business_name");
  if(after)query=query.gt("id",z.uuid().parse(after));
  const result=await query;checkDb(result.error);
  const domains=(result.data||[]).slice(0,50),ids=domains.map(d=>d.id),names=domains.map(d=>d.name);
  const clients=[...new Set(domains.flatMap(d=>{
    const value=d.portal_domain_assignments as unknown as {client_id:string}[]|{client_id:string}|null;
    return (Array.isArray(value)?value:value?[value]:[]).map(a=>a.client_id);
  }))];
  const empty={data:[],error:null};
  const [contacts,quotes,orders,mail,operations]=await Promise.all([
    clients.length?db.from("portal_memberships").select("client_id,portal_accounts!inner(approved_email,active,role)").in("client_id",clients).eq("portal_accounts.role","client").limit(501):empty,
    ids.length?db.from("portal_quotes").select("domain_id,retail_minor,currency,valid_until,created_at").in("domain_id",ids).eq("kind","renewal").gte("valid_until",at).order("created_at",{ascending:false}).limit(501):empty,
    names.length?db.from("portal_orders").select("id,client_id,domain,status,environment,created_at").in("domain",names).eq("kind","renewal").order("created_at",{ascending:false}).limit(501):empty,
    clients.length?db.from("portal_email_outbox").select("id,client_id,subject,status,created_at,dedupe_key").in("client_id",clients).like("dedupe_key","renewal:%").order("created_at",{ascending:false}).limit(501):empty,
    ids.length?db.from("portal_domain_operations").select("id,domain_id,kind,status,created_at").in("domain_id",ids).order("created_at",{ascending:false}).limit(501):empty,
  ]);
  [contacts,quotes,orders,mail,operations].forEach(r=>checkDb(r.error));
  return {checked_at:at,domains,contacts:(contacts.data||[]).slice(0,500),quotes:(quotes.data||[]).slice(0,500),orders:(orders.data||[]).slice(0,500),
    reminders:(mail.data||[]).slice(0,500).map(({dedupe_key,...row})=>({...row,domain:names.find(name=>String(dedupe_key).startsWith(`renewal:${name}:`))||null})).filter(r=>r.domain),
    operations:(operations.data||[]).slice(0,500),history_limited:[contacts,quotes,orders,mail,operations].some(r=>(r.data?.length||0)>500),next:(result.data?.length||0)>50?domains.at(-1)?.id:null};
}
