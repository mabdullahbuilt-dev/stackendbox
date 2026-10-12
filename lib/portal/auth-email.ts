import "server-only";
import { z } from "zod";
import { audit, env, portalOrigin } from "./server";
import { PortalError } from "./rules";
/** Authentication links stay in memory and the recipient's email, never the outbox or logs. */
export async function sendAuthEmail(email: string, hash: string, type: "invite" | "recovery", mode: "invitation" | "account_ready" = "invitation") {
  const callback = new URL("/client-portal/auth/callback", portalOrigin());
  // Fragments survive a refresh but aren't sent in HTTP request URLs or referrers.
  callback.hash = new URLSearchParams({ token_hash: hash, type, ...(mode === "account_ready" ? {flow:"account-ready"} : {}) }).toString();
  const title = type === "recovery" ? "Reset your StackEndBox password" : mode === "account_ready" ? "Your StackEndBox account is ready" : "Activate your StackEndBox account";
  const copy = type === "recovery" ? "Confirm your password-recovery request using this private link." : mode === "account_ready" ? `Verify your email using this private link, then sign in using your approved email and the password provided to you securely. No password reset is required.\n\nPortal login: ${portalOrigin()}/client-portal/login` : "Confirm this invitation to choose your own password and activate your account.";
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST", headers: { "api-key": env("BREVO_CLIENT_API_KEY"), "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { email: env("BREVO_CLIENT_SENDER_EMAIL"), name: process.env.BREVO_CLIENT_SENDER_NAME || "StackEndBox" },
      to: [{ email }], replyTo: { email: env("BREVO_CLIENT_REPLY_TO") },
      subject: title,
      textContent: `${title}\n\n${copy}\n\n${callback.href}\n\nThis link is private and single-use. If you didn't request this email, contact StackEndBox. Your password is never included in this email.`,
    }), signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new PortalError("auth_email_delivery_failed", 502);
  const messageId = z.object({ messageId: z.string() }).parse(await response.json()).messageId;
  await audit(null, "auth_email_provider_accepted", undefined, {message_id:messageId, type, mode, delivery_confirmed:false});
  return messageId;
}
