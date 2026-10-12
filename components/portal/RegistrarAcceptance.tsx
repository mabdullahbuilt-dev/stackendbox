"use client";
import {useState} from "react";
import {api} from "./Portal";
export function RegistrarAcceptance() {
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[result,setResult]=useState<Record<string,unknown>|null>(null);
  return <section className="portal-panel"><h2>Isolated registrar acceptance</h2>
    <p>Personal-account reads use separate encrypted test credentials. The exact founder-approved domain must also be configured as SPACESHIP_TEST_DOMAIN. This check never imports or assigns personal domains and cannot perform writes.</p>
    <form className="portal-form" onSubmit={async e=>{e.preventDefault();const fields=new FormData(e.currentTarget);setBusy(true);setError("");setResult(null);try{setResult(await api("admin/registrar-acceptance",{domain:fields.get("domain"),authorized_readonly:true}));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>
      <label>Exact authorized test domain<input name="domain" required maxLength={253}/></label>
      <label className="portal-check"><input type="checkbox" required/>The founder approved read-only access to this exact domain.</label>
      <button className="portal-button" disabled={busy}>{busy?"Checking provider":"Run read-only acceptance"}</button>
    </form>
    {error&&<p role="alert" className="portal-error">{error}</p>}
    {result&&<><p role="status">Connected. No registrar changes or portal assignments performed.</p><pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{JSON.stringify(result,null,2)}</pre></>}
  </section>;
}
