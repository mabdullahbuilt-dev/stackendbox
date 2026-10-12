"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type Data } from "./Portal";
import { generateTemporaryPassword, validatePassword } from "@/lib/portal/password-policy";
type Client = {
  id: string;
  name: string;
  business_name: string;
  status: string;
  portal_memberships: { user_id: string }[];
  portal_websites: { id: string; name: string; url: string }[];
  portal_domain_assignments: {
    domain_id: string;
    legal_holder: string;
    portal_domains: { name: string };
  }[];
};
type Identity = {
  user_id: string;
  approved_email: string;
  invitation_status: string;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  email_consistent: boolean;
};
type Pending = {
  id: string;
  email: string;
  state: string;
  last_error: string | null;
  input: Record<string, unknown>;
};
type Directory = {
  clients: Client[];
  identities: Identity[];
  provisioning: Pending[];
  next: string | null;
};
export function AdminClients({ create = false }: { create?: boolean }) {
  const [data, setData] = useState<Directory | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [credentialMode, setCredentialMode] = useState("invitation");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [attempt, setAttempt] = useState<Record<string, unknown> | null>(null);
  const [assets,setAssets] = useState<Data|null>(null),[domainId,setDomainId]=useState("");
  useEffect(() => {
    setRequestId(crypto.randomUUID());
  }, []);
  async function load(after?: string) {
    try {
      const result = (await api(
        `admin/clients${after ? `?after=${encodeURIComponent(after)}` : ""}`,
      )) as Directory;
      setData((previous) =>
        after && previous
          ? {
              ...result,
              clients: [...previous.clients, ...result.clients],
              identities: [...previous.identities, ...result.identities],
            }
          : result,
      );
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    if (!create) void load();
    else void api("admin/workspace").then(setAssets).catch(e=>setError(e.message));
  }, [create]);
  async function provision(input: Record<string, unknown>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api("admin/clients", {
        ...input,
        ...(input.credential_mode === "temporary_password" && temporaryPassword ? { temporary_password: temporaryPassword } : {}),
      });
      setTemporaryPassword("");
      setMessage(`${result.message} Reference: ${result.id}`);
      if (!create) await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (create)
    return (
      <section className="portal-panel">
        <h1>Create a client</h1>
        <p>
          The approved email is the sign-in identity. Passwords are set through
          Supabase Auth. Invitations let the client verify their email and choose
          a private password. Optional temporary passwords must be replaced before
          accessing client records and are never saved in provisioning records.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const fields = Object.fromEntries(new FormData(e.currentTarget));
            if (credentialMode === "temporary_password" && !attempt) {
              try { validatePassword(temporaryPassword); } catch (error) { setError((error as Error).message); return; }
            }
            const payload = attempt || {
              idempotency_key: requestId,
              name: fields.name,
              business_name: fields.business_name,
              email: fields.email,
              status: fields.status,
              ...(credentialMode === "temporary_password" ? { credential_mode: credentialMode } : {}),
              ...(fields.domain_id ? {domain_id:fields.domain_id,holder_arrangement:fields.holder_arrangement,legal_holder:fields.legal_holder,rights_confirmed:fields.rights_confirmed==="on"} : {}),
              ...(fields.website_url
                ? {
                    website: {
                      name: fields.website_name,
                      url: fields.website_url,
                    },
                  }
                : {}),
            };
            setAttempt(payload);
            await provision(payload);
          }}
        >
          <fieldset disabled={busy || !!attempt}>
            <label>
              Client name
              <input name="name" required maxLength={100} />
            </label>
            <label>
              Business name
              <input name="business_name" required maxLength={150} />
            </label>
            <label>
              Approved email
              <input name="email" type="email" required maxLength={254} />
            </label>
            <label>
              Client access setup
              <select value={credentialMode} onChange={e => { setCredentialMode(e.target.value); setTemporaryPassword(""); }}>
                <option value="invitation">Invitation, client chooses password</option>
                <option value="temporary_password">Administrator sets temporary password</option>
              </select>
            </label>
            <label>
              Account status
              <select name="status">
                <option value="active">Active, send invitation</option>
                <option value="suspended">
                  Suspended, do not send invitation
                </option>
              </select>
            </label>
            <label>
              Website name, optional
              <input name="website_name" maxLength={120} />
            </label>
            <label>Assigned domain, optional<select name="domain_id" value={domainId} onChange={e=>setDomainId(e.target.value)}><option value="">Assign later</option>{((assets?.domains||[]) as Record<string,unknown>[]).filter(d=>!d.protected&&!d.reconciliation_required&&d.lifecycle_status==="registered"&&!((assets?.domain_assignments||[]) as Record<string,unknown>[]).some(a=>a.domain_id===d.id)).map(d=><option key={String(d.id)} value={String(d.id)}>{String(d.name)}</option>)}</select></label>
            {domainId&&<><label>Actual legal holder<input name="legal_holder" required maxLength={160}/></label><label>Holder arrangement<select name="holder_arrangement"><option value="client_owned">Client-owned, managed by StackEndBox</option><option value="licensed">StackEndBox-owned, licensed to client</option></select></label><label className="portal-check"><input name="rights_confirmed" type="checkbox" required/>Contractual rights and accurate holder arrangement verified.</label></>}
            <label>
              Website URL, optional
              <input name="website_url" type="url" placeholder="https://" />
            </label>
          </fieldset>
          {credentialMode === "temporary_password" && <fieldset disabled={busy}>
            <label>Initial temporary portal password
              <input type="password" autoComplete="new-password" value={temporaryPassword} onChange={e => setTemporaryPassword(e.target.value)} minLength={8} maxLength={128} required={!attempt} />
            </label>
            <button type="button" onClick={() => setTemporaryPassword(generateTemporaryPassword())}>Generate strong password</button>
            <p>Use 8-128 characters. Letters, numbers, spaces and symbols are accepted. Longer generated passwords are recommended. Only a hash prefix is sent to the free Pwned Passwords safety check. The full password goes only to Supabase Auth. Access email contains an invitation, never the password. Email verification is still required. Retries never overwrite an existing identity&apos;s password.</p>
          </fieldset>}
          <button className="portal-button" disabled={busy || !requestId}>
            {busy
              ? "Saving…"
              : attempt
                ? "Retry same request"
                : "Save client and send invitation"}
          </button>
        </form>
        {error && (
          <p role="alert" className="portal-error">
            {error}
          </p>
        )}
        {message && <p role="status">{message}</p>}
        <p>
          <Link href="/admin/clients">
            View saved clients and invitation status
          </Link>
        </p>
      </section>
    );
  return (
    <>
      <h1>Clients</h1>
      <p>Saved PostgreSQL records, linked to Supabase Auth identities.</p>
      <p>
        <Link className="portal-button" href="/admin/clients/new">
          Create client
        </Link>{" "}
        <button disabled={busy} onClick={() => void load()}>
          Refresh saved records
        </button>
      </p>
      {error && (
        <p role="alert" className="portal-error">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {!data ? (
        <p role="status">Loading clients…</p>
      ) : (
        <>
          {!data.clients.length && (
            <p>No client accounts have been provisioned.</p>
          )}
          {data.clients.map((c) => (
            <section className="portal-panel" key={c.id}>
              <h2>{c.business_name}</h2>
              <p>
                {c.name} · {c.status}
              </p>
              <p>Client ID: {c.id}</p>
              {c.portal_memberships.map((m) => {
                const identity = data.identities.find(
                  (i) => i.user_id === m.user_id,
                );
                return (
                  <div key={m.user_id}>
                    <p>
                      {identity?.approved_email ||
                        "Identity needs reconciliation"}
                    </p>
                    <p>
                      Invitation: {identity?.invitation_status || "Unknown"}.
                      Email:{" "}
                      {identity?.email_confirmed_at
                        ? "Confirmed"
                        : "Not confirmed"}
                      .{" "}
                      {identity && !identity.email_consistent
                        ? "Approved email mismatch, access denied."
                        : ""}
                    </p>
                    <p>
                      Last sign-in:{" "}
                      {identity?.last_sign_in_at
                        ? new Date(identity.last_sign_in_at).toLocaleString()
                        : "No sign-in recorded"}
                    </p>
                    <small>Auth identity: {m.user_id}</small>
                  </div>
                );
              })}
              <h3>Domains</h3>
              {c.portal_domain_assignments.length ? (
                c.portal_domain_assignments.map((d) => (
                  <p key={d.domain_id}>
                    {d.portal_domains.name} · Legal holder: {d.legal_holder}
                  </p>
                ))
              ) : (
                <p>No domains assigned.</p>
              )}
              <h3>Websites</h3>
              {c.portal_websites.length ? (
                c.portal_websites.map((w) => (
                  <p key={w.id}>
                    {w.name} · {w.url}
                  </p>
                ))
              ) : (
                <p>No websites assigned.</p>
              )}
              <p>
                <Link href="/admin/billing">Client billing</Link> ·{" "}
                <Link href="/admin/support">Support records</Link>
              </p>
            </section>
          ))}
          {data.next && (
            <button onClick={() => void load(data.next!)}>
              Load more clients
            </button>
          )}
          <section className="portal-panel">
            <h2>Provisioning follow-up</h2>
            {!data.provisioning.length ? (
              <p>No incomplete provisioning requests.</p>
            ) : (
              data.provisioning.map((p) => (
                <div key={p.id}>
                  <p>
                    {p.email} · {p.state} ·{" "}
                    {p.last_error || "No delivery error recorded"}
                  </p>
                  <small>{p.id}</small>
                  {p.state === "reserved" && (
                    <button
                      disabled={busy}
                      onClick={() =>
                        void provision({ ...p.input, idempotency_key: p.id })
                      }
                    >
                      Resume saved request
                    </button>
                  )}
                  {p.state === "review_required" && (
                    <p>
                      Delivery is uncertain. Check the email provider before
                      sending another invitation.
                    </p>
                  )}
                </div>
              ))
            )}
          </section>
        </>
      )}
    </>
  );
}
