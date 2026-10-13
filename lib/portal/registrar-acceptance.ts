import "server-only";
import { spaceshipTest } from "./spaceship";
import { domainName, PortalError } from "./rules";
import { rateLimit } from "./server";
import {authoritativeNameservers} from "./authoritative-dns";
import {ZodError} from "zod";

async function providerStage<T>(name: "detail" | "contact" | "dns", read: () => Promise<T>): Promise<T> {
  try {
    return await read();
  } catch (error) {
    if (error instanceof ZodError) {
      const path = error.issues[0]?.path.map(String).join("_") || "root";
      throw new PortalError(`personal_${name}_schema_${path}`, 502);
    }
    throw error;
  }
}
export async function registrarAcceptance(input: string) {
  const domain=domainName(input);
  if (!process.env.SPACESHIP_TEST_DOMAIN || domain !== domainName(process.env.SPACESHIP_TEST_DOMAIN)) throw new PortalError("exact_test_domain_authorization_required",409);
  if (domain === "stackendbox.com" || domain.endsWith(".stackendbox.com")) throw new PortalError("corporate_domain_protected",403);
  await rateLimit(`personal-acceptance:${domain}`,1,300);
  let detail;
  try {
    detail=await providerStage("detail",()=>spaceshipTest.detail(domain));
  } catch (error) {
    if (error instanceof PortalError && error.code === "spaceship_404") throw new PortalError("test_domain_not_in_account",409);
    throw error;
  }
  if (domainName(detail.name)!==domain) throw new PortalError("registrar_domain_mismatch",502);
  const registrantId=detail.contacts?.registrant;
  const contact=registrantId ? await providerStage("contact",()=>spaceshipTest.contact(registrantId)) : null;
  const dns=await providerStage("dns",()=>spaceshipTest.dns(domain));
  const authoritative_hosts=await authoritativeNameservers(domain);
  const expected=(detail.nameservers?.hosts || []).map(domainName).sort();
  const provider_nameserver_match=authoritative_hosts.length>0 && JSON.stringify([...authoritative_hosts].sort())===JSON.stringify(expected);
  return {connection:"Connected",read_only:true,domain,detail,registrant:contact ? {name:contact.organization || `${contact.firstName} ${contact.lastName}`,country:contact.country} : null,dns,authoritative_hosts,dns_source:"Cloudflare public recursive NS lookup, propagation/cache may lag",provider_nameserver_match,checked_at:new Date().toISOString(),dedicated_configuration_unchanged:true};
}
