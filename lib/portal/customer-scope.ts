export type CustomerScope = "customers" | "test";
export function customerScope(value:string|null):CustomerScope|undefined {
  return value === "customers" || value === "test" ? value : undefined;
}
export function filterCustomerScope<T extends {ilike:(key:string,value:string)=>T;not:(key:string,operator:string,value:string)=>T}>(query:T,scope:CustomerScope|undefined,key="business_name"):T {
  return scope === "test" ? query.ilike(key,"TEST ONLY %") : scope === "customers" ? query.not(key,"ilike","TEST ONLY %") : query;
}
