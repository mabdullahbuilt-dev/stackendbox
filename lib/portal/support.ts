import "server-only";
import {z} from "zod";
import {adminDb,checkDb,portalOrigin} from "./server";
import {PortalError} from "./rules";
import {notifyClient} from "./services";
export const supportChangeSchema=z.object({idempotency_key:z.uuid(),request_id:z.uuid(),expected_revision:z.number().int().nonnegative(),priority:z.enum(["low","normal","high","urgent"]),assigned_to:z.uuid().nullable(),escalated:z.boolean(),status:z.enum(["submitted","under_review","quoted","approved","in_progress","completed","closed"])}).strict();
export const supportNoteSchema=z.object({idempotency_key:z.uuid(),request_id:z.uuid(),body:z.string().trim().min(1).max(5000)}).strict();
function checked(error:{code?:string;message:string}|null){
 if(error?.code==="P0001")throw new PortalError(({"Support request conflict":"idempotency_conflict","Support revision changed":"ticket_changed_refresh_required","Support assignee unavailable":"staff_assignee_unavailable","Support request missing":"request_not_found"} as Record<string,string>)[error.message]||"support_operation_denied",409);
 checkDb(error);
}
export async function supportQueue(params:URLSearchParams){
 const cursor=params.get("before"),search=params.get("search")?.trim()||"",status=params.get("status");
 const client=params.has("client_id")?z.uuid().parse(params.get("client_id")):null;
 const db=adminDb();let q=db.from("portal_requests").select("id,client_id,subject,status,created_at,updated_at,portal_clients(name),portal_support_meta(priority,assigned_to,escalated,revision,assignee:portal_accounts!portal_support_meta_assigned_to_fkey(name))").order("created_at",{ascending:false}).order("id",{ascending:false}).limit(51);
 if(cursor){const value=z.object({at:z.iso.datetime({offset:true}),id:z.uuid()}).parse(JSON.parse(cursor));q=q.or(`created_at.lt.${value.at},and(created_at.eq.${value.at},id.lt.${value.id})`);}
 if(search)q=q.ilike("subject",`%${search.replace(/[%_\\]/g,"").slice(0,100)}%`);
 if(status)q=q.eq("status",z.enum(["submitted","under_review","completed","closed"]).parse(status));
 if(client)q=q.eq("client_id",client);
 const result=await q;checkDb(result.error);const rows=result.data||[],items=rows.slice(0,50),last=items.at(-1);
 return {items,next:rows.length>50&&last?JSON.stringify({at:last.created_at,id:last.id}):null};
}
export async function supportDetail(request:string){
 const id=z.uuid().parse(request),db=adminDb();
 const results=await Promise.all([
 db.from("portal_requests").select("id,client_id,subject,description,status,created_at,updated_at").eq("id",id).single(),
 db.from("portal_support_meta").select("priority,assigned_to,escalated,revision").eq("request_id",id).maybeSingle(),
 db.from("portal_messages").select("id,body,author_id,created_at").eq("request_id",id).order("created_at",{ascending:false}).order("id").limit(100),
 db.from("portal_support_notes").select("id,body,author_id,created_at").eq("request_id",id).order("created_at",{ascending:false}).order("id").limit(100),
 db.from("portal_support_changes").select("id,input,actor_id,created_at").eq("request_id",id).order("created_at",{ascending:false}).order("id").limit(100),
 db.rpc("portal_support_operators"),
 ]);results.forEach(r=>checkDb(r.error));
 return {ticket:results[0].data,meta:results[1].data||{priority:"normal",assigned_to:null,escalated:false,revision:0},messages:results[2].data,notes:results[3].data,history:results[4].data,assignees:results[5].data,history_limit:100};
}
export async function supportChange(actor:string,body:unknown){
 const input=supportChangeSchema.parse(body),db=adminDb();
 const result=await db.rpc("portal_support_change",{p_id:input.idempotency_key,p_actor:actor,p_request:input.request_id,p_revision:input.expected_revision,p_priority:input.priority,p_assignee:input.assigned_to,p_escalated:input.escalated,p_status:input.status});checked(result.error);
 const ticket=await db.from("portal_requests").select("client_id,subject").eq("id",input.request_id).single();checkDb(ticket.error);
 await notifyClient(ticket.data!.client_id,`Request updated: ${ticket.data!.subject}`,`Your support request was updated. View its status at ${portalOrigin()}/client-portal/requests.`,`support-workflow:${input.idempotency_key}`);
 return {message:"Ticket updated."};
}
export async function supportNote(actor:string,body:unknown){
 const input=supportNoteSchema.parse(body),result=await adminDb().rpc("portal_support_note",{p_id:input.idempotency_key,p_actor:actor,p_request:input.request_id,p_body:input.body});checked(result.error);
 return {message:"Internal note saved. It is never sent to the client."};
}
