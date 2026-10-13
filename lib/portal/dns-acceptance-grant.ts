import {z} from "zod";
import {domainName,PortalError} from "./rules";
export const acceptanceGrantSchema=z.object({domain:z.string().transform(domainName),actor_id:z.uuid(),name:z.string().regex(/^_[a-z0-9-]{1,62}$/),value:z.string().min(1).max(128),ttl:z.literal(300),expires_at:z.iso.datetime()}).strict();
export function oneAssignedClient(value:unknown){
  const row=z.object({client_id:z.uuid()}).strict(),parsed=z.union([row,z.array(row).length(1)]).safeParse(value);
  return parsed.success?(Array.isArray(parsed.data)?parsed.data[0].client_id:parsed.data.client_id):null;
}
export function dnsAcceptanceGrant(name:string,actor?:string){
  let input:unknown;
  try{input=JSON.parse(process.env.DOMAIN_ACCEPTANCE_GRANT||"null");}catch{throw new PortalError("dns_acceptance_not_authorized",403);}
  const parsed=acceptanceGrantSchema.safeParse(input);
  if(!parsed.success||parsed.data.domain!==domainName(name)||parsed.data.domain==="stackendbox.com"||parsed.data.domain.endsWith(".stackendbox.com")||Date.parse(parsed.data.expires_at)<=Date.now()||(actor&&actor!==parsed.data.actor_id))throw new PortalError("dns_acceptance_not_authorized",403);
  return parsed.data;
}
export function approvedAcceptanceRecord(name:string,record:unknown){
  const grant=dnsAcceptanceGrant(name);
  const approved=z.object({type:z.literal("TXT"),name:z.literal(grant.name),value:z.literal(grant.value),ttl:z.literal(grant.ttl)}).strict().safeParse(record);
  if(!approved.success)throw new PortalError("dns_acceptance_record_mismatch",403);
  return approved.data;
}
