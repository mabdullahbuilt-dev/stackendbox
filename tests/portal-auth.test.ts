import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/portal/server", () => ({
  adminDb: vi.fn(), audit: vi.fn(), checkDb: vi.fn(), clientAccess: vi.fn(),
  identity: vi.fn(), originCheck: vi.fn(), portalOrigin: vi.fn(),
  rateLimit: vi.fn(), sessionDb: vi.fn(), superAdmin: vi.fn(), turnstile: vi.fn(),
}));
vi.mock("@/lib/portal/services", () => ({
  availability: vi.fn(), createQuote: vi.fn(), notifyClient: vi.fn(),
  syncDomains: vi.fn(), validateQuote: vi.fn(), runJobs: vi.fn(),
}));
vi.mock("@/lib/portal/whop", () => ({ checkout: vi.fn() }));
vi.mock("@/lib/portal/spaceship", () => ({ spaceship: vi.fn() }));

import { POST } from "@/app/api/portal/[...path]/route";
import { sessionDb, turnstile } from "@/lib/portal/server";

describe("authentication verification errors", () => {
  for (const action of ["login", "recover"]) {
    it.each([undefined, "", "   ", null])(
      `${action} explains a missing verification token (%s)`,
      async (token) => {
        const response = await POST(
          new NextRequest(`https://portal.example/api/portal/auth/${action}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "test@example.com", password: "fixture", token }),
          }),
          { params: Promise.resolve({ path: ["auth", action] }) },
        );
        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: "verification_required" });
        expect(sessionDb).not.toHaveBeenCalled();
        expect(turnstile).not.toHaveBeenCalled();
      },
    );
  }
});
