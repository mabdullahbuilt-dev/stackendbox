// Static portal builds can live entirely beneath their own route namespace.
// Existing Next deployments retain their current API paths.
export function portalApiPath(path: string) {
  const base = process.env.NEXT_PUBLIC_PORTAL_API_BASE === "/client-portal/api"
    ? "/client-portal/api" : "/api/portal";
  return `${base}/${path}`;
}
