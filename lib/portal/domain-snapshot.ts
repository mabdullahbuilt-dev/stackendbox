import {domainName,PortalError} from "./rules";
/** Registered-domain snapshots must not erase a previously verified expiry. */
export function requireVerifiedExpiration(status:string, expiration?:string|null) {
  if(status==="registered"&&(!expiration||!Number.isFinite(Date.parse(expiration))))
    throw new PortalError("registrar_expiration_unverified",502);
  return expiration||null;
}
/** A quote must be tied to the exact provider domain and unchanged real expiry. */
export function verifiedRenewalExpiration(name:string, detail:{name:string;lifecycleStatus:string;autoRenew:boolean;expirationDate?:string|null}, expected?:string|null, now=Date.now()) {
  if(domainName(detail.name)!==domainName(name))throw new PortalError("registrar_domain_mismatch",502);
  const expiration=requireVerifiedExpiration(detail.lifecycleStatus,detail.expirationDate);
  if(detail.autoRenew!==false||detail.lifecycleStatus!=="registered"||!expiration||!Number.isFinite(Date.parse(expiration))||Date.parse(expiration)<=now||(expected!==undefined&&Date.parse(expiration)!==Date.parse(expected||"")))throw new PortalError("renewal_requires_administrator_review",409);
  return expiration;
}
