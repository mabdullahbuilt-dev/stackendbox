"use client";
import {useEffect,useState} from "react";
import {api,Mfa} from "./Portal";
import {isAdministrativeAccount} from "@/lib/portal/account-navigation";

/** Identity-only MFA entry, never renders client navigation or private admin data. */
export function AdminVerification(){
  const [factors,setFactors]=useState<{id:string;status:string}[]|null>(null);
  const [error,setError]=useState("");
  useEffect(()=>{
    let active=true;
    (async()=>{
      const identity=await api("auth/identity");
      if(!isAdministrativeAccount(identity.role))throw new Error("This account doesn't have administrator access.");
      const data=await api("data?section=settings");
      if(active)setFactors(data.factors);
    })().catch(error=>{if(active)setError(error.message);});
    return()=>{active=false;};
  },[]);
  return <main className="portal-auth portal-auth-compact">
    <div className="portal-brand">StackEndBox<span>ADMINISTRATION</span></div>
    {error?<section className="portal-panel"><p role="alert">{error}</p><button onClick={()=>window.location.reload()}>Retry</button></section>:factors?<Mfa factors={factors}/>:<p role="status">Loading account security…</p>}
  </main>;
}
