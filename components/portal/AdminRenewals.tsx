"use client";
import Link from "next/link";
import {useEffect,useRef,useState} from "react";
import {api} from "./Portal";
import {customerMoney,renewalBuckets,renewalWindow} from "@/lib/portal/renewal-view";
type Assignment={client_id:string;portal_clients:{name:string;business_name:string}};
type Domain={id:string;name:string;expiration_date:string|null;auto_renew:boolean|null;last_synced_at:string|null;reconciliation_required:boolean;portal_domain_assignments:Assignment[]|Assignment|null};
type Snapshot={checked_at:string;domains:Domain[];contacts:{client_id:string;portal_accounts:{approved_email:string;active:boolean}}[];quotes:{domain_id:string;retail_minor:number;currency:string;valid_until:string}[];orders:{id:string;client_id:string;domain:string;status:string;environment:string}[];reminders:{id:string;client_id:string;domain:string;status:string;created_at:string}[];operations:{id:string;domain_id:string;kind:string;status:string}[];next:string|null;history_limited:boolean};
const assignments=(d:Domain)=>Array.isArray(d.portal_domain_assignments)?d.portal_domain_assignments:d.portal_domain_assignments?[d.portal_domain_assignments]:[];
export function AdminRenewals(){
  const [data,setData]=useState<Snapshot|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false),[search,setSearch]=useState(""),[bucket,setBucket]=useState("All");
  const pending=useRef(false);
  async function load(after?:string){if(pending.current)return;pending.current=true;setBusy(true);try{const next=await api(`admin/renewals${after?`?after=${encodeURIComponent(after)}`:""}`) as Snapshot;setData(old=>after&&old?{...next,domains:[...old.domains,...next.domains],contacts:[...old.contacts,...next.contacts],quotes:[...old.quotes,...next.quotes],orders:[...old.orders,...next.orders],reminders:[...old.reminders,...next.reminders],operations:[...old.operations,...next.operations],history_limited:old.history_limited||next.history_limited}:next);setError("");}catch(e){setError((e as Error).message);}finally{pending.current=false;setBusy(false);}}
  useEffect(()=>{void load();},[]);
  const now=data?Date.parse(data.checked_at):0;
  const contacts=data?.contacts.filter((c,i,all)=>all.findIndex(other=>other.client_id===c.client_id&&other.portal_accounts.approved_email===c.portal_accounts.approved_email)===i)||[];
  const filtered=data?.domains.filter(d=>{
    const clientIds=assignments(d).map(a=>a.client_id);
    const text=[d.name,...assignments(d).map(a=>a.portal_clients?.business_name||a.portal_clients?.name||""),...data.contacts.filter(c=>clientIds.includes(c.client_id)).map(c=>c.portal_accounts.approved_email)].join(" ").toLowerCase();
    return (bucket==="All"||renewalWindow(d.expiration_date,now).bucket===bucket)&&text.includes(search.trim().toLowerCase());
  }).sort((a,b)=>(Date.parse(a.expiration_date||"")||0)-(Date.parse(b.expiration_date||"")||0))||[];
  return <><h1>Renewals</h1><p>Monitor verified expiration dates, payment status and follow-up. Live charges and registrar renewals remain disabled.</p>
    <button disabled={busy} onClick={()=>void load()}>{busy?"Loading…":"Refresh saved records"}</button>
    {error&&<p role="alert" className="portal-error">{error}{data?" Previous records remain visible.":""}</p>}
    <div className="portal-renewal-filters"><label>Find domain or client<input value={search} onChange={e=>setSearch(e.target.value)}/></label><label>Expiration window<select value={bucket} onChange={e=>setBucket(e.target.value)}>{renewalBuckets.map(b=><option key={b}>{b}</option>)}</select></label></div>
    {data&&<p>{filtered.length} matching domains among {data.domains.length} loaded.{data.next?" Load the next page to include more domains in your filter.":" All domain pages loaded."} Snapshot: {new Date(data.checked_at).toLocaleString()}.</p>}
    {data?.history_limited&&<p className="portal-notice">Some history reached its query limit. Review the individual client records before concluding there is no activity.</p>}
    {!busy&&!filtered.length&&<p>No domains match this view.</p>}
    {filtered.map(d=>{const time=renewalWindow(d.expiration_date,now),owners=assignments(d),quote=data!.quotes.find(q=>q.domain_id===d.id&&Date.parse(q.valid_until)>now),order=data!.orders.find(o=>o.domain===d.name&&owners.some(a=>a.client_id===o.client_id)),reminder=data!.reminders.find(r=>r.domain===d.name&&owners.some(a=>a.client_id===r.client_id));return <section className="portal-panel" key={d.id}>
      <h2><Link href={`/admin/domains/${encodeURIComponent(d.name)}`}>{d.name}</Link></h2><p>{time.bucket} · {time.days===null?"Expiry unverified":new Date(d.expiration_date!).toLocaleDateString()} · {time.days!==null&&time.days>0?`${time.days} days remaining`:time.bucket}</p>
      {owners.length?owners.map(a=><div key={a.client_id}><Link href={`/admin/clients/${a.client_id}`}>{a.portal_clients?.business_name||a.portal_clients?.name||"Client profile"}</Link>{contacts.filter(c=>c.client_id===a.client_id).map(c=><p key={c.portal_accounts.approved_email}>{c.portal_accounts.approved_email}{!c.portal_accounts.active?" · Sign-in disabled":""}</p>)}</div>):<p>Unassigned</p>}
      <dl className="portal-details"><dt>Renewal quote</dt><dd>{customerMoney(quote?.retail_minor,quote?.currency)}</dd><dt>Auto-renew</dt><dd>{d.auto_renew===false?"Off":d.auto_renew===true?"On, review required":"Unknown"}</dd><dt>Payment</dt><dd>{order?`${order.status.replaceAll("_"," ")} · ${order.environment}`:"No renewal order in loaded history"}</dd><dt>Last reminder</dt><dd>{reminder?`${reminder.status.replaceAll("_"," ")} · ${new Date(reminder.created_at).toLocaleString()}`:"No reminder in loaded history"}</dd><dt>Verified snapshot</dt><dd>{d.last_synced_at?new Date(d.last_synced_at).toLocaleString():"Not recorded"}</dd></dl>
      <p>{d.reconciliation_required?"Provider reconciliation required. Preserve the existing record until verified.":"A paid order alone does not prove a registrar renewal."}</p>
      <details><summary>Recorded domain operations</summary>{data!.operations.filter(o=>o.domain_id===d.id).length?data!.operations.filter(o=>o.domain_id===d.id).map(o=><p key={o.id}>{o.kind} · {o.status.replaceAll("_"," ")}</p>):<p>No operations in loaded history.</p>}</details>
    </section>})}
    {data?.next&&<button disabled={busy} onClick={()=>void load(data.next!)}>Load next 50 domains</button>}
  </>;
}
