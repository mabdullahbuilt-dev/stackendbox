import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const auth = vi.hoisted(() => ({ verifyOtp: vi.fn(), exchangeCodeForSession: vi.fn() }));
vi.mock("@/lib/portal/server", () => ({
  sessionDb: vi.fn(async () => ({ auth })),
  originCheck: (req: Request) => {
    if (req.headers.get("origin") !== new URL(req.url).origin) throw new Error("invalid_origin");
  },
}));
import { GET, POST } from "@/app/client-portal/auth/callback/route";

function request(body: unknown, origin = "https://portal.example") {
  return new NextRequest("https://portal.example/client-portal/auth/callback", {
    method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  auth.verifyOtp.mockResolvedValue({ error: null });
  auth.exchangeCodeForSession.mockResolvedValue({ error: null });
});
describe("email link confirmation", () => {
  it("does not consume credentials on a scanner GET", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(await response.text()).toContain("button.addEventListener('click'");
    expect(auth.verifyOtp).not.toHaveBeenCalled();
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });
  it.each(["invite", "recovery"])("confirms %s only on a same-origin POST", async (type) => {
    const body = { token_hash: "fixture-token-hash", type };
    expect((await POST(request(body))).status).toBe(200);
    expect(auth.verifyOtp).toHaveBeenCalledWith(body);
  });
  it("retains the PKCE code exchange", async () => {
    expect((await POST(request({ code: "fixture-code" }))).status).toBe(200);
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("fixture-code");
  });
  it("rejects cross-origin submissions before authentication", async () => {
    expect((await POST(request({ code: "fixture-code" }, "https://attacker.example"))).status).toBe(403);
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });
  it.each([{}, { token_hash: "fixture-token-hash", type: "signup" }, { code: "short" }])("rejects malformed confirmations", async (body) => {
    expect((await POST(request(body))).status).toBe(400);
    expect(auth.verifyOtp).not.toHaveBeenCalled();
  });
  it("returns an expired-link error without exposing provider details", async () => {
    auth.verifyOtp.mockResolvedValue({ error: { message: "private provider detail" } });
    const response = await POST(request({ token_hash: "fixture-token-hash", type: "invite" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "link_invalid_or_expired" });
  });
  it("handles provider outages without leaking credentials", async () => {
    auth.verifyOtp.mockRejectedValue(new Error("private credentials"));
    const response = await POST(request({ token_hash: "fixture-token-hash", type: "recovery" }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "confirmation_unavailable" });
  });
});
