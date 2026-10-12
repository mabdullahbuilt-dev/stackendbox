import "server-only";
import { domainName, PortalError } from "./rules";
import { spaceship } from "./spaceship";
import { rateLimit } from "./server";

// Called only after super-admin authorization. Contact PII is never returned in client data.
export async function readRegistrant(name: string) {
  name = domainName(name);
  await rateLimit(`provider:detail:${name}`, 4, 300);
  const detail = await spaceship.detail(name);
  if (domainName(detail.name) !== name) throw new PortalError("registrar_domain_mismatch", 502);
  if (!detail.contacts?.registrant) throw new PortalError("registrant_contact_unavailable", 409);
  await rateLimit(`provider:contact:${detail.contacts.registrant}`, 4, 300);
  const contact = await spaceship.contact(detail.contacts.registrant);
  return {
    domain: name,
    contact_id: detail.contacts.registrant,
    holder: contact.organization?.trim() || `${contact.firstName} ${contact.lastName}`.trim(),
    contact,
    verification_status: detail.verificationStatus ?? null,
    verification_reported: detail.verificationStatus !== undefined,
    lifecycle_status: detail.lifecycleStatus,
    expiration_date: detail.expirationDate ?? null,
    suspensions: detail.suspensions || [],
    checked_at: new Date().toISOString(),
    custody: "Dedicated StackEndBox Spaceship account",
  };
}

export async function verifyPortalAssignment(name: string) {
  const evidence = await readRegistrant(name);
  if (evidence.lifecycle_status !== "registered" || !evidence.expiration_date || evidence.suspensions.length)
    throw new PortalError("domain_registration_unverified", 409);
  // Management authorization is supplied by the admin's contractual consent.
  // Pending holder verification is reported separately and never claims a transfer.
  return evidence;
}
