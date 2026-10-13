import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({ rpc: vi.fn(), assignments: vi.fn() }));
vi.mock("@/lib/portal/server", () => ({
  adminDb: () => ({
    rpc: state.rpc,
    from: (table: string) => {
      if (table !== "portal_domain_assignments") throw new Error(`Unexpected table: ${table}`);
      return { select: state.assignments };
    },
  }),
  checkDb: (error: unknown) => { if (error) throw error; },
  env: () => "unused_fixture",
  portalOrigin: () => "https://example.invalid",
  audit: vi.fn(),
}));
vi.mock("@/lib/portal/spaceship", () => ({ spaceship: {} }));

import { runJobs } from "@/lib/portal/services";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("PORTAL_SANDBOX_CHECKOUT_ENABLED", "false");
  state.assignments.mockResolvedValue({ data: [], error: null });
  state.rpc.mockImplementation(async (name: string) => ({
    data: name === "portal_claim_email" ? [] : 0,
    error: null,
  }));
});

describe("durable email claim recovery", () => {
  it("classifies abandoned sends before claiming new work, without resending them", async () => {
    expect(await runJobs()).toEqual({ emailsAccepted: 0 });
    expect(state.rpc.mock.calls.map(([name]) => name)).toEqual([
      "portal_recover_stale_email_claims",
      "portal_claim_email",
    ]);
  });

  it("fails closed when stale-claim recovery is unavailable", async () => {
    state.rpc.mockResolvedValueOnce({ data: null, error: { message: "database unavailable" } });
    await expect(runJobs()).rejects.toEqual({ message: "database unavailable" });
    expect(state.rpc).toHaveBeenCalledTimes(1);
  });
});
