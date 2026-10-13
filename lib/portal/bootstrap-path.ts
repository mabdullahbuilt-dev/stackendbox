export function bootstrapPath(route:{admin:boolean;section:string;detail?:string;publicPage?:boolean}) {
  if(route.admin)return "auth/identity?admin=1";
  const params=new URLSearchParams({section:route.section});
  if(route.section==="domains"&&route.detail)params.set("domain",route.detail);
  return `data?${params}`;
}
