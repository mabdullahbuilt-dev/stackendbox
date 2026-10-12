import { domainName, PortalError } from "./rules";
import { domainToUnicode } from "node:url";

/** Candidate generation is not an availability claim. One bounded provider batch follows. */
export function domainCandidates(input: string) {
  const normalized = input.normalize("NFKC").trim().toLowerCase();
  if (!normalized || normalized.length > 253 || /[/:@?#\\]/.test(normalized))
    throw new PortalError("invalid_domain_search");
  const compact = normalized.replace(/\s+/g, "");
  const primary = domainName(compact.includes(".") ? compact : `${compact}.com`);
  const stem = domainToUnicode(primary).split(".")[0];
  const candidates = [primary, ...["com", "net", "org", "site", "online", "co"].map(tld => `${stem}.${tld}`), `get${stem}.com`, `${stem}hq.com`, `try${stem}.com`, `${stem}app.com`];
  return [...new Set(candidates)].flatMap(candidate => {
    try { return [domainName(candidate)]; } catch { return []; }
  }).slice(0, 20);
}
