/** Password login and activation must land staff at MFA setup, not tenant data. */
export function accountLandingPath(role:string){return role==="staff"?"/client-portal/settings":"/client-portal/dashboard";}
