"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {api} from "./Portal";
import {OwnershipTasks} from "./OwnershipTasks";
import {operatorGuide} from "@/lib/portal/operator-guide";
type Assignment={client_id:string;portal_clients:{name:string;business_name:string}};
type Domain={id:string;name:string;lifecycle_status:string;expiration_date:string|null;auto_renew:boolean|null;last_synced_at:string|null;reconciliation_required:boolean;portal_domain_assignments:Assignment[]|Assignment|null};
type Item={id?:string;client_id?:string;domain?:string;subject?:string;status?:string;kind?:string;category?:string;order_id?:string;last_error?:string;created_at?:string;environment?:string;reconciliation_status?:string};
type Quote={domain_id:string;retail_minor:number;currency:string;valid_until:string};
type Snapshot={checked_at:string;counts:Record<string,number>;domains:Domain[];quotes:Quote[];orders:Item[];email:Item[];operations:Item[];ledger:Item[];audit:{id:number;action:string;target_id:string|null;created_at:string}[]};
const title=(value:string)=>value.replaceAll("_"," ");
export function AdminOperations(){
  const [data,setData]=useState<Snapshot|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  async function notification(route:string,id:string){
    setBusy(true);setError("");setMessage("");
    try{const result=await api(route,{id,...(route.endsWith("recover")?{confirmed:true}:{})});setMessage(result.message);await load();}
    catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  async function load(){setBusy(true);try{setData(await api("admin/operations"));setError("");}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  useEffect(()=>{void load();},[]);
  return <section aria-label="Client operations">
    <h1>Client operations</h1>
    <details className="portal-panel"><summary>Administrator operating guide</summary>{operatorGuide.map(section=><section key={section.title}><h2>{section.title}</h2><ol>{section.steps.map(step=><li key={step}>{step}</li>)}</ol></section>)}</details>
    <OwnershipTasks/>
    <p><Link href="/admin/health">Integration and backup health</Link> · <Link href="/admin/renewals">Renewal follow-up</Link></p>
    <p>Saved provider-verified snapshots. Refreshing this dashboard doesn&apos;t call Spaceship or change domains.</p>
    <button disabled={busy} onClick={()=>void load()}>{busy?"Refreshing…":"Refresh operations"}</button>
    {error&&<p className="portal-error" role="alert">{error}</p>}
    {message&&<p role="status">{message}</p>}
    {data&&<>
      <p>Database snapshot: {new Date(data.checked_at).toLocaleString()}. Counts include test records. Expiry windows overlap.</p>
      <section className="portal-panel"><h2>Saved operations summary</h2><dl>{Object.entries(data.counts).map(([key,value])=><div key={key}><dt>{title(key)}</dt><dd>{value??"Unavailable"}</dd></div>)}</dl></section>
      <section className="portal-panel">
        <h2>Domain renewal follow-up</h2>
        <p>First 100 domains by expiry, unknown dates first. Auto-renew is the last verified provider state. Quotes show at most 500 current saved quotes for these domains.</p>
        {data.domains.length?<div className="portal-table-wrap"><table><thead><tr><th>Domain / client</th><th>Expiry / quote</th><th>Provider state</th><th>Freshness</th></tr></thead><tbody>
          {data.domains.map(d=>{
            const assignments=Array.isArray(d.portal_domain_assignments)?d.portal_domain_assignments:d.portal_domain_assignments?[d.portal_domain_assignments]:[];
            const quote=data.quotes.find(q=>q.domain_id===d.id&&Date.parse(q.valid_until)>Date.now());
            return <tr key={d.id}>
              <td><Link href={`/admin/domains/${encodeURIComponent(d.name)}`}>{d.name}</Link>
                {assignments.map(a=><p key={a.client_id}><Link href={`/admin/clients/${a.client_id}`}>{a.portal_clients?.business_name||a.portal_clients?.name||a.client_id}</Link></p>)}
                {!assignments.length&&<p>Unassigned</p>}
              </td>
              <td>{d.expiration_date?new Date(d.expiration_date).toLocaleString():"Expiry unverified"}
                {quote?<p>{(quote.retail_minor/100).toFixed(2)} {quote.currency.toUpperCase()} · valid until {new Date(quote.valid_until).toLocaleString()}</p>:<p>Quote required</p>}
              </td>
              <td>{d.lifecycle_status}<p>Auto-renew: {d.auto_renew===true?"On":d.auto_renew===false?"Off":"Unknown"}</p></td>
              <td>{d.last_synced_at?new Date(d.last_synced_at).toLocaleString():"Not verified"}{d.reconciliation_required&&<p>Provider reconciliation required. Previous records preserved.</p>}</td>
            </tr>;
          })}
        </tbody></table></div>:<p>No domain snapshots saved.</p>}
      </section>
      {([
        ["orders","Payment and renewal follow-up"],
        ["operations","Registrar operation follow-up"],
        ["ledger","Unreconciled supplier / processor ledger"],
        ["email","Recent notification and reminder history"],
      ] as const).map(([key,heading])=><section className="portal-panel" key={key}>
        <h2>{heading}</h2><p>Up to 50 saved records. Paid status doesn&apos;t prove a registrar renewal. Ambiguous sends and operations require reconciliation, not blind retry.</p>
        {data[key].length?data[key].map((item,i)=><article key={item.id||`${item.order_id}-${i}`}>
          <p>{item.subject||item.domain||item.kind||item.category||"Operation"} · {title(item.status||item.reconciliation_status||"unknown")}{item.environment?` · ${item.environment}`:""}</p>
          <small>Reference: {item.id||item.order_id}</small>
          {item.created_at&&<p>{new Date(item.created_at).toLocaleString()}</p>}
          {item.last_error&&<p>{item.last_error}</p>}
          {key==="email"&&item.id&&<div className="portal-actions">
            <button disabled={busy} onClick={()=>void notification("admin/notification-reconcile",item.id!)}>Check delivery status</button>
            {item.status==="review_required"&&item.last_error==="configuration_required:BREVO_CLIENT_SENDER_EMAIL"&&<button disabled={busy} onClick={()=>{if(window.confirm("Queue this confirmed pre-send failure once? This won't send immediately and won't retry an uncertain delivery."))void notification("admin/notification-recover",item.id!);}}>Recover confirmed unsent email</button>}
          </div>}
          {item.client_id&&<p><Link href={`/admin/clients/${item.client_id}`}>Open client profile</Link></p>}
        </article>):<p>No records in this queue.</p>}
      </section>)}
      <section className="portal-panel"><h2>Recent audit activity</h2><p>Latest 50 actions. Sensitive provider payloads are excluded.</p>
        {data.audit.length?data.audit.map(row=><p key={row.id}>{new Date(row.created_at).toLocaleString()} · {title(row.action)} · {row.target_id||"System"}</p>):<p>No audit activity recorded.</p>}
      </section>
    </>}
  </section>;
}
