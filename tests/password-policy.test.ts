import { afterEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
vi.mock("server-only", () => ({}));
import { generateTemporaryPassword, validatePassword } from "@/lib/portal/password-policy";
import { checkPassword } from "@/lib/portal/password-check";
afterEach(() => vi.unstubAllGlobals());
describe("temporary credentials", () => {
  it.each(["short!", "aaaaaaaa", "A1!A1!A1!A1!A1!A1!", "A".repeat(129)])("rejects weak or repetitive input", password => {
    expect(() => validatePassword(password)).toThrow();
  });
  it.each(["Wave!Sea", "Letters!", "abcdefgh", "River 8!"])("accepts an eight-character value without forced character classes", password => {
    expect(password).toHaveLength(8); expect(() => validatePassword(password)).not.toThrow();
  });
  it("generates unique strong random values", () => {
    const values = Array.from({ length: 100 }, generateTemporaryPassword);
    expect(new Set(values).size).toBe(100);
    for (const value of values) { expect(value).toHaveLength(24); expect(() => validatePassword(value)).not.toThrow(); }
  });
  it("sends only five hash characters and requests padded results", async () => {
    const password = "Fixture-only-Password!928";
    const fetcher = vi.fn(async (_url: string, _options?: RequestInit) => new Response(`${"A".repeat(35)}:0\r\n`));
    vi.stubGlobal("fetch", fetcher);
    await checkPassword(password);
    expect(fetcher.mock.calls[0][0]).toBe(`https://api.pwnedpasswords.com/range/${createHash("sha1").update(password).digest("hex").slice(0,5).toUpperCase()}`);
    expect(JSON.stringify(fetcher.mock.calls)).not.toContain(password);
  });
  it("rejects a breached value and ignores padding entries with zero occurrences", async () => {
    const password = "Fixture-only-Password!928";
    const suffix = createHash("sha1").update(password).digest("hex").slice(5).toUpperCase();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(`${suffix}:1`)));
    await expect(checkPassword(password)).rejects.toThrow("compromised_password");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(`${suffix}:0`)));
    await expect(checkPassword(password)).resolves.toBeUndefined();
  });
  it.each(["malformed", ""])("fails closed on an invalid safety response", async response => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(response)));
    await expect(checkPassword("Fixture-only-Password!928")).rejects.toThrow("password_safety_check_unavailable");
  });
  it("fails closed on provider timeout", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw Error("network"); }));
    await expect(checkPassword("Fixture-only-Password!928")).rejects.toThrow("password_safety_check_unavailable");
  });
});
