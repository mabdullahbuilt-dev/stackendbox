"use client";
import Link from "next/link";
import {useEffect,useRef,useState} from "react";
import {api} from "./Portal";
import {RegistrarAcceptance} from "./RegistrarAcceptance";
import {backupStatus,healthQueues,type BackupEvidence} from "@/lib/portal/health-status";

type Exception={id?:string;order_id?:string;name?:string;email?:string;status?:string;state?:string;category?:string;reconciliation_status?:string;auto_renew?:boolean|null;reconciliation_required?:boolean;created_at?:string;last_error?:string|null};
type Health={checked_at:string;counts:Record<string,number>;backups:BackupEvidence[];releases:{version:string;applied_at:string}[]}&Record<keyof typeof healthQueues,Exception[]>;
const label=(value:string)=>value.replaceAll("_"," ");
function date(value:string|null|undefined){return value&&Number.isFinite(Date.parse(value))?new Date(value).toLocaleString():"Not recorded";}

export function AdminHealth(){
  const [data,setData]=useState<Health|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  const inFlight=useRef(false);
  async function load(){
    if(inFlight.current)return;
    inFlight.current=true;setBusy(true);
    try{setData(await api("admin/health") as Health);setError("");}
    catch(e){setError(e instanceof Error?e.message:"Health check failed. Retry safely.");}
    finally{inFlight.current=false;setBusy(false);}
  }
  useEffect(()=>{void load();},[]);
  const newestVerified=data?.backups.filter(b=>backupStatus(b).verified).sort((a,b)=>Date.parse(b.completed_at!)-Date.parse(a.completed_at!))[0];
  return <>
    <h1>Operations health</h1>
    <p>Review saved backend evidence and work needing attention. These checks do not send emails, charge clients or change registrar settings.</p>
    <button disabled={busy} onClick={()=>void load()}>{busy?"Checking records…":"Refresh saved checks"}</button>
    {error&&<p role="alert" className="portal-error">{error}{data?" Showing the previous snapshot, which may be out of date.":""}</p>}
    {!data ? busy&&<p role="status">Checking persisted records…</p> : <>
      <p>Snapshot checked {date(data.checked_at)}</p>
      <section className="portal-panel"><h2>Saved records</h2><dl>{Object.entries(data.counts).map(([name,count])=><div key={name}><dt>{label(name)}</dt><dd>{count??"Unavailable"}</dd></div>)}</dl></section>
      <section className="portal-panel"><h2>Backup and recovery evidence</h2>
        <p>Latest 10 records. A verified encrypted upload does not prove a full Supabase recovery. Keep the private recovery key and separate recovery code in their approved custody locations.</p>
        {data.backups.length?data.backups.map(b=>{const status=backupStatus(b);return <article key={b.id}>
          <h3>{b.kind==="restore_drill"?"Recovery drill":"Encrypted backup"} · {label(b.status)}</h3>
          <p>{status.label}</p><p>Started {date(b.started_at)}. Completed {date(b.completed_at)}.</p>
          {status.stale&&b.id===newestVerified?.id&&<p className="portal-error">The newest verified generation in this snapshot is at least 48 hours old. Check the hosted backup workflow and offsite destination.</p>}
          <p>Auth records: {b.includes_auth?"Included":"Not included"}. {status.storage}.</p>
          <small>Record reference: {b.id}</small>
        </article>}):<p>No backup or recovery evidence has been recorded. Check the hosted backup workflow before treating recovery as available.</p>}
      </section>
      {(Object.keys(healthQueues) as (keyof typeof healthQueues)[]).map(key=>{const queue=healthQueues[key];return <section className="portal-panel" key={key}>
        <h2>{queue.title}</h2><p>{queue.help}</p><p>Up to 50 saved records, not a total count.</p>
        {data[key].length?data[key].map((item,i)=><article key={item.id||`${item.order_id}-${item.category}-${i}`}>
          <h3>{item.name||item.email||label(item.category||"Saved operation")}</h3>
          <p>{label(item.status||item.state||item.reconciliation_status||(item.reconciliation_required?"Provider reconciliation required":"Review provider auto-renew"))}</p>
          {key==="domain_exceptions"&&<p>Provider auto-renew: {item.auto_renew===true?"On":item.auto_renew===false?"Off":"Unknown"}</p>}
          {item.created_at&&<p>Created {date(item.created_at)}</p>}
          {item.last_error&&<p>Recorded error: {item.last_error}</p>}
          <small>Reference: {item.id||item.order_id||"Not recorded"}</small>
        </article>):<p>No exceptions returned by this check.</p>}
        <p><Link href={queue.href}>{queue.action}</Link></p>
      </section>})}
      <details className="portal-panel"><summary>Applied database releases</summary>{data.releases.map(r=><p key={r.version}>{r.version} · {date(r.applied_at)}</p>)}</details>
    </>}
    <details className="portal-panel"><summary>Advanced read-only registrar acceptance</summary><RegistrarAcceptance/></details>
  </>;
}
