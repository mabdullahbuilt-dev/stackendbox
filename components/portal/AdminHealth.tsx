"use client";
import {useEffect,useState} from "react";
import {api} from "./Portal";
import {RegistrarAcceptance} from "./RegistrarAcceptance";
type Health={checked_at:string;counts:Record<string,number>;backups:Record<string,unknown>[];releases:{version:string;applied_at:string}[];provisioning:unknown[];email:unknown[];jobs:unknown[];domain_exceptions:unknown[];unreconciled_ledger:unknown[]};
export function AdminHealth(){
  const [data,setData]=useState<Health|null>(null),[error,setError]=useState("");
  async function load(){try{setData(await api("admin/health") as Health);setError("");}catch(e){setError((e as Error).message);}}
  useEffect(()=>{void load();},[]);
  return <><h1>Backend health</h1><RegistrarAcceptance/><button onClick={()=>void load()}>Refresh checks</button>{error&&<p role="alert" className="portal-error">{error}</p>}{!data?<p role="status">Checking persisted records…</p>:<><p>Checked {new Date(data.checked_at).toLocaleString()}</p><section className="portal-panel"><h2>Saved records</h2>{Object.entries(data.counts).map(([name,count])=><p key={name}>{name.replaceAll("_"," ")}: {count}</p>)}</section><section className="portal-panel"><h2>Backup and restore evidence</h2><p>A successful export alone does not prove offsite recovery. Check the recorded destination, object coverage and restore drill.</p>{data.backups.length?data.backups.map((b,i)=><pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}} key={i}>{JSON.stringify(b,null,2)}</pre>):<p>No completed backup or restore evidence has been recorded.</p>}</section>{(["provisioning","email","jobs","domain_exceptions","unreconciled_ledger"] as const).map(key=><section className="portal-panel" key={key}><h2>{key.replaceAll("_"," ")}</h2>{data[key].length?<pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{JSON.stringify(data[key],null,2)}</pre>:<p>No exceptions returned by this check.</p>}</section>)}<section className="portal-panel"><h2>Schema releases</h2>{data.releases.map(r=><p key={r.version}>{r.version} · {new Date(r.applied_at).toLocaleString()}</p>)}</section></>}</>;
}
