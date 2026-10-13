/** Isolated routing proof only. No Wrangler route or production DNS binds this. */
export function isPortalPath(path: string) {
  return path === "/client-portal" || path.startsWith("/client-portal/") || path === "/admin" || path.startsWith("/admin/");
}
export async function selectiveIngress(request: Request, origins: {publicOrigin:string;portalOrigin:string}) {
  const source=new URL(request.url),privateRoute=isPortalPath(source.pathname);
  const destination=new URL(privateRoute?origins.portalOrigin:origins.publicOrigin);
  if(destination.protocol!=="https:"||destination.username||destination.password||destination.origin===source.origin||destination.pathname!=="/")return new Response("Invalid origin configuration",{status:503});
  destination.pathname=source.pathname;destination.search=source.search;
  const headers=new Headers(request.headers);
  headers.delete("host");headers.delete("x-stackendbox-bridge");
  // Supabase cookies span the two portal prefixes. Never forward them to the
  // separate original public application. Preserve its own unrelated cookies.
  if(!privateRoute){
    const cookies=(headers.get("cookie")||"").split(";").map(v=>v.trim()).filter(v=>v&&!/^sb-[^=]+=/.test(v));
    if(cookies.length)headers.set("cookie",cookies.join("; "));else headers.delete("cookie");
    headers.delete("authorization");
  }
  try{
    const response=await fetch(destination,{method:request.method,headers,body:["GET","HEAD"].includes(request.method)?undefined:request.body,redirect:"manual",signal:AbortSignal.timeout(30000)});
    const outgoing=new Headers(response.headers);
    if(privateRoute)outgoing.set("cache-control","private, no-store");
    // Never follow redirects server-side or rewrite HTML. Canonical redirects
    // need an explicit origin review before a real hostname can use this proof.
    return new Response(response.body,{status:response.status,headers:outgoing});
  }catch{return new Response("Origin temporarily unavailable",{status:502,headers:{"cache-control":"no-store"}});}
}
