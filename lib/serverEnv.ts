import "server-only";
import { z } from "zod";

const schema = z.object({
  BREVO_API_KEY: z.string().min(10),
  BREVO_SENDER_EMAIL: z.string().email(),
  BREVO_SENDER_NAME: z.string().min(1).default("StackEndBox"),
  BRIEF_TO_EMAIL: z.string().email(),
});

/** Server-only configuration. Returns the names of missing or invalid variables, never their values. */
export function brevoEnv(): { ok: true; env: z.infer<typeof schema> } | { ok: false; missing: string[] } {
  const r = schema.safeParse({
    BREVO_API_KEY: process.env.BREVO_API_KEY?.trim(),
    BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL?.trim(),
    BREVO_SENDER_NAME: process.env.BREVO_SENDER_NAME?.trim() || "StackEndBox",
    BRIEF_TO_EMAIL: process.env.BRIEF_TO_EMAIL?.trim(),
  });
  if (r.success) return { ok: true, env: r.data };
  return { ok: false, missing: [...new Set(r.error.issues.map((i) => String(i.path[0])))] };
}

export const turnstileEnabled = () => !!(process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
