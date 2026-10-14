import "server-only";
import { z } from "zod";
import { adminDb, audit, checkDb } from "./server";
import { PortalError, safeWebUrl } from "./rules";

const text = z.string().trim().min(1);
export const websiteAssignmentSchema = z.object({
  idempotency_key:z.uuid().optional(),
  client_id: z.uuid(),
  name: text.max(120),
  url: z.url().transform(safeWebUrl),
}).strict();
export const serviceAssignmentSchema = z.object({
  idempotency_key:z.uuid().optional(),
  client_id: z.uuid(),
  website_id: z.uuid().optional(),
  service: z.enum(["Website development", "Website hosting", "Managed database", "Website performance optimization", "Integrations", "Maintenance", "Technical support"]),
  description: text.max(1000),
  status: z.enum(["included", "provisioned", "suspended"]),
}).strict();
export const serviceEditSchema=serviceAssignmentSchema.omit({idempotency_key:true}).extend({id:z.uuid(),website_id:z.uuid().nullable().optional()}).strict();
export const websiteEditSchema=websiteAssignmentSchema.omit({idempotency_key:true}).extend({id:z.uuid()}).strict();

async function requireActiveClient(db: ReturnType<typeof adminDb>, clientId: string) {
  const result = await db.from("portal_clients").select("id").eq("id", clientId).eq("status", "active").maybeSingle();
  checkDb(result.error);
  if (!result.data) throw new PortalError("active_client_required", 409);
}
async function insertAssignment(db:ReturnType<typeof adminDb>,table:"portal_websites"|"portal_service_entitlements",input:Record<string,unknown>,key?:string){
  const result=await db.from(table).insert({...input,...(key?{id:key}:{})});
  if(key&&result.error?.code==="23505"){
    const prior=await db.from(table).select(Object.keys(input).join(",")).eq("id",key).maybeSingle();
    checkDb(prior.error);
    if(!prior.data||Object.entries(input).some(([field,value])=>(prior.data as unknown as Record<string,unknown>)[field]!==value))throw new PortalError("idempotency_conflict",409);
    return false;
  }
  checkDb(result.error);return true;
}

export async function assignWebsite(actor: string, body: unknown) {
  const {idempotency_key,...input} = websiteAssignmentSchema.parse(body);
  const db = adminDb();
  await requireActiveClient(db, input.client_id);
  if(await insertAssignment(db,"portal_websites",input,idempotency_key))await audit(actor, "website_added", input.client_id);
  return { message: "Website added." };
}

export async function assignService(actor: string, body: unknown) {
  const {idempotency_key,...input} = serviceAssignmentSchema.parse(body);
  const db = adminDb();
  await requireActiveClient(db, input.client_id);
  if (input.website_id) {
    const website = await db.from("portal_websites").select("id").eq("id", input.website_id).eq("client_id", input.client_id).maybeSingle();
    checkDb(website.error);
    if (!website.data) throw new PortalError("website_client_mismatch", 409);
  }
  // The database's composite ownership foreign key remains the final boundary.
  if(await insertAssignment(db,"portal_service_entitlements",{...input,created_by:actor},idempotency_key))await audit(actor, "service_entitlement_added", input.client_id);
  return { message: "Agreed service saved." };
}

export async function editAssignedService(actor:string,body:unknown){
  const {id,...input}=serviceEditSchema.parse(body),db=adminDb();
  await requireActiveClient(db,input.client_id);
  if(input.website_id){
    const website=await db.from("portal_websites").select("id").eq("id",input.website_id).eq("client_id",input.client_id).maybeSingle();checkDb(website.error);
    if(!website.data)throw new PortalError("website_client_mismatch",409);
  }
  const saved=await db.from("portal_service_entitlements").update(input).eq("id",id).eq("client_id",input.client_id).select("id").maybeSingle();
  checkDb(saved.error);if(!saved.data)throw new PortalError("service_not_found",404);
  await audit(actor,"service_entitlement_updated",id);
  return {message:"Service updated."};
}
export async function editAssignedWebsite(actor:string,body:unknown){
  const {id,...input}=websiteEditSchema.parse(body),db=adminDb();await requireActiveClient(db,input.client_id);
  const saved=await db.from("portal_websites").update(input).eq("id",id).eq("client_id",input.client_id).select("id").maybeSingle();
  checkDb(saved.error);if(!saved.data)throw new PortalError("website_not_found",404);
  await audit(actor,"website_updated",id);return {message:"Website updated."};
}
