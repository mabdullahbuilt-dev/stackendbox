import {afterEach,describe,it,expect,vi} from "vitest";
vi.mock("server-only",()=>({}));
import {authoritativeNameservers} from "@/lib/portal/authoritative-dns";
afterEach(()=>vi.unstubAllGlobals());
describe("HTTPS nameserver verification",()=>{
  it("accepts only NS answers for the exact domain",async()=>{
    vi.stubGlobal("fetch",vi.fn(async()=>new Response(JSON.stringify({Status:0,Answer:[{name:"example.com.",type:2,data:"ns1.example.net."},{name:"other.com.",type:2,data:"wrong.example.net."},{name:"example.com.",type:1,data:"192.0.2.1"}]}))));
    expect(await authoritativeNameservers("example.com")).toEqual(["ns1.example.net"]);
  });
  it("fails closed on resolver errors",async()=>{
    vi.stubGlobal("fetch",vi.fn(async()=>new Response("error",{status:503})));
    expect(await authoritativeNameservers("example.com")).toEqual([]);
  });
});
