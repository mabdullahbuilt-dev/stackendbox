import { NextRequest, NextResponse } from "next/server";
import { sessionDb } from "@/lib/portal/server";
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const token_hash = req.nextUrl.searchParams.get("token_hash");
  const type = req.nextUrl.searchParams.get("type");
  if (token_hash && (type === "invite" || type === "recovery")) {
    const db = await sessionDb();
    const { error } = await db.auth.verifyOtp({ token_hash, type });
    if (!error)
      return NextResponse.redirect(
        new URL("/client-portal/reset-password", req.url),
      );
  }
  if (code) {
    const db = await sessionDb();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(
        new URL("/client-portal/reset-password", req.url),
      );
  }
  // Supabase email invitations may use the implicit callback form. Exchange
  // the fragment once, erase it immediately, and keep sessions in HttpOnly cookies.
  return new NextResponse(
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>Confirming portal access</title><body><p id="status">Confirming your invitation...</p><script>
  (async()=>{const p=new URLSearchParams(location.hash.slice(1));history.replaceState(null,'',location.pathname);try{const r=await fetch('/api/portal/auth/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({access_token:p.get('access_token'),refresh_token:p.get('refresh_token')})});if(!r.ok)throw new Error();location.replace('/client-portal/reset-password');}catch{document.getElementById('status').textContent='This link is invalid or has expired. Please request a new invitation or password reset.';}})();
  </script></body></html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "X-Frame-Options": "DENY",
      },
    },
  );
}
