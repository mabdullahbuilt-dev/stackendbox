"use client";
import Link from "next/link";
import {useState} from "react";
import {customerMoney,renewalWindow} from "@/lib/portal/renewal-view";
import {Globe2,ArrowUpRight} from "lucide-react";
import {EmptyState,StatusBadge} from "./PortalUI";
type Row=Record<string,unknown>;
export function ClientDomainCards({domains,quotes,websites=[]}:{domains:Row[];quotes:Row[];websites?:Row[]}) {
  const [search,setSearch]=useState("");
  const [now]=useState(()=>Date.now());
  const filtered=domains.filter(d=>String(d.name).toLowerCase().includes(search.trim().toLowerCase()));
  return <section aria-label="Assigned domains">
    {domains.length>5&&<label className="portal-search">Find a domain<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Domain name"/></label>}
    {!domains.length?<EmptyState title="Your domains will appear here" description="Once a domain is assigned, its verified details will be ready to manage." action={<Link className="p-button" href="/client-portal/requests">Contact support</Link>}/>:!filtered.length?<EmptyState title="No matching domains"/>:<div className="portal-domain-grid">{filtered.map(d=>{
      const time=renewalWindow(d.expiration_date,now);
      const quote=quotes.filter(q=>q.domain_id===d.id&&q.kind==="renewal"&&Date.parse(String(q.valid_until))>now).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)))[0];
      return <article className="portal-panel portal-domain-card" key={String(d.id)}>
        <div className="p-domain-top"><span className="p-icon-tile"><Globe2 size={20}/></span><StatusBadge value={time.bucket==="Expired"?"expired":d.lifecycle_status==="registered"?"active":String(d.lifecycle_status||"unverified")}/></div><h2>{String(d.name)}</h2>
        <dl className="portal-details"><dt>Expires</dt><dd>{time.days===null?"Not verified":new Date(String(d.expiration_date)).toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric"})}<small>{time.days===null?"":time.bucket==="Expired"?"Expired":`${time.days} days remaining`}</small></dd><dt>Auto-renew</dt><dd>{d.auto_renew===false?"Off":d.auto_renew===true?"On, review needed":"Not verified"}</dd><dt>Renewal price</dt><dd>{customerMoney(quote?.retail_minor,quote?.currency)}</dd></dl>
        <Link className="p-button p-domain-action" href={`/client-portal/domains/${encodeURIComponent(String(d.name))}`}>Manage Domain<ArrowUpRight size={15}/></Link>
        {websites.filter(w=>w.domain_id===d.id).map(w=><p key={String(w.id)}><Link href="/client-portal/websites">{String(w.name)}</Link> · {String(w.project_status||"Status not recorded")}</p>)}
        {d.reconciliation_required===true&&<p role="status">Latest update unavailable. Showing your last verified details.</p>}
        <small className="p-muted">Online renewal unavailable · No automatic charge</small>
      </article>;
    })}</div>}
  </section>;
}
