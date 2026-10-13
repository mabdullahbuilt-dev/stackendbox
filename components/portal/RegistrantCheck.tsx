"use client";
import { useState } from "react";
import { api } from "./Portal";
type Evidence = {
  holder: string; contact_id: string; custody: string; checked_at: string;
  verification_status: string | null; verification_reported: boolean;
  contact: { email: string; country: string };
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
    <h2>Registrar holder and agency custody</h2>
    <p>Clients use StackEndBox credentials. Portal assignment doesn’t move the domain to another registrar account or change its registered holder.</p>
    <p>Domains are registered through Spaceship. StackEndBox manages your services and isn’t an ICANN-accredited registrar.</p>
    <button className="portal-button" disabled={busy} onClick={() => void check()}>{busy ? "Checking registrar" : "Verify registered holder"}</button>
    {error && <p role="alert" className="portal-error">{error}</p>}
    {result && <dl>
      <dt>Recorded registrant</dt><dd>{result.holder}</dd>
      <dt>Official contact ID</dt><dd>{result.contact_id}</dd>
      <dt>Registrant email</dt><dd>{result.contact.email}</dd>
      <dt>Country</dt><dd>{result.contact.country}</dd>
      <dt>Provider verification</dt><dd>{!result.verification_reported ? "Not reported, manual review required" : result.verification_status === null ? "Provider reports no confirmation required" : result.verification_status}</dd>
      <dt>Custody</dt><dd>{result.custody}</dd>
      <dt>Checked</dt><dd>{new Date(result.checked_at).toLocaleString()}</dd>
    </dl>}
    <p>Holder changes may require Spaceship verification emails. Required registrar notices aren’t replaced by StackEndBox service emails.</p>
    <button disabled>Transfer Ownership, legal registrant change awaiting approval</button>
    <p>Requires the exact intended legal holder, accurate contact details, destination email and specific consent. The supported process saves an official Spaceship contact, updates the domain’s registrant contact ID and verifies the resulting provider state. No ownership change is claimed before confirmation.</p>
    <p>An account-to-account move is a separate, optional dashboard workflow. No documented generic API endpoint has been verified for it.</p>
  </section>;
}
