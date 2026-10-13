import {PortalError} from "./rules";
/** Registered-domain snapshots must not erase a previously verified expiry. */
export function requireVerifiedExpiration(status:string, expiration?:string|null) {
  if(status==="registered"&&(!expiration||!Number.isFinite(Date.parse(expiration))))
    throw new PortalError("registrar_expiration_unverified",502);
  return expiration||null;
}
