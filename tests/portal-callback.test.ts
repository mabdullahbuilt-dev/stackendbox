import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { runInNewContext } from "node:vm";

const auth = vi.hoisted(() => ({ verifyOtp: vi.fn(), exchangeCodeForSession: vi.fn(), signOut:vi.fn() }));
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
  auth.signOut.mockResolvedValue({error:null});
});
describe("email link confirmation", () => {
  it("reloads a changed fragment without consuming its credentials",async()=>{
    const html=await(await GET()).text(),script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
    let changed=()=>{};
    const location={pathname:"/client-portal/auth/callback",search:"",hash:"#token_hash=first&type=invite",reload:vi.fn()};
    const fetcher=vi.fn();
    runInNewContext(script!,{location,history:{},URLSearchParams,window:{addEventListener:(_event:string,fn:()=>void)=>{changed=fn;}},document:{getElementById:()=>({addEventListener:vi.fn()}),querySelector:()=>({})},fetch:fetcher});
    location.hash="#token_hash=newer&type=recovery";changed();
    expect(location.reload).toHaveBeenCalledOnce();expect(fetcher).not.toHaveBeenCalled();expect(location.hash).toContain("newer");
  });
  it("verifies initial-password email without forcing a reset",async()=>{
    auth.verifyOtp.mockResolvedValue({error:null,data:{user:{app_metadata:{portal_credential_mode:"initial_password"}}}});
    const r=await POST(request({token_hash:"fixture-token-hash",type:"invite"}));
    expect(await r.json()).toEqual({ok:true,next:"/client-portal/login"});
    expect(auth.signOut).toHaveBeenCalledWith({scope:"local"});
  });
  it("keeps explicit recovery separate for initial-password accounts",async()=>{
    auth.verifyOtp.mockResolvedValue({error:null,data:{user:{app_metadata:{portal_credential_mode:"initial_password"}}}});
    const r=await POST(request({token_hash:"fixture-token-hash",type:"recovery"}));
    expect((await r.json()).next).toBe("/client-portal/reset-password");
    expect(auth.signOut).not.toHaveBeenCalled();
  });
  it("preserves an unused token across refresh in the URL fragment, then clears it after confirmation", async () => {
    const html=await (await GET()).text();
    const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
    expect(script).toBeTruthy();
    const location={pathname:"/client-portal/auth/callback",search:"?token_hash=fixture-token-hash&type=invite",hash:"",replace:vi.fn()};
    let click:()=>Promise<void> = async()=>{};
    const button={disabled:false,addEventListener:(_event:string,fn:()=>Promise<void>)=>{click=fn;}};
    const status={textContent:"",appendChild:vi.fn()};
    const history={replaceState:(_state:unknown,_title:string,url:string)=>{const parsed=new URL(url,"https://portal.example");location.search=parsed.search;location.hash=parsed.hash;}};
    const fetcher=vi.fn(async()=>({ok:true,json:async()=>({next:"/client-portal/reset-password"})}));
    const context={location,history,URLSearchParams,window:{addEventListener:vi.fn()},document:{getElementById:(id:string)=>id==="confirm"?button:status,querySelector:()=>({}),createElement:()=>({})},fetch:fetcher};
    runInNewContext(script!,context);
    expect(location.search).toBe("");expect(location.hash).toContain("token_hash=fixture-token-hash");expect(fetcher).not.toHaveBeenCalled();
    runInNewContext(script!,context); // A fresh JS context reads the preserved fragment.
    await click();
    expect(JSON.parse((fetcher.mock.calls[0] as unknown as [string,{body:string}])[1].body)).toEqual({token_hash:"fixture-token-hash",type:"invite"});
    expect(location.hash).toBe("");expect(location.replace).toHaveBeenCalledWith("/client-portal/reset-password");
  });
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
