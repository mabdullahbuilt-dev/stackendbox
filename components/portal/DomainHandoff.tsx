"use client";
import {useEffect,useRef,useState,type FormEvent} from "react";
import Link from "next/link";
import {useSearchParams} from "next/navigation";
import {api} from "./Portal";
import {generateTemporaryPassword,validatePassword} from "@/lib/portal/password-policy";
type Review={domain:string;email:string;existing_client:boolean;already_assigned:boolean;expiration:string;checked_at:string};
type Result={client_id?:string;email:string;domain:string;portal_url:string;message:string};
const validEmail=(value:string)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
export function DomainHandoff({reload,domains=[]}:{reload:()=>Promise<void>;domains?:string[]}){
  const params=useSearchParams();
  const [email,setEmail]=useState(params.get("assign_email")||""),[domain,setDomain]=useState(""),[password,setPassword]=useState(""),[show,setShow]=useState(false);
  const [verified,setVerified]=useState<Review|null>(null),[review,setReview]=useState<Review|null>(null),[result,setResult]=useState<Result|null>(null);
  const [checking,setChecking]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[copied,setCopied]=useState(false),[pending,setPending]=useState<Record<string,unknown>|null>(null);
  const request=useRef(crypto.randomUUID()),lock=useRef(false);
  useEffect(()=>{
    setVerified(null);setError("");
    if(!validEmail(email)||!domain.trim()||review||result)return;
    const controller=new AbortController();let active=true;
    const timer=setTimeout(()=>{setChecking(true);api("admin/domain-handoff-preview",{email:email.trim().toLowerCase(),domain:domain.trim()},controller.signal).then(data=>{if(active){setVerified(data);if(data.existing_client)setPassword("");}}).catch(e=>{if(active&&!controller.signal.aborted)setError((e as Error).message);}).finally(()=>{if(active)setChecking(false);});},650);
    return()=>{active=false;clearTimeout(timer);controller.abort();setChecking(false);};
  },[email,domain,review,result]);
  async function prepare(e:FormEvent<HTMLFormElement>){
    e.preventDefault();if(lock.current)return;lock.current=true;setBusy(true);setError("");
    try{
      const next=await api("admin/domain-handoff-review",{email:email.trim().toLowerCase(),domain:domain.trim()});
      if(!next.existing_client)validatePassword(password);
      setReview(next);setVerified(next);
    }catch(e){setError((e as Error).message);}finally{lock.current=false;setBusy(false);}
  }
  async function activate(){
    if(!review||lock.current)return;lock.current=true;setBusy(true);setError("");
    const input=pending||{idempotency_key:request.current,email:review.email,domain:review.domain,rights_confirmed:true,...(!review.existing_client?{initial_password:password}:{})};setPending(input);
    try{const saved=await api("admin/activate-domain-client",input);if(!saved.client_id)throw Error("Client access needs review. Check its saved operation before retrying.");setResult(saved);setPassword("");setPending(null);await reload();}
    catch(e){setError((e as Error).message);}finally{lock.current=false;setBusy(false);}
  }
  if(result)return <section className="portal-panel" id="domain-handoff"><h2>Domain Assigned Successfully</h2><p>{result.domain}</p><p>Assigned to: {result.email}</p><p role="status">{result.message}</p><p><Link href={result.portal_url}>{result.portal_url}</Link></p><button onClick={()=>{void navigator.clipboard.writeText(result.portal_url).then(()=>setCopied(true)).catch(()=>setError("Copy unavailable. Select the displayed link to copy it manually."));}}>{copied?"Link copied":"Copy Link"}</button>{error&&<p role="alert">{error}</p>}<button onClick={()=>{request.current=crypto.randomUUID();setResult(null);setReview(null);setVerified(null);setEmail("");setDomain("");setPassword("");setCopied(false);setError("");}}>Assign another domain</button></section>;
  return <section className="portal-panel" id="domain-handoff"><h2>Assign Domain</h2><p>Give a customer access to their purchased domain.</p>
    {!review?<form className="portal-form" onSubmit={prepare}><fieldset disabled={busy}>
      <label>Client Email<input type="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} autoComplete="off"/></label>
      <label>Initial Password<input type={show?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" minLength={8} maxLength={128} disabled={verified?.existing_client===true} required={verified?.existing_client===false}/></label>
      {verified?.existing_client?<small>Existing account found. Its password will remain unchanged.</small>:<><small>Required for new accounts. Deliver it separately, never by email.</small><div className="portal-actions"><label className="portal-check"><input type="checkbox" checked={show} onChange={e=>setShow(e.target.checked)}/>Show password</label><button type="button" onClick={()=>setPassword(generateTemporaryPassword())}>Generate</button></div></>}
      <label>Purchased Domain<input required maxLength={253} value={domain} onChange={e=>setDomain(e.target.value)} list="handoff-domains" autoComplete="off" placeholder="client-domain.com"/></label><datalist id="handoff-domains">{domains.map(value=><option key={value} value={value}/>)}</datalist>
      {checking?<small role="status">Checking domain…</small>:verified?<small role="status">Domain verified in registrar account. Expires {new Date(verified.expiration).toLocaleDateString()}.</small>:null}
    </fieldset><button className="portal-button" disabled={busy||checking}>{busy?"Checking assignment…":"Assign Domain"}</button></form>:<div><h3>Confirm assignment</h3><dl className="portal-details"><dt>Client Email</dt><dd>{review.email}</dd><dt>Domain</dt><dd>{review.domain}</dd></dl>{review.already_assigned?<p>This domain is already assigned to this account. No new assignment is needed.</p>:<><p>Portal access only. Legal ownership and registrar settings stay unchanged.</p><button className="portal-button" disabled={busy} onClick={()=>void activate()}>{busy?"Assigning…":pending?"Retry same assignment":"Confirm assignment"}</button></>}{!pending&&<button disabled={busy} onClick={()=>setReview(null)}>Back</button>}{pending&&<small>Request reference: {request.current}. Retry this same request if its response was lost.</small>}</div>}
    {error&&<p role="alert" className="portal-error">{error}{error.includes("authenticator")&&<> <Link href="/client-portal/settings" target="_blank" rel="noopener noreferrer">Account Settings</Link></>}</p>}
  </section>;
}
