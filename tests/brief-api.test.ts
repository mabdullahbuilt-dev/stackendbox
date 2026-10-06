import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { confirmationEmail, internalEmail } from "@/lib/briefEmail";

const input = { needs: ["AI System" as const], stage: "Existing Product" as const, goal: "Add AI" as const, name: "Ada\nLovelace <b>", email: "ada@example.com", company: "Analytical", context: "<script>x</script>", url: "https://example.com", source: "/#start", referrer: "https://google.com" };

describe("brief emails", () => {
  it("builds a clean internal subject and escapes html", () => {
    const m = internalEmail(input as never);
    expect(m.subject).toBe("New StackEndBox Project Brief: AI System from Ada Lovelace <b>");
    expect(m.subject).not.toMatch(/[\r\n]/);
    expect(m.html).not.toContain("<script>");
    expect(m.text).toContain("Stage: Existing Product");
    expect(m.text).toContain("Goal: Add AI");
  });
  it("confirmation has no response-time promise and only links to Cal when configured", () => {
    const a = confirmationEmail(input as never, undefined, "https://www.stackendbox.com", "hello@stackendbox.com");
    expect(a.text).not.toMatch(/24 hours|within/i);
    expect(a.text).not.toContain("schedule a meeting");
    const b = confirmationEmail(input as never, "https://cal.com/x/y", "https://www.stackendbox.com", "hello@stackendbox.com");
    expect(b.text).toContain("https://cal.com/x/y");
    expect(b.text.startsWith("Hi Ada,")).toBe(true);
  });
});

describe("POST /api/brief", () => {
  const body = { needs: ["AI System"], stage: "Idea", goal: "Launch", name: "Ada", email: "ada@example.com", context: "A support assistant" };
  const req = async (b: unknown, ip = "1.1.1.1") => {
    const { POST } = await import("@/app/api/brief/route");
    return POST(new Request("http://x/api/brief", { method: "POST", body: JSON.stringify(b), headers: { "x-forwarded-for": ip } }) as never);
  };
  beforeEach(() => {
    vi.resetModules();
    process.env.BREVO_API_KEY = "xkeysib-test-key-123456";
    process.env.BREVO_SENDER_EMAIL = "hello@stackendbox.com";
    process.env.BREVO_SENDER_NAME = "StackEndBox";
    process.env.BRIEF_TO_EMAIL = "hello@stackendbox.com";
    delete process.env.TURNSTILE_SECRET_KEY;
  });
  afterEach(() => vi.unstubAllGlobals());

  it("sends the team email with reply-to and then the visitor confirmation", async () => {
    const f = vi.fn().mockResolvedValue(new Response("{}", { status: 201 }));
    vi.stubGlobal("fetch", f);
    const r = await req(body, "2.2.2.2");
    expect(r.status).toBe(200);
    expect(f).toHaveBeenCalledTimes(2);
    const first = JSON.parse(f.mock.calls[0][1].body);
    expect(first.to[0].email).toBe("hello@stackendbox.com");
    expect(first.replyTo.email).toBe("ada@example.com");
    expect(f.mock.calls[0][1].headers["api-key"]).toBe("xkeysib-test-key-123456");
    const second = JSON.parse(f.mock.calls[1][1].body);
    expect(second.to[0].email).toBe("ada@example.com");
    expect(second.subject).toBe("We received your project brief");
  });
  it("still succeeds when only the confirmation fails", async () => {
    const f = vi.fn().mockResolvedValueOnce(new Response("{}", { status: 201 })).mockResolvedValueOnce(new Response("nope", { status: 400 }));
    vi.stubGlobal("fetch", f);
    expect((await req(body, "3.3.3.3")).status).toBe(200);
  });
  it("fails loudly when the team email cannot be delivered", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("bad", { status: 401 })));
    const r = await req(body, "4.4.4.4");
    expect(r.status).toBe(502);
  });
  it("answers 503 when Brevo is not configured", async () => {
    delete process.env.BREVO_API_KEY;
    expect((await req(body, "5.5.5.5")).status).toBe(503);
  });
  it("requires a Turnstile token when Turnstile is configured", async () => {
    process.env.TURNSTILE_SECRET_KEY = "s";
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "k";
    vi.stubGlobal("fetch", vi.fn());
    expect((await req(body, "6.6.6.6")).status).toBe(403);
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  });
});

describe("brief email acceptance", () => {
  const base = { name: "Ada", context: "A support assistant" };
  it("accepts Gmail, Outlook and company addresses and rejects malformed ones", async () => {
    const { briefSchema } = await import("@/lib/briefSchema");
    for (const email of ["name@gmail.com", "name@outlook.com", "first.last@company.co.uk", "a+tag@sub.company.com"]) expect(briefSchema.safeParse({ ...base, email }).success).toBe(true);
    for (const email of ["not-an-email", "a@b", "@gmail.com", ""]) expect(briefSchema.safeParse({ ...base, email }).success).toBe(false);
  });
  it("keeps company, url and areas optional and rejects blank required fields", async () => {
    const { briefSchema } = await import("@/lib/briefSchema");
    expect(briefSchema.safeParse({ ...base, email: "a@gmail.com" }).success).toBe(true);
    expect(briefSchema.safeParse({ ...base, email: "a@gmail.com", name: " " }).success).toBe(false);
    expect(briefSchema.safeParse({ ...base, email: "a@gmail.com", context: "" }).success).toBe(false);
    expect(briefSchema.safeParse({ ...base, email: "a@gmail.com", context: "x".repeat(3000) }).success).toBe(true);
  });
});

describe("brevo failure hints", () => {
  it("names the Brevo setting to change for each rejection", async () => {
    vi.resetModules();
    const { brevoHint } = await import("@/app/api/brief/route");
    expect(brevoHint('brevo_401:{"message":"We have detected you are using an unrecognised IP address 98.82.5.138"}')).toMatch(/Authorised IPs/);
    expect(brevoHint('brevo_401:{"message":"Key not found"}')).toMatch(/BREVO_API_KEY/);
    expect(brevoHint('brevo_400:{"message":"Sender is invalid / inactive"}')).toMatch(/verified sender/);
    expect(brevoHint("brevo_500:x")).toBe("");
  });
});
