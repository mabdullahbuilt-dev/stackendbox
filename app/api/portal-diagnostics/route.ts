import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { WhopError } from "@whop/sdk";
import { adminDb, env } from "@/lib/portal/server";
import { spaceship,spaceshipTest } from "@/lib/portal/spaceship";
import { whop } from "@/lib/portal/whop";
import { PortalError, sandboxOnly } from "@/lib/portal/rules";

// Preview-only, read-only verification. A fresh token is injected into just the
// diagnostic deployment, never into production or the client-side bundle.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const token = process.env.PORTAL_DIAGNOSTICS_TOKEN;
  const actual = Buffer.from(req.headers.get("authorization") || "");
  const expected = Buffer.from(`Bearer ${token || ""}`);
  if (
    process.env.VERCEL_ENV !== "preview" ||
    !token ||
    actual.length !== expected.length ||
    !timingSafeEqual(actual, expected)
  )
    return new Response(null, { status: 404 });
  sandboxOnly();
  if(new URL(req.url).searchParams.get("check") === "personal-connection") {
    try {
      const connection=await spaceshipTest.connection();
      return NextResponse.json({personalRegistrar:{...connection,domainAcceptance:"Pending exact domain authorization"},read_only:true,dedicated_credentials_unchanged:true},{headers:{"Cache-Control":"no-store"}});
    } catch {
      return NextResponse.json({personalRegistrar:{connection:"Failed",domainAcceptance:"Not performed"},read_only:true,dedicated_credentials_unchanged:true},{headers:{"Cache-Control":"no-store"}});
    }
  }
  async function check(run: () => Promise<unknown>) {
    const start = performance.now();
    try {
      const result = await run();
      return { ok: true, result, elapsedMs: Math.round(performance.now() - start) };
    } catch (e) {
      return {
        ok: false,
        code:
          e instanceof PortalError
            ? e.code
            : e instanceof WhopError
              ? `whop_${e.statusCode || "transport"}`
              : "provider_check_failed",
      };
    }
  }
  const [database, registrar, payments, email] = await Promise.all([
    check(async () => {
      const db = adminDb();
      const { count, error } = await db
        .from("portal_accounts")
        .select("user_id", { count: "exact", head: true });
      if (error) return { ready: false, databaseCode: error.code };
      return { ready: true, approvedAccounts: count };
    }),
    check(async () => {
      const domains = await spaceship.inventory();
      const availability = await spaceship.availabilityBatch(["example.com", "example.net"]);
      const headers = {"X-API-Key":env("SPACESHIP_API_KEY"),"X-API-Secret":env("SPACESHIP_API_SECRET")};
      // Bounded read-only probes distinguish an empty provider inventory from
      // application filtering or a pagination mismatch. Never return keys.
      const probes = await Promise.all(["/domains?take=1&skip=0","/domains?take=100&skip=0"].map(async path => {
        const response = await fetch(`https://spaceship.dev/api/v1${path}`,{headers,cache:"no-store",signal:AbortSignal.timeout(15000)});
        const body = await response.json().catch(()=>null);
        return {path,status:response.status,total:typeof body?.total === "number"?body.total:undefined,items:Array.isArray(body?.items)?body.items.length:undefined,name:typeof body?.name === "string"?body.name:undefined,lifecycleStatus:body?.lifecycleStatus};
      }));
      return { domainsRead: domains.length, emptyInventoryValid: true, accountPurpose: "dedicated_client_domains", availability, probes };
    }),
    check(async () => {
      const payments = await whop().payments.list({
        account_id: env("WHOP_SANDBOX_COMPANY_ID"),
        first: 1,
      });
      return {
        paymentReadAccess: true,
        recordsChecked: payments.data.length,
        sandbox: true,
      };
    }),
    check(async () => {
      const result = await fetch("https://api.brevo.com/v3/senders", {
        headers: { "api-key": env("BREVO_CLIENT_API_KEY") },
        signal: AbortSignal.timeout(10000),
      });
      if (!result.ok) throw new PortalError(`brevo_${result.status}`);
      const data = await result.json();
      return {
        senderVerified:
          Array.isArray(data.senders) &&
          data.senders.some(
            (s: { email?: string; active?: boolean }) =>
              s.email === env("BREVO_CLIENT_SENDER_EMAIL") && s.active === true,
          ),
        mailSent: false,
      };
    }),
  ]);
  return NextResponse.json(
    { database, registrar, payments, email, liveMutationsEnabled: false },
    { headers: { "Cache-Control": "no-store" } },
  );
}
