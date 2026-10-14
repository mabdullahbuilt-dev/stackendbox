import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { PortalError } from "./rules";
import { observeLatency } from "./latency";
import type {User} from "@supabase/supabase-js";
import {z} from "zod";

export function env(name: string) {
  const value = process.env[name];
  if (!value) throw new PortalError(`configuration_required:${name}`, 503);
  return value;
}
export function adminDb() {
  return createClient(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("SUPABASE_SECRET_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export async function sessionDb() {
  const jar = await cookies();
  return createServerClient(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (items) => {
          try {
            items.forEach(({ name, value, options }) =>
              jar.set(name, value, {
                ...options,
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                path: "/",
              }),
            );
          } catch {
            /* Server component cannot update cookies. API requests refresh sessions. */
          }
        },
      },
    },
  );
}
export type Account = {
  user_id: string;
  approved_email: string;
  name: string;
  role: "super_admin" | "staff" | "client";
  active: boolean;
};
export async function identity(verified?:{db:Awaited<ReturnType<typeof sessionDb>>;user:User},includeMemberships=false) {
  const db = verified?.db || await sessionDb();
  // Only server-held responses from Supabase password/session validation may
  // supply this identity. Normal requests still perform getUser verification.
  const {
    data: { user },
    error,
  } = verified ? {data:{user:verified.user},error:null} : await observeLatency("auth_user", () => db.auth.getUser());
  if (error || !user) throw new PortalError("sign_in_required", 401);
  const { data: account, error: accountError } = await observeLatency("account", () => db
    .from("portal_accounts")
    .select(includeMemberships ? "*,portal_memberships(client_id)" : "*")
    .eq("user_id", user.id)
    .returns<(Account & {portal_memberships?:{client_id:string}[]})[]>()
    .maybeSingle());
  if (accountError) throw new PortalError("portal_database_unavailable", 503);
  if (
    !account ||
    !account.active ||
    account.approved_email !== user.email?.toLowerCase()
  )
    throw new PortalError("account_not_authorized", 403);
  const memberships=includeMemberships?z.array(z.object({client_id:z.uuid()})).parse(account.portal_memberships):undefined;
  const {portal_memberships:internalMemberships,...accountFields}=account;
  void internalMemberships;
  return { db, user, account: accountFields as Account, memberships };
}
export async function superAdmin(existing?: Awaited<ReturnType<typeof identity>>, requireFreshMfa=false) {
  const auth = existing || await identity();
  if (auth.account.role !== "super_admin")
    throw new PortalError("administrator_required", 403);
  const { data, error } = await auth.db.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || data?.currentLevel !== "aal2")
    throw new PortalError("administrator_mfa_required", 403);
  if(requireFreshMfa){
    const now=Date.now()/1000;
    const fresh=data.currentAuthenticationMethods?.some(method=>typeof method!=="string"&&["totp","mfa/totp"].includes(method.method)&&Number.isFinite(method.timestamp)&&method.timestamp<=now+30&&now-method.timestamp<=600);
    if(!fresh)throw new PortalError("administrator_fresh_mfa_required",403);
  }
  return auth;
}
export async function clientAccess(id: string, existing?: Awaited<ReturnType<typeof identity>>) {
  // Reuse only the identity already verified by this request's handler. The
  // tenant RPC still runs for every target, and no identity is cached globally.
  const auth = existing || await identity();
  const { data, error } = await auth.db.rpc("portal_access", { target: id });
  if (error || !data) throw new PortalError("access_denied", 403);
  return auth;
}
export async function audit(
  actor: string | null,
  action: string,
  target?: string,
  detail: Record<string, unknown> = {},
) {
  const { error } = await adminDb()
    .from("portal_audit")
    .insert({ actor_id: actor, action, target_id: target, detail });
  if (error) throw new PortalError("audit_unavailable", 503);
}
export async function rateLimit(key: string, limit = 10, seconds = 900) {
  const digest = createHash("sha256").update(key).digest("hex");
  const { data, error } = await adminDb().rpc("portal_rate_limit", {
    p_key: digest,
    p_limit: limit,
    p_seconds: seconds,
  });
  if (error) throw new PortalError("rate_limit_unavailable", 503);
  if (!data) throw new PortalError("too_many_requests", 429);
}
export function originCheck(req: Request) {
  if (req.headers.get("origin") !== new URL(req.url).origin)
    throw new PortalError("invalid_origin", 403);
}
export function portalOrigin() {
  if (process.env.PORTAL_APP_URL)
    return new URL(process.env.PORTAL_APP_URL).origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
export async function turnstile(token: string, req: Request) {
  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: env("TURNSTILE_SECRET_KEY"),
        response: token,
      }),
      signal: AbortSignal.timeout(8000),
    },
  );
  const data = await response.json();
  if (
    !response.ok ||
    data.success !== true ||
    data.hostname !== new URL(req.url).hostname
  )
    throw new PortalError("verification_failed", 403);
}
export function checkDb(error: { message: string; code?: string } | null) {
  if (error)
    throw new PortalError(
      error.code === "23505"
        ? "conflicting_record"
        : "database_operation_failed",
      error.code === "23505" ? 409 : 503,
    );
}
