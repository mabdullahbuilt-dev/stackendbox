"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { AdminDomainSearch, api, type Data } from "./Portal";
import { DomainControls } from "./DomainControls";
import { RegistrantCheck } from "./RegistrantCheck";

type Row = Record<string, unknown>;
const rows = (data: Data, key: string) => (data[key] || []) as Row[];
const text = (value: unknown) =>
  value == null ? "Not recorded" : String(value);
const money = (value: unknown) =>
  typeof value === "number" ? `$${(value / 100).toFixed(2)}` : "Quote required";
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
  const [acquisitions, setAcquisitions] = useState<Row[]>([]);
  const [requestId, setRequestId] = useState(""),
    [paymentId, setPaymentId] = useState("");
  const [acquisitionAttempt, setAcquisitionAttempt] = useState<Row | null>(
      null,
    ),
    [paymentAttempt, setPaymentAttempt] = useState<Row | null>(null);
  async function loadRequests() {
    const r = await api("admin/acquisitions");
    setAcquisitions(r.requests);
  }
  useEffect(() => {
    setRequestId(crypto.randomUUID());
    setPaymentId(crypto.randomUUID());
    void loadRequests().catch((e) => setError(e.message));
  }, []);
  async function run(action: () => Promise<{ message?: string }>) {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const result = await action();
      setMessage(result.message || "Saved.");
      await reload();
      await loadRequests();
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
        Acquire and assign domains for clients. Live registration, renewal, and
        DNS changes are disabled.
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
      <AdminDomainSearch clientSelect={clientSelect} />
      <section className="portal-panel">
        <h2>Record an approved purchase request</h2>
        <p>
          Use the customer&apos;s actual quote and approval reference. The standard
          eligible first-year package is $45.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = fields(e);
            const payload = acquisitionAttempt || {
              ...f,
              idempotency_key: requestId,
              retail_minor: Math.round(Number(f.retail_usd) * 100),
            };
            delete payload.retail_usd;
            setAcquisitionAttempt(payload);
            void run(() => api("admin/acquisitions", payload));
          }}
        >
          <fieldset disabled={busy || !!acquisitionAttempt}>
            {clientSelect}
            <label>
              Requested domain
              <input name="domain" required maxLength={253} />
            </label>
            <label>
              Approved customer price, USD
              <input
                name="retail_usd"
                type="number"
                min="0.01"
                max="10000"
                step="0.01"
                defaultValue="45"
                required
              />
            </label>
            <label>
              Customer approval reference
              <input name="customer_approval" required maxLength={1000} />
            </label>
            <label>
              Actual legal holder
              <input name="legal_holder" required maxLength={160} />
            </label>
            <label>
              Arrangement
              <select name="holder_arrangement">
                <option value="client_owned">Client-owned</option>
                <option value="licensed">
                  Agency-owned, licensed to client
                </option>
              </select>
            </label>
          </fieldset>
          <button disabled={busy || !requestId} className="portal-button">
            {acquisitionAttempt
              ? "Retry saved request"
              : "Save purchase request"}
          </button>
        </form>
        <p>
          Registrar purchase remains unavailable pending supplier pricing,
          registration contacts, and live-operation acceptance.
        </p>
        <button disabled className="portal-button">
          Live registration disabled
        </button>
      </section>
      <section className="portal-panel">
        <h2>Purchase requests and external payments</h2>
        {!acquisitions.length ? (
          <p>No customer purchase requests.</p>
        ) : (
          acquisitions.map((r) => (
            <article key={text(r.id)}>
              <h3>
                {text(r.domain)} · {money(r.retail_minor)}
              </h3>
              <p>
                {text(clients.find((c) => c.id === r.client_id)?.business_name)}{" "}
                · {text(r.status).replaceAll("_", " ")}
              </p>
              <small>Reference: {text(r.id)}</small>
              {((r.portal_external_payments || []) as Row[]).map((p) => (
                <p key={text(p.id)}>
                  {money(p.amount_minor)} ·{" "}
                  {text(p.source).replaceAll("_", " ")} ·{" "}
                  {text(p.reconciliation_status)} ·{" "}
                  {text(p.transaction_reference)}
                </p>
              ))}
            </article>
          ))
        )}
        {!!acquisitions.length && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = fields(e);
              const r = acquisitions.find((r) => r.id === f.acquisition_id);
              if (!r) return;
              const payload = paymentAttempt || {
                ...f,
                idempotency_key: paymentId,
                client_id: r.client_id,
                amount_minor: r.retail_minor,
                paid_at: new Date(String(f.paid_at)).toISOString(),
                confirmed: f.confirmed === "on",
              };
              setPaymentAttempt(payload);
              void run(() => api("admin/external-payments", payload));
            }}
          >
            <fieldset disabled={busy || !!paymentAttempt}>
              <label>
                Purchase request
                <select name="acquisition_id" required>
                  {acquisitions.map((r) => (
                    <option key={text(r.id)} value={text(r.id)}>
                      {text(r.domain)} · {money(r.retail_minor)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Actual payment source
                <select name="source">
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="cash">Cash</option>
                  <option value="external_processor">External processor</option>
                </select>
              </label>
              <label>
                Transaction or receipt reference
                <input name="transaction_reference" required maxLength={1000} />
              </label>
              <label>
                Payment date and time
                <input name="paid_at" type="datetime-local" required />
              </label>
              <label>
                Payment evidence reference
                <input name="evidence" required maxLength={1000} />
              </label>
              <label>
                Reconciliation
                <select name="reconciliation_status">
                  <option value="unreconciled">
                    Unreconciled, needs verification
                  </option>
                  <option value="verified">
                    Verified against payment evidence
                  </option>
                </select>
              </label>
              <label className="portal-check">
                <input name="confirmed" type="checkbox" required />I confirm the
                source, amount, date, and evidence reflect the actual payment.
              </label>
            </fieldset>
            <button className="portal-button" disabled={busy || !paymentId}>
              {paymentAttempt
                ? "Retry same payment record"
                : "Save external payment evidence"}
            </button>
          </form>
        )}
      </section>
    </>
  );
}
