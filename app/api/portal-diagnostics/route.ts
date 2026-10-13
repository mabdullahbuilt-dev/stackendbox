import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { WhopError } from "@whop/sdk";
import { adminDb, env } from "@/lib/portal/server";
import { spaceship,spaceshipTest } from "@/lib/portal/spaceship";
import { whop } from "@/lib/portal/whop";
import { PortalError, sandboxOnly } from "@/lib/portal/rules";
import {brevoEnv} from "@/lib/serverEnv";

// Preview-only, read-only verification. A fresh token is injected into just the
// diagnostic deployment, never into production or the client-side bundle.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function diagnosticAuthorized(req: Request) {
  const token = process.env.PORTAL_DIAGNOSTICS_TOKEN;
  const actual = Buffer.from(req.headers.get("authorization") || "");
  const expected = Buffer.from(`Bearer ${token || ""}`);
  return !(
    process.env.VERCEL_ENV !== "preview" ||
    !token ||
    actual.length !== expected.length ||
    !timingSafeEqual(actual, expected)
  );
}
export async function GET(req: Request) {
  if(!diagnosticAuthorized(req)) return new Response(null,{status:404});
  sandboxOnly();
  if(new URL(req.url).searchParams.get("check") === "email-events") {
    const db=adminDb();
    const publicRecord=await db.from("portal_audit").select("detail").eq("action","public_email_acceptance_result").eq("target_id","public-email-separation-2026-10-13").order("id",{ascending:false}).limit(1).maybeSingle();
    const portalRecord=await db.from("portal_email_outbox").select("provider_id").eq("id","cb845beb-66ed-402c-8d5a-000879514525").maybeSingle();
    if(publicRecord.error||portalRecord.error) return NextResponse.json({error:"audit_unavailable"},{status:503});
    const events=async(keyName:string,id?:string)=>{
      if(!id) return {error:"no_provider_reference"};
      const url=new URL("https://api.brevo.com/v3/smtp/statistics/events");
      url.searchParams.set("messageId",id);url.searchParams.set("limit","25");
      const result=await fetch(url,{headers:{"api-key":env(keyName)},signal:AbortSignal.timeout(10000)});
      const data=result.ok?await result.json():{};
      return {providerStatus:result.status,events:Array.isArray(data.events)?data.events.map((e:{event?:string;reason?:string;from?:string;email?:string;messageId?:string})=>({event:e.event,reason:e.reason,from:e.from,recipient:e.email,correlated:e.messageId===id})):[]};
    };
    const [publicWebsite,clientPortal]=await Promise.all([
      events("BREVO_API_KEY",publicRecord.data?.detail?.messageId),events("BREVO_CLIENT_API_KEY",portalRecord.data?.provider_id),
    ]);
    return NextResponse.json({publicWebsite,clientPortal,readOnly:true},{headers:{"Cache-Control":"no-store"}});
  }
  if(new URL(req.url).searchParams.get("check") === "email-identities") {
    const readIdentity = async (keyName: string, senderName: string) => {
      const headers = {"api-key":env(keyName)};
      const [account, senders] = await Promise.all([
        fetch("https://api.brevo.com/v3/account",{headers,signal:AbortSignal.timeout(10000)}),
        fetch("https://api.brevo.com/v3/senders",{headers,signal:AbortSignal.timeout(10000)}),
      ]);
      const accountData=account.ok?await account.json():{};
      const senderData=senders.ok?await senders.json():{};
      return {accountStatus:account.status,sendersStatus:senders.status,accountEmail:accountData.email??null,
        configuredSender:env(senderName),senderVerified:Array.isArray(senderData.senders)&&senderData.senders.some((s:{email?:string;active?:boolean})=>s.email===env(senderName)&&s.active===true)};
    };
    const [publicWebsite,clientPortal]=await Promise.all([
      readIdentity("BREVO_API_KEY","BREVO_SENDER_EMAIL"),
      readIdentity("BREVO_CLIENT_API_KEY","BREVO_CLIENT_SENDER_EMAIL"),
    ]);
    return NextResponse.json({publicWebsite,clientPortal,readOnly:true},{headers:{"Cache-Control":"no-store"}});
  }
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
      const publicConfiguration=brevoEnv();
      let publicWebsiteEmail: {configured:boolean;senderVerified?:boolean;providerStatus?:number;missingSettings?:string[];domainStatus?:number;domainVerified?:boolean;domainAuthenticated?:boolean}={configured:false};
      if(publicConfiguration.ok){
        const publicSenders=await fetch("https://api.brevo.com/v3/senders",{headers:{"api-key":publicConfiguration.env.BREVO_API_KEY},signal:AbortSignal.timeout(10000)});
        const publicData=publicSenders.ok?await publicSenders.json():{};
        publicWebsiteEmail={configured:true,providerStatus:publicSenders.status,senderVerified:Array.isArray(publicData.senders)&&publicData.senders.some((s:{email?:string;active?:boolean})=>s.email===publicConfiguration.env.BREVO_SENDER_EMAIL&&s.active===true)};
        const domain=publicConfiguration.env.BREVO_SENDER_EMAIL.split("@")[1];
        const domainResponse=await fetch(`https://api.brevo.com/v3/senders/domains/${encodeURIComponent(domain)}`,{headers:{"api-key":publicConfiguration.env.BREVO_API_KEY},signal:AbortSignal.timeout(10000)});
        const domainData=domainResponse.ok?await domainResponse.json():{};
        publicWebsiteEmail={...publicWebsiteEmail,domainStatus:domainResponse.status,domainVerified:domainData.verified===true,domainAuthenticated:domainData.authenticated===true};
      }else publicWebsiteEmail={configured:false,missingSettings:publicConfiguration.missing};
      return {
        publicWebsiteEmail,
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
