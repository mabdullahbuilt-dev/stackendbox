import { after, NextResponse } from "next/server";
import { runJobs } from "@/lib/portal/services";
import { processWebhook } from "@/lib/portal/whop";
import { PortalError, sandboxOnly } from "@/lib/portal/rules";
import {boundedText} from "@/lib/portal/request-body";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    // Stopping new checkouts must never drop a signed event for an already
    // created payment. Live credentials and registrar operations remain gated.
    sandboxOnly();
    const raw = await boundedText(req,256000);
    if (raw.length > 256000) return new Response(null, { status: 413 });
    const result = await processWebhook(
      raw,
      Object.fromEntries(req.headers.entries()),
    );
    if (process.env.PORTAL_JOBS_ENABLED === "true")
      after(async () => {
        try {
          await runJobs();
        } catch {
          /* Durable queued work is retained for the scheduled or admin retry. */
        }
      });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof PortalError ? e.code : "webhook_processing_failed",
      },
      { status: e instanceof PortalError ? e.status : 503 },
    );
  }
}
