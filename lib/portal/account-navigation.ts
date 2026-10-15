export function isAdministrativeAccount(role:string){return role==="staff"||role==="super_admin";}
/** Administrative password login and activation must reach MFA before the workspace. */
export function accountLandingPath(role:string){return isAdministrativeAccount(role)?"/admin/verify":"/client-portal/dashboard";}
/** This destination is returned only after successful server-side MFA verification. */
export function verifiedMfaLandingPath(role:string){return isAdministrativeAccount(role)?"/admin":null;}
