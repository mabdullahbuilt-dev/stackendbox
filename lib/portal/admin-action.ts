// Read-only review uses the same AAL2 boundary as automatic preview.
// The durable handoff still requires a TOTP verified within ten minutes.
export function requiresFreshAdminMfa(route:string,method:string){
  return method === "POST" && ["admin/activate-domain-client","admin/account-status","admin/client-update","admin/client-access-email","admin/external-payments","admin/notification-recover"].includes(route);
}
