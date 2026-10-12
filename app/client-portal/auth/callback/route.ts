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
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>Confirm your StackEndBox access</title><body style="font-family:system-ui;max-width:32rem;margin:10vh auto;padding:24px"><h1>Continue to StackEndBox</h1><p id="status" role="status">Confirm this email link to set your password. Only continue if you requested access or a password reset.</p><button id="confirm" type="button" style="padding:12px 24px">Continue</button><p><a href="/client-portal/forgot-password">Request a new password-reset email</a></p><script>
  (()=>{const q=new URLSearchParams(location.search),p=new URLSearchParams(location.hash.slice(1));history.replaceState(null,'',location.pathname);const button=document.getElementById('confirm'),status=document.getElementById('status');button.addEventListener('click',async()=>{button.disabled=true;status.textContent='Confirming your access...';try{let url=location.pathname,body;if(q.has('token_hash'))body={token_hash:q.get('token_hash'),type:q.get('type')};else if(q.has('code'))body={code:q.get('code')};else{url='/api/portal/auth/session';body={access_token:p.get('access_token'),refresh_token:p.get('refresh_token')};}const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw new Error();location.replace('/client-portal/reset-password');}catch{status.textContent='This link is invalid or has expired. Request a new password-reset email using the link below.';}});})();
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
