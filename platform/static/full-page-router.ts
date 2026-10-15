type BrowserLocation=Pick<Location,"assign"|"replace"|"reload">;
/** A full document navigation already refreshes data. A second reload can cancel it. */
export function createFullPageRouter(location:()=>BrowserLocation){
 let navigating=false;
 return {
  push:(path:string)=>{navigating=true;location().assign(path);},
  replace:(path:string)=>{navigating=true;location().replace(path);},
  refresh:()=>{if(!navigating)location().reload();},
 };
}
