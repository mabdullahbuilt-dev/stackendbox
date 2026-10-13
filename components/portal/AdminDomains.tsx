"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { api, type Data } from "./Portal";
import { DomainControls } from "./DomainControls";
import { RegistrantCheck } from "./RegistrantCheck";
import { DomainHandoff } from "./DomainHandoff";

type Row = Record<string, unknown>;
const rows = (data: Data, key: string) => (data[key] || []) as Row[];
const text = (value: unknown) =>
  value == null ? "Not recorded" : String(value);
export function AdminDomains({
  data,
  reload,
  domain,
}: {
  data: Data;
  reload: () => Promise<void>;
  domain?: string;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  async function run(action: () => Promise<{ message?: string }>) {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const result = await action();
      setMessage(result.message || "Saved.");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }
  const clients = rows(data, "clients").filter((c) => c.status === "active"),
    inventory = rows(data, "domains");
  const assignments = rows(data, "domain_assignments");
  const clientSelect = (
    <label>
      Client business
      <select name="client_id" required>
        <option value="">Select a client</option>
        {clients.map((c) => (
          <option key={text(c.id)} value={text(c.id)}>
            {text(c.business_name)}
          </option>
        ))}
      </select>
    </label>
  );
  const fields = (e: FormEvent<HTMLFormElement>) =>
    Object.fromEntries(new FormData(e.currentTarget));
  const selected = domain
    ? inventory.find((d) => d.name === decodeURIComponent(domain))
    : null;
  if (domain)
    return (
      <>
        <Link href="/admin/domains">Back to domain inventory</Link>
        {selected ? (
          <>
            <h1>{text(selected.name)}</h1>
            <p>
              Registrar status: {text(selected.lifecycle_status)}. Expires:{" "}
              {selected.expiration_date
                ? new Date(text(selected.expiration_date)).toLocaleDateString()
                : "Not verified"}
              .
            </p>
            <p>
              Last verified: {text(selected.last_synced_at)}.{" "}
              {selected.reconciliation_required === true
                ? "Inventory reconciliation required."
                : ""}
            </p>
            {(["dns", "nameservers", "privacy"] as const).map((panel) => (
              <section className="portal-panel" key={panel}>
                <h2>
                  {panel === "dns"
                    ? "DNS records"
                    : panel === "nameservers"
                      ? "Nameservers"
                      : "Privacy and security"}
                </h2>
                <DomainControls
                  name={text(selected.name)}
                  panel={panel}
                  admin
                />
              </section>
            ))}
            <RegistrantCheck name={text(selected.name)} />
          </>
        ) : (
          <p>This domain isn&apos;t in the verified inventory.</p>
        )}
      </>
    );
  return (
    <>
      <h1>Domains</h1>
      <p>
        Assign domains already purchased manually in the dedicated Spaceship account.
        Initial domain purchases and first-year checkout aren’t available here. Live renewal and DNS changes remain disabled.
      </p>
      {error && (
        <p role="alert" className="portal-error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="portal-notice">
          {message}
        </p>
      )}
      <DomainHandoff reload={reload}/>
      <section className="portal-panel">
        <h2>Client-domain registrar inventory</h2>
        <p>Use the dedicated StackEndBox client-domains Spaceship account. Keep personal domains outside this integration.</p>
        <button
          disabled={busy}
          className="portal-button"
          onClick={() =>
            void run(async () => {
              const r = await api("admin/sync", {});
              return {
                message: `Verified ${r.count} registrar domains. ${r.missing} require reconciliation.`,
              };
            })
          }
        >
          Sync domains
        </button>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = fields(e);
            void run(() => api("admin/import-domain", f));
          }}
        >
          <label>
            Import an existing domain
            <input
              name="domain"
              required
              maxLength={253}
              placeholder="example.com"
            />
          </label>
          <button disabled={busy} className="portal-button">
            Verify and import
          </button>
        </form>
        <p>
          Import checks the configured Spaceship account. A name entered here
          isn&apos;t proof of ownership.
        </p>
        {!inventory.length ? (
          <p>The configured client-domain account returned no domains. An empty inventory is valid before client domains are purchased or transferred into that account. No personal domains are imported automatically.</p>
        ) : (
          <div className="portal-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Domain</th>
                  <th>Registrar status</th>
                  <th>Expires</th>
                  <th>Assignment</th>
                  <th>Verification</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((d) => {
                  const a = assignments.find((a) => a.domain_id === d.id);
                  return (
                    <tr key={text(d.id)}>
                      <td>
                        <Link href={`/admin/domains/${text(d.name)}`}>
                          {text(d.name)}
                        </Link>
                        {d.protected === true && (
                          <small>Protected company asset</small>
                        )}
                      </td>
                      <td>{text(d.lifecycle_status)}</td>
                      <td>
                        {d.expiration_date
                          ? new Date(
                              text(d.expiration_date),
                            ).toLocaleDateString()
                          : "Not verified"}
                      </td>
                      <td>
                        {a
                          ? text(
                              clients.find((c) => c.id === a.client_id)
                                ?.business_name,
                            )
                          : "Unassigned"}
                      </td>
                      <td>
                        {d.reconciliation_required === true
                          ? "Review required"
                          : text(d.last_synced_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="portal-panel">
        <h2>Assign a verified domain</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = fields(e);
            void run(() =>
              api("admin/assign", {
                ...f,
                rights_confirmed: f.rights_confirmed === "on",
              }),
            );
          }}
        >
          {clientSelect}
          <label>
            Unassigned domain
            <select name="domain_id" required>
              <option value="">Select a verified domain</option>
              {inventory
                .filter(
                  (d) =>
                    !d.protected &&
                    !d.reconciliation_required &&
                    d.lifecycle_status === "registered" &&
                    !assignments.some((a) => a.domain_id === d.id),
                )
                .map((d) => (
                  <option key={text(d.id)} value={text(d.id)}>
                    {text(d.name)}
                  </option>
                ))}
            </select>
          </label>
          <p>The actual registered holder is fetched from Spaceship and recorded separately. You don&apos;t need to change it to grant client management access.</p>
          <label>
            Contractual arrangement
            <select name="holder_arrangement">
              <option value="client_owned">
                Client ownership agreement, separate registrar handoff
              </option>
              <option value="licensed">
                Managed or licensed access, holder unchanged
              </option>
            </select>
          </label>
          <label className="portal-check">
            <input name="rights_confirmed" type="checkbox" required />I verified
            the contractual rights and accurate holder arrangement.
          </label>
          <button className="portal-button" disabled={busy || !clients.length}>
            Verify and assign domain
          </button>
        </form>
        <p>
          The registrar record is fetched again before assignment. Assignment
          grants portal access and doesn&apos;t change registrar ownership.
        </p>
      </section>
    </>
  );
}
