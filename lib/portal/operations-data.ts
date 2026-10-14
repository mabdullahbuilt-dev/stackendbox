import "server-only";
import {adminDb,checkDb} from "./server";

export async function operationsSummary(){
  const db=adminDb(),now=new Date(),at=now.toISOString();
  const count=(table:string)=>db.from(`portal_${table}`).select("*",{count:"exact",head:true});
  const queries={
    active_clients:count("clients").eq("status","active"),
    assigned_domains:count("domain_assignments"),
    expires_30_days:count("domains").eq("protected",false).gte("expiration_date",at).lte("expiration_date",new Date(now.getTime()+30*86400000).toISOString()),
    unpaid_invoices:count("invoices").eq("status","issued"),
    open_support:count("requests").not("status","in","(completed,closed)"),
  };
  const names=Object.keys(queries),results=await Promise.all(Object.values(queries));results.forEach(result=>checkDb(result.error));
  return {checked_at:at,counts:Object.fromEntries(names.map((name,index)=>[name,results[index].count]))};
}

/** Admin-only snapshot. No registrar calls, writes, password or provider payloads. */
export async function operationsData() {
  const db=adminDb(),now=new Date(),at=now.toISOString();
  const count=(table:string)=>db.from(`portal_${table}`).select("*",{count:"exact",head:true});
  const queries={
    active_clients:count("clients").eq("status","active"),
    assigned_domains:count("domain_assignments"),
    registered_domains:count("domains").eq("protected",false).eq("lifecycle_status","registered"),
    expired_domains:count("domains").eq("protected",false).lt("expiration_date",at),
    paid_invoices:count("invoices").eq("status","paid"),
    unpaid_invoices:count("invoices").eq("status","issued"),
    payment_followups:count("orders").in("status",["paid","action_required","disputed"]),
    provider_followups:count("domains").eq("protected",false).eq("reconciliation_required",true),
    open_support:count("requests").not("status","in","(completed,closed)"),
    ...Object.fromEntries([60,30,14,7,1].map(days=>[`expires_${days}_days`,count("domains").eq("protected",false).gte("expiration_date",at).lte("expiration_date",new Date(now.getTime()+days*86400000).toISOString())])),
  };
  const names=Object.keys(queries),counts=await Promise.all(Object.values(queries));
  counts.forEach(r=>checkDb(r.error));
  const [domains,orders,mail,operations,ledger,audit]=await Promise.all([
    db.from("portal_domains").select("id,name,lifecycle_status,expiration_date,auto_renew,last_synced_at,reconciliation_required,portal_domain_assignments(client_id,portal_clients(name,business_name))").eq("protected",false).order("expiration_date",{ascending:true,nullsFirst:true}).limit(100),
    db.from("portal_orders").select("id,client_id,domain,status,environment,amount_minor,currency,payment_id,created_at").in("status",["paid","action_required","disputed","declined","simulation_queued"]).order("created_at",{ascending:false}).limit(50),
    db.from("portal_email_outbox").select("id,client_id,subject,status,last_error,created_at").order("created_at",{ascending:false}).limit(50),
    db.from("portal_domain_operations").select("id,domain_id,client_id,kind,status,created_at,updated_at").in("status",["applying","review_required","rejected"]).order("created_at",{ascending:false}).limit(50),
    db.from("portal_ledger").select("order_id,category,amount_minor,currency,reconciliation_status").eq("reconciliation_status","unreconciled").limit(50),
    db.from("portal_audit").select("id,actor_id,action,target_id,created_at").order("created_at",{ascending:false}).limit(50),
  ]);
  [domains,orders,mail,operations,ledger,audit].forEach(r=>checkDb(r.error));
  const domainIds=(domains.data||[]).map(d=>d.id);
  const quotes=domainIds.length?await db.from("portal_quotes").select("id,domain_id,retail_minor,currency,valid_until,created_at").in("domain_id",domainIds).eq("kind","renewal").gte("valid_until",at).order("created_at",{ascending:false}).limit(500):{data:[],error:null};
  checkDb(quotes.error);
  return {checked_at:at,counts:Object.fromEntries(names.map((name,i)=>[name,counts[i].count])),domains:domains.data,quotes:quotes.data,orders:orders.data,email:mail.data,operations:operations.data,ledger:ledger.data,audit:audit.data};
}
