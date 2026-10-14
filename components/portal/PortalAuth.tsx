"use client";
import Link from "next/link";
import {useEffect,useRef,useState,type FormEvent} from "react";
import {PortalVerificationController} from "@/lib/portal/turnstile-client";
import {api} from "./Portal";

export function PortalAuth({recovery=false}:{recovery?:boolean}) {
  const container=useRef<HTMLDivElement>(null),verification=useRef<PortalVerificationController|null>(null),submitting=useRef(false);
  const [stage,setStage]=useState<"idle"|"verification"|"request">("idle"),[error,setError]=useState(""),[message,setMessage]=useState("");
  useEffect(()=>()=>{verification.current?.dispose();verification.current=null;},[]);
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(submitting.current||!container.current)return;
    submitting.current=true;setError("");setMessage("");setStage("verification");
    const fields=Object.fromEntries(new FormData(event.currentTarget));
    try {
      verification.current??=new PortalVerificationController(container.current,process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY||"");
      const token=await verification.current.verify();
      setStage("request");
      const result=await api(recovery?"auth/recover":"auth/login",{...fields,token});
      if(result.redirect) window.location.assign(result.redirect);
      else setMessage(result.message||"Check your approved inbox for the recovery link.");
    } catch(error) {setError(error instanceof Error?error.message:"Unable to sign in. Try again.");}
    finally {submitting.current=false;setStage("idle");}
  }
  const busy=stage!=="idle";
  return <main id="main" className="portal-auth portal-auth-compact">
    <Link href="/client-portal" className="portal-brand">StackEndBox<span>CLIENT PORTAL</span></Link>
    <section className="portal-panel">
      <h1>{recovery?"Reset your password":"Welcome back"}</h1>
      <p>{recovery?"We'll send a recovery link to your approved email.":"Sign in to manage your domains and services."}</p>
      <form className="portal-form" onSubmit={submit} aria-busy={busy}>
        <label>Email address<input name="email" type="email" autoComplete="username" required maxLength={254} readOnly={busy}/></label>
        {!recovery&&<label>Password<input name="password" type="password" autoComplete="current-password" required maxLength={128} readOnly={busy}/></label>}
        <div ref={container} className="portal-verification"/>
        <button className="portal-button" disabled={busy}>{stage==="verification"?"Checking security…":stage==="request"?(recovery?"Sending…":"Signing in…"):(recovery?"Send recovery link":"Sign in")}</button>
        {error&&<p role="alert" className="portal-error">{error}</p>}
        {message&&<p role="status" className="portal-notice">{message}</p>}
      </form>
      <p><Link href={recovery?"/client-portal/login":"/client-portal/forgot-password"}>{recovery?"Back to sign in":"Forgot password?"}</Link></p>
      <p className="portal-small">Access is provided by StackEndBox.</p>
    </section>
  </main>;
}
