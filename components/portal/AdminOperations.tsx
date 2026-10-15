"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {Activity,ArrowUpRight,Clock3,CreditCard,HelpCircle,Mail,RefreshCw,ShieldAlert} from "lucide-react";
import {api} from "./Portal";
import {OwnershipTasks} from "./OwnershipTasks";
import {operatorGuide} from "@/lib/portal/operator-guide";
import {needsOperationReview} from "@/lib/portal/operation-review";
import {useAdminAccess} from "./AdminAccess";
import {DetailDrawer,EmptyState,LoadingSkeleton,MetricCard,PageHeader,StatusBadge,SectionTabs} from "./PortalUI";
type Client={name:string;business_name:string};
type Assignment={client_id:string;portal_clients:Client};
type Domain={id:string;name:string;lifecycle_status:string;expiration_date:string|null;auto_renew:boolean|null;last_synced_at:string|null;reconciliation_required:boolean;portal_domain_assignments:Assignment[]|Assignment|null};
type Item={id?:string;client_id?:string;domain?:string;subject?:string;status?:string;kind?:string;category?:string;order_id?:string;amount_minor?:number;currency?:string;payment_id?:string;last_error?:string;created_at?:string;environment?:string;reconciliation_status?:string;portal_clients?:Client|null};
type Quote={domain_id:string;retail_minor:number;currency:string;valid_until:string};
type Snapshot={checked_at:string;counts:Record<string,number|null>;domains:Domain[];quotes:Quote[];orders:Item[];email:Item[];operations:Item[];ledger:Item[];audit:{id:number;action:string;target_id:string|null;created_at:string}[]};
const tabs=["All","Needs attention","Renewals","Payments","Notifications","Domain operations","Activity log"] as const;
type Tab=typeof tabs[number];
const date=(value?:string|null)=>value?new Date(value).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"}):"Not verified";
const title=(value:string)=>value.replaceAll("_"," ");
export function AdminOperations(){
  const {can}=useAdminAccess();
  const [data,setData]=useState<Snapshot|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
  const [tab,setTab]=useState<Tab>("All"),[search,setSearch]=useState("");
  const [detail,setDetail]=useState<{kind:string;item:Item}|null>(null),[help,setHelp]=useState(false);
  async function load(){setBusy(true);try{setData(await api("admin/operations"));setError("");}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  useEffect(()=>{void load();},[]);
  async function notification(recover=false){
    if(!detail?.item.id||busy)return;
    setBusy(true);setError("");setMessage("");
    try{const result=await api(recover?"admin/notification-recover":"admin/notification-reconcile",{id:detail.item.id,...(recover?{confirmed:true}:{})});setMessage(result.message);setDetail(null);await load();}
    catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  const filtered=(items:Item[])=>items.filter(item=>`${item.subject||""} ${item.domain||""} ${item.kind||""} ${item.status||""} ${item.portal_clients?.business_name||""}`.toLowerCase().includes(search.toLowerCase()));
  const table=(items:Item[],kind:string)=>items.length?<div className="portal-table-wrap"><table className="p-data-table"><thead><tr><th>{kind==="email"?"Notification":"Item"}</th><th>Client / environment</th><th>Status</th><th>Created</th><th><span className="p-sr-only">Action</span></th></tr></thead><tbody>{filtered(items).map((item,i)=><tr key={item.id||`${item.order_id}-${i}`}><td><strong>{item.subject||item.domain||title(item.kind||item.category||"Operation")}</strong></td><td>{item.portal_clients?.business_name||item.portal_clients?.name|| (item.client_id?<Link href={`/admin/clients/${item.client_id}`}>Open client</Link>:"System")}{item.environment&&<small>{item.environment==="sandbox"?"Sandbox, no live charge":item.environment}</small>}</td><td><StatusBadge value={item.status||item.reconciliation_status}/></td><td>{date(item.created_at)}</td><td><button className="p-button p-button-small" onClick={()=>setDetail({kind:item.subject?"email":kind,item})}>View details</button></td></tr>)}</tbody></table>{!filtered(items).length&&<EmptyState title="No matching records" description="Try a different search."/>}</div>:<EmptyState title="Nothing to review" description="New items will appear here when there is work to do."/>;
  const reviewCount=data?["payment_followups","email_delivery_issues","domain_operation_reviews"].reduce<number|null>((sum,key)=>sum===null||data.counts[key]==null?null:sum+data.counts[key]!,0):null;
  return <section aria-label="Operations">
    <PageHeader title="Operations" description="Monitor business activity and resolve items that need attention." eyebrow="Administration" actions={<><button className="p-button" onClick={()=>setHelp(true)}><HelpCircle size={16}/>Help</button><Link className="p-button" href="/admin/health"><Activity size={16}/>Health</Link><button className="p-button p-button-primary" disabled={busy} onClick={()=>void load()}><RefreshCw size={16} className={busy?"p-spinning":""}/>{busy?"Refreshing":"Refresh"}</button></>}/>
    {error&&<div className="portal-error" role="alert">{error}<button onClick={()=>void load()}>Retry</button></div>}{message&&<div className="p-toast" role="status">{message}<button className="p-icon-button" aria-label="Dismiss notification" onClick={()=>setMessage("")}>×</button></div>}
    {!data&&!error&&<LoadingSkeleton label="Loading operations"/>}
    {data&&<>
      <div className="p-metric-grid"><MetricCard title="Needs attention" value={reviewCount} icon={ShieldAlert} hint="Review items across queues"/><MetricCard title="Pending renewals" value={data.counts.pending_renewals} icon={Clock3}/><MetricCard title="Payment reviews" value={data.counts.payment_followups} icon={CreditCard}/><MetricCard title="Email delivery issues" value={data.counts.email_delivery_issues} icon={Mail}/></div>
      <div className="p-workbench"><SectionTabs tabs={tabs} value={tab} onChange={value=>{setTab(value);setSearch("");}} label="Operations sections" panelId="operations-panel"/>
      <section id="operations-panel" role="tabpanel" aria-labelledby={`operations-panel-${tabs.indexOf(tab)}`} className="p-workbench-body" tabIndex={0}>
        {tab!=="All"&&<div className="p-table-toolbar"><h2>{tab}</h2><label className="p-search"><span className="p-sr-only">Search visible records</span><input type="search" placeholder="Search this view…" value={search} onChange={event=>setSearch(event.target.value)} maxLength={100}/></label></div>}
        {tab==="All"&&<><div className="p-section-heading"><h2>Your work, organized</h2><span className="p-muted">Includes labelled test records</span></div><div className="p-queue-grid">{([["Notifications","Delivery history and safe follow-up",Mail],["Renewals","Verified expiry and saved renewal quotes",Clock3],["Payments","Orders and reconciliation reviews",CreditCard],["Domain operations","Registrar follow-up and ownership tasks",ShieldAlert]] as const).map(([name,description,Icon])=><button key={name} className="p-queue-card" onClick={()=>setTab(name)}><span className="p-icon-tile"><Icon size={19}/></span><span><strong>{name}</strong><small>{description}</small></span><ArrowUpRight size={16}/></button>)}</div><div className="p-section-heading"><h2>Recent activity</h2><button className="p-link-button" onClick={()=>setTab("Activity log")}>View activity</button></div>{data.audit.length?<ol className="p-timeline">{data.audit.slice(0,5).map(row=><li key={row.id}><span>{title(row.action)}</span><time>{date(row.created_at)}</time></li>)}</ol>:<EmptyState title="No activity yet"/>}</>}
        {tab==="Needs attention"&&table([...data.orders.filter(row=>needsOperationReview("payments",row.status)),...data.email.filter(row=>needsOperationReview("email",row.status)),...data.operations].map(row=>({...row,kind:row.subject?"Notification":row.kind||"Review"})),"review")}
        {tab==="Notifications"&&table(data.email,"email")}
        {tab==="Payments"&&<>{table(data.orders,"orders")}<details className="p-technical-details"><summary>Supplier and processor reconciliation</summary>{table(data.ledger,"ledger")}</details></>}
        {tab==="Domain operations"&&<>{table(data.operations,"operations")}<div className="p-section-heading"><h2>Ownership follow-up</h2></div><OwnershipTasks/></>}
        {tab==="Renewals"&&(data.domains.length?<div className="portal-table-wrap"><table><thead><tr><th>Domain</th><th>Expiry</th><th>Status</th><th>Renewal</th><th>Action</th></tr></thead><tbody>{data.domains.filter(d=>d.name.includes(search.toLowerCase())).map(d=>{const quote=data.quotes.find(q=>q.domain_id===d.id&&Date.parse(q.valid_until)>Date.now());return <tr key={d.id}><td><strong>{d.name}</strong></td><td>{date(d.expiration_date)}</td><td><StatusBadge value={d.lifecycle_status}/></td><td>{quote?`${(quote.retail_minor/100).toFixed(2)} ${quote.currency.toUpperCase()}`:"Quote required"}<small>Auto-renew {d.auto_renew===null?"unverified":d.auto_renew?"on":"off"}</small></td><td><Link className="p-button p-button-small" href={`/admin/domains/${encodeURIComponent(d.name)}`}>Open domain</Link></td></tr>;})}</tbody></table></div>:<EmptyState title="No domains saved"/>)}
        {tab==="Activity log"&&<div className="portal-table-wrap"><table><thead><tr><th>Activity</th><th>Date</th><th>Details</th></tr></thead><tbody>{data.audit.filter(row=>row.action.includes(search.toLowerCase().replaceAll(" ","_"))).map(row=><tr key={row.id}><td>{title(row.action)}</td><td>{date(row.created_at)}</td><td><details><summary>Reference</summary><code>{row.target_id||"System event"}</code></details></td></tr>)}</tbody></table></div>}
      </section><footer className="p-table-footer">Updated {new Date(data.checked_at).toLocaleTimeString()} · Latest 50 queue records, up to 100 domains</footer></div>
    </>}
    {detail&&<DetailDrawer title={detail.kind==="email"?"Notification details":"Operation details"} onClose={()=>setDetail(null)}>
      <h3>{detail.item.subject||detail.item.domain||title(detail.item.kind||detail.item.category||"Operation")}</h3>
      <StatusBadge value={detail.item.status||detail.item.reconciliation_status}/>
      <dl className="p-detail-list">
        {detail.item.created_at&&<><dt>Created</dt><dd>{date(detail.item.created_at)}</dd></>}
        {typeof detail.item.amount_minor==="number"&&<><dt>Amount</dt><dd>{(detail.item.amount_minor/100).toFixed(2)} {detail.item.currency?.toUpperCase()}</dd></>}
        {detail.item.environment&&<><dt>Environment</dt><dd>{detail.item.environment==="sandbox"?"Sandbox, no live charge":detail.item.environment}</dd></>}
        <dt>Reference</dt><dd><code>{detail.item.id||detail.item.order_id}</code></dd>
        {detail.item.payment_id&&<><dt>Payment reference</dt><dd><code>{detail.item.payment_id}</code></dd></>}
      </dl>
      {detail.item.last_error&&<details className="p-technical-details"><summary>Diagnostic details</summary><code>{detail.item.last_error}</code></details>}
      {detail.kind==="email"&&can("operations.recover")&&<>
        <p className="p-muted">Check provider evidence without sending another message. Accepted and delivered are separate states.</p>
        <button className="p-button p-button-primary" disabled={busy} onClick={()=>void notification()}>{busy?"Checking…":"Check delivery status"}</button>
        {detail.item.status==="review_required"&&detail.item.last_error==="configuration_required:BREVO_CLIENT_SENDER_EMAIL"&&<details className="p-technical-details"><summary>Safe recovery</summary><p>This exact failure occurred before dispatch. Fresh MFA is required. This queues once and does not send immediately.</p><button className="p-button" disabled={busy} onClick={()=>{if(window.confirm("Queue this confirmed unsent notification once?"))void notification(true);}}>Recover confirmed unsent email</button></details>}
      </>}
      {detail.item.client_id&&<p><Link className="p-button" href={`/admin/clients/${detail.item.client_id}`}>Open client profile</Link></p>}
      {error&&<p className="portal-error" role="alert">{error}</p>}
    </DetailDrawer>}
    {help&&<DetailDrawer title="Operator help" onClose={()=>setHelp(false)}>{operatorGuide.map(section=><details className="p-help-topic" key={section.title}><summary>{section.title}</summary><ol>{section.steps.map(step=><li key={step}>{step}</li>)}</ol></details>)}</DetailDrawer>}
  </section>;
}
