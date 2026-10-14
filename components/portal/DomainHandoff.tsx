"use client";
import {useEffect,useRef,useState,type FormEvent} from "react";
import {useSearchParams} from "next/navigation";
import Link from "next/link";
import {api} from "./Portal";
import {generateTemporaryPassword,validatePassword} from "@/lib/portal/password-policy";
type ClientOption={client_id:string;name:string;business_name:string;email:string};
type Review={domain:string;email:string;client_id:string|null;existing_client:boolean;already_assigned:boolean;status:string;expiration:string;registered_holder:string;custody:string;checked_at:string;action:string};
export function DomainHandoff({reload,domains=[]}:{reload:()=>Promise<void>;domains?:string[]}){
  const preferred=useSearchParams().get("assign_client");
  const [options,setOptions]=useState<ClientOption[]>([]),[selected,setSelected]=useState(""),[mode,setMode]=useState("existing"),[loading,setLoading]=useState(true);
  const [password,setPassword]=useState(""),[show,setShow]=useState(false),[busy,setBusy]=useState(false),[review,setReview]=useState<Review|null>(null),[attempt,setAttempt]=useState<Record<string,unknown>|null>(null),[submitted,setSubmitted]=useState(false),[finished,setFinished]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");
  const [credentialMode,setCredentialMode]=useState("initial_password");
  const [search,setSearch]=useState("");
  const id=useRef(crypto.randomUUID()),lock=useRef(false);
  useEffect(()=>{let active=true;api("admin/client-options").then(data=>{if(!active)return;setOptions(data.clients||[]);const match=(data.clients as ClientOption[]).find(c=>c.client_id===preferred);if(match)setSelected(match.email);}).catch(e=>{if(active)setError((e as Error).message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[preferred]);
  const client=options.find(c=>c.email===selected);
  async function prepare(e:FormEvent<HTMLFormElement>){
    e.preventDefault();if(lock.current)return;lock.current=true;setBusy(true);setError("");
    try{
      const fields=Object.fromEntries(new FormData(e.currentTarget));
      if(mode==="new"&&credentialMode==="initial_password")validatePassword(password);
      if(mode==="existing"&&!client)throw Error("Select an existing client first.");
      const input:Record<string,unknown>={...fields,account_mode:mode,idempotency_key:id.current,...(client&&mode==="existing"?{email:client.email,name:client.name,business_name:client.business_name,client_id:client.client_id}:{credential_mode:credentialMode,...(credentialMode==="initial_password"?{initial_password:password}:{})})};
      const result=await api("admin/domain-handoff-preview",{domain:fields.domain,email:input.email,account_mode:mode,...(mode==="existing"?{client_id:client!.client_id}:{})});
      setAttempt(input);setReview(result);setSubmitted(false);
    }catch(e){setError((e as Error).message);}finally{lock.current=false;setBusy(false);}
  }
  async function activate(e:FormEvent<HTMLFormElement>){
    e.preventDefault();if(!attempt||!review||lock.current||finished)return;
    lock.current=true;setBusy(true);setSubmitted(true);setError("");
    try{const result=await api("admin/activate-domain-client",{...attempt,rights_confirmed:true});setMessage(result.message);setReview({...review,client_id:result.client_id||review.client_id});setFinished(true);setPassword("");setAttempt(null);await reload();}
    catch(e){setError((e as Error).message);}finally{lock.current=false;setBusy(false);}
  }
  return <section className="portal-panel" id="domain-handoff"><h2>Assign Domain to Client</h2><p>Assign a manually purchased domain. Legal ownership and live domain settings stay unchanged.</p>
    <form className="portal-form" onSubmit={prepare} hidden={!!review} style={review?{display:"none"}:undefined}><fieldset disabled={busy}>
      <label>Client account<select value={mode} onChange={e=>{setMode(e.target.value);setPassword("");setShow(false);}}><option value="existing">Existing client</option><option value="new">New client</option></select></label>
      {mode==="existing"?<><label>Search clients<input value={search} onChange={e=>{setSearch(e.target.value);setSelected("");}} placeholder="Name or approved email"/></label><label>Select client<select required disabled={loading} value={selected} onChange={e=>setSelected(e.target.value)}><option value="">{loading?"Loading clients…":"Choose a client"}</option>{options.filter(c=>`${c.name} ${c.business_name} ${c.email}`.toLowerCase().includes(search.trim().toLowerCase())).map(c=><option key={`${c.client_id}:${c.email}`} value={c.email}>{c.business_name} · {c.email}</option>)}</select></label><p>Existing credentials will be preserved.</p></>:<><label>Client name<input name="name" required maxLength={100}/></label><label>Approved login email<input name="email" required type="email" maxLength={254}/></label><label>Account creation<select value={credentialMode} onChange={e=>{setCredentialMode(e.target.value);setPassword("");setShow(false);}}><option value="initial_password">Initial password, delivered separately</option><option value="invitation">Email invitation, client sets password</option></select></label>{credentialMode==="initial_password"?<><label>Initial StackEndBox password<input type={show?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} minLength={8} maxLength={128} autoComplete="new-password" required/></label><label className="portal-check"><input type="checkbox" checked={show} onChange={e=>setShow(e.target.checked)}/>Show password</label><button type="button" onClick={()=>setPassword(generateTemporaryPassword())}>Generate password</button><small>Deliver this portal password through an agreed secure channel. It won&apos;t be emailed.</small></>:<p>The client receives a one-time activation link and chooses their own password.</p>}</>}
      <label>Purchased domain<input name="domain" list="handoff-domains" required maxLength={253} autoComplete="off" placeholder="client-domain.com"/><datalist id="handoff-domains">{domains.map(d=><option key={d} value={d}/>)}</datalist></label>
      <label>Management arrangement<select name="holder_arrangement"><option value="licensed">Managed access, registered holder unchanged</option><option value="client_owned">Client ownership agreement, separate legal handoff</option></select></label>
    </fieldset><button className="portal-button" disabled={busy||mode==="existing"&&(!client||loading)}>{busy?"Verifying domain…":"Verify and review"}</button></form>
    {review&&<><h3>Review client access</h3><dl className="portal-details"><dt>Client</dt><dd>{String(attempt?.name||review.email)}</dd><dt>Approved email</dt><dd>{review.email}</dd><dt>Account method</dt><dd>{review.existing_client?"Existing credentials preserved":attempt?.credential_mode==="invitation"?"Email invitation":"Initial password, delivered separately"}</dd><dt>Management rights</dt><dd>Assigned-domain visibility and supported controls. Live changes remain subject to separate approval and backend safeguards.</dd><dt>Domain</dt><dd>{review.domain}</dd><dt>Status</dt><dd>{review.status}</dd><dt>Expires</dt><dd>{new Date(review.expiration).toLocaleDateString()}</dd><dt>Registered holder</dt><dd>{review.registered_holder}</dd><dt>Registrar custody</dt><dd>{review.custody}</dd></dl><p>{review.action}</p>{review.already_assigned&&<p>This domain is already assigned to this client. No new assignment is needed.</p>}
      {!finished&&!review.already_assigned&&<form onSubmit={activate}><p>Verify your authenticator within 10 minutes of activation. <Link href="/client-portal/settings" target="_blank" rel="noopener noreferrer">Open Account Settings in another tab</Link></p><label className="portal-check"><input type="checkbox" required disabled={busy}/>I confirm this exact client/domain pairing and their authorized management rights.</label><button className="portal-button" disabled={busy}>{busy?"Activating access…":submitted?"Retry same activation":"Activate Client Access"}</button></form>}
      {!submitted&&!finished&&<button disabled={busy} onClick={()=>{setReview(null);setAttempt(null);}}>Back to details</button>}
      {submitted&&!finished&&<p>Keep this operation reference for follow-up: {id.current}. Retry the same request if its response was lost.</p>}
      {(finished||review.already_assigned)&&review.client_id&&<p><Link href={`/admin/clients/${review.client_id}`}>Open client profile</Link></p>}
      {finished&&<button onClick={()=>{id.current=crypto.randomUUID();setReview(null);setSubmitted(false);setFinished(false);setMessage("");}}>Assign another domain</button>}
    </>}
    {error&&<p role="alert" className="portal-error">{error}</p>}{message&&<p role="status" className="portal-notice">{message}</p>}
  </section>;
}
