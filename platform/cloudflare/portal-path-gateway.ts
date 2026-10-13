import gateway from "./gateway";
type Env = Parameters<typeof gateway.fetch>[1];
const assetPaths = new Map([
  ["/client-portal/_assets/portal.js", "/portal.js"],
  ["/client-portal/_assets/portal.css", "/portal.css"],
  ["/client-portal/_assets/fonts/geist.woff2", "/fonts/geist.woff2"],
  ["/client-portal/_assets/fonts/geist-mono.woff2", "/fonts/geist-mono.woff2"],
]);
const missing = () => new Response("Not found", {status:404,headers:{"Cache-Control":"no-store"}});

const portalPathGateway = {
  scheduled: gateway.scheduled,
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    // Existing provider webhook stays on its Worker URL. It is not included in
    // the proposed company-domain path rewrites.
    if (url.pathname === "/api/webhooks/whop") return gateway.fetch(req, env);
    // This origin never owns the public homepage, contact endpoint or assets.
    if (!(url.pathname === "/admin" || url.pathname.startsWith("/admin/") || url.pathname === "/client-portal" || url.pathname.startsWith("/client-portal/"))) return missing();
    if (url.pathname.startsWith("/client-portal/api/")) {
      url.pathname = "/api/portal/" + url.pathname.slice("/client-portal/api/".length);
      return gateway.fetch(new Request(url, req), env);
    }
    if (url.pathname === "/client-portal/auth/callback") {
      const response = await gateway.fetch(req, env);
      if (req.method !== "GET" || !response.ok) return response;
      // The shared callback also supports legacy fragment sessions. Keep that
      // browser POST within the same portal namespace as password login.
      const body = (await response.text()).replace("'/api/portal/auth/session'", "'/client-portal/api/auth/session'");
      const headers = new Headers(response.headers); headers.delete("content-length");
      return new Response(body, {status:response.status,headers});
    }
    if (!["GET", "HEAD"].includes(req.method)) return new Response(null, {status:405,headers:{Allow:"GET, HEAD"}});
    const asset = assetPaths.get(url.pathname);
    if (url.pathname.startsWith("/client-portal/_assets/") && !asset) return missing();
    url.pathname = asset || "/portal.html";
    url.search = "";
    const response = await env.ASSETS.fetch(new Request(url, req));
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "no-store");
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(response.body, {status:response.status,headers});
  },
};
export default portalPathGateway;
