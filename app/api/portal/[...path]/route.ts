import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  adminDb,
  audit,
  checkDb,
  clientAccess,
  identity,
  originCheck,
  portalOrigin,
  rateLimit,
  sessionDb,
  superAdmin,
  turnstile,
} from "@/lib/portal/server";
import {
  assertCustomerDomain,
  domainName,
  PortalError,
  sandboxCheckoutEnabled,
  requireSandboxCheckout,
} from "@/lib/portal/rules";
import {
  availability,
  createQuote,
  notifyClient,
  syncDomains,
  importDomain,
  validateQuote,
  runJobs,
} from "@/lib/portal/services";
import { spaceship } from "@/lib/portal/spaceship";
import { searchDomains } from "@/lib/portal/search-service";
import { authorizedDomain, changeDomain, readDomainState } from "@/lib/portal/domain-operations";
import { sendAuthEmail } from "@/lib/portal/auth-email";
import { receiptHtml,serviceInvoiceHtml } from "@/lib/portal/receipt";
import { provisionClient } from "@/lib/portal/provisioning";
import { clientDirectory, operationalHealth } from "@/lib/portal/admin-data";
import { saveAcquisition, saveExternalPayment } from "@/lib/portal/agency";
import { assignWebsite, assignService } from "@/lib/portal/website-assignments";
import { adminTables, clientSections, clientTables, portalTables } from "@/lib/portal/data-scope";
import { checkPassword } from "@/lib/portal/password-check";
import { readRegistrant, verifyPortalAssignment } from "@/lib/portal/registrant";
import { registrarAcceptance } from "@/lib/portal/registrar-acceptance";
import {editClient,sendClientAccess} from "@/lib/portal/client-operations";
import {createServiceInvoice,transitionServiceInvoice} from "@/lib/portal/invoices";
import {boundedText} from "@/lib/portal/request-body";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };
const uuid = z.string().uuid();
const text = z.string().trim().min(1).max(5000);
const reply = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
async function handle(req: NextRequest, context: Context) {
  try {
    const { path } = await context.params,
      route = path.join("/");
    let body: Record<string, unknown> = {};
    if (req.method === "POST") {
      originCheck(req);
      const raw = await boundedText(req,24000);
      if (raw.length > 24000) throw new PortalError("request_too_large", 413);
      body = z.record(z.string(), z.unknown()).parse(JSON.parse(raw || "{}"));
    }
    if (
      req.method === "POST" &&
      ["auth/login", "auth/recover"].includes(route)
    ) {
      if (typeof body.token !== "string" || !body.token.trim())
        throw new PortalError("verification_required", 400);
      const input = z
        .object({
          email: z.email().max(254),
          password: z.string().max(128).optional(),
          token: z.string().min(1).max(2048),
        })
        .parse(body);
      const email = input.email.toLowerCase();
      await rateLimit(
        `auth-ip:${req.headers.get("x-forwarded-for") || "unknown"}`,
        30,
      );
      await rateLimit(`auth-email:${email}`, 8);
      await turnstile(input.token, req);
      const db = await sessionDb();
      if (route === "auth/recover") {
        const { data: a } = await adminDb()
          .from("portal_accounts")
          .select("user_id")
          .eq("approved_email", email)
          .eq("active", true)
          .maybeSingle();
        if (a) {
          try {
            const { data: link, error } = await adminDb().auth.admin.generateLink({ type: "recovery", email });
            if (error || !link.properties?.hashed_token) throw new PortalError("recovery_link_failed", 502);
            const messageId = await sendAuthEmail(email, link.properties.hashed_token, "recovery");
            await audit(null, "password_recovery_requested", a.user_id, { messageId });
          } catch {
            await audit(null, "password_recovery_send_failed", a.user_id);
          }
        }
        return reply({
          message:
            "If this address is approved, you will receive a password recovery email.",
        });
      }
      const { error } = await db.auth.signInWithPassword({
        email,
        password: input.password || "",
      });
      if (error) throw new PortalError("invalid_credentials", 401);
      let passwordChangeRequired = false;
      try {
        const auth = await identity();
        passwordChangeRequired = auth.user.app_metadata?.portal_password_change_required === true;
      } catch {
        await db.auth.signOut();
        throw new PortalError("invalid_credentials", 401);
      }
      return reply({ redirect: passwordChangeRequired ? "/client-portal/reset-password" : "/client-portal/dashboard" });
    }
    if (req.method === "POST" && route === "auth/logout") {
      const db = await sessionDb();
      checkDb((await db.auth.signOut({ scope: "global" })).error);
      return reply({ redirect: "/client-portal/login" });
    }
    if (req.method === "POST" && route === "auth/session") {
      await rateLimit(
        `session:${req.headers.get("x-forwarded-for") || "unknown"}`,
        20,
      );
      const input = z
        .object({
          access_token: z.string().min(20).max(16000),
          refresh_token: z.string().min(10).max(2000),
        })
        .parse(body);
      const db = await sessionDb();
      const { error } = await db.auth.setSession(input);
      if (error) throw new PortalError("invalid_invitation", 401);
      try {
        await identity();
      } catch {
        await db.auth.signOut();
        throw new PortalError("account_not_authorized", 403);
      }
      return reply({ redirect: "/client-portal/reset-password" });
    }
    const auth = await identity();
    if (auth.user.app_metadata?.portal_password_change_required === true && route !== "auth/password") {
      if (route === "data" && req.method === "GET" && req.nextUrl.searchParams.get("section") === "reset-password")
        return reply({ account: auth.account, factors: [], clients: [], password_change_required: true });
      throw new PortalError("password_change_required", 403);
    }
    if (path[0] === "invoices" && path[2] === "download" && path.length === 3 && req.method === "GET") {
      const id = uuid.parse(path[1]);
      const { data: invoice, error } = await auth.db.from("portal_invoices").select("*").eq("id", id).maybeSingle();
      checkDb(error);
      if (!invoice) throw new PortalError("receipt_not_found", 404);
      await clientAccess(invoice.client_id);
      if (invoice.order_id === null && invoice.status === "draft" && auth.account.role !== "super_admin") throw new PortalError("invoice_not_issued",403);
      return new Response(invoice.order_id === null ? serviceInvoiceHtml(invoice) : receiptHtml(invoice), { headers: {
        "Content-Type": "text/html; charset=utf-8", "Content-Disposition": `attachment; filename="stackendbox-${invoice.order_id === null ? "invoice" : "sandbox-receipt"}-${id}.html"`,
        "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox",
      } });
    }
    if (req.method === "POST")
      await rateLimit(`actions:${auth.user.id}`, 60, 60);
    if (req.method === "POST" && route === "auth/password") {
      const input = z
        .object({ password: z.string().max(128) })
        .parse(body);
      await checkPassword(input.password);
      const { error } = await auth.db.auth.updateUser({
        password: input.password,
      });
      if (error) throw new PortalError("password_change_failed", 400);
      if (auth.user.app_metadata?.portal_password_change_required === true) {
        const cleared = await adminDb().auth.admin.updateUserById(auth.user.id, {
          app_metadata: { ...auth.user.app_metadata, portal_password_change_required: false },
        });
        if (cleared.error) throw new PortalError("password_access_update_failed", 503);
      }
      await auth.db.auth.signOut({ scope: "others" });
      await audit(auth.user.id, "password_changed");
      return reply({
        message: "Password changed. Other sessions have been signed out.",
      });
    }
    if (route === "auth/mfa" && req.method === "POST") {
      if (body.action === "enroll") {
        const { data, error } = await auth.db.auth.mfa.enroll({
          factorType: "totp",
          friendlyName: "StackEndBox portal",
        });
        if (error) throw new PortalError("mfa_enrollment_failed");
        return reply(data);
      }
      const input = z
        .object({ factorId: uuid, code: z.string().regex(/^\d{6}$/) })
        .parse(body);
      await rateLimit(`mfa:${auth.user.id}`, 5, 300);
      const { error } = await auth.db.auth.mfa.challengeAndVerify({
        factorId: input.factorId,
        code: input.code,
      });
      if (error) throw new PortalError("mfa_verification_failed");
      return reply({ message: "Authenticator verified." });
    }
    if (["data", "admin/workspace"].includes(route) && req.method === "GET") {
      const adminMode = route === "admin/workspace";
      if (adminMode) await superAdmin(auth);
      const section = z.enum(clientSections).parse(req.nextUrl.searchParams.get("section") || "dashboard");
      const selected = new Set(adminMode ? adminTables(section) : clientTables(section,req.nextUrl.searchParams.has("domain")));
      const [{ data: memberships, error: membershipError }, { data: factors, error: factorsError }] = await Promise.all([
        adminMode ? { data: [], error: null } : auth.db.from("portal_memberships").select("client_id").eq("user_id", auth.user.id),
        adminMode || section === "settings" ? auth.db.auth.mfa.listFactors() : {data:{totp:[]},error:null},
      ]);
      checkDb(membershipError);
      checkDb(factorsError);
      const clientIds = (memberships || []).map((m) => m.client_id);
      const { data: assigned, error: assignmentError } = adminMode || !clientIds.length || !selected.has("domains") ? { data: [], error: null } : await auth.db.from("portal_domain_assignments").select("domain_id").in("client_id", clientIds);
      checkDb(assignmentError);
      const tables = portalTables;
      const results = await Promise.all(
        tables.map((t) => {
          if (!adminMode && t === "memberships") return {data:memberships||[],error:null};
          if (!selected.has(t)) return {data:[],error:null};
          if (!adminMode && !clientIds.length) return { data: [], error: null };
          let query = auth.db.from(`portal_${t}`).select(t === "external_payments" ? "id,client_id,acquisition_id,source,transaction_reference,amount_minor,currency,paid_at,reconciliation_status,created_at" : "*").limit(500);
          if (!adminMode) {
            if (t === "domains") query = query.in("id", (assigned || []).map((a) => a.domain_id));
            else if (t === "clients") query = query.in("id", clientIds);
            else if (t === "memberships") query = query.eq("user_id", auth.user.id);
            else query = query.in("client_id", clientIds);
          }
          return query;
        }),
      );
      results.forEach((r) => checkDb(r.error));
      return reply({
        account: auth.account,
        sandbox_checkout_enabled: sandboxCheckoutEnabled(),
        factors:
          factors?.totp.map((f) => ({ id: f.id, status: f.status })) || [],
        ...Object.fromEntries(tables.map((t, i) => [t, results[i].data])),
      });
    }
    if (path[0] === "domains" && path[1] && path[2] === "manage") {
      const name = domainName(path[1]);
      await authorizedDomain(name, auth);
      if (req.method === "GET") return reply(await readDomainState(name));
      if (req.method === "POST") return reply(await changeDomain(name, body, auth));
    }
    if (path[0] === "domains" && path[1] && req.method === "GET") {
      const name = domainName(path[1]);
      const { data: d, error } = await auth.db
        .from("portal_domains")
        .select("*")
        .eq("name", name)
        .maybeSingle();
      checkDb(error);
      if (!d) throw new PortalError("domain_not_found", 404);
      if (path[2] === "dns") return reply(await spaceship.dns(name));
      return reply(d);
    }
    if (route === "availability" && req.method === "POST") {
      await superAdmin(auth);
      return reply(await availability(text.parse(body.domain)));
    }
    if (route === "domain-search" && req.method === "POST") {
      await superAdmin(auth);
      await rateLimit(`domain-search:${auth.user.id}`, 10, 60);
      return reply(await searchDomains(text.parse(body.query)));
    }
    if (route === "quotes" && req.method === "POST") {
      const input = z
        .object({
          client_id: uuid,
          domain: text,
          kind: z.enum(["registration", "renewal"]),
        })
        .parse(body);
      await clientAccess(input.client_id);
      if (input.kind === "registration") await superAdmin(auth);
      return reply(
        await createQuote(input.client_id, input.domain, input.kind),
      );
    }
    if (route === "orders" && req.method === "POST") {
      requireSandboxCheckout();
      const input = z
        .object({ quote_id: uuid, accept_terms: z.literal(true) })
        .parse(body);
      const { data: q, error } = await auth.db
        .from("portal_quotes")
        .select("*")
        .eq("id", input.quote_id)
        .single();
      checkDb(error);
      if (!q || Date.parse(q.valid_until) <= Date.now())
        throw new PortalError("quote_expired", 409);
      if (q.kind === "registration") await superAdmin(auth);
      await clientAccess(q.client_id);
      await validateQuote(q.id);
      assertCustomerDomain(q.domain);
      const { data: e, error: ee } = await adminDb()
        .from("portal_quote_evidence")
        .select("quote_id")
        .eq("quote_id", q.id)
        .maybeSingle();
      checkDb(ee);
      if (!e) throw new PortalError("quote_evidence_missing", 409);
      const { data: o, error: oe } = await adminDb()
        .from("portal_orders")
        .insert({
          client_id: q.client_id,
          quote_id: q.id,
          domain: q.domain,
          kind: q.kind,
          amount_minor: q.retail_minor,
          currency: q.currency,
          accepted_terms_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      checkDb(oe);
      await audit(auth.user.id, "order_created", o.id);
      return reply(o);
    }
    if (
      path[0] === "orders" &&
      path[2] === "checkout" &&
      req.method === "POST"
    ) {
      requireSandboxCheckout();
      const { data: o, error } = await auth.db
        .from("portal_orders")
        .select("*")
        .eq("id", uuid.parse(path[1]))
        .single();
      checkDb(error);
      if (!o) throw new PortalError("order_not_found", 404);
      if (o.kind === "registration") await superAdmin(auth);
      await clientAccess(o.client_id);
      await validateQuote(o.quote_id);
      if (o.checkout_url && o.status === "checkout_ready")
        return reply({ url: o.checkout_url });
      const { data: q } = await auth.db
        .from("portal_quotes")
        .select("valid_until")
        .eq("id", o.quote_id)
        .single();
      if (!q || Date.parse(q.valid_until) <= Date.now())
        throw new PortalError("quote_expired", 409);
      return reply(await (await import("@/lib/portal/whop")).checkout(o));
    }
    if (
      path[0] === "orders" &&
      path[2] === "decline" &&
      req.method === "POST"
    ) {
      const { data: o, error } = await auth.db
        .from("portal_orders")
        .select("*")
        .eq("id", uuid.parse(path[1]))
        .single();
      checkDb(error);
      if (!o || o.kind !== "renewal")
        throw new PortalError("order_not_found", 404);
      await clientAccess(o.client_id);
      if (o.status !== "awaiting_payment")
        throw new PortalError("checkout_exists_contact_support", 409);
      checkDb(
        (
          await adminDb()
            .from("portal_orders")
            .update({ status: "declined" })
            .eq("id", o.id)
            .eq("status", "awaiting_payment")
        ).error,
      );
      await audit(auth.user.id, "renewal_declined", o.id);
      return reply({
        message: "Renewal declined. No registrar request was made.",
      });
    }
    if (route === "requests" && req.method === "POST") {
      const input = z
        .object({
          client_id: uuid,
          subject: text.max(160),
          description: text,
          category: z.enum([
            "Website update",
            "Bug fix",
            "Domain / DNS",
            "Billing",
            "Hosting",
            "General support",
          ]),
        })
        .parse(body);
      await clientAccess(input.client_id);
      const { data, error } = await adminDb()
        .from("portal_requests")
        .insert({ ...input, created_by: auth.user.id })
        .select("*")
        .single();
      checkDb(error);
      await audit(auth.user.id, "support_request_created", data.id);
      return reply(data);
    }
    if (
      path[0] === "requests" &&
      path[2] === "messages" &&
      req.method === "POST"
    ) {
      const { data: r, error } = await auth.db
        .from("portal_requests")
        .select("*")
        .eq("id", uuid.parse(path[1]))
        .single();
      checkDb(error);
      if (!r) throw new PortalError("request_not_found", 404);
      await clientAccess(r.client_id);
      checkDb(
        (
          await adminDb()
            .from("portal_messages")
            .insert({
              request_id: r.id,
              client_id: r.client_id,
              author_id: auth.user.id,
              body: text.parse(body.body),
            })
        ).error,
      );
      checkDb(
        (
          await adminDb()
            .from("portal_requests")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", r.id)
        ).error,
      );
      if (auth.account.role !== "client")
        await notifyClient(
          r.client_id,
          `Support update: ${r.subject}`,
          `A member of StackEndBox replied to your request. Read the reply securely at ${portalOrigin()}/client-portal/requests.`,
          `reply:${r.id}:${crypto.randomUUID()}`,
        );
      return reply({ message: "Reply saved." });
    }
    if (path[0] === "documents" && req.method === "GET") {
      const { data: d, error } = await auth.db
        .from("portal_documents")
        .select("*")
        .eq("id", uuid.parse(path[1]))
        .single();
      checkDb(error);
      if (!d) throw new PortalError("document_not_found", 404);
      const { data, error: se } = await adminDb()
        .storage.from("portal-documents")
        .createSignedUrl(d.storage_path, 60, { download: d.name });
      checkDb(se);
      return reply({ url: data?.signedUrl });
    }
    if (path[0] === "admin") {
      const admin = await superAdmin(auth),
        db = adminDb();
      if (route === "admin/clients" && req.method === "GET")
        return reply(await clientDirectory(req.nextUrl.searchParams.has("after") ? uuid.parse(req.nextUrl.searchParams.get("after")) : undefined));
      if (route === "admin/health" && req.method === "GET") return reply(await operationalHealth());
      if (route === "admin/client-update" && req.method === "POST") return reply(await editClient(admin.user.id,body));
      if (route === "admin/invoices" && req.method === "POST") return reply(await createServiceInvoice(admin.user.id,body));
      if (route === "admin/invoice-status" && req.method === "POST") return reply(await transitionServiceInvoice(admin.user.id,body));
      if (path[1] === "invoices" && path[2] && path[3] === "checkout" && path.length === 4 && req.method === "POST") {
        requireSandboxCheckout();
        return reply(await (await import("@/lib/portal/whop")).checkoutServiceInvoice(uuid.parse(path[2])));
      }
      if (route === "admin/client-access-email" && req.method === "POST") return reply(await sendClientAccess(admin.user.id,body));
      if (route === "admin/registrar-acceptance" && req.method === "POST") {
        const input=z.object({domain:text,authorized_readonly:z.literal(true)}).strict().parse(body);
        return reply(await registrarAcceptance(input.domain));
      }
      if (route === "admin/acquisitions" && req.method === "GET") {
        const result = await db.from("portal_acquisition_requests").select("*,portal_external_payments(*)").order("created_at",{ascending:false}).limit(100);
        checkDb(result.error);
        return reply({requests:result.data});
      }
      if (route === "admin/acquisitions" && req.method === "POST") return reply(await saveAcquisition(admin.user.id,body));
      if (route === "admin/external-payments" && req.method === "POST") return reply(await saveExternalPayment(admin.user.id,body));
      if (path[1] === "domains" && path[2] && path[3] === "manage" && path.length === 4 && req.method === "GET")
        return reply(await readDomainState(domainName(path[2])));
      if (path[1] === "domains" && path[2] && path[3] === "registrant" && path.length === 4 && req.method === "GET")
        return reply(await readRegistrant(domainName(path[2])));
      if (route === "admin/data" && req.method === "GET") {
        const names = [
          "accounts",
          "pricing",
          "settings",
          "ledger",
          "events",
          "jobs",
          "email_outbox",
          "audit",
        ];
        const results = await Promise.all(
          names.map((n) => db.from(`portal_${n}`).select("*").limit(200)),
        );
        results.forEach((r) => checkDb(r.error));
        return reply(
          Object.fromEntries(names.map((n, i) => [n, results[i].data])),
        );
      }
      if (route === "admin/sync" && req.method === "POST")
        return reply(await syncDomains(admin.user.id));
      if (route === "admin/import-domain" && req.method === "POST")
        return reply(await importDomain(admin.user.id, text.parse(body.domain)));
      if (route === "admin/domain-search" && req.method === "POST") {
        await rateLimit(`domain-search:${admin.user.id}`, 10, 60);
        return reply(await searchDomains(text.parse(body.query)));
      }
      if (route === "admin/quotes" && req.method === "POST") {
        const input = z.object({ client_id: uuid, domain: text, kind: z.enum(["registration", "renewal"]) }).parse(body);
        return reply(await createQuote(input.client_id, input.domain, input.kind));
      }
      if (route === "admin/jobs" && req.method === "POST") {
        const result = await runJobs();
        await audit(admin.user.id, "queued_jobs_processed");
        return reply({
          message: `Queued work processed. ${result.emailsAccepted} emails accepted by Brevo.`,
        });
      }
      if (route === "admin/clients" && req.method === "POST") {
        return reply(await provisionClient(admin.user.id,body));
      }
      if (route === "admin/account-status" && req.method === "POST") {
        const input = z
          .object({ user_id: uuid, active: z.boolean() })
          .parse(body);
        if (input.user_id === admin.user.id)
          throw new PortalError("cannot_disable_current_admin");
        checkDb(
          (
            await db
              .from("portal_accounts")
              .update({ active: input.active })
              .eq("user_id", input.user_id)
          ).error,
        );
        await audit(admin.user.id, "account_access_changed", input.user_id, {
          active: input.active,
        });
        return reply({ message: "Account access updated." });
      }
      if (route === "admin/assign" && req.method === "POST") {
        const input = z
          .object({
            domain_id: uuid,
            client_id: uuid,
            legal_holder: text.max(160).optional(),
            holder_arrangement: z.enum(["client_owned", "licensed"]),
            rights_confirmed: z.literal(true),
          })
          .parse(body);
        const { data: d, error } = await db
          .from("portal_domains")
          .select("*")
          .eq("id", input.domain_id)
          .single();
        checkDb(error);
        assertCustomerDomain(d.name, d.protected);
        const holderEvidence = await verifyPortalAssignment(d.name);
        const verified = await importDomain(admin.user.id, d.name);
        if (verified.domain.lifecycle_status !== "registered" || !verified.domain.expiration_date)
          throw new PortalError("domain_registration_unverified", 409);
        checkDb(
          (await db.rpc("portal_assign_verified_domain", { p_domain: input.domain_id, p_client: input.client_id, p_holder: holderEvidence.holder, p_arrangement: input.holder_arrangement, p_actor: admin.user.id })).error,
        );
        await audit(admin.user.id, "assignment_registrant_verified", input.domain_id, {
          contact_id: holderEvidence.contact_id,
          verification_status: holderEvidence.verification_status,
          checked_at: holderEvidence.checked_at,
          registrar_custody_unchanged: true,
          ownership_transfer_performed: false,
        });
        return reply({
          message: "Management access assigned. The official holder was recorded separately. No ownership transfer or registrar change was performed.",
        });
      }
      if (route === "admin/websites" && req.method === "POST") {
        return reply(await assignWebsite(admin.user.id, body));
      }
      if (route === "admin/services" && req.method === "POST") {
        return reply(await assignService(admin.user.id, body));
      }
      if (route === "admin/pricing" && req.method === "POST") {
        const input = z
          .object({
            domain: text,
            kind: z.enum(["registration", "renewal"]),
            supplier_minor: z.number().int().positive().max(1000000),
            fees_minor: z.number().int().nonnegative().max(100000),
            source: text.max(1000),
            valid_until: z.iso.datetime(),
            premium: z.boolean(),
            requirements_verified: z.boolean(),
          })
          .parse(body);
        assertCustomerDomain(input.domain);
        if (
          Date.parse(input.valid_until) <= Date.now() ||
          Date.parse(input.valid_until) > Date.now() + 7 * 86400000
        )
          throw new PortalError("quote_validity_maximum_seven_days");
        checkDb(
          (
            await db.from("portal_pricing").insert({
              ...input,
              domain: domainName(input.domain),
              verified_at: new Date().toISOString(),
              verified_by: admin.user.id,
            })
          ).error,
        );
        await audit(
          admin.user.id,
          "supplier_price_verified",
          domainName(input.domain),
        );
        return reply({ message: "Verified pricing evidence saved." });
      }
      if (route === "admin/settings" && req.method === "POST") {
        const input = z
          .object({
            allowed_tlds: z.array(z.string().regex(/^[a-z.]{2,30}$/)).max(50),
            max_supplier_minor: z.number().int().nonnegative().max(1000000),
            tolerance_minor: z.number().int().nonnegative(),
            registration_minor: z.literal(4500),
            markup_basis_points: z.literal(3000),
          })
          .parse(body);
        checkDb(
          (await db.from("portal_settings").update(input).eq("id", true)).error,
        );
        await audit(admin.user.id, "pricing_policy_updated");
        return reply({
          message: "Pricing policy updated. Existing orders are unchanged.",
        });
      }
      if (route === "admin/request-status" && req.method === "POST") {
        const input = z
          .object({
            id: uuid,
            status: z.enum([
              "submitted",
              "under_review",
              "quoted",
              "approved",
              "in_progress",
              "completed",
              "closed",
            ]),
          })
          .parse(body);
        const { data: r, error } = await db
          .from("portal_requests")
          .update({
            status: input.status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", input.id)
          .select("*")
          .single();
        checkDb(error);
        await notifyClient(
          r.client_id,
          `Request updated: ${r.subject}`,
          `Your request is now ${r.status}. View it at ${portalOrigin()}/client-portal/requests.`,
          `status:${r.id}:${r.status}`,
        );
        await audit(admin.user.id, "request_status_changed", r.id);
        return reply({ message: "Request updated." });
      }
    }
    throw new PortalError("not_found", 404);
  } catch (e) {
    if (e instanceof PortalError) return reply({ error: e.code }, e.status);
    if (e instanceof z.ZodError || e instanceof SyntaxError)
      return reply({ error: "invalid_input" }, 422);
    return reply({ error: "service_temporarily_unavailable" }, 503);
  }
}
export const GET = handle;
export const POST = handle;
