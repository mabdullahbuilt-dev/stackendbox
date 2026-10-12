import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { originCheck, sessionDb } from "@/lib/portal/server";

const headers = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
};
const confirmation = z.union([
  z.object({ token_hash: z.string().min(8).max(1024), type: z.enum(["invite", "recovery"]) }).strict(),
  z.object({ code: z.string().min(8).max(1024) }).strict(),
]);

// Email scanners may follow GET links before the recipient opens them.
// Consume one-use credentials only after an explicit confirmation click.
export async function GET() {
  return new NextResponse(
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>Confirm your StackEndBox access</title><style>body{font-family:system-ui;background:#070907;color:#f5f5f5;max-width:36rem;margin:8vh auto;padding:24px;line-height:1.6}a{color:#ff7b0d}header{font-size:24px;font-weight:700}header span{display:block;color:#ff7b0d;font-size:12px;letter-spacing:3px}main{margin-top:36px;padding:28px;border:1px solid #293027;border-radius:16px;background:#0d120c}button{background:#ff7b0d;color:#090b08;border:0;border-radius:8px;font-size:16px;cursor:pointer}button:disabled{opacity:.55}h1{line-height:1.2;font-size:32px}small{color:#abb2a5}</style><body><header>StackEndBox<span>PRIVATE CLIENT ACCESS</span></header><main><h1>Continue to StackEndBox</h1><p id="status" role="status">Confirm this email link to set your password. Only continue if you requested access or a password reset.</p><button id="confirm" type="button" style="padding:12px 24px">Continue</button><p><a href="/client-portal/forgot-password">Request a new password-reset email</a></p><small>Invitation and recovery links are single-use. Your password is secured by Supabase Auth.</small></main><script>
  (()=>{const q=new URLSearchParams(location.search),p=new URLSearchParams(location.hash.slice(1));if(q.has('token_hash')||q.has('code')){for(const key of ['token_hash','type','code'])if(q.has(key))p.set(key,q.get(key));history.replaceState(null,'',location.pathname+'#'+p.toString());}const button=document.getElementById('confirm'),status=document.getElementById('status');button.addEventListener('click',async()=>{button.disabled=true;status.textContent='Confirming your access...';try{let url=location.pathname,body;if(p.has('token_hash'))body={token_hash:p.get('token_hash'),type:p.get('type')};else if(p.has('code'))body={code:p.get('code')};else{url='/api/portal/auth/session';body={access_token:p.get('access_token'),refresh_token:p.get('refresh_token')};}const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw new Error();history.replaceState(null,'',location.pathname);location.replace('/client-portal/reset-password');}catch{status.textContent='This link was already used, is invalid, or has expired. If you already clicked Continue in this browser, return to password setup. Otherwise request a new password-reset email.';const a=document.createElement('a');a.href='/client-portal/reset-password';a.textContent='Return to password setup';status.appendChild(document.createElement('br'));status.appendChild(a);}});})();
  </script></body></html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        ...headers,
      },
    },
  );
}

export async function POST(req: NextRequest) {
  try {
    originCheck(req);
  } catch {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403, headers });
  }
  const parsed = confirmation.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "invalid_confirmation" }, { status: 400, headers });
  try {
    const db = await sessionDb();
    const { error } = "code" in parsed.data
      ? await db.auth.exchangeCodeForSession(parsed.data.code)
      : await db.auth.verifyOtp(parsed.data);
    if (error)
      return NextResponse.json({ error: "link_invalid_or_expired" }, { status: 400, headers });
    return NextResponse.json({ ok: true }, { headers });
  } catch {
    return NextResponse.json({ error: "confirmation_unavailable" }, { status: 503, headers });
  }
}
