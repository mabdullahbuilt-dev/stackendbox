import "server-only";
import { z } from "zod";
import { adminDb, audit, checkDb } from "./server";
import { PortalError, safeWebUrl } from "./rules";

const text = z.string().trim().min(1);
export const websiteAssignmentSchema = z.object({
  client_id: z.uuid(),
  name: text.max(120),
  url: z.url().transform(safeWebUrl),
}).strict();
export const serviceAssignmentSchema = z.object({
  client_id: z.uuid(),
  website_id: z.uuid().optional(),
  service: z.enum(["Website development", "Website hosting", "Managed database", "Website performance optimization", "Integrations", "Maintenance", "Technical support"]),
  description: text.max(1000),
  status: z.enum(["included", "provisioned", "suspended"]),
}).strict();

async function requireActiveClient(db: ReturnType<typeof adminDb>, clientId: string) {
  const result = await db.from("portal_clients").select("id").eq("id", clientId).eq("status", "active").maybeSingle();
  checkDb(result.error);
  if (!result.data) throw new PortalError("active_client_required", 409);
}

export async function assignWebsite(actor: string, body: unknown) {
  const input = websiteAssignmentSchema.parse(body);
  const db = adminDb();
  await requireActiveClient(db, input.client_id);
  checkDb((await db.from("portal_websites").insert(input)).error);
  await audit(actor, "website_added", input.client_id);
  return { message: "Website added." };
}

export async function assignService(actor: string, body: unknown) {
  const input = serviceAssignmentSchema.parse(body);
  const db = adminDb();
  await requireActiveClient(db, input.client_id);
  if (input.website_id) {
    const website = await db.from("portal_websites").select("id").eq("id", input.website_id).eq("client_id", input.client_id).maybeSingle();
    checkDb(website.error);
    if (!website.data) throw new PortalError("website_client_mismatch", 409);
  }
  // The database's composite ownership foreign key remains the final boundary.
  checkDb((await db.from("portal_service_entitlements").insert({ ...input, created_by: actor })).error);
  await audit(actor, "service_entitlement_added", input.client_id);
  return { message: "Agreed service saved." };
}
