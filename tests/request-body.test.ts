import {describe,it,expect} from "vitest";
import {boundedText} from "@/lib/portal/request-body";
describe("bounded request bodies",()=>{
 it("accepts bounded UTF-8 content",async()=>{expect(await boundedText(new Request("https://example.com",{method:"POST",body:"Client é"}),32)).toBe("Client é");});
 it("rejects oversized content even without a length header",async()=>{await expect(boundedText(new Request("https://example.com",{method:"POST",body:"x".repeat(101)}),100)).rejects.toThrow("request_too_large");});
 it("rejects a declared oversize before consuming its body",async()=>{const req=new Request("https://example.com",{method:"POST",headers:{"content-length":"101"},body:"tiny"});await expect(boundedText(req,100)).rejects.toThrow("request_too_large");expect(req.bodyUsed).toBe(false);});
});
