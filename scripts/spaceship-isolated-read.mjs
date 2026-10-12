// Personal-account acceptance reads never use or replace the dedicated account keys.
// Supply the exact founder-authorized domain and isolated keys through the environment.
import { domainToASCII } from "node:url";
const domain = domainToASCII((process.env.SPACESHIP_TEST_DOMAIN || "").trim().toLowerCase());
const key = process.env.SPACESHIP_TEST_API_KEY;
const secret = process.env.SPACESHIP_TEST_API_SECRET;
if (!domain || !key || !secret || domain === "stackendbox.com" || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
  console.error("Exact authorized noncorporate domain and separate test credentials are required. No provider request was made.");
  process.exit(1);
}
async function read(path) {
  const r = await fetch(`https://spaceship.dev/api/v1${path}`, {headers:{"X-API-Key":key,"X-API-Secret":secret}, signal:AbortSignal.timeout(15000), cache:"no-store"});
  if (!r.ok) throw new Error(`Provider read failed: HTTP ${r.status}`);
  return r.json();
}
try {
  const detail = await read(`/domains/${encodeURIComponent(domain)}`);
  if (domainToASCII(String(detail.name).toLowerCase()) !== domain) throw new Error("Provider domain mismatch");
  const id = detail.contacts?.registrant;
  if (!/^[a-zA-Z0-9]{27,32}$/.test(id || "")) throw new Error("Official registrant contact ID unavailable");
  const contact = await read(`/contacts/${id}`);
  const dns = await read(`/dns/records/${encodeURIComponent(domain)}?take=500&skip=0`);
  console.log(JSON.stringify({domain,lifecycle:detail.lifecycleStatus,expiration:detail.expirationDate,verification:detail.verificationStatus ?? "not reported",nameservers:detail.nameservers,registrantContactRetrieved:!!contact.firstName && !!contact.email,dnsTotal:dns.total,dnsFirstPageCount:dns.items?.length,readOnly:true,dedicatedCredentialsUsed:false},null,2));
} catch (e) {
  console.error(e instanceof Error ? e.message : "Isolated provider read failed");
  process.exitCode=1;
}
