// Read-only review uses the same AAL2 boundary as automatic preview.
// The durable handoff still requires a TOTP verified within ten minutes.
export function requiresFreshAdminMfa(route:string,method:string){
  return route === "admin/activate-domain-client" && method === "POST";
}
