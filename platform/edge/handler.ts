import { timingSafeEqual } from "node:crypto";
import { NextRequest, withRequest } from "./next-runtime";
import * as portal from "../../app/api/portal/[...path]/route";
import * as callback from "../../app/client-portal/auth/callback/route";
import * as webhook from "../../app/api/webhooks/whop/route";
import * as upload from "../../app/api/portal/upload/route";
import * as jobs from "../../app/api/portal-jobs/route";
import * as brief from "../../app/api/brief/route";
import * as diagnostics from "../../app/api/portal-diagnostics/route";
import * as releaseReadiness from "../../app/api/release-readiness/route";
import { withLatency } from "../../lib/portal/latency";

export async function handleEdge(incoming: Request, waitUntil?: (p: Promise<unknown>) => void) {
  const expected = process.env.STACKENDBOX_BRIDGE_SECRET || "";
  const supplied = incoming.headers.get("x-stackendbox-bridge") || "";
  if (!expected || Buffer.byteLength(expected) !== Buffer.byteLength(supplied) || !timingSafeEqual(Buffer.from(expected), Buffer.from(supplied)))
    return Response.json({ error: "unauthorized_gateway" }, { status: 401 });
  const url = new URL(incoming.url);
  const path = url.pathname.replace(/^\/(?:functions\/v1\/)?stackendbox-(?:acceptance|production)(?=\/|$)/, "") || "/";
  if (!path.startsWith("/api/") && path !== "/client-portal/auth/callback") return Response.json({ error: "route_not_found" }, { status: 404 });
  const origin = process.env.PORTAL_APP_URL;
  if (!origin || !origin.startsWith("https://")) return new Response(null, { status: 503 });
  const req = new NextRequest(new URL(path + url.search, origin), incoming);
  const frameworkRequest = req as unknown as Parameters<typeof portal.GET>[0];
  return withLatency(() => withRequest(req, async () => {
    if (path === "/client-portal/auth/callback") return req.method === "GET" ? callback.GET() : req.method === "POST" ? callback.POST(frameworkRequest) : new Response(null, { status: 405 });
    if (path === "/api/webhooks/whop" && req.method === "POST") return webhook.POST(req);
    if (path === "/api/portal/upload" && req.method === "POST") return upload.POST(req);
    if (path === "/api/portal-jobs" && req.method === "GET") return jobs.GET(req);
    if (path === "/api/brief" && req.method === "POST") return brief.POST(frameworkRequest);
    if (path === "/api/portal-diagnostics" && req.method === "GET") return diagnostics.GET(req);
    if (path === "/api/release-readiness" && req.method === "GET") return releaseReadiness.GET(req);
    if (path.startsWith("/api/portal/") && ["GET", "POST"].includes(req.method)) {
      const context = { params: Promise.resolve({ path: path.slice("/api/portal/".length).split("/") }) };
      // The bundle substitutes only the nextUrl/cookie APIs used by these handlers.
      const portalRequest = req as unknown as Parameters<typeof portal.GET>[0];
      return req.method === "GET" ? portal.GET(portalRequest, context) : portal.POST(portalRequest, context);
    }
    return new Response(null, { status: 404 });
  }, waitUntil));
}
