import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyCronRequest } from "@/lib/auth/cron";
import { processBulkBookingJob, type BulkBookingPayload } from "@/lib/agency/bulk-jobs";

export async function POST(request: Request) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const limit = 5;

  const { data: jobs } = await admin
    .from("agency_background_jobs")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  const processed: Array<{ id: string; status: string }> = [];

  for (const job of jobs ?? []) {
    const result = await processBulkBookingJob(
      admin,
      {
        id: job.id as string,
        organization_id: job.organization_id as string,
        job_type: job.job_type as "bulk_booking",
        status: "pending",
        payload: job.payload as BulkBookingPayload,
        result: (job.result as Record<string, unknown>) ?? {},
        progress: job.progress as number,
        total_steps: job.total_steps as number,
        error_message: job.error_message as string | null,
      },
      job.created_by as string
    );

    processed.push({
      id: job.id as string,
      status: result.ok ? "completed" : "failed",
    });
  }

  return NextResponse.json({ ok: true, processed });
}
