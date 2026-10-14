"use client";
import Link from "next/link";
import {useState} from "react";
import {customerMoney,renewalWindow} from "@/lib/portal/renewal-view";
type Row=Record<string,unknown>;
export function ClientDomainCards({domains,quotes}:{domains:Row[];quotes:Row[]}) {
  const [search,setSearch]=useState("");
  const [now]=useState(()=>Date.now());
  const filtered=domains.filter(d=>String(d.name).toLowerCase().includes(search.trim().toLowerCase()));
  return <section aria-label="Assigned domains">
    {domains.length>5&&<label className="portal-search">Find a domain<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Domain name"/></label>}
    {!domains.length?<div className="portal-empty">Your domains will appear here once assigned. <Link href="/client-portal/support">Contact support</Link></div>:!filtered.length?<p>No domains match your search.</p>:<div className="portal-domain-grid">{filtered.map(d=>{
      const time=renewalWindow(d.expiration_date,now);
      const quote=quotes.filter(q=>q.domain_id===d.id&&q.kind==="renewal"&&Date.parse(String(q.valid_until))>now).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)))[0];
      return <article className="portal-panel portal-domain-card" key={String(d.id)}>
        <h2>{String(d.name)}</h2><span className="portal-status">{time.bucket==="Expired"?"Expired":d.lifecycle_status==="registered"?"Active":String(d.lifecycle_status||"Status unverified").replaceAll("_"," ")}</span>
        <dl className="portal-details"><dt>Expires</dt><dd>{time.days===null?"Not verified":new Date(String(d.expiration_date)).toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric"})}<small>{time.days===null?"":time.bucket==="Expired"?"Expired":`${time.days} days remaining`}</small></dd><dt>Auto-renew</dt><dd>{d.auto_renew===false?"Off":d.auto_renew===true?"On, review needed":"Not verified"}</dd><dt>Renewal price</dt><dd>{customerMoney(quote?.retail_minor,quote?.currency)}</dd></dl>
        <Link className="portal-button" href={`/client-portal/domains/${encodeURIComponent(String(d.name))}`}>Manage Domain</Link>
        <small>Renewal setup in progress. No automatic charge.</small>
      </article>;
    })}</div>}
  </section>;
}
