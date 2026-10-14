"use client";
import Link from "next/link";
import {useCallback,useEffect,useState} from "react";
import {Clock3,CreditCard,Globe2,LifeBuoy,Plus,RefreshCw,ShieldAlert,Users} from "lucide-react";
import {api} from "./Portal";
import {EmptyState,LoadingSkeleton,MetricCard,PageHeader} from "./PortalUI";
type Summary={checked_at:string;scope:"customers"|"test";counts:Record<"active_clients"|"assigned_domains"|"expires_30_days"|"unpaid_invoices"|"open_support"|"operation_reviews",number|null>};
export function AdminOverview(){
  const [data,setData]=useState<Summary|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false),[scope,setScope]=useState<"customers"|"test">("customers");
  const load=useCallback(async(signal?:AbortSignal)=>{setBusy(true);try{const next=await api(`admin/summary?scope=${scope}`,undefined,signal);if(!signal?.aborted){setData(next);setError("");}}catch(e){if(!signal?.aborted)setError((e as Error).message);}finally{if(!signal?.aborted)setBusy(false);}},[scope]);
  useEffect(()=>{const controller=new AbortController();void load(controller.signal);return()=>controller.abort();},[load]);
  const metrics=[
    ["active_clients","Active clients","/admin/clients",Users],
    ["assigned_domains","Assigned domains","/admin/domains",Globe2],
    ["expires_30_days","Expiring in 30 days","/admin/renewals",Clock3],
    ["unpaid_invoices","Pending invoices","/admin/billing",CreditCard],
    ["open_support","Open support","/admin/support",LifeBuoy],
    ["operation_reviews","Operations to review","/admin/operations",ShieldAlert],
  ] as const;
  const destination=(href:string)=>href==="/admin/operations"?href:`${href}?scope=${scope}`;
  return <section>
    <PageHeader title="Overview" eyebrow="Workspace" description="Your clients, services and next steps." actions={<><Link className="p-button" href="/admin/billing">Create invoice</Link><Link className="p-button" href="/admin/domains#domain-handoff">Assign domain</Link><Link className="p-button p-button-primary" href="/admin/clients/new"><Plus size={16}/>Add client</Link></>}/>
    <div className="p-report-toolbar"><label>Reporting<select aria-label="Reporting scope" value={scope} disabled={busy} onChange={event=>{setData(null);setScope(event.target.value as "customers"|"test");}}><option value="customers">Customers</option><option value="test">Test accounts only</option></select></label><button className="p-button" disabled={busy} onClick={()=>void load()} aria-label="Refresh summary"><RefreshCw size={15} className={busy?"p-spinning":""}/>{busy?"Refreshing":"Refresh"}</button></div>
    {error&&<div role="alert" className="portal-error">{error}<button onClick={()=>void load()}>Retry summary</button></div>}
    {!data&&!error&&<LoadingSkeleton label="Loading overview"/>}
    {data&&<><div className="p-metric-grid p-overview-grid">{metrics.map(([key,title,href,icon])=><MetricCard key={key} title={title} value={data.counts[key]} href={destination(href)} icon={icon} hint={key==="operation_reviews"?"Open all operational queues":undefined}/>)}</div>
      <div className="p-workbench"><div className="p-workbench-body"><div className="p-section-heading"><h2>Needs attention</h2><span className="p-muted">{scope==="test"?"Labelled test accounts":"Customer records only"}</span></div>
      {(["expires_30_days","unpaid_invoices","open_support","operation_reviews"] as const).some(key=>(data.counts[key]||0)>0)?<div className="p-attention-list">{metrics.filter(([key])=>["expires_30_days","unpaid_invoices","open_support","operation_reviews"].includes(key)&&(data.counts[key]||0)>0).map(([key,title,href,Icon])=><Link href={destination(href)} key={key}><span className="p-icon-tile"><Icon size={18}/></span><span><strong>{title}</strong><small>{data.counts[key]} saved {data.counts[key]===1?"item":"items"} to follow up{key==="operation_reviews"?", opens all queues":""}</small></span><span className="p-button p-button-small">Open</span></Link>)}</div>:<EmptyState title="You’re all caught up" description="No pending items in this reporting group."/>}
      </div><footer className="p-table-footer">Updated {new Date(data.checked_at).toLocaleTimeString()} · {scope==="test"?"Test records only":"Test accounts excluded"}</footer></div>
    </>}
  </section>;
}
