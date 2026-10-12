import { describe, expect, it } from "vitest";
import { receiptHtml } from "@/lib/portal/receipt";
const invoice = { id: "51b9d78b-042a-4c54-9427-7a00c7b8b272", order_id: "c7e22d30-f353-45a8-bbef-70346f16b3dc", amount_minor: 4500, currency: "usd", status: "paid", description: "example.com registration", created_at: "2026-10-12T12:00:00Z" };
describe("downloadable receipts", () => {
  it("uses recorded money and explicitly labels test payments", () => {
    const html = receiptHtml(invoice);
    expect(html).toContain("$45.00");
    expect(html).toContain("Sandbox payment receipt");
    expect(html).toContain("not a tax invoice");
    expect(html).toContain(invoice.order_id);
  });
  it("escapes untrusted receipt text", () => {
    const html = receiptHtml({ ...invoice, description: '<script>alert("x")</script>', status: '<img src=x>' });
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;script&gt;");
  });
  it("accepts the timestamp offset returned by PostgreSQL", () => {
    expect(receiptHtml({...invoice, created_at:"2026-10-12T12:00:00+00:00"})).toContain("2026-10-12T12:00:00+00:00");
  });
  it("rejects malformed or unsafe financial records", () => {
    for (const change of [{currency: "eur"}, {amount_minor: -1}, {amount_minor: 1.2}, {amount_minor: Number.MAX_SAFE_INTEGER + 1}, {id: '../escape'}, {created_at: 'yesterday'}]) expect(() => receiptHtml({...invoice, ...change})).toThrow();
  });
});
