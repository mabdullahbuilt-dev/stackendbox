import "server-only";
import { z } from "zod";
import { env, portalOrigin } from "./server";
import { PortalError } from "./rules";
/** Authentication links stay in memory and the recipient's email, never the outbox or logs. */
export async function sendAuthEmail(email: string, hash: string, type: "invite" | "recovery") {
  const callback = new URL("/client-portal/auth/callback", portalOrigin());
  callback.searchParams.set("token_hash", hash);
  callback.searchParams.set("type", type);
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST", headers: { "api-key": env("BREVO_CLIENT_API_KEY"), "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { email: env("BREVO_CLIENT_SENDER_EMAIL"), name: process.env.BREVO_CLIENT_SENDER_NAME || "StackEndBox" },
      to: [{ email }], replyTo: { email: env("BREVO_CLIENT_REPLY_TO") },
      subject: type === "invite" ? "Your StackEndBox portal invitation" : "Reset your StackEndBox password",
      textContent: `${type === "invite" ? "Set your password to access your StackEndBox account." : "Use this link to reset your StackEndBox password."}\n\n${callback.href}\n\nThis link is private and expires. If you didn't request this email, contact StackEndBox.`,
    }), signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new PortalError("auth_email_delivery_failed", 502);
  return z.object({ messageId: z.string() }).parse(await response.json()).messageId;
}
