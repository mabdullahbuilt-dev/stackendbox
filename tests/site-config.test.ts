import { describe, expect, it } from "vitest";
import { siteConfig, telHref } from "@/site.config";

describe("contact configuration", () => {
  it("keeps the business phone and the WhatsApp link as separate values", () => {
    expect(siteConfig.contactPhone).toBe("+44 7366 847680");
    expect(siteConfig.whatsappUrl).toBe("https://wa.me/message/4LZFXFNE5TT7O1");
    expect(siteConfig.whatsappUrl).not.toContain("447366847680");
  });
  it("builds a normalised tel: link", () => {
    expect(telHref("+44 7366 847680")).toBe("tel:+447366847680");
    expect(telHref("+44 (7366) 847-680")).toBe("tel:+447366847680");
  });
});
