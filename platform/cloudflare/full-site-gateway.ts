import gateway from "./gateway";
import portals from "./portal-path-gateway";

// Reuse the verified private transport without changing the public site's
// original API routes or its source components.
const fullSiteGateway = {
  scheduled: gateway.scheduled,
  fetch(req: Request, env: Parameters<typeof gateway.fetch>[1]): Promise<Response> {
    const url = new URL(req.url);
    if (url.hostname !== "stackendbox.com" && (
      url.pathname === "/admin" || url.pathname.startsWith("/admin/") ||
      url.pathname === "/client-portal" || url.pathname.startsWith("/client-portal/")
    )) return portals.fetch(req, env);
    return gateway.fetch(req, env);
  },
};
export default fullSiteGateway;
