import "server-only";
import { z } from "zod";
import { adminDb, audit, checkDb, env, portalOrigin } from "./server";
import {
  assertCustomerDomain,
  domainName,
  PortalError,
  renewalPrice,
  verifiedPrice,
  sandboxCheckoutEnabled,
} from "./rules";
import { domainSchema, spaceship } from "./spaceship";

async function saveVerifiedDomain(d: z.infer<typeof domainSchema>) {
  const name = domainName(d.name);
  const db = adminDb();
  const existing = await db.from("portal_domains").select("protected").eq("name", name).eq("provider", "spaceship").eq("provider_account", "primary").maybeSingle();
  checkDb(existing.error);
  const saved = await db.from("portal_domains").upsert({
    name, provider: "spaceship", provider_account: "primary",
    protected: name === "stackendbox.com" || existing.data?.protected === true,
    lifecycle_status: d.lifecycleStatus, registration_date: d.registrationDate || null,
    expiration_date: d.expirationDate || null, auto_renew: d.autoRenew,
    verification_status: d.verificationStatus || null, nameservers: d.nameservers || {},
    security: { eppStatuses: d.eppStatuses || [], privacy: d.privacyProtection || null, suspensions: d.suspensions || [] },
    last_synced_at: new Date().toISOString(), reconciliation_required: false,
  }, { onConflict: "provider,provider_account,name" }).select("*").single();
  checkDb(saved.error);
  return saved.data;
}

export async function importDomain(actor: string, input: string) {
  const name = domainName(input);
  const detail = await spaceship.detail(name);
  if (domainName(detail.name) !== name) throw new PortalError("registrar_domain_mismatch", 502);
  const saved = await saveVerifiedDomain(detail);
  await audit(actor, "domain_import_verified", saved.id, { name });
  return { domain: saved, message: "Domain verified with Spaceship and saved. Existing assignments are preserved." };
}

