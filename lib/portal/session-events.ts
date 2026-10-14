const key="stackendbox-session-change";
/** Signal only, with no account data, credentials or session tokens. */
export function notifySessionChange(){
  try{window.localStorage.setItem(key,crypto.randomUUID());}catch{/* Focus checks still revalidate authorization when storage is unavailable. */}
}
export function watchSessionChange(changed:()=>void){
  const listener=(event:StorageEvent)=>{if(event.key===key)changed();};
  window.addEventListener("storage",listener);
  return()=>window.removeEventListener("storage",listener);
}
