import { NextResponse } from "next/server";
import { z } from "zod";
import {
  adminDb,
  audit,
  checkDb,
  clientAccess,
  originCheck,
  rateLimit,
} from "@/lib/portal/server";
import { PortalError } from "@/lib/portal/rules";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    originCheck(req);
    if (Number(req.headers.get("content-length") || 0) > 4_400_000)
      throw new PortalError("file_too_large", 413);
    const form = await req.formData();
    const clientId = z.string().uuid().parse(form.get("client_id"));
    const auth = await clientAccess(clientId);
    if(auth.account.role==="staff")throw new PortalError("staff_document_upload_unavailable",403);
    await rateLimit(`upload:${auth.user.id}`, 15, 3600);
    const file = form.get("file");
    if (!(file instanceof File) || !file.size || file.size > 4 * 1024 * 1024)
      throw new PortalError("file_must_be_under_4mb", 413);
    const bytes = Buffer.from(await file.arrayBuffer());
    const signatures: Record<string, boolean> = {
      "application/pdf": bytes.subarray(0, 5).toString() === "%PDF-",
      "image/png": bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
      "image/jpeg": bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255,
      "image/webp":
        bytes.subarray(0, 4).toString() === "RIFF" &&
        bytes.subarray(8, 12).toString() === "WEBP",
      "text/plain":
        !bytes.includes(0) &&
        !/<(?:script|html|iframe|svg)\b/i.test(bytes.toString("utf8")),
    };
    if (!signatures[file.type])
      throw new PortalError("unsupported_or_mismatched_file_type", 422);
    const name =
      file.name.replace(/[\\/\x00-\x1f]/g, "_").slice(0, 180) || "document";
    const storagePath = `${clientId}/${crypto.randomUUID()}`;
    const db = adminDb();
    checkDb(
      (
        await db.storage
          .from("portal-documents")
          .upload(storagePath, bytes, { contentType: file.type, upsert: false })
      ).error,
    );
    const { error } = await db
      .from("portal_documents")
      .insert({
        client_id: clientId,
        name,
        storage_path: storagePath,
        mime_type: file.type,
        size_bytes: file.size,
      });
    if (error) {
      await db.storage.from("portal-documents").remove([storagePath]);
      checkDb(error);
    }
    await audit(auth.user.id, "document_uploaded", storagePath, {
      size: file.size,
      type: file.type,
    });
    return NextResponse.json(
      { message: "Document uploaded to private storage." },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof PortalError ? e.code : "upload_failed" },
      { status: e instanceof PortalError ? e.status : 400 },
    );
  }
}
