"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {api} from "./Portal";
type Summary={checked_at:string;counts:{active_clients:number;assigned_domains:number;expires_30_days:number;unpaid_invoices:number;open_support:number}};
export function AdminOverview(){
  const [data,setData]=useState<Summary|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  async function load(){setBusy(true);try{setData(await api("admin/summary"));setError("");}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  useEffect(()=>{void load();},[]);
  return <section><h1>Overview</h1><p>Client access, domains and service follow-up.</p>
    <div className="portal-actions"><Link className="portal-button" href="/admin/clients/new">Create client</Link><Link className="portal-button" href="/admin/domains#domain-handoff">Assign domain</Link><button disabled={busy} onClick={()=>void load()}>{busy?"Refreshing…":"Refresh"}</button></div>
    {error&&<p role="alert" className="portal-error">{error}</p>}
    {!data&&!error&&<p role="status">Loading summary…</p>}
    {data&&<><div className="portal-stats portal-overview-stats">{([
      ["active_clients","Active clients","/admin/clients"],
      ["assigned_domains","Assigned domains","/admin/domains"],
      ["expires_30_days","Expire in 30 days","/admin/renewals"],
      ["unpaid_invoices","Unpaid invoices","/admin/billing"],
      ["open_support","Open support","/admin/support"],
    ] as const).map(([key,label,href])=><Link className="portal-panel" key={key} href={href}><span>{label}</span><strong>{data.counts[key]??"Unavailable"}</strong></Link>)}</div><small>Saved records as of {new Date(data.checked_at).toLocaleString()}. Labelled acceptance records are included.</small></>}
  </section>;
}
