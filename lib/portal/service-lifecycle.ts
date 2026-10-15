import "server-only";
import {z} from "zod";
import {adminDb,checkDb} from "./server";
import {PortalError} from "./rules";
export const serviceLifecycleSchema=z.object({idempotency_key:z.uuid(),service_id:z.uuid(),client_id:z.uuid(),expected_revision:z.number().int().nonnegative(),start_date:z.iso.date().nullable(),end_date:z.iso.date().nullable(),billing_arrangement:z.enum(["included","one_time","monthly","annual","custom"]).nullable(),staff_note:z.string().trim().max(5000)}).strict().refine(v=>!v.start_date||!v.end_date||v.end_date>=v.start_date,{message:"End date must follow start date",path:["end_date"]});
export async function serviceWorkspace(params:URLSearchParams){
 const kind=z.enum(["websites","services"]).parse(params.get("kind")||"websites"),after=params.get("after"),term=z.string().trim().max(100).parse(params.get("search")||""),db=adminDb();
 let q=db.from(kind==="websites"?"portal_websites":"portal_service_entitlements").select(`${kind==="websites"?"id,client_id,name,url,status":"id,client_id,website_id,service,description,status,start_date,end_date,billing_arrangement"},portal_clients(name,business_name)`).order("id").limit(51);
 if(params.get("client_id"))q=q.eq("client_id",z.uuid().parse(params.get("client_id")));
 if(after)q=q.gt("id",z.uuid().parse(after));
 if(term)q=q.ilike(kind==="websites"?"name":"service",`%${term.replace(/[\\%_]/g,"\\$&")}%`);
 const result=await q;checkDb(result.error);const rows=z.array(z.object({id:z.uuid(),client_id:z.uuid(),status:z.string(),portal_clients:z.object({name:z.string(),business_name:z.string()}).nullable()}).passthrough()).parse(result.data||[]),items=rows.slice(0,50);
 return {items,next:rows.length>50?items.at(-1)!.id:null};
}
export async function serviceClientOptions(params:URLSearchParams){
 const term=z.string().trim().max(100).parse(params.get("search")||""),db=adminDb();let q=db.from("portal_clients").select("id,name,business_name").eq("status","active").order("name").limit(50);
 if(term)q=q.ilike("name",`%${term.replace(/[\\%_]/g,"\\$&")}%`);
 const result=await q;checkDb(result.error);return {clients:result.data};
}
export async function serviceWebsiteOptions(client:string){
 const result=await adminDb().from("portal_websites").select("id,client_id,name,url,status").eq("client_id",z.uuid().parse(client)).order("name").limit(100);checkDb(result.error);return {websites:result.data};
}
export async function readServiceLifecycle(id:string){
 const service=z.uuid().parse(id),db=adminDb(),results=await Promise.all([
 db.from("portal_service_entitlements").select("id,client_id,service,description,status,start_date,end_date,billing_arrangement").eq("id",service).single(),
 db.from("portal_service_internal").select("staff_note,revision").eq("service_id",service).maybeSingle(),
 db.from("portal_service_history").select("id,input,previous,created_at").eq("service_id",service).order("created_at",{ascending:false}).order("id").limit(50),
 ]);results.forEach(r=>checkDb(r.error));return {service:results[0].data,internal:results[1].data||{staff_note:"",revision:0},history:results[2].data};
}
export async function saveServiceLifecycle(actor:string,body:unknown){
 const v=serviceLifecycleSchema.parse(body),result=await adminDb().rpc("portal_service_lifecycle",{p_id:v.idempotency_key,p_actor:actor,p_service:v.service_id,p_client:v.client_id,p_revision:v.expected_revision,p_start:v.start_date,p_end:v.end_date,p_billing:v.billing_arrangement,p_note:v.staff_note});
 if(result.error?.code==="P0001")throw new PortalError(({"Service request conflict":"idempotency_conflict","Service revision changed":"service_changed_refresh_required","Service missing":"service_not_found","Active client required":"active_client_required"} as Record<string,string>)[result.error.message]||"service_operation_denied",409);
 checkDb(result.error);return {message:"Service lifecycle saved. No payment or renewal was started."};
}
