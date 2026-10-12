import "server-only";
import {z} from "zod";
import {domainName} from "./rules";
// Standard HTTPS avoids unsupported/custom UDP resolvers in Workers.
export async function authoritativeNameservers(name:string):Promise<string[]> {
  try {
    const url=new URL("https://cloudflare-dns.com/dns-query");url.searchParams.set("name",domainName(name));url.searchParams.set("type","NS");
    const response=await fetch(url,{headers:{Accept:"application/dns-json"},signal:AbortSignal.timeout(3000),cache:"no-store"});
    if (!response.ok) return [];
    const result=z.object({Status:z.number(),Answer:z.array(z.object({name:z.string(),type:z.number(),data:z.string()})).max(256).optional()}).parse(await response.json());
    if (result.Status !== 0) return [];
    return [...new Set((result.Answer || []).filter(a=>a.type === 2 && a.name.toLowerCase().replace(/\.$/,"") === domainName(name)).map(a=>domainName(a.data.replace(/\.$/,""))))];
  } catch {return [];}
}
