import "server-only";
import { domainName, PortalError } from "./rules";
import { spaceship } from "./spaceship";
import { rateLimit } from "./server";

const normalizeHolder = (value: string) => value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();

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

export async function verifyAssignmentHolder(name: string, holder: string) {
  const evidence = await readRegistrant(name);
  if (evidence.lifecycle_status !== "registered" || !evidence.expiration_date || evidence.suspensions.length)
    throw new PortalError("domain_registration_unverified", 409);
  if (!evidence.verification_reported || ![null, "success"].includes(evidence.verification_status))
    throw new PortalError("registrant_verification_pending", 409);
  if (normalizeHolder(holder) !== normalizeHolder(evidence.holder))
    throw new PortalError("registered_holder_mismatch", 409);
  return evidence;
}
