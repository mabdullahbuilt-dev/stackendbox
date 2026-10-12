import { timingSafeEqual } from "node:crypto";
import { runJobs } from "@/lib/portal/services";
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  const actual = req.headers.get("authorization") || "";
  if (
    !expected ||
    actual.length !== expected.length + 7 ||
    !timingSafeEqual(Buffer.from(actual), Buffer.from(`Bearer ${expected}`))
  )
    return new Response(null, { status: 401 });
  try {
    if (process.env.PORTAL_JOBS_ENABLED !== "true")
      return NextResponse.json({ status: "disabled", message: "Background processing awaits operational acceptance." });
    return NextResponse.json(await runJobs());
  } catch {
    return NextResponse.json(
      { error: "job_execution_failed" },
      { status: 503 },
    );
  }
}
