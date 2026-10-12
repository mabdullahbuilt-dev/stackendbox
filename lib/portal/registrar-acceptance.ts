import "server-only";
import { spaceshipTest } from "./spaceship";
import { domainName, PortalError } from "./rules";
import { rateLimit } from "./server";
import {authoritativeNameservers} from "./authoritative-dns";
export async function registrarAcceptance(input: string) {
  const domain=domainName(input);
  if (!process.env.SPACESHIP_TEST_DOMAIN || domain !== domainName(process.env.SPACESHIP_TEST_DOMAIN)) throw new PortalError("exact_test_domain_authorization_required",409);
  if (domain === "stackendbox.com" || domain.endsWith(".stackendbox.com")) throw new PortalError("corporate_domain_protected",403);
  await rateLimit(`personal-acceptance:${domain}`,1,300);
  const inventory=await spaceshipTest.inventory();
  if (!inventory.some(d=>domainName(d.name)===domain)) throw new PortalError("test_domain_not_in_account",409);
  const detail=await spaceshipTest.detail(domain);
  if (domainName(detail.name)!==domain) throw new PortalError("registrar_domain_mismatch",502);
  const contact=detail.contacts?.registrant ? await spaceshipTest.contact(detail.contacts.registrant) : null;
  const dns=await spaceshipTest.dns(domain);
  const authoritative_hosts=await authoritativeNameservers(domain);
  const expected=(detail.nameservers?.hosts || []).map(domainName).sort();
  const provider_nameserver_match=authoritative_hosts.length>0 && JSON.stringify([...authoritative_hosts].sort())===JSON.stringify(expected);
  return {connection:"Connected",read_only:true,domain,detail,registrant:contact ? {name:contact.organization || `${contact.firstName} ${contact.lastName}`,country:contact.country} : null,dns,authoritative_hosts,dns_source:"Cloudflare public recursive NS lookup, propagation/cache may lag",provider_nameserver_match,checked_at:new Date().toISOString(),dedicated_configuration_unchanged:true};
}
