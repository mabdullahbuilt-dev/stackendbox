import "server-only";
import { createHash } from "node:crypto";
import { PortalError } from "./rules";
import { validatePassword } from "./password-policy";

export async function checkPassword(password: string) {
  try { validatePassword(password); } catch { throw new PortalError("strong_password_required", 422); }
  const digest = createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
  let response: Response;
  try {
    response = await fetch(`https://api.pwnedpasswords.com/range/${digest.slice(0, 5)}`, {
      headers: { "Add-Padding": "true", "User-Agent": "StackEndBox password safety" },
      signal: AbortSignal.timeout(8000), cache: "no-store",
    });
  } catch { throw new PortalError("password_safety_check_unavailable", 503); }
  if (!response.ok) throw new PortalError("password_safety_check_unavailable", 503);
  const text = await response.text();
  const lines = text.trim().split(/\r?\n/);
  if (!lines.length || lines.some(line => !/^[A-F0-9]{35}:\d+$/.test(line)))
    throw new PortalError("password_safety_check_unavailable", 503);
  if (lines.some(line => line.startsWith(`${digest.slice(5)}:`) && Number(line.split(":")[1]) > 0))
    throw new PortalError("compromised_password", 422);
}
