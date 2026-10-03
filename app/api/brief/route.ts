import { NextResponse, type NextRequest } from "next/server";
import { briefSchema } from "@/lib/briefSchema";
import { briefText } from "@/lib/briefTemplate";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

const json = (body: unknown, status = 200, headers?: Record<string, string>) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

async function deliver(text: string, replyTo: string, subject: string) {
  const webhook = process.env.BRIEF_WEBHOOK_URL;
  const resendKey = process.env.RESEND_API_KEY;
  const to = process.env.BRIEF_TO_EMAIL;
  const from = process.env.BRIEF_FROM_EMAIL;
  let attempted = false;
  let delivered = false;

  if (webhook) {
    attempted = true;
    try {
      const r = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, subject, replyTo }),
        signal: AbortSignal.timeout(8000),
      });
      delivered ||= r.ok;
    } catch {}
  }
  if (resendKey && to && from) {
    attempted = true;
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [to], reply_to: replyTo, subject, text }),
        signal: AbortSignal.timeout(8000),
      });
      delivered ||= r.ok;
    } catch {}
  }
  return { attempted, delivered };
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

  const { attempted, delivered } = await deliver(briefText(parsed.data), parsed.data.email, `New brief: ${parsed.data.needs.join(", ")} (${parsed.data.stage})`);
  if (!attempted) return json({ ok: false, error: "not_configured" }, 503);
  if (!delivered) return json({ ok: false, error: "delivery_failed" }, 502);
  return json({ ok: true });
}

export function GET() {
  return json({ ok: false, error: "method_not_allowed" }, 405, { Allow: "POST" });
}