export async function syncDomains(actor: string) {
  const domains = await spaceship.inventory();
  const db = adminDb();
  for (const d of domains) {
    await saveVerifiedDomain(d);
  }
  const { data: stored, error } = await db
    .from("portal_domains")
    .select("id,name")
    .eq("provider_account", "primary");
  checkDb(error);
  const current = new Set(domains.map((d) => domainName(d.name)));
  const absent = (stored || [])
    .filter((d) => !current.has(d.name))
    .map((d) => d.id);
  if (absent.length)
    checkDb(
      (
        await db
          .from("portal_domains")
          .update({ reconciliation_required: true })
          .in("id", absent)
      ).error,
    );
  await audit(actor, "domain_inventory_synchronized", undefined, {
    count: domains.length,
    missing: absent.length,
  });
  return { count: domains.length, missing: absent.length };
}
export async function availability(input: string) {
  const name = domainName(input);
  assertCustomerDomain(name);
  const data = z
    .object({
      domains: z.array(
        z.object({
          domain: z.string(),
          result: z.string(),
          premiumPricing: z.array(z.unknown()).optional(),
        }),
      ),
    })
    .parse(await spaceship.availability(name));
  const match = data.domains.find((d) => domainName(d.domain) === name);
  if (!match) throw new PortalError("availability_unverified", 502);
  return {
    name,
    result: match.result,
    premium: !!match.premiumPricing?.length,
  };
}
export async function createQuote(
  clientId: string,
  input: string,
  kind: "registration" | "renewal",
) {
  const name = domainName(input);
  assertCustomerDomain(name);
  const db = adminDb();
  let domainId: string | null = null,
    expiration: string | null = null;
  if (kind === "renewal") {
    const { data: d, error } = await db
      .from("portal_domains")
      .select("*")
      .eq("name", name)
      .eq("provider_account", "primary")
      .single();
    checkDb(error);
    assertCustomerDomain(name, d.protected);
    const { data: a, error: ae } = await db
      .from("portal_domain_assignments")
      .select("*")
      .eq("domain_id", d.id)
      .eq("client_id", clientId)
      .maybeSingle();
    checkDb(ae);
    if (!a) throw new PortalError("access_denied", 403);
    const current = await spaceship.detail(name);
    if (
      current.autoRenew ||
      current.lifecycleStatus !== "registered" ||
      !current.expirationDate ||
      Date.parse(current.expirationDate) <= Date.now()
    )
      throw new PortalError("renewal_requires_administrator_review", 409);
    domainId = d.id;
    expiration = current.expirationDate;
  } else {
    const a = await availability(name);
    if (a.result !== "available" || a.premium)
      throw new PortalError("domain_not_eligible", 409);
  }
  const { data: price, error } = await db
    .from("portal_pricing")
    .select("*")
    .eq("domain", name)
    .eq("kind", kind)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  checkDb(error);
  if (!price) throw new PortalError("price_confirmation_required", 409);
  verifiedPrice(price);
  const { data: settings, error: se } = await db
    .from("portal_settings")
    .select("*")
    .single();
  checkDb(se);
  if (settings.registration_minor !== 4500 || settings.markup_basis_points !== 3000)
    throw new PortalError("pricing_policy_requires_review", 409);
  const suffix = name.split(".").slice(1).join(".");
  if (
    kind === "registration" &&
    (!settings.allowed_tlds.includes(suffix) ||
      price.supplier_minor + price.fees_minor > settings.max_supplier_minor)
  )
    throw new PortalError("domain_outside_package", 409);
  const retail =
    kind === "registration"
      ? settings.registration_minor
      : renewalPrice(
          price.supplier_minor,
          price.fees_minor,
          settings.markup_basis_points,
        );
  const { data: quote, error: qe } = await db
    .from("portal_quotes")
    .insert({
      client_id: clientId,
      domain: name,
      domain_id: domainId,
      kind,
      retail_minor: retail,
      currency: "usd",
      expiration_snapshot: expiration,
      valid_until: new Date(
        Math.min(Date.now() + 15 * 60 * 1000, Date.parse(price.valid_until)),
      ).toISOString(),
    })
    .select("*")
    .single();
  checkDb(qe);
  checkDb(
    (
      await db.from("portal_quote_evidence").insert({
        quote_id: quote.id,
        pricing_id: price.id,
        supplier_minor: price.supplier_minor,
        fees_minor: price.fees_minor,
        source: price.source,
        markup_basis_points: settings.markup_basis_points,
        verified_at: price.verified_at,
        contact_ids: price.contact_ids,
      })
    ).error,
  );
  return quote;
}
export async function validateQuote(quoteId: string) {
  const db = adminDb();
  const { data: q, error } = await db
    .from("portal_quotes")
    .select("*")
    .eq("id", quoteId)
    .single();
  checkDb(error);
  if (!q || Date.parse(q.valid_until) <= Date.now())
    throw new PortalError("quote_expired", 409);
  assertCustomerDomain(q.domain);
  const { data: e, error: ee } = await db
    .from("portal_quote_evidence")
    .select("*")
    .eq("quote_id", q.id)
    .single();
  checkDb(ee);
  const { data: p, error: pe } = await db
    .from("portal_pricing")
    .select("*")
    .eq("domain", q.domain)
    .eq("kind", q.kind)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  checkDb(pe);
  verifiedPrice(p);
  const { data: settings, error: se } = await db
    .from("portal_settings")
    .select("*")
    .single();
  checkDb(se);
  if (
    Math.abs(
      p.supplier_minor + p.fees_minor - e.supplier_minor - e.fees_minor,
    ) > settings.tolerance_minor
  )
    throw new PortalError("supplier_price_changed_request_new_quote", 409);
  if (q.kind === "registration") {
    const available = await availability(q.domain);
    if (
      available.result !== "available" ||
      available.premium ||
      !settings.allowed_tlds.includes(q.domain.split(".").slice(1).join(".")) ||
      p.supplier_minor + p.fees_minor > settings.max_supplier_minor
    )
      throw new PortalError("domain_not_eligible", 409);
  } else {
    const { data: a, error: ae } = await db
      .from("portal_domain_assignments")
      .select("domain_id,portal_domains(protected)")
      .eq("domain_id", q.domain_id)
      .eq("client_id", q.client_id)
      .maybeSingle();
    checkDb(ae);
    if (!a) throw new PortalError("access_denied", 403);
    const d = a.portal_domains as unknown as { protected: boolean };
    assertCustomerDomain(q.domain, d.protected);
    const current = await spaceship.detail(q.domain);
    if (
      current.autoRenew ||
      current.lifecycleStatus !== "registered" ||
      !current.expirationDate ||
      Date.parse(current.expirationDate) !==
        Date.parse(q.expiration_snapshot) ||
      Date.parse(current.expirationDate) <= Date.now()
    )
      throw new PortalError("renewal_requires_administrator_review", 409);
  }
  return q;
}
export async function notifyClient(
  clientId: string,
  subject: string,
  body: string,
  dedupe: string,
) {
  const db = adminDb();
  const { data: members, error } = await db
    .from("portal_memberships")
    .select("user_id")
    .eq("client_id", clientId);
  checkDb(error);
  if (!members?.length) return;
  const { data: accounts, error: ae } = await db
    .from("portal_accounts")
    .select("approved_email")
    .in(
      "user_id",
      members.map((m) => m.user_id),
    )
    .eq("active", true)
    .eq("role", "client");
  checkDb(ae);
  for (const a of accounts || [])
    checkDb(
      (
        await db.from("portal_email_outbox").upsert(
          {
            client_id: clientId,
            recipient: a.approved_email,
            subject,
            body,
            dedupe_key: `${dedupe}:${a.approved_email}`,
          },
          { onConflict: "dedupe_key", ignoreDuplicates: true },
        )
      ).error,
    );
}
export async function runJobs() {
  const db = adminDb();
  if (sandboxCheckoutEnabled()) checkDb((await db.rpc("portal_run_simulations")).error);
  const { data: assignments, error } = await db
    .from("portal_domain_assignments")
    .select("client_id,portal_domains(name,expiration_date)");
  checkDb(error);
  for (const a of assignments || []) {
    const d = a.portal_domains as unknown as {
      name: string;
      expiration_date: string;
    };
    if (!d?.expiration_date) continue;
    const days = Math.ceil(
      (Date.parse(d.expiration_date) - Date.now()) / 86400000,
    );
    const stage = [1, 7, 14, 30, 60].find((s) => days > 0 && days <= s);
    if (stage)
      await notifyClient(
        a.client_id,
        `${d.name} expires soon`,
        `${d.name} expires on ${d.expiration_date.slice(0, 10)}. Sign in to review your renewal quote: ${portalOrigin()}/client-portal/renewals. Unpaid domains will not be renewed by this portal. Expiration may interrupt your website and email.`,
        `renewal:${d.name}:${d.expiration_date}:${stage}`,
      );
  }
  let sent = 0;
  for (let i = 0; i < 10; i++) {
    const { data, error: ce } = await db.rpc("portal_claim_email");
    checkDb(ce);
    const mail = data?.[0];
    if (!mail) break;
    try {
      const r = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": env("BREVO_CLIENT_API_KEY"),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: {
            email: env("BREVO_CLIENT_SENDER_EMAIL"),
            name: process.env.BREVO_CLIENT_SENDER_NAME || "StackEndBox",
          },
          to: [{ email: mail.recipient }],
          replyTo: { email: env("BREVO_CLIENT_REPLY_TO") },
          subject: mail.subject,
          textContent: mail.body,
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) throw new PortalError(`brevo_${r.status}`, 502);
      const response = z
        .object({ messageId: z.string() })
        .parse(await r.json());
      checkDb(
        (
          await db
            .from("portal_email_outbox")
            .update({ status: "accepted", provider_id: response.messageId })
            .eq("id", mail.id)
        ).error,
      );
      sent++;
    } catch (e) {
      // Ambiguous sends are reviewed, not blindly retried into duplicate mail.
      checkDb(
        (
          await db
            .from("portal_email_outbox")
            .update({
              status: "review_required",
              last_error:
                e instanceof PortalError ? e.code : "ambiguous_email_delivery",
            })
            .eq("id", mail.id)
        ).error,
      );
    }
  }
  return { emailsAccepted: sent };
}
