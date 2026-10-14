"use client";
import Link from "next/link";
import {useCallback,useEffect,useState} from "react";
import {api} from "./Portal";
type Summary={checked_at:string;scope:"customers"|"test";counts:{active_clients:number;assigned_domains:number;expires_30_days:number;unpaid_invoices:number;open_support:number}};
export function AdminOverview(){
  const [data,setData]=useState<Summary|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  const [scope,setScope]=useState<"customers"|"test">("customers");
  const load=useCallback(async(signal?:AbortSignal)=>{setBusy(true);try{const next=await api(`admin/summary?scope=${scope}`,undefined,signal);if(!signal?.aborted){setData(next);setError("");}}catch(e){if(!signal?.aborted)setError((e as Error).message);}finally{if(!signal?.aborted)setBusy(false);}},[scope]);
  useEffect(()=>{const controller=new AbortController();void load(controller.signal);return()=>controller.abort();},[load]);
  return <section><h1>Overview</h1><p>Client access, domains and service follow-up.</p>
    <div className="portal-actions"><Link className="portal-button" href="/admin/clients/new">Create client</Link><Link className="portal-button" href="/admin/domains#domain-handoff">Assign domain</Link><button disabled={busy} onClick={()=>void load()}>{busy?"Refreshing…":"Refresh"}</button></div>
    <label>Show<select value={scope} disabled={busy} onChange={e=>{setData(null);setScope(e.target.value as "customers"|"test");}}><option value="customers">Customers</option><option value="test">Test accounts only</option></select></label>
    {error&&<p role="alert" className="portal-error">{error}</p>}
    {!data&&!error&&<p role="status">Loading summary…</p>}
    {data&&<><div className="portal-stats portal-overview-stats">{([
      ["active_clients","Active clients","/admin/clients"],
      ["assigned_domains","Assigned domains","/admin/domains"],
      ["expires_30_days","Assigned domains expiring in 30 days","/admin/renewals"],
      ["unpaid_invoices","Unpaid invoices","/admin/billing"],
      ["open_support","Open support","/admin/support"],
    ] as const).map(([key,label,href])=><Link className="portal-panel" key={key} href={href}><span>{label}</span><strong>{data.counts[key]??"Unavailable"}</strong></Link>)}</div><small>Saved records as of {new Date(data.checked_at).toLocaleString()}. {data.scope==="test"?"Only accounts labelled TEST ONLY are counted.":"Accounts labelled TEST ONLY are excluded."}</small></>}
  </section>;
}
