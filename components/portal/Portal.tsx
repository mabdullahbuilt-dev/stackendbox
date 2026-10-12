"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowUpRight,
  Bell,
  Building2,
  CreditCard,
  Files,
  Globe2,
  LayoutDashboard,
  LifeBuoy,
  LockKeyhole,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { Turnstile } from "@/components/builder/Turnstile";

type Row = Record<string, unknown>;
type Data = {
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
  price_confirmation_required:
    "A verified supplier quote is required. Please contact StackEndBox.",
  administrator_mfa_required:
    "Verify your authenticator in Account Settings before opening administration.",
  invalid_credentials:
    "The email or password is incorrect, or this account is not approved.",
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
async function api(path: string, body?: unknown) {
  const r = await fetch(`/api/portal/${path}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
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
  ["domains/buy", "Buy a Domain", Plus],
  ["websites", "My Websites", Building2],
  ["renewals", "Renewals", RefreshCw],
  ["billing", "Billing & Invoices", CreditCard],
  ["requests", "Support & Requests", LifeBuoy],
  ["documents", "Documents", Files],
  ["settings", "Account Settings", Settings],
] as const;

export function Portal({ path }: { path: string[] }) {
  const router = useRouter();
  const section = path[0],
    page = path.join("/");
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true),
    [open, setOpen] = useState(false);
  const [token, setToken] = useState(""),
    [tokenKey, setTokenKey] = useState(0);
  const publicPage = section === "login" || section === "forgot-password";
  const reload = useCallback(async () => {
    setBusy(true);
    try {
      setData(await api("data"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    if (!publicPage) void reload();
  }, [publicPage, reload]);
  if (publicPage)
    return (
      <main id="main" className="portal-auth">
        <Link href="/" className="portal-brand">
          StackEndBox<span>CLIENT PORTAL</span>
        </Link>
        <div className="portal-auth-grid">
          <section>
            <span className="portal-eyebrow">YOUR BUSINESS, SUPPORTED</span>
            <h1>
              A clear view of
              <br />
              what comes next.
            </h1>
            <p>
              Your domains, websites, and ongoing work with StackEndBox. One
              place to stay informed and ask for help.
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
              key={url}
              href={`/client-portal/${url}`}
              onClick={() => setOpen(false)}
              aria-current={page === url ? "page" : undefined}
            >
              <Icon size={18} />
              {title}
            </Link>
          ))}
          {data?.account.role === "super_admin" && (
            <Link
              href="/client-portal/admin"
              aria-current={section === "admin" ? "page" : undefined}
            >
              <ShieldCheck size={18} />
              Administration
            </Link>
          )}
        </nav>
        <div className="portal-sidebar-foot">
          <p>Need a hand?</p>
          <Link href="/client-portal/requests">
            Talk to StackEndBox <ArrowUpRight size={14} />
          </Link>
          <button
            onClick={async () => {
              await api("auth/logout", {});
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
          <span>{data?.account.name || "Client workspace"}</span>
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
          <div className="portal-sandbox">
            Sandbox billing · Test payments do not purchase or renew real
            domains.
          </div>
          {busy ? (
            <p role="status">Loading your workspace…</p>
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
function PortalContent({
  section,
  path,
  data,
  reload,
}: {
  section: string;
  path: string[];
  data: Data;
  reload: () => Promise<void>;
}) {
  const [now] = useState(() => Date.now());
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
          <span className="portal-eyebrow">YOUR WORKSPACE</span>
          <h1>Good to see you, {data.account.name.split(" ")[0]}.</h1>
          <p>Stay on top of your websites, domains, and work in progress.</p>
        </div>
        <div className="portal-stats">
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
        </div>
        <div className="portal-section-title">
          <h2>Your domains</h2>
          <Link href="/client-portal/domains">
            View all <ArrowUpRight size={16} />
          </Link>
        </div>
        <DomainList domains={domains} />
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
              <Empty>No websites assigned yet.</Empty>
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
              <Empty>You’re all caught up. Updates will appear here.</Empty>
            )}
          </section>
        </div>
      </>
    );
  if (section === "domains" && path[1] === "buy")
    return <BuyDomain clientSelect={clientSelect} />;
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
        <DomainList domains={domains} />
        <Link className="portal-button" href="/client-portal/domains/buy">
          Find a domain
        </Link>
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
            No websites assigned yet. Contact StackEndBox to connect your
            project.
          </Empty>
        )}
      </>
    );
  if (section === "renewals")
    return (
      <>
        <Heading
          title="Renewals"
          description="Review a verified quote and decide whether to renew. Payments are one-time."
        />
        <DomainList domains={domains} />
        <section className="portal-panel">
          <h2>Renewal orders</h2>
          <OrderList
            orders={rows(data, "orders").filter((o) => o.kind === "renewal")}
            reload={reload}
          />
        </section>
      </>
    );
  if (section === "billing")
    return (
      <>
        <Heading
          title="Billing & Invoices"
          description="Track payments and fulfillment separately. All current payments are sandbox tests."
        />
        <OrderList orders={rows(data, "orders")} reload={reload} />
        <h2>Receipts</h2>
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
              <select name="category">
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
            <Field name="subject" title="Subject" />
            <label>
              Description
              <textarea name="description" required maxLength={5000} rows={5} />
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
              {data.account.role === "super_admin" && (
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
            onSubmit={(f) => api("auth/password", f)}
          >
            <Field
              name="password"
              title="New password, at least 12 characters"
              type="password"
            />
          </Form>
        </section>
        {data.account.role === "super_admin" && <Mfa factors={data.factors} />}
      </>
    );
  if (section === "admin")
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
function DomainList({ domains }: { domains: Row[] }) {
  const [search, setSearch] = useState("");
  return (
    <section className="portal-panel">
      <label className="portal-search">
        Search domains
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by domain name"
        />
      </label>
      {domains.length ? (
        <div className="portal-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Domain</th>
                <th>Status</th>
                <th>Expires</th>
                <th>Registrar auto-renew</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {domains
                .filter((d) => str(d.name).includes(search.toLowerCase()))
                .map((d) => (
                  <tr key={str(d.id)}>
                    <td>
                      <Globe2 size={16} /> {str(d.name)}
                      {d.protected === true && (
                        <small>Protected company asset</small>
                      )}
                    </td>
                    <td>
                      <Status value={d.lifecycle_status} />
                    </td>
                    <td>{date(d.expiration_date)}</td>
                    <td>
                      {d.auto_renew === true
                        ? "Enabled, review required"
                        : d.auto_renew === false
                          ? "Off"
                          : "Unverified"}
                    </td>
                    <td>
                      <Link href={`/client-portal/domains/${d.name}`}>
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
          No domains assigned yet. Your domains will appear here after
          StackEndBox assigns them.
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
}: {
  orders: Row[];
  reload: () => Promise<void>;
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
          {["awaiting_payment", "checkout_ready"].includes(str(o.status)) && (
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
function BuyDomain({ clientSelect }: { clientSelect: ReactNode }) {
  const [result, setResult] = useState<Row | null>(null),
    [quote, setQuote] = useState<Row | null>(null);
  return (
    <>
      <Heading
        title="Find your next domain"
        description="Eligible standard domains start at $45 for the first year. Availability and verified pricing are checked separately."
      />
      <section className="portal-panel">
        <Form
          button="Check availability"
          onSubmit={async (f) => {
            setQuote(null);
            const r = await api("availability", f);
            setResult(r);
            return { message: `${r.name}: ${r.result}` };
          }}
        >
          <Field
            name="domain"
            title="Domain name"
            placeholder="yourbusiness.com"
          />
        </Form>
      </section>
      {result && (
        <section className="portal-panel">
          <h2>{str(result.name)}</h2>
          <Status value={result.result} />
          {result.premium === true ? (
            <p>This domain requires a custom quote.</p>
          ) : (
            result.result === "available" && (
              <Form
                button="Request verified quote"
                onSubmit={async (f) => {
                  const q = await api("quotes", {
                    ...f,
                    domain: result.name,
                    kind: "registration",
                  });
                  setQuote(q);
                  return { message: "Quote ready for review." };
                }}
              >
                {clientSelect}
              </Form>
            )
          )}
          <Link href="/client-portal/requests">Ask StackEndBox for help</Link>
        </section>
      )}
      {quote && <QuoteCheckout quote={quote} />}
    </>
  );
}
function DomainDetail({ domain: d, data }: { domain: Row; data: Data }) {
  const [tab, setTab] = useState("Overview"),
    [dns, setDns] = useState<Row | null>(null),
    [quote, setQuote] = useState<Row | null>(null);
  const assignment = rows(data, "domain_assignments").find(
    (a) => a.domain_id === d.id,
  );
  return (
    <>
      <Heading
        title={str(d.name)}
        description={`Last synchronized ${date(d.last_synced_at)}. Provider: Spaceship.`}
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
            <p>Read-only view. Request changes through support.</p>
            <Action
              title="Load DNS records"
              run={async () => {
                setDns(await api(`domains/${d.name}/dns`));
              }}
            />
            {dns && <pre>{JSON.stringify(dns, null, 2)}</pre>}
          </>
        )}
        {tab === "Nameservers" && (
          <>
            <h2>Nameservers</h2>
            <pre>{JSON.stringify(d.nameservers, null, 2)}</pre>
          </>
        )}
        {tab === "Security" && (
          <>
            <h2>Provider-reported security</h2>
            <pre>{JSON.stringify(d.security, null, 2)}</pre>
            <p>Unsupported checks are not shown as verified.</p>
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
            {assignment && (
              <Action
                title="Prepare renewal quote"
                run={async () => {
                  setQuote(
                    await api("quotes", {
                      domain: d.name,
                      client_id: assignment.client_id,
                      kind: "renewal",
                    }),
                  );
                  return { message: "Quote prepared." };
                }}
              />
            )}
            {quote && <QuoteCheckout quote={quote} />}
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
      <h2>Administrator authenticator</h2>
      <p>Administrator actions require a verified authenticator session.</p>
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
      <DomainList domains={rows(data, "domains")} />
      <div className="portal-columns">
        <section className="portal-panel">
          <h2>Invite a client</h2>
          <Form
            button="Create client & send invitation"
            onSubmit={async (f) => {
              const r = await api("admin/clients", f);
              await reload();
              return r;
            }}
          >
            <Field name="name" title="Client name" />
            <Field name="business_name" title="Business name" />
            <Field name="email" title="Approved email" type="email" />
          </Form>
        </section>
        <section className="portal-panel">
          <h2>Assign a domain</h2>
          <Form
            button="Assign domain"
            onSubmit={async (f) => {
              const r = await api("admin/assign", f);
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
