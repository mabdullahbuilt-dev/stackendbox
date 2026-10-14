"use client";
import { useState, type FormEvent } from "react";
import { api } from "./Portal";
type RecordRow = Record<string, unknown> & { type: string; name: string; group: { type: string } };
type State = { version: string; managed: boolean; changesEnabled: boolean; checked_at?:string; detail: { expirationDate?:string|null; lifecycleStatus?:string;autoRenew?:boolean; nameservers?: { hosts: string[] }; privacyProtection?: { level: string } }; dns: { items: RecordRow[] } };
const fields: Record<string, string[]> = {
  A: ["address"], AAAA: ["address"], ALIAS: ["aliasName"], CNAME: ["cname"],
  CAA: ["flag", "tag", "value"], MX: ["exchange", "preference"], NS: ["nameserver"], PTR: ["pointer"], TXT: ["value"],
  SRV: ["service", "protocol", "priority", "weight", "port", "target"],
  HTTPS: ["svcPriority", "targetName", "svcParams", "port", "scheme"], SVCB: ["svcPriority", "targetName", "svcParams", "port", "scheme"],
  TLSA: ["port", "protocol", "usage", "selector", "matching", "associationData"],
};
const numeric = new Set(["ttl", "flag", "preference", "priority", "weight", "svcPriority", "usage", "selector", "matching"]);
function clean(record: RecordRow) {
  return Object.fromEntries(["type", "name", "ttl", ...(fields[record.type] || [])].filter(k => record[k] !== undefined).map(k => [k, record[k]]));
}
export function DomainControls({ name, panel, admin = false }: { name: string; panel: "dns" | "nameservers" | "privacy"; admin?:boolean }) {
  const [state, setState] = useState<State | null>(null), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  const [type, setType] = useState("A"), [editing, setEditing] = useState<RecordRow | null>(null);
  const [pendingKey,setPendingKey]=useState<string|null>(null);
  async function checkOperation(){
    if(!pendingKey||busy)return;
    setBusy(true);
    try{
      const result=await api(`domains/${name}/manage?operation=${encodeURIComponent(pendingKey)}`);
      setMessage(result.status==="verified"?"Your change was verified. Refresh settings to see the latest values.":result.status==="rejected"?"The change was rejected before execution. Refresh settings before starting another change.":result.status==="not_recorded"?"No saved result is available yet. Contact support before retrying this change.":"This operation is still being processed or needs staff review. Don't submit it again.");
      if(["verified","rejected"].includes(result.status))setPendingKey(null);
    }catch{setMessage("Unable to check this operation. Contact support before retrying. Your existing domain record is preserved.");}
    finally{setBusy(false);}
  }
  async function load() { if(busy)return; setBusy(true); setMessage(""); try { const next = await api(`${admin ? "admin/" : ""}domains/${name}/manage`); setState(admin ? {...next,changesEnabled:false} : next); } catch(e) { setState(previous=>previous?{...previous,changesEnabled:false}:null); setMessage(`Refresh failed. Previously displayed values may be out of date. ${(e as Error).message}`); } finally { setBusy(false); } }
  async function change(value: unknown) {
    if (!state || !state.changesEnabled || busy || pendingKey) return;
    if (!window.confirm(`Confirm this change to ${name}. It may interrupt your website, email, or expose public registration details. Continue?`)) return;
    const key=crypto.randomUUID();setPendingKey(key);setBusy(true); setMessage("");
    try { const response = await api(`domains/${name}/manage`, { idempotency_key: key, expected_version: state.version, confirmed: true, change: value }); setMessage(response.message || response.status); if(["verified","rejected"].includes(response.status))setPendingKey(null); setState(null); setEditing(null); }
    catch(e) { setState(previous=>previous?{...previous,changesEnabled:false}:null);setMessage(`The result couldn't be confirmed. Check the saved operation before retrying. ${(e as Error).message}`); }
    finally { setBusy(false); }
  }
  function submitRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const after = Object.fromEntries([...new FormData(event.currentTarget)].filter(([k,v]) => !(["HTTPS", "SVCB"].includes(type) && ["port", "scheme"].includes(k) && !v)).map(([k,v]) => [k, numeric.has(k) || (type === "SRV" && k === "port") ? Number(v) : v]));
    void change({ kind: "dns", action: editing ? "edit" : "add", ...(editing ? { before: clean(editing) } : {}), after: { ...after, type } });
  }
  return <section>
    {state && <p>Registration status: {state.detail.lifecycleStatus || "Not reported"}. Verified expiration: {state.detail.expirationDate ? new Date(state.detail.expirationDate).toLocaleDateString() : "Not reported"}. Auto-renew: {state.detail.autoRenew === undefined ? "Not reported" : state.detail.autoRenew ? "On, administrator review required" : "Off"}.</p>}
    {state?.checked_at&&<p>Last verified: {new Date(state.checked_at).toLocaleString()}.</p>}
    <button className="portal-button" disabled={busy||!!pendingKey} onClick={() => void load()}>{busy ? "Checking settings…" : "Refresh settings"}</button>
    {pendingKey&&<p>A change is awaiting confirmation. <button disabled={busy} onClick={()=>void checkOperation()}>Check saved result</button></p>}
    {message && <p role="status" className="portal-notice">{message}</p>}
    {state && <>
      {!state.changesEnabled && <p>Settings are read-only. Contact StackEndBox if you need a change.</p>}
      {panel === "dns" && (!state.managed ? <p>DNS is managed separately for this domain or its settings are still updating. Contact StackEndBox for help.</p> : <>
        <div className="portal-table-wrap"><table><thead><tr><th>Type</th><th>Name</th><th>Value</th><th>TTL</th><th>Source</th><th /></tr></thead><tbody>{state.dns.items.map((record,i) => <tr key={i}><td>{record.type}</td><td>{record.name}</td><td>{(fields[record.type] || []).map(k => `${k}: ${String(record[k] ?? "")}`).join(" · ")}</td><td>{String(record.ttl ?? "Not reported")}</td><td>{record.group.type}</td><td>{state.changesEnabled && record.group.type === "custom" && fields[record.type] && <><button disabled={busy} onClick={() => { setEditing(record); setType(record.type); }}>Edit</button><button disabled={busy} onClick={() => void change({kind: "dns", action: "delete", before: clean(record)})}>Delete</button></>}</td></tr>)}</tbody></table></div>
        {!state.dns.items.length && <p>No DNS records reported.</p>}
        {state.changesEnabled && <form className="portal-form" onSubmit={submitRecord} key={editing ? JSON.stringify(editing) : type}>
          <h3>{editing ? "Edit DNS record" : "Add DNS record"}</h3>
          <label>Type<select value={type} disabled={!!editing} onChange={e => setType(e.target.value)}>{Object.keys(fields).map(t => <option key={t}>{t}</option>)}</select></label>
          <label>Name<input name="name" defaultValue={editing?.name || "@"} required /></label>
          <label>TTL, seconds<input name="ttl" type="number" min={60} max={3600} defaultValue={Number(editing?.ttl || 3600)} required /></label>
          {fields[type].map(k => <label key={k}>{k}<input name={k} defaultValue={editing?.[k] === undefined ? "" : String(editing[k])} type={numeric.has(k) || (type === "SRV" && k === "port") ? "number" : "text"} required={k !== "svcParams" && !(["HTTPS", "SVCB"].includes(type) && ["port", "scheme"].includes(k))} /></label>)}
          <p>Website and mail records are service-critical. Conflicts are never force-overridden.</p>
          <button className="portal-button" disabled={busy}>Review and save</button>
          {editing && <button type="button" onClick={() => setEditing(null)}>Cancel edit</button>}
        </form>}
      </>)}
      {panel === "nameservers" && admin && <ul>{state.detail.nameservers?.hosts.map(host => <li key={host}>{host}</li>)}</ul>}
      {panel === "privacy" && <><p>Privacy: {state.detail.privacyProtection?.level || "Not reported"}</p>{state.changesEnabled && state.detail.privacyProtection && <form className="portal-form" onSubmit={e => { e.preventDefault(); void change({ kind: "privacy", level: new FormData(e.currentTarget).get("level"), consent: true }); }}><label>Privacy level<select name="level" defaultValue={state.detail.privacyProtection.level}><option value="high">Private where supported</option><option value="public">Public registration details</option></select></label><label className="portal-check"><input type="checkbox" required />I consent to this privacy change and understand that public settings may expose registration contact details.</label><button className="portal-button" disabled={busy}>Review privacy change</button></form>}</>}
    </>}
  </section>;
}
