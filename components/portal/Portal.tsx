"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowUpRight,
  Bell,
  Building2,
  CreditCard,
  Globe2,
  LayoutDashboard,
  LifeBuoy,
  LockKeyhole,
  LogOut,
  Menu,
  RefreshCw,
  Settings,
} from "lucide-react";
import { Turnstile } from "@/components/builder/Turnstile";
import { usePortalCache } from "./PortalCache";
import { DomainControls } from "./DomainControls";
import { validatePassword } from "@/lib/portal/password-policy";

type Row = Record<string, unknown>;
export type Data = {
  account: {
    name: string;
    approved_email: string;
    role: string;
    user_id: string;
  };
  factors: { id: string; status: string }[];
} & Record<string, unknown>;
const rows = (data: Data | null, name: string) => (data?.[name] || []) as Row[];
const str = (value: unknown) =>
  typeof value === "string"
    ? value
    : value === null || value === undefined
      ? "Not recorded"
      : String(value);
const money = (value: unknown) =>
  typeof value === "number"
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(value / 100)
    : "Quote required";
const date = (value: unknown) =>
  typeof value === "string"
    ? new Date(value).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Not recorded";
const label = (value: unknown) => str(value).replaceAll("_", " ");
const errors: Record<string, string> = {
  registered_holder_mismatch: "The entered legal holder doesn't match the official Spaceship registrant contact. Verify the holder before assigning portal access.",
  registrant_contact_unavailable: "Spaceship didn't return a registrant contact ID. Assignment needs verified holder details.",
  registrant_verification_pending: "Registrar verification is pending or wasn't reported. Complete the required registrar verification before assignment.",
  spaceship_404: "This domain wasn't found in the configured Spaceship account. Check the registrar account and API key scope.",
  payment_acceptance_pending: "Online payments aren't available yet. Contact StackEndBox to arrange payment.",
  price_confirmation_required:
    "A verified supplier quote is required. Please contact StackEndBox.",
  administrator_mfa_required:
    "Verify your authenticator in Account Settings before opening administration.",
  invalid_credentials:
    "The email or password is incorrect, or this account is not approved.",
  strong_password_required: "Use 8-128 characters and avoid repetitive passwords. Letters, numbers, spaces and symbols are accepted.",
  compromised_password: "This password appears in known breaches. Choose another password.",
  password_safety_check_unavailable: "Password safety checking is temporarily unavailable. Your password hasn't been changed. Try again shortly.",
  password_change_required: "Replace your temporary password before accessing client records.",
  password_access_update_failed: "Your password changed, but access verification needs a retry. Contact StackEndBox.",
  verification_failed: "Please complete the security check again.",
  verification_required:
    "Security verification hasn't completed. Wait for the check to succeed, or use Retry verification if it fails.",
  quote_expired: "This quote has expired. Request a fresh quote.",
  renewal_requires_administrator_review:
    "This domain needs an administrator review before renewal. Contact support.",
  protected_company_domain: "This is a protected StackEndBox domain.",
  checkout_requires_reconciliation:
    "Checkout could not be confirmed. StackEndBox needs to check its status before you retry.",
};
export async function api(path: string, body?: unknown, signal?: AbortSignal) {
  const r = await fetch(`/api/portal/${path}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(25000)]) : AbortSignal.timeout(25000),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(errors[data.error] || label(data.error));
  return data;
}
function Form({
  children,
  onSubmit,
  button = "Save",
}: {
  children: ReactNode;
  onSubmit: (data: Record<string, FormDataEntryValue>) => Promise<unknown>;
  button?: string;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [failed, setFailed] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const result = (await onSubmit(
        Object.fromEntries(new FormData(e.currentTarget)),
      )) as { message?: string } | undefined;
      setFailed(false);
      setMessage(result?.message || "Saved.");
    } catch (e) {
      setFailed(true);
      setMessage(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="portal-form">
      {children}
      <button className="portal-button" disabled={busy}>
        {busy ? "Please wait…" : button}
      </button>
      {message && (
        <p
          role={failed ? "alert" : "status"}
          className={failed ? "portal-error" : "portal-notice"}
        >
          {message}
        </p>
      )}
    </form>
  );
}
function Field({
  name,
  title,
  type = "text",
  ...props
}: {
  name: string;
  title: string;
  type?: string;
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  defaultValue?: string | number;
  placeholder?: string;
}) {
  return (
    <label>
      {title}
      <input name={name} type={type} required {...props} />
    </label>
  );
}
function Empty({ children }: { children: ReactNode }) {
  return <div className="portal-empty">{children}</div>;
}
function Status({ value }: { value: unknown }) {
  return <span className="portal-status">{label(value)}</span>;
}
const nav = [
  ["dashboard", "Overview", LayoutDashboard],
  ["domains", "My Domains", Globe2],
  ["websites", "My Websites", Building2],
  ["renewals", "Renewals", RefreshCw],
  ["billing", "Billing & Invoices", CreditCard],
  ["requests", "Support", LifeBuoy],
  ["settings", "Account Settings", Settings],
] as const;

export function Portal({ path, userId = "" }: { path: string[]; userId?: string }) {
  const { cache, save } = usePortalCache();
  const router = useRouter();
  const section = path[0],
    page = path.join("/"),
    domainDetail = section === "domains" ? path[1] : undefined;
  const [data, setData] = useState<Data | null>(() => cache?.userId === userId && cache.section === page ? cache.data : null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(() => cache?.userId !== userId || cache.section !== page),
    [open, setOpen] = useState(false);
  const [token, setToken] = useState(""),
    [tokenKey, setTokenKey] = useState(0);
  const [dataPage,setDataPage] = useState(page);
  const publicPage = section === "login" || section === "forgot-password";
  const reload = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const next = await api(`data?section=${encodeURIComponent(section)}${domainDetail ? `&domain=${encodeURIComponent(domainDetail)}` : ""}`);
      setData(next);
      setDataPage(page);
      save({ userId, section: page, data: next, loadedAt: Date.now() });
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [save, userId, page, section, domainDetail]);
  useEffect(() => {
    if (publicPage) return;
    if (cache?.userId === userId && cache.section === page && Date.now() - cache.loadedAt < 30000) return;
    void reload();
  }, [publicPage, page, reload, cache, userId]);
  if (publicPage)
    return (
      <main id="main" className="portal-auth">
        <Link href="/" className="portal-brand">
          StackEndBox<span>CLIENT PORTAL</span>
        </Link>
        <div className="portal-auth-grid">
          <section>
            <span className="portal-eyebrow">CLIENT PORTAL</span>
            <h1>
              Your domains and websites.
            </h1>
            <p>
              Manage your domains, review renewals, and request support.
            </p>
            <div className="portal-auth-note">
              <LockKeyhole size={18} />
              <span>Private access for StackEndBox clients.</span>
            </div>
          </section>
          <section className="portal-panel">
            <h2>
              {section === "login" ? "Welcome back" : "Reset your password"}
            </h2>
            <p>
              {section === "login"
                ? "Sign in with your approved email address."
                : "Enter your approved email to request a recovery link."}
            </p>
            <Form
              button={section === "login" ? "Sign in" : "Send recovery link"}
              onSubmit={async (f) => {
                if (!token) throw new Error(errors.verification_required);
                try {
                  const r = await api(
                    section === "login" ? "auth/login" : "auth/recover",
                    { ...f, token },
                  );
                  if (r.redirect) window.location.assign(r.redirect);
                  return r;
                } finally {
                  setToken("");
                  setTokenKey((k) => k + 1);
                }
              }}
            >
              <Field name="email" title="Email address" type="email" />
              {section === "login" && (
                <Field name="password" title="Password" type="password" />
              )}
              <Turnstile key={tokenKey} onToken={setToken} />
              {!token && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
                <div>
                  <p className="portal-small" role="status">
                    Complete the security check before continuing. If it fails,
                    retry verification or reload this page.
                  </p>
                  <button
                    type="button"
                    className="portal-button"
                    onClick={() => {
                      setToken("");
                      setTokenKey((k) => k + 1);
                    }}
                  >
                    Retry verification
                  </button>
                </div>
              )}
              {!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
                <p role="alert">
                  Security verification is not configured. Sign-in is
                  unavailable.
                </p>
              )}
            </Form>
            <Link
              href={`/client-portal/${section === "login" ? "forgot-password" : "login"}`}
            >
              {section === "login" ? "Forgot password?" : "Back to sign in"}
            </Link>
            <p className="portal-small">
              Accounts are created by StackEndBox. For access, contact your
              project lead.
            </p>
          </section>
        </div>
      </main>
    );
  return (
    <div className="portal-shell">
      <aside className={open ? "portal-sidebar is-open" : "portal-sidebar"}>
        <Link href="/" className="portal-brand">
          StackEndBox<span>CLIENT PORTAL</span>
        </Link>
        <nav aria-label="Client portal">
          {nav.map(([url, title, Icon]) => (
            <Link
              prefetch={false}
              key={url}
              href={`/client-portal/${url}`}
              onClick={() => setOpen(false)}
              aria-current={page === url ? "page" : undefined}
            >
              <Icon size={18} />
              {title}
            </Link>
          ))}
        </nav>
        <div className="portal-sidebar-foot">
          <p>Need a hand?</p>
          <Link href="/client-portal/requests">
            Talk to StackEndBox <ArrowUpRight size={14} />
          </Link>
          <button
            onClick={async () => {
              await api("auth/logout", {});
              save(null);
              router.replace("/client-portal/login");
              router.refresh();
            }}
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>
      <div className="portal-workspace">
        <header className="portal-topbar">
          <button
            aria-label="Toggle navigation"
            className="portal-menu"
            onClick={() => setOpen(!open)}
          >
            <Menu />
          </button>
          <span>{rows(data, "clients")[0]?.business_name as string || data?.account.name || "StackEndBox"}</span>
          <div>
            <Link href="/client-portal/dashboard" aria-label="Notifications">
              <Bell size={18} />
            </Link>
            <span className="portal-avatar">
              {data?.account.name.slice(0, 1) || "S"}
            </span>
          </div>
        </header>
        <main id="main" className="portal-main">
          {data?.sandbox_checkout_enabled === true && <div className="portal-sandbox">Test payments do not purchase or renew real domains.</div>}
          {!error && ((busy && !data) || dataPage !== page) ? (
            <p role="status">Loading {section === "dashboard" ? "account overview" : section === "renewals" ? "renewal details" : section}…</p>
          ) : error ? (
            <div role="alert" className="portal-error">
              {error}
              <button onClick={() => void reload()}>Try again</button>
            </div>
          ) : (
            data && (
              <PortalContent
                section={section}
                path={path}
                data={data}
                reload={reload}
              />
            )
          )}
        </main>
        <footer className="portal-footer">
          StackEndBox · Software & Product Engineering
        </footer>
      </div>
    </div>
  );
}
export function PortalContent({
  section,
  path,
  data,
  reload,
  adminMode = false,
}: {
  section: string;
  path: string[];
  data: Data;
  reload: () => Promise<void>;
  adminMode?: boolean;
}) {
  const [now] = useState(() => Date.now());
  const requestedDomain = (useSearchParams().get("domain") || "").slice(0, 253);
  const domains = rows(data, "domains"),
    websites = rows(data, "websites"),
    requests = rows(data, "requests");
  const clients = rows(data, "clients");
  const clientSelect = (
    <label>
      Business
      <select name="client_id" required>
        {clients.map((c) => (
          <option key={str(c.id)} value={str(c.id)}>
            {str(c.business_name)}
          </option>
        ))}
      </select>
    </label>
  );
  if (section === "dashboard")
    return (
      <>
        <div className="portal-heading">
          <h1>Overview</h1>
          <p>{str(clients[0]?.business_name || data.account.name)}</p>
        </div>
        {(domains.length > 0 || websites.length > 0 || requests.length > 0) && <div className="portal-stats">
          {[
            ["My domains", domains.length],
            ["My websites", websites.length],
            [
              "Renewals within 60 days",
              domains.filter(
                (d) =>
                  d.expiration_date &&
                  Date.parse(str(d.expiration_date)) >= now &&
                  Date.parse(str(d.expiration_date)) - now < 60 * 86400000,
              ).length,
            ],
            [
              "Open requests",
              requests.filter(
                (r) => !["completed", "closed"].includes(str(r.status)),
              ).length,
            ],
          ].map(([title, count]) => (
            <div key={title}>
              <span>{title}</span>
              <strong>{count}</strong>
            </div>
          ))}
        </div>}
        <div className="portal-section-title">
          <h2>Your domains</h2>
          <Link href="/client-portal/domains">
            View all <ArrowUpRight size={16} />
          </Link>
        </div>
        <DomainList domains={domains} quotes={rows(data,"quotes")} />
        {!!rows(data,"service_entitlements").length&&<section className="portal-panel"><h2>Your agreed services</h2>{rows(data,"service_entitlements").map(s=><p key={str(s.id)}>{str(s.service)} · {str(s.description)} · {label(s.status)}</p>)}</section>}
        <div className="portal-columns">
          <section className="portal-panel">
            <h2>Your websites</h2>
            {websites.length ? (
              websites.map((w) => (
                <p key={str(w.id)}>
                  <a href={str(w.url)} target="_blank" rel="noreferrer">
                    {str(w.name)} <ArrowUpRight size={14} />
                  </a>
                  <small>{str(w.status)}</small>
                </p>
              ))
            ) : (
              <Empty>No websites have been assigned to your account.</Empty>
            )}
          </section>
          <section className="portal-panel">
            <h2>Recent notifications</h2>
            {rows(data, "notifications").length ? (
              rows(data, "notifications").map((n) => (
                <article key={str(n.id)}>
                  <h3>{str(n.title)}</h3>
                  <p>{str(n.body)}</p>
                  <small>{date(n.created_at)}</small>
                </article>
              ))
            ) : (
              <p>No updates to show.</p>
            )}
          </section>
        </div>
      </>
    );
  if (section === "domains" && path[1]) {
    const domain = domains.find((d) => d.name === decodeURIComponent(path[1]));
    return domain ? (
      <DomainDetail domain={domain} data={data} />
    ) : (
      <Empty>
        This domain is unavailable or isn’t assigned to your account.
      </Empty>
    );
  }
  if (section === "domains")
    return (
      <>
        <Heading
          title="My Domains"
          description="Registration details and renewal information for your assigned domains."
        />
        <DomainList domains={domains} quotes={rows(data,"quotes")} />
      </>
    );
  if (section === "websites")
    return (
      <>
        <Heading
          title="My Websites"
          description="Your projects and ongoing website services."
        />
        {websites.length ? (
          <div className="portal-columns">
            {websites.map((w) => (
              <section key={str(w.id)} className="portal-panel">
                <Building2 />
                <h2>{str(w.name)}</h2>
                <Status value={w.status} />
                <p>{str(w.url)}</p>
                <p>Project: {label(w.project_status)}</p>
                {Boolean(w.last_verified_at) && (
                  <p>Last verified {date(w.last_verified_at)}</p>
                )}
                {rows(data,"service_entitlements").filter(s=>s.client_id===w.client_id && (!s.website_id || s.website_id===w.id)).map(s=><p key={str(s.id)}>{str(s.service)}: {str(s.description)} · {label(s.status)}</p>)}
                <a
                  className="portal-button"
                  href={str(w.url)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open website <ArrowUpRight size={16} />
                </a>
                <Link href="/client-portal/requests">Request an update</Link>
              </section>
            ))}
          </div>
        ) : (
          <Empty>
            No websites have been assigned to your account. Contact StackEndBox to discuss a website project.
          </Empty>
        )}
      </>
    );
  if (section === "renewals")
    return (
      <>
        <Heading
          title="Domain renewals"
          description="Review a verified quote and decide whether to renew. Payments are one-time."
        />
        {domains.length ? <DomainList domains={[...domains].sort((a, b) => str(a.expiration_date).localeCompare(str(b.expiration_date)))} quotes={rows(data,"quotes")} /> : <Empty>No domain has been assigned to your account yet. Your renewal details will appear once StackEndBox completes the setup. <Link href="/client-portal/requests">Contact StackEndBox</Link></Empty>}
        <section className="portal-panel">
          <h2>Renewal orders</h2>
          <OrderList
            orders={rows(data, "orders").filter((o) => o.kind === "renewal")}
            reload={reload}
            checkoutEnabled={data.sandbox_checkout_enabled === true}
          />
        </section>
      </>
    );
  if (section === "billing")
    return (
      <>
        <Heading
          title="Billing & Invoices"
          description="Your service payments, renewal history, and receipts."
        />
        <OrderList orders={rows(data, "orders")} reload={reload} checkoutEnabled={data.sandbox_checkout_enabled === true} />
        {!!rows(data,"external_payments").length&&<section className="portal-panel"><h2>Payments made to StackEndBox</h2>{rows(data,"external_payments").map(p=><article key={str(p.id)}><p>{money(p.amount_minor)} · {date(p.paid_at)} · {label(p.source)}</p><p>{p.reconciliation_status==="verified"?"Payment evidence verified":"Payment record awaiting reconciliation"}. Reference: {str(p.transaction_reference)}</p></article>)}</section>}
        <h2>Receipts</h2>
        {!rows(data, "invoices").length && <Empty>No payment receipts yet.</Empty>}
        {rows(data, "invoices").map((i) => (
          <section className="portal-panel" key={str(i.id)}>
            <h3>{str(i.description)}</h3>
            <p>
              {money(i.amount_minor)} · {date(i.created_at)}
            </p>
            <Status value={i.status} />
            <p className="portal-small">
              Sandbox receipt {str(i.id)}. This is not a tax invoice.
            </p>
            <a href={`/api/portal/invoices/${str(i.id)}/download`} download>Download receipt</a>
          </section>
        ))}
      </>
    );
  if (section === "requests")
    return (
      <>
        <Heading
          title="Support & Requests"
          description="Tell us what you need. Follow the conversation and progress here."
        />
        <section className="portal-panel">
          <h2>Start a request</h2>
          <Form
            button="Submit request"
            onSubmit={async (f) => {
              const r = await api("requests", f);
              await reload();
              return r;
            }}
          >
            {clientSelect}
            <label>
              Category
              <select name="category" defaultValue={requestedDomain ? "Domain / DNS" : "Website update"}>
                {[
                  "Website update",
                  "Bug fix",
                  "Domain / DNS",
                  "Billing",
                  "Hosting",
                  "General support",
                ].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>Subject<input name="subject" required maxLength={200} defaultValue={requestedDomain ? `Domain quote: ${requestedDomain}` : ""} /></label>
            <label>
              Description
              <textarea name="description" required maxLength={5000} rows={5} defaultValue={requestedDomain ? `Please provide a verified registration quote for ${requestedDomain}.` : ""} />
            </label>
          </Form>
        </section>
        {requests.length ? (
          requests.map((r) => (
            <section className="portal-panel" key={str(r.id)}>
              <div className="portal-section-title">
                <h2>{str(r.subject)}</h2>
                <Status value={r.status} />
              </div>
              <p>{str(r.description)}</p>
              <small>
                Request {str(r.id).slice(0, 8)} · Updated {date(r.updated_at)}
              </small>
              <div className="portal-conversation">
                {rows(data, "messages")
                  .filter((m) => m.request_id === r.id)
                  .map((m) => (
                    <article key={str(m.id)}>
                      <small>
                        {m.author_id === data.account.user_id
                          ? "You"
                          : "StackEndBox / client"}{" "}
                        · {date(m.created_at)}
                      </small>
                      <p>{str(m.body)}</p>
                    </article>
                  ))}
              </div>
              <Form
                button="Send reply"
                onSubmit={async (f) => {
                  const result = await api(`requests/${r.id}/messages`, f);
                  await reload();
                  return result;
                }}
              >
                <label>
                  Reply
                  <textarea name="body" required maxLength={5000} />
                </label>
              </Form>
              {adminMode && data.account.role === "super_admin" && (
                <Form
                  button="Update status"
                  onSubmit={async (f) => {
                    const result = await api("admin/request-status", {
                      id: r.id,
                      ...f,
                    });
                    await reload();
                    return result;
                  }}
                >
                  <label>
                    Status
                    <select name="status" defaultValue={str(r.status)}>
                      {[
                        "submitted",
                        "under_review",
                        "quoted",
                        "approved",
                        "in_progress",
                        "completed",
                        "closed",
                      ].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                </Form>
              )}
            </section>
          ))
        ) : (
          <Empty>No support requests yet.</Empty>
        )}
      </>
    );
  if (section === "documents")
    return (
      <>
        <Heading
          title="Documents"
          description="Files and deliverables shared with your business."
        />
        <DocumentUpload clientSelect={clientSelect} reload={reload} />
        {rows(data, "documents").length ? (
          rows(data, "documents").map((d) => (
            <section className="portal-panel" key={str(d.id)}>
              <h2>{str(d.name)}</h2>
              <Action
                title="Download securely"
                run={async () => {
                  const r = await api(`documents/${d.id}`);
                  window.location.assign(r.url);
                }}
              />
            </section>
          ))
        ) : (
          <Empty>No documents have been shared yet.</Empty>
        )}
      </>
    );
  if (section === "settings" || section === "reset-password")
    return (
      <>
        <Heading
          title={
            section === "settings" ? "Account Settings" : "Set your password"
          }
          description="Your approved login identity is managed by StackEndBox."
        />
        <section className="portal-panel">
          <h2>{data.account.name}</h2>
          <p>{data.account.approved_email}</p>
          <p>Email changes require administrator verification.</p>
          <Form
            button="Change password"
            onSubmit={(f) => { validatePassword(String(f.password || "")); return api("auth/password", f); }}
          >
            <Field
              name="password"
              title="New password, at least 8 characters"
              type="password"
              minLength={8}
              maxLength={128}
            />
          </Form>
        </section>
        {section === "settings" && <Mfa factors={data.factors} />}
      </>
    );
  if (section === "admin" && adminMode)
    return <Admin data={data} reload={reload} clientSelect={clientSelect} />;
  return null;
}
function Heading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="portal-heading">
      <span className="portal-eyebrow">STACKENDBOX</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}
function DomainList({ domains, admin = false, quotes = [] }: { domains: Row[]; admin?:boolean; quotes?:Row[] }) {
  const [search, setSearch] = useState("");
  const [now] = useState(()=>Date.now());
  return (
    <section className="portal-panel">
      {domains.length > 10 && <label className="portal-search">
        Filter your domains
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by domain name"
        />
      </label>}
      {domains.length ? (
        <div className="portal-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Domain</th>
                <th>Status</th>
                <th>Expires</th>
                <th>Renewal method</th>
                {!admin&&<th>Renewal quote</th>}
                <th />
              </tr>
            </thead>
            <tbody>
              {domains
                .filter((d) => str(d.name).includes(search.toLowerCase()))
                .map((d) => (
                  <tr key={str(d.id)}>
                    <td>
                      <Link href={`${admin?"/admin":"/client-portal"}/domains/${d.name}`}>{str(d.name)}</Link>
                      {d.protected === true && (
                        <small>Protected company asset</small>
                      )}
                    </td>
                    <td>
                      <Status value={d.lifecycle_status} />
                    </td>
                    <td>{date(d.expiration_date)}{typeof d.expiration_date==="string"&&Number.isFinite(Date.parse(d.expiration_date))&&<small>{Date.parse(d.expiration_date)<=now?"Expired":`${Math.ceil((Date.parse(d.expiration_date)-now)/86400000)} days remaining`}</small>}</td>
                    <td>
                      {d.auto_renew === true
                        ? "Enabled, review required"
                        : d.auto_renew === false
                          ? "Manual"
                          : "Unverified"}
                    </td>
                    {!admin&&<td>{money(quotes.filter(q=>q.domain_id===d.id&&q.kind==="renewal"&&Date.parse(str(q.valid_until))>now).sort((a,b)=>str(b.created_at).localeCompare(str(a.created_at)))[0]?.retail_minor)}<small><Link href="/client-portal/requests">Contact support</Link></small></td>}
                    <td>
                      <Link href={`${admin?"/admin":"/client-portal"}/domains/${d.name}`}>
                        Manage <ArrowUpRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>
          No domain has been assigned to your account yet. Your domain will appear here once StackEndBox completes the setup. <Link href="/client-portal/requests">Contact StackEndBox</Link>
        </Empty>
      )}
    </section>
  );
}
function Action({
  title,
  run,
}: {
  title: string;
  run: () => Promise<unknown>;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <div>
      <button
        className="portal-button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMessage("");
          try {
            const r = (await run()) as { message?: string } | undefined;
            setMessage(r?.message || "Completed.");
          } catch (e) {
            setMessage((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Working…" : title}
      </button>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
function OrderList({
  orders,
  reload,
  checkoutEnabled = false,
}: {
  orders: Row[];
  reload: () => Promise<void>;
  checkoutEnabled?: boolean;
}) {
  return orders.length ? (
    <div className="portal-order-list">
      {orders.map((o) => (
        <section className="portal-panel" key={str(o.id)}>
          <div className="portal-section-title">
            <h3>{str(o.domain)}</h3>
            <strong>{money(o.amount_minor)}</strong>
          </div>
          <p>
            {label(o.kind)} · One year · {date(o.created_at)}
          </p>
          <Status value={o.status} />
          {o.status === "simulated_complete" && (
            <p>
              Test fulfillment completed. No real domain was registered or
              renewed.
            </p>
          )}
          {checkoutEnabled && o.kind === "renewal" && ["awaiting_payment", "checkout_ready"].includes(str(o.status)) && (
            <Action
              title="Open sandbox checkout"
              run={async () => {
                const r = await api(`orders/${o.id}/checkout`, {});
                window.location.assign(r.url);
              }}
            />
          )}
          {o.kind === "renewal" && o.status === "awaiting_payment" && (
            <Action
              title="Decline renewal"
              run={async () => {
                if (
                  !window.confirm(
                    "If you do not renew, the domain may expire and your website and email may stop working. Decline this renewal?",
                  )
                )
                  return;
                const r = await api(`orders/${o.id}/decline`, {});
                await reload();
                return r;
              }}
            />
          )}
          <small>Order {str(o.id)}</small>
        </section>
      ))}
    </div>
  ) : (
    <Empty>No orders yet.</Empty>
  );
}
function DocumentUpload({
  clientSelect,
  reload,
}: {
  clientSelect: ReactNode;
  reload: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <form
      className="portal-panel"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        setBusy(true);
        setMessage("");
        try {
          const response = await fetch("/api/portal/upload", {
            method: "POST",
            body: new FormData(form),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(label(result.error));
          form.reset();
          setMessage(result.message);
          await reload();
        } catch (error) {
          setMessage((error as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>Share a document</h2>
      {clientSelect}
      <label>
        PDF, PNG, JPEG, WebP or plain text, up to 4 MB
        <input
          type="file"
          name="file"
          accept="application/pdf,image/png,image/jpeg,image/webp,text/plain"
          required
        />
      </label>
      <button disabled={busy}>{busy ? "Uploading…" : "Upload securely"}</button>
      <p role="status">{message}</p>
    </form>
  );
}
function QuoteCheckout({ quote }: { quote: Row }) {
  const router = useRouter();
  const { save } = usePortalCache();
  return (
    <section className="portal-panel">
      <h2>{str(quote.domain)}</h2>
      <p>
        {label(quote.kind)} · 1 year · {money(quote.retail_minor)}
      </p>
      <p>
        Quote valid until {new Date(str(quote.valid_until)).toLocaleString()}.
      </p>
      <p>
        Hosting, website development, maintenance, and email hosting are
        separate services. Future renewals require a new quote and one-time
        payment. Registrar auto-renew must be off before a managed live renewal.
      </p>
      <Form
        button="Create sandbox order"
        onSubmit={async () => {
          const order = await api("orders", {
            quote_id: quote.id,
            accept_terms: true,
          });
          save(null);
          router.push(`/client-portal/billing?order=${order.id}`);
          router.refresh();
        }}
      >
        <label className="portal-check">
          <input type="checkbox" required />I accept this quote and understand
          this is a sandbox test. No real domain will be purchased or renewed.
        </label>
      </Form>
    </section>
  );
}
export function AdminDomainSearch({ clientSelect }: { clientSelect: ReactNode }) {
  const [result, setResult] = useState<{ primary: Row; alternatives: Row[] } | null>(null),
    [quote, setQuote] = useState<Row | null>(null),
    [selected, setSelected] = useState<Row | null>(null),
    [query, setQuery] = useState(""),
    [searching, setSearching] = useState(false),
    [failure, setFailure] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setSearching(true); setFailure(""); setQuote(null); setSelected(null); setResult(null);
    try { const next = await api("admin/domain-search", { query }, controller.signal); if (!controller.signal.aborted) setResult(next); }
    catch (e) { if (!controller.signal.aborted) setFailure(e instanceof Error ? e.message : "Availability could not be checked."); }
    finally { if (request.current === controller) setSearching(false); }
  }
  const resultRow = (item: Row, primary = false) => <article className={`portal-domain-result ${primary ? "is-primary" : ""}`} key={str(item.name)}>
    <div><h2>{str(item.name)}</h2><p>{item.result === "available" ? "Available" : item.result === "unavailable" ? "This domain is already registered." : "Availability could not be verified."}</p></div>
    {item.result === "available" && <div><p>{typeof item.retail_minor === "number" ? `${money(item.retail_minor)} for the first year` : item.premium ? "Premium domain. Verified quote required." : "Verified price required"}</p><p>Verified supplier cost: {money(item.supplier_minor)}. Mandatory fees: {money(item.fees_minor)}.</p>
      <button className="portal-button" onClick={() => { setSelected(item); setQuote(null); }}>Review domain</button>
    </div>}
  </article>;
  return (
    <>
      <div className="portal-heading"><h2>Domain acquisition</h2><p>Check Spaceship availability and prepare a verified customer quote.</p></div>
      <form className="portal-domain-search" onSubmit={search}>
        <label htmlFor="domain-search">Enter a name or domain</label>
        <div><input id="domain-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Enter a name or domain" required maxLength={253} /><button className="portal-button">Search domains</button></div>
      </form>
      {searching && <p role="status">Checking availability…</p>}
      {failure && <p role="alert" className="portal-error">{failure} Try your search again.</p>}
      {result && <>
        {resultRow(result.primary, true)}
        {result.alternatives.length > 0 ? <section><h2>Available alternatives</h2>{result.alternatives.map(item => resultRow(item))}</section> : result.primary.result !== "available" && <p>We couldn&apos;t find an available match. Try a different name.</p>}
        <p className="portal-small">Availability checked {new Date(str(result.primary.checked_at)).toLocaleTimeString()}. Availability, supplier pricing, and contacts must be verified before registration.</p>
      </>}
      {selected && (
        <section className="portal-panel">
          <h2>{str(selected.name)}</h2>
          <p>Registration period: 1 year. Eligible standard customer package: $45. Supplier price: {typeof selected.retail_minor === "number" ? "Verified for this quote" : "Verification required"}.</p>
          <h3>Renewal pricing</h3>
          <p>Your renewal price will be confirmed before renewal. Annual pricing uses the verified supplier renewal cost plus 30%. Renewals require your approval and a one-time payment.</p>
          <h3>What&apos;s included</h3>
          <p>Initial sales are handled by StackEndBox. Registrar purchasing is disabled until acceptance and authorization are complete.</p>
          <p>A domain does not include a website, hosting, database, mailboxes, or paid third-party services.</p>
          <p>Ownership and registration contact details must be confirmed before any live registration.</p>
              {typeof selected.retail_minor === "number" ? <Form
                button="Review final quote"
                onSubmit={async (f) => {
                  const q = await api("admin/quotes", {
                    ...f,
                    domain: selected.name,
                    kind: "registration",
                  });
                  setQuote(q);
                  return { message: "Quote ready for review." };
                }}
              >
                {clientSelect}
              </Form> : <p><button className="portal-button" disabled>Supplier pricing verification required</button></p>}
        </section>
      )}
      {quote && <section className="portal-panel"><h2>Saved customer quote</h2><p>{str(quote.domain)} · {money(quote.retail_minor)} · valid until {date(quote.valid_until)}</p><p>No payment or registration was performed. Reference: {str(quote.id)}</p></section>}
    </>
  );
}
function DomainDetail({ domain: d, data }: { domain: Row; data: Data }) {
  const [now] = useState(() => Date.now());
  const security = d.security as { eppStatuses?: string[]; privacy?: { level?: string } } | undefined;
  const nameservers = d.nameservers as { hosts?: string[] } | undefined;
  const latestRenewal = rows(data, "quotes").filter(q => q.domain_id === d.id && q.kind === "renewal" && Date.parse(str(q.valid_until)) > now).sort((a, b) => str(b.created_at).localeCompare(str(a.created_at)))[0];
  const linkedWebsites = rows(data, "websites").filter(w => w.domain_id === d.id);
  const [tab, setTab] = useState("Overview");
  const assignment = rows(data, "domain_assignments").find(
    (a) => a.domain_id === d.id,
  );
  return (
    <>
      <Heading
        title={str(d.name)}
        description={`Expires on ${date(d.expiration_date)}. Last synchronized ${date(d.last_synced_at)}.`}
      />
      <div role="tablist" className="portal-tabs">
        {[
          "Overview",
          "DNS Records",
          "Nameservers",
          "Security",
          "Ownership",
          "Renewal & Billing",
          "Activity",
        ].map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <section className="portal-panel" role="tabpanel">
        {tab === "Overview" && (
          <>
            <h2>Registration details</h2>
            <dl className="portal-details">
              <dt>Status</dt>
              <dd>{label(d.lifecycle_status)}</dd>
              <dt>Registered</dt>
              <dd>{date(d.registration_date)}</dd>
              <dt>Expiration</dt>
              <dd>{date(d.expiration_date)}</dd>
              <dt>Verification</dt>
              <dd>{label(d.verification_status)}</dd>
              <dt>Time remaining</dt>
              <dd>{d.expiration_date && Number.isFinite(Date.parse(str(d.expiration_date))) ? `${Math.max(0, Math.ceil((Date.parse(str(d.expiration_date)) - now) / 86400000))} days` : "Not verified"}</dd>
              <dt>Nameservers</dt>
              <dd>{nameservers?.hosts?.join(", ") || "Not reported"}</dd>
              <dt>Privacy</dt>
              <dd>{security?.privacy?.level || "Not reported"}</dd>
              <dt>Renewal quote</dt>
              <dd>{latestRenewal ? `${money(latestRenewal.retail_minor)} for one year, valid until ${new Date(str(latestRenewal.valid_until)).toLocaleString()}` : "Request a current verified quote under Renewal & Billing"}</dd>
              <dt>Associated website</dt>
              <dd>{linkedWebsites.length ? linkedWebsites.map(w => str(w.name)).join(", ") : "No website linked"}</dd>
              <dt>Registrar auto-renew</dt>
              <dd>
                {d.auto_renew === false
                  ? "Off"
                  : d.auto_renew === true
                    ? "Enabled, administrator review required"
                    : "Unverified"}
              </dd>
            </dl>
            {d.reconciliation_required === true && (
              <p role="alert">
                This domain needs reconciliation with the registrar.
              </p>
            )}
          </>
        )}
        {tab === "DNS Records" && (
          <>
            <h2>DNS records</h2>
            <DomainControls name={str(d.name)} panel="dns" />
          </>
        )}
        {tab === "Nameservers" && (
          <>
            <h2>Nameservers</h2>
            <DomainControls name={str(d.name)} panel="nameservers" />
          </>
        )}
        {tab === "Security" && (
          <>
            <h2>Provider-reported security</h2>
            <p>Verification: {label(d.verification_status)}</p>
            <h3>Transfer status</h3>
            <p>{security?.eppStatuses?.length ? security.eppStatuses.join(", ") : "No transfer-lock status was reported by the registrar."}</p>
            <p>Transfer and ownership handover require identity and ownership checks. Authorization codes are never shown in ordinary account data.</p>
            <Link href="/client-portal/requests">Contact support about this domain</Link>
            <DomainControls name={str(d.name)} panel="privacy" />
          </>
        )}
        {tab === "Ownership" && (
          <>
            <h2>Ownership & service arrangement</h2>
            <p>
              {assignment
                ? label(assignment.holder_arrangement)
                : "Internal or unassigned asset"}
            </p>
            <p>
              Legal holder:{" "}
              {assignment
                ? str(assignment.legal_holder)
                : "Contact StackEndBox for confirmation"}
            </p>
            <p>
              Contact corrections and transfer or handover requests are reviewed
              by StackEndBox under the applicable registrar process.
            </p>
          </>
        )}
        {tab === "Renewal & Billing" && (
          <>
            <h2>Choose whether to renew</h2>
            <p>
              Expires {date(d.expiration_date)}. Renewal pricing is confirmed
              before checkout. Unpaid renewals do not trigger a registrar
              request.
            </p>
            {assignment && latestRenewal ? (
              data.sandbox_checkout_enabled === true ? <QuoteCheckout quote={latestRenewal} /> : <p>Verified renewal quote: {money(latestRenewal.retail_minor)}. Online payments remain disabled pending acceptance.</p>
            ) : <p>A current verified renewal quote hasn&apos;t been issued. StackEndBox must confirm supplier pricing before you can approve a renewal.</p>}
            {(!latestRenewal || data.sandbox_checkout_enabled !== true) && <button className="portal-button" disabled>Online renewal unavailable</button>}
            <p><Link href="/client-portal/requests">Contact StackEndBox about renewal</Link></p>
          </>
        )}
        {tab === "Activity" && (
          <>
            <h2>Domain activity</h2>
            {assignment && <p>Assigned {date(assignment.assigned_at)}</p>}
            <p>Last inventory sync {date(d.last_synced_at)}</p>
            {rows(data, "orders")
              .filter((o) => o.domain === d.name)
              .map((o) => (
                <p key={str(o.id)}>
                  {date(o.created_at)} · {label(o.kind)} · {label(o.status)}
                </p>
              ))}
          </>
        )}
        <Link href="/client-portal/requests">
          Request help or a domain change <ArrowUpRight size={14} />
        </Link>
      </section>
    </>
  );
}
function Mfa({ factors }: { factors: { id: string; status: string }[] }) {
  const [enrollment, setEnrollment] = useState<{
    id: string;
    totp: { qr_code: string };
  } | null>(null);
  return (
    <section className="portal-panel">
      <h2>Two-step verification</h2>
      <p>Use your authenticator to protect sensitive account and domain changes.</p>
      {!factors.length && (
        <Action
          title="Set up authenticator"
          run={async () => {
            setEnrollment(await api("auth/mfa", { action: "enroll" }));
          }}
        />
      )}
      {enrollment && (
        <div className="portal-qr">
          <Image
            unoptimized
            src={enrollment.totp.qr_code}
            alt="Scan with your authenticator"
            width={220}
            height={220}
          />
        </div>
      )}
      {(enrollment || factors.length > 0) && (
        <Form
          button="Verify authenticator"
          onSubmit={(f) =>
            api("auth/mfa", {
              factorId: enrollment?.id || factors[0].id,
              code: f.code,
            })
          }
        >
          <Field name="code" title="Six-digit authenticator code" />
        </Form>
      )}
    </section>
  );
}
function Admin({
  data,
  reload,
  clientSelect,
}: {
  data: Data;
  reload: () => Promise<void>;
  clientSelect: ReactNode;
}) {
  const [admin, setAdmin] = useState<Record<string, Row[]> | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    api("admin/data")
      .then(setAdmin)
      .catch((e) => setError(e.message));
  }, []);
  if (data.account.role !== "super_admin")
    return <Empty>Administrator access is required.</Empty>;
  return (
    <>
      <Heading
        title="Administration"
        description="Manage client access, assigned assets, supplier quotes, and operational exceptions."
      />
      {error && (
        <p className="portal-error" role="alert">
          {error}{" "}
          <Link href="/client-portal/settings">Open account security</Link>
        </p>
      )}
      <section className="portal-panel">
        <h2>Domain inventory</h2>
        <Action title="Process queued work" run={() => api("admin/jobs", {})} />
        <Action
          title="Sync Spaceship domains"
          run={async () => {
            const r = await api("admin/sync", {});
            await reload();
            return {
              message: `Synchronized ${r.count} domains. ${r.missing} require reconciliation.`,
            };
          }}
        />
        <p>
          Import reads registrar data and preserves assignments. It does not
          change DNS, renewal settings, or domain ownership.
        </p>
      </section>
      <p><Link className="portal-button" href="/admin/domains">Open domain acquisition, import, and assignment</Link></p>
      <DomainList domains={rows(data, "domains")} admin />
      <div className="portal-columns">
        <section className="portal-panel">
          <h2>Invite a client</h2>
          <p>Create a saved client and membership before sending an invitation.</p>
          <Link className="portal-button" href="/admin/clients/new">Create client</Link>
        </section>
        <section className="portal-panel">
          <h2>Assign a domain</h2>
          <Form
            button="Assign domain"
            onSubmit={async (f) => {
              const r = await api("admin/assign", {...f,rights_confirmed:f.rights_confirmed==="on"});
              await reload();
              return r;
            }}
          >
            {clientSelect}
            <label>
              Domain
              <select name="domain_id" required>
                {rows(data, "domains")
                  .filter(
                    (d) =>
                      !d.protected &&
                      !rows(data, "domain_assignments").some(
                        (a) => a.domain_id === d.id,
                      ),
                  )
                  .map((d) => (
                    <option key={str(d.id)} value={str(d.id)}>
                      {str(d.name)}
                    </option>
                  ))}
              </select>
            </label>
            <Field name="legal_holder" title="Actual legal holder" />
            <label>
              Arrangement
              <select name="holder_arrangement">
                <option value="client_owned">
                  Client-owned, managed by StackEndBox
                </option>
                <option value="licensed">
                  StackEndBox-owned, licensed to client
                </option>
              </select>
            </label>
            <label className="portal-check"><input type="checkbox" name="rights_confirmed" required/>I verified the contractual rights and accurate legal-holder arrangement.</label>
          </Form>
        </section>
        <section className="portal-panel">
          <h2>Add a website</h2>
          <Form
            button="Add website"
            onSubmit={async (f) => {
              const r = await api("admin/websites", f);
              await reload();
              return r;
            }}
          >
            {clientSelect}
            <Field name="name" title="Website name" />
            <Field name="url" title="HTTPS website URL" type="url" />
          </Form>
        </section>
        <section className="portal-panel">
          <h2>Assign an agreed service</h2>
          <Form button="Save service" onSubmit={async f=>{const r=await api("admin/services",f);await reload();return r;}}>{clientSelect}<label>Service<select name="service">{["Website development","Website hosting","Managed database","Website performance optimization","Integrations","Maintenance","Technical support"].map(s=><option key={s}>{s}</option>)}</select></label><Field name="description" title="Actual service and agreement details"/><label>Service status<select name="status"><option value="included">Included in agreement</option><option value="provisioned">Provisioned</option><option value="suspended">Suspended</option></select></label></Form>
        </section>
        <section className="portal-panel">
          <h2>Verify supplier pricing</h2>
          <Form
            button="Save verified quote"
            onSubmit={(f) =>
              api("admin/pricing", {
                ...f,
                supplier_minor: Number(f.supplier_minor),
                fees_minor: Number(f.fees_minor),
                valid_until: new Date(str(f.valid_until)).toISOString(),
                premium: false,
                requirements_verified: f.requirements_verified === "on",
              })
            }
          >
            <Field name="domain" title="Exact domain" />
            <label>
              Operation
              <select name="kind">
                <option value="registration">Registration</option>
                <option value="renewal">Renewal</option>
              </select>
            </label>
            <Field
              name="supplier_minor"
              title="Supplier cost in USD cents"
              type="number"
              min={1}
            />
            <Field
              name="fees_minor"
              title="Supplier fees in USD cents"
              type="number"
              min={0}
              defaultValue={0}
            />
            <Field name="source" title="Verified pricing source / reference" />
            <Field
              name="valid_until"
              title="Valid until, maximum 7 days"
              type="datetime-local"
            />
            <label className="portal-check">
              <input type="checkbox" name="requirements_verified" required />I
              verified standard non-premium pricing and registration
              requirements.
            </label>
          </Form>
        </section>
      </div>
      <section className="portal-panel">
        <h2>Package policy</h2>
        <Form
          button="Save pricing policy"
          onSubmit={(f) =>
            api("admin/settings", {
              allowed_tlds: str(f.allowed_tlds)
                .split(",")
                .map((s) => s.trim().replace(/^\./, "")),
              max_supplier_minor: Number(f.max_supplier_minor),
              tolerance_minor: Number(f.tolerance_minor),
              registration_minor: Number(f.registration_minor),
              markup_basis_points: Number(f.markup_basis_points),
            })
          }
        >
          <Field
            name="allowed_tlds"
            title="Allowed extensions, comma-separated"
            placeholder="com, net, org"
          />
          <Field
            name="max_supplier_minor"
            title="Maximum supplier cost, USD cents"
            type="number"
            min={0}
          />
          <Field
            name="tolerance_minor"
            title="Maximum price increase, USD cents"
            type="number"
            min={0}
            defaultValue={0}
          />
          <Field
            name="registration_minor"
            title="First-year retail price, USD cents"
            type="number"
            defaultValue={4500}
          />
          <Field
            name="markup_basis_points"
            title="Renewal markup, basis points (3000 = 30%)"
            type="number"
            defaultValue={3000}
          />
        </Form>
      </section>
      {admin && (
        <>
          <section className="portal-panel">
            <h2>Account access</h2>
            {admin.accounts?.map((a) => (
              <div key={str(a.user_id)}>
                <p>
                  {str(a.name)} · {str(a.approved_email)} · {str(a.role)}
                </p>
                <Action
                  title={a.active ? "Suspend access" : "Restore access"}
                  run={() =>
                    api("admin/account-status", {
                      user_id: a.user_id,
                      active: !a.active,
                    })
                  }
                />
              </div>
            ))}
          </section>
          {(["ledger", "events", "jobs", "email_outbox", "audit"] as const).map(
            (name) => (
              <section key={name} className="portal-panel">
                <h2>{label(name)}</h2>
                {admin[name]?.length ? (
                  <div className="portal-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          {Object.keys(admin[name][0]).map((k) => (
                            <th key={k}>{label(k)}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {admin[name].map((r, i) => (
                          <tr key={i}>
                            {Object.values(r).map((v, j) => (
                              <td key={j}>
                                {typeof v === "object"
                                  ? JSON.stringify(v)
                                  : str(v)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty>No records yet.</Empty>
                )}
              </section>
            ),
          )}
        </>
      )}
    </>
  );
}
