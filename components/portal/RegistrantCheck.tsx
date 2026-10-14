"use client";
import { useState } from "react";
import { api } from "./Portal";
import Link from "next/link";
type Evidence = {
  holder: string; contact_id: string; custody: string; checked_at: string;
  verification_status: string | null; verification_reported: boolean;
  contact: { email: string; country: string };
  lifecycle_status:string;expiration_date:string|null;auto_renew:boolean;nameservers:string[];
  portal_assignment:{client_id:string;portal_clients:{name:string;business_name:string;status:string}}|null;
};
export function RegistrantCheck({ name }: { name: string }) {
  const [result, setResult] = useState<Evidence | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function check() {
    setBusy(true); setError(""); setResult(null);
    try { setResult(await api(`admin/domains/${encodeURIComponent(name)}/registrant`)); }
    catch (e) { setError(e instanceof Error ? e.message : "Registrant verification failed. No settings changed."); }
    finally { setBusy(false); }
  }
  return <section className="portal-panel">
    <h2>Domain verification</h2>
    <p>Check registration, current holder and portal assignment.</p>
    <button className="portal-button" disabled={busy} onClick={() => void check()}>{busy ? "Checking registrar" : "Verify registered holder"}</button>
    {error && <p role="alert" className="portal-error">{error}</p>}
    {result && <dl className="portal-details">
      <dt>Domain</dt><dd>{name}</dd>
      <dt>Registration status</dt><dd>{result.lifecycle_status}</dd>
      <dt>Expiration</dt><dd>{result.expiration_date?new Date(result.expiration_date).toLocaleString():"Not confirmed"}</dd>
      <dt>Registrar auto-renew</dt><dd>{result.auto_renew?"On":"Off"}</dd>
      <dt>Authoritative nameservers reported by registrar</dt><dd>{result.nameservers.join(", ")||"Not reported"}</dd>
      <dt>Recorded registrant</dt><dd>{result.holder}</dd>
      <dt>Official contact ID</dt><dd>{result.contact_id}</dd>
      <dt>Registrant email</dt><dd>{result.contact.email}</dd>
      <dt>Country</dt><dd>{result.contact.country}</dd>
      <dt>Provider verification</dt><dd>{!result.verification_reported ? "Not reported, manual review required" : result.verification_status === null ? "Provider reports no confirmation required" : result.verification_status}</dd>
      <dt>Custody</dt><dd>{result.custody}</dd>
      <dt>Portal access</dt><dd>{result.portal_assignment?`Assigned to ${result.portal_assignment.portal_clients.business_name||result.portal_assignment.portal_clients.name}`:"Not assigned to a client"}</dd>
      <dt>Checked</dt><dd>{new Date(result.checked_at).toLocaleString()}</dd>
    </dl>}
    <details><summary>Registered-holder change and transfers</summary>
      <p>Portal access preserves the registered holder and registrar account. A legal holder change needs the approved new holder’s full contact details, current and new holder consent, and any provider verification.</p>
      <ol><li>Capture the domain, contacts and DNS baseline, then review the exact new registrant details.</li><li>After specific approval, save the official contact and update this domain’s registrant contact ID, preserving all other contact IDs and settings.</li><li>Complete registrar notices and verification. Read the resulting contact and verification state before marking the change verified. A successful API response alone is insufficient.</li></ol>
      <p>A change of registrant may create a 60-day transfer lock. Check eligibility with the registrar before authorizing it.</p>
      <p>Moving custody to another Spaceship account is a separate dashboard process: Domain List, select the domain, Transfer, Transfer ownership. An external registrar transfer is also separate. Neither is required for portal access.</p>
      <p>Execution remains unavailable until the exact legal operation is approved. <Link href="/admin/operations#ownership-tasks">Track an ownership review</Link>.</p>
      <p><a href="https://docs.spaceship.dev/" target="_blank" rel="noopener noreferrer">Official contact API</a> · <a href="https://www.icann.org/resources/pages/ownership-2013-05-03-en" target="_blank" rel="noopener noreferrer">Registrant confirmation and transfer policy</a></p>
    </details>
  </section>;
}
