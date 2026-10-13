"use client";
import {useState} from "react";
import {api} from "./Portal";
type State={record:{type:"TXT";name:string;value:string;ttl:number};version:string;expires_at:string;dns:{items:Record<string,unknown>[]}};
export function DnsAcceptance({name}:{name:string}){
  const [state,setState]=useState<State|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[review,setReview]=useState<"add"|"delete"|null>(null),[attempt,setAttempt]=useState<{action:"add"|"delete";idempotency_key:string;expected_version:string}|null>(null);
  async function load(){setBusy(true);setMessage("");try{setState(await api(`admin/domains/${encodeURIComponent(name)}/dns-acceptance`));}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
  async function change(action:"add"|"delete"){
    if(!state)return;
    const input=attempt||{action,idempotency_key:crypto.randomUUID(),expected_version:state.version};setAttempt(input);setBusy(true);setMessage("");
    try{const result=await api(`admin/domains/${encodeURIComponent(name)}/dns-acceptance`,input);setMessage(result.message);setState({...state,version:result.version,dns:result.dns});setAttempt(null);setReview(null);}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}
  }
  const present=state?.dns.items.some(r=>r.type==="TXT"&&r.name===state.record.name&&r.value===state.record.value);
  return <section className="portal-panel"><h2>Isolated DNS acceptance</h2><p>This staff-only test needs a separate, expiring authorization for one exact TXT record. All ordinary registrar writes remain disabled.</p><button className="portal-button" disabled={busy||!!attempt||!!review} onClick={()=>void load()}>Load approved TXT test</button>{state&&<><p>{state.record.name}.{name} TXT {state.record.value}, TTL {state.record.ttl} seconds. Approval expires {state.expires_at}.</p><p>Provider currently reports {state.dns.items.length} DNS records.</p><button className="portal-button" disabled={busy||!!present||(!!attempt&&attempt.action!=="add")} onClick={()=>setReview("add")}>Add approved test TXT</button><button className="portal-button" disabled={busy||!present||(!!attempt&&attempt.action!=="delete")} onClick={()=>setReview("delete")}>Remove approved test TXT</button>{review&&<div role="region" aria-label="Review approved TXT action"><p>{review==="add"?"Add":"Remove"} only the exact TXT record shown above. All other records and domain settings stay unchanged.</p><button className="portal-button" disabled={busy} onClick={()=>void change(review)}>{busy?"Verifying provider operation…":review==="add"?"Confirm approved TXT addition":"Confirm approved TXT removal"}</button>{!attempt&&<button disabled={busy} onClick={()=>setReview(null)}>Cancel review</button>}</div>}</>}{message&&<p role="status" className="portal-notice">{message}</p>}</section>;
}
