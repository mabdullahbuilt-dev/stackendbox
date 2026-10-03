import { NextResponse, type NextRequest } from "next/server";
import { briefSchema, type BriefInput } from "@/lib/briefSchema";
import { confirmationEmail, internalEmail, type BriefMail } from "@/lib/briefEmail";
import { rateLimit } from "@/lib/rateLimit";
import { brevoEnv, turnstileEnabled } from "@/lib/serverEnv";
import { siteConfig } from "@/site.config";

export const runtime = "nodejs";

const json = (body: unknown, status = 200, headers?: Record<string, string>) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

type Sender = { name: string; email: string };

/** Brevo transactional email (server side only). Never log the API key or response bodies containing it. */
async function brevoSend(key: string, sender: Sender, to: { email: string; name?: string }, replyTo: { email: string; name?: string }, mail: BriefMail) {
  const r = await fetch(process.env.BREVO_API_URL || "https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": key, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ sender, to: [to], replyTo, subject: mail.subject, htmlContent: mail.html, textContent: mail.text }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!r.ok) {
    const detail = await r.text().catch(() => "");
    throw new Error(`brevo_${r.status}:${detail.slice(0, 200)}`);
  }
}

async function verifyTurnstile(token: string | undefined, ip: string) {
  if (!token) return false;
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY ?? "", response: token, ...(ip !== "unknown" ? { remoteip: ip } : {}) }),
      signal: AbortSignal.timeout(6000),
    });
    const body = (await r.json()) as { success?: boolean };
    return body.success === true;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > 20_000) return json({ ok: false, error: "too_large" }, 413);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const rl = rateLimit(`brief:${ip}`);
  if (!rl.ok) return json({ ok: false, error: "rate_limited" }, 429, { "Retry-After": String(rl.retryAfter) });

  let data: unknown;
  try {
    data = await req.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  // Honeypot: pretend success so bots learn nothing.
  if (typeof data === "object" && data && typeof (data as Record<string, unknown>).website === "string" && (data as Record<string, string>).website.length > 0) {
    return json({ ok: true });
  }

  const parsed = briefSchema.safeParse(data);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[String(issue.path[0] ?? "form")] ??= issue.message;
    return json({ ok: false, error: "validation", fields }, 422);
  }
  const input: BriefInput = parsed.data;

  if (turnstileEnabled() && !(await verifyTurnstile(input.turnstileToken, ip))) {
    return json({ ok: false, error: "verification_failed" }, 403);
  }

  const cfg = brevoEnv();
  if (!cfg.ok) {
    console.error("[brief] email delivery is not configured. Missing or invalid:", cfg.missing.join(", "));
    return json({ ok: false, error: "not_configured" }, 503);
  }
  const { BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME, BRIEF_TO_EMAIL } = cfg.env;
  const sender: Sender = { name: BREVO_SENDER_NAME, email: BREVO_SENDER_EMAIL };

  try {
    await brevoSend(BREVO_API_KEY, sender, { email: BRIEF_TO_EMAIL, name: "StackEndBox" }, { email: input.email, name: input.name.replace(/[\r\n]+/g, " ") }, internalEmail(input));
  } catch (e) {
    // Never lose a brief silently: the submission is written to the runtime log so it can be recovered.
    console.error("[brief] internal delivery failed:", (e as Error).message.replace(BREVO_API_KEY, "[redacted]"));
    console.error("[brief] UNDELIVERED SUBMISSION", JSON.stringify({ at: new Date().toISOString(), name: input.name, email: input.email, company: input.company, needs: input.needs, stage: input.stage, goal: input.goal, url: input.url, context: input.context }));
    return json({ ok: false, error: "delivery_failed" }, 502);
  }

  // The visitor confirmation must never fail a brief that already reached the team.
  try {
    await brevoSend(BREVO_API_KEY, sender, { email: input.email, name: input.name.replace(/[\r\n]+/g, " ") }, { email: BRIEF_TO_EMAIL, name: "StackEndBox" }, confirmationEmail(input, siteConfig.calUrl, siteConfig.url, siteConfig.contactEmail ?? BRIEF_TO_EMAIL));
  } catch (e) {
    console.error("[brief] confirmation email failed:", (e as Error).message.replace(BREVO_API_KEY, "[redacted]"));
  }
  return json({ ok: true });
}

export function GET() {
  return json({ ok: false, error: "method_not_allowed" }, 405, { Allow: "POST" });
}
