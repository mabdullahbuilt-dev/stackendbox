type Env = { EDGE_BACKEND_URL: string; EDGE_BACKEND_REGION?: string; STACKENDBOX_BRIDGE_SECRET: string; PORTAL_JOBS_ENABLED?: string; CRON_SECRET?: string; ASSETS: { fetch(req: Request): Promise<Response> } };
const gateway = {
  async scheduled(_event: unknown, env: Env) {
    if (env.PORTAL_JOBS_ENABLED !== "true") return;
    if (!env.CRON_SECRET || !env.STACKENDBOX_BRIDGE_SECRET || !env.EDGE_BACKEND_URL) throw Error("scheduled_configuration_required");
    const target=new URL(env.EDGE_BACKEND_URL + "/api/portal-jobs");
    if (target.protocol !== "https:" || !target.hostname.endsWith(".supabase.co")) throw Error("scheduled_backend_invalid");
    const response=await fetch(target,{headers:{"x-stackendbox-bridge":env.STACKENDBOX_BRIDGE_SECRET,Authorization:`Bearer ${env.CRON_SECRET}`},redirect:"manual",signal:AbortSignal.timeout(60000)});
    const result=await response.json() as {status?:string};
    if (!response.ok || result.status === "disabled") throw Error("scheduled_job_not_completed");
  },
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (!url.pathname.startsWith("/api/") && url.pathname !== "/client-portal/auth/callback") return env.ASSETS.fetch(req);
    if (!env.EDGE_BACKEND_URL || !env.STACKENDBOX_BRIDGE_SECRET) return Response.json({ error: "backend_unavailable" }, { status: 503 });
    const target = new URL(env.EDGE_BACKEND_URL + url.pathname + url.search);
    if (target.protocol !== "https:" || !target.hostname.endsWith(".supabase.co")) return new Response(null, { status: 503 });
    const headers = new Headers(req.headers);
    headers.delete("host");
    headers.delete("x-region");
    if (env.EDGE_BACKEND_REGION) headers.set("x-region", env.EDGE_BACKEND_REGION);
    headers.set("x-stackendbox-bridge", env.STACKENDBOX_BRIDGE_SECRET);
    headers.set("x-forwarded-for", req.headers.get("cf-connecting-ip") || "unknown");
    try {
      const response = await fetch(target, { method: req.method, headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : req.body, redirect: "manual", signal: AbortSignal.timeout(30000) });
      const outgoing = new Headers(response.headers);
      outgoing.set("Cache-Control", "private, no-store");
      outgoing.set("X-Content-Type-Options", "nosniff");
      if (url.pathname === "/client-portal/auth/callback" && req.method === "GET" && response.ok) outgoing.set("Content-Type", "text/html; charset=utf-8");
      return new Response(response.body, { status: response.status, headers: outgoing });
    } catch { return Response.json({ error: "backend_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
  },
};
export default gateway;
