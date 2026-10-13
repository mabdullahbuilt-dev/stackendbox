import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({ rpc: vi.fn(), assignments: vi.fn(), configuration: vi.fn() }));
vi.mock("@/lib/portal/server", () => ({
  adminDb: () => ({
    rpc: state.rpc,
    from: (table: string) => {
      if (table !== "portal_domain_assignments") throw new Error(`Unexpected table: ${table}`);
      return { select: state.assignments };
    },
  }),
  checkDb: (error: unknown) => { if (error) throw error; },
  env: state.configuration,
  portalOrigin: () => "https://example.invalid",
  audit: vi.fn(),
}));
vi.mock("@/lib/portal/spaceship", () => ({ spaceship: {} }));

import { runJobs } from "@/lib/portal/services";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("PORTAL_JOBS_ENABLED", "true");
  vi.stubEnv("PORTAL_SANDBOX_CHECKOUT_ENABLED", "false");
  state.configuration.mockImplementation((name: string) => name.endsWith("API_KEY") ? "fixture" : "fixture@example.com");
  state.assignments.mockResolvedValue({ data: [], error: null });
  state.rpc.mockImplementation(async (name: string) => ({
    data: name === "portal_claim_email" ? [] : 0,
    error: null,
  }));
});
afterEach(() => vi.unstubAllEnvs());

describe("durable email claim recovery", () => {
  it("claims only explicitly selected emails and does not run domain simulations", async () => {
    vi.stubEnv("PORTAL_SANDBOX_CHECKOUT_ENABLED", "true");
    const ids=["aaaaaaaa-0000-4000-8000-000000000001"];
    await runJobs(ids);
    expect(state.rpc.mock.calls).toEqual([["portal_recover_stale_email_claims"],["portal_claim_selected_email",{target_ids:ids}]]);
  });
  it("does not claim or send when sender configuration is missing", async () => {
    state.configuration.mockImplementation((name: string) => { if (name === "BREVO_CLIENT_SENDER_EMAIL") throw Error("configuration_required"); return "fixture"; });
    const fetcher=vi.fn(); vi.stubGlobal("fetch",fetcher);
    try {
      await expect(runJobs()).rejects.toThrow("configuration_required");
      expect(state.rpc).not.toHaveBeenCalled();
      expect(fetcher).not.toHaveBeenCalled();
    } finally { vi.unstubAllGlobals(); }
  });
  it("does not touch the database when operational jobs are disabled", async () => {
    vi.stubEnv("PORTAL_JOBS_ENABLED", "false");
    expect(await runJobs()).toEqual({ emailsAccepted: 0, status: "disabled" });
    expect(state.rpc).not.toHaveBeenCalled();
    expect(state.assignments).not.toHaveBeenCalled();
  });
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
