import {timingSafeEqual} from "node:crypto";
import {adminDb} from "@/lib/portal/server";
export const runtime="nodejs";
export async function GET(req:Request){
  const token=process.env.PORTAL_RELEASE_CHECK_TOKEN,actual=Buffer.from(req.headers.get("authorization")||""),expected=Buffer.from(`Bearer ${token||""}`);
  if(process.env.VERCEL_ENV!=="production"||!token||actual.length!==expected.length||!timingSafeEqual(actual,expected))return new Response(null,{status:404});
  const required=["NEXT_PUBLIC_SUPABASE_URL","NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY","SUPABASE_SECRET_KEY","STACKENDBOX_BRIDGE_SECRET","SPACESHIP_API_KEY","SPACESHIP_API_SECRET","BREVO_API_KEY","BREVO_SENDER_EMAIL","BREVO_SENDER_NAME","BRIEF_TO_EMAIL","BREVO_CLIENT_API_KEY","BREVO_CLIENT_SENDER_EMAIL","BREVO_CLIENT_SENDER_NAME","BREVO_CLIENT_REPLY_TO","WHOP_SANDBOX_API_KEY","WHOP_SANDBOX_WEBHOOK_SECRET","TURNSTILE_SECRET_KEY"];
  const present=Object.fromEntries(required.map(name=>[name,!!process.env[name]?.trim()&&!/placeholder|redacted|sensitive|^\*+$/i.test(process.env[name]!)]));
  const safe={sandboxMode:process.env.WHOP_MODE==="sandbox",checkoutDisabled:process.env.PORTAL_SANDBOX_CHECKOUT_ENABLED!=="true",purchasesDisabled:process.env.DOMAIN_LIVE_PURCHASES_ENABLED!=="true",renewalsDisabled:process.env.DOMAIN_LIVE_RENEWALS_ENABLED!=="true",registrarWritesDisabled:process.env.DOMAIN_LIVE_MUTATIONS_ENABLED!=="true",mutationAllowlistEmpty:!process.env.DOMAIN_MUTATION_ALLOWLIST,diagnosticsDisabled:!process.env.PORTAL_DIAGNOSTICS_TOKEN};
  const releases=await adminDb().from("portal_schema_releases").select("version").order("version",{ascending:false}).limit(1);
  return Response.json({origin:process.env.PORTAL_APP_URL,requiredSecretBindings:present,safeguards:safe,databaseAccessible:!releases.error,latestMigration:releases.data?.[0]?.version||null,technicalChecksPassed:!releases.error&&Object.values(present).every(Boolean)&&Object.values(safe).every(Boolean),providerKeysExported:false},{headers:{"Cache-Control":"private, no-store"}});
}
