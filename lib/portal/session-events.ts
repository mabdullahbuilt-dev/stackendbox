const key="stackendbox-session-change";
const revoked="stackendbox-access-revoked";
export function isAuthorizationRejection(status:number,code:unknown){
  return status===401||status===403&&["account_not_authorized","staff_permission_denied","administrator_required"].includes(String(code));
}
/** Clear the requesting tab too, without broadcasting identity or tokens. */
export function notifyAccessRevoked(){
  window.dispatchEvent(new Event(revoked));
  notifySessionChange();
}
/** Signal only, with no account data, credentials or session tokens. */
export function notifySessionChange(){
  try{window.localStorage.setItem(key,crypto.randomUUID());}catch{/* Focus checks still revalidate authorization when storage is unavailable. */}
}
export function watchSessionChange(changed:()=>void){
  const listener=(event:StorageEvent)=>{if(event.key===key)changed();};
  window.addEventListener("storage",listener);
  window.addEventListener(revoked,changed);
  return()=>{window.removeEventListener("storage",listener);window.removeEventListener(revoked,changed);};
}
