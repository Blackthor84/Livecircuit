"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  enqueueBulkBookingJobAction,
  getAgencyJobStatusAction,
  processAgencyJobAction,
} from "@/lib/actions/agency-features";

type JobRow = {
  id: string;
  job_type: string;
  status: string;
  progress: number;
  total_steps: number;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
};

export function AgencyBulkJobsPanel({
  orgId,
  jobs: initialJobs,
  onEnqueue,
}: {
  orgId: string;
  jobs: JobRow[];
  onEnqueue?: () => void;
}) {
  const [jobs, setJobs] = useState(initialJobs);
  const [pending, startTransition] = useTransition();
  const [pollingId, setPollingId] = useState<string | null>(null);

  useEffect(() => {
    if (!pollingId) return;
    const interval = setInterval(async () => {
      const result = await getAgencyJobStatusAction(orgId, pollingId);
      if (result.ok) {
        setJobs((current) =>
          current.map((j) => (j.id === pollingId ? { ...j, ...result.job } : j))
        );
        if (result.job.status === "completed" || result.job.status === "failed") {
          setPollingId(null);
          toast.success(result.job.status === "completed" ? "Bulk job completed" : "Bulk job failed");
        }
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [pollingId, orgId]);

  function runJob(jobId: string) {
    startTransition(async () => {
      setPollingId(jobId);
      const result = await processAgencyJobAction(orgId, jobId);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <Card className="glass-panel border-white/10">
      <CardHeader>
        <CardTitle className="text-base">Background jobs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {jobs.length ? (
          jobs.map((job) => (
            <div
              key={job.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 p-3 text-sm"
            >
              <div>
                <p className="font-medium capitalize">{job.job_type.replace(/_/g, " ")}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(job.created_at).toLocaleString()}
                  {job.total_steps ? ` · ${job.progress}/${job.total_steps} steps` : ""}
                </p>
                {job.error_message ? (
                  <p className="mt-1 text-xs text-destructive">{job.error_message}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{job.status}</Badge>
                {job.status === "pending" ? (
                  <Button type="button" size="sm" disabled={pending} onClick={() => runJob(job.id)}>
                    {pending && pollingId === job.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "Run now"
                    )}
                  </Button>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Bulk booking jobs run in the background for large roster operations.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function useBulkBookingEnqueue(orgId: string) {
  const [pending, startTransition] = useTransition();

  function enqueue(input: {
    title: string;
    artistIds: string[];
    preferredStates?: string[];
    preferredGenres?: string[];
    runAutoMatch?: boolean;
    bookingMode?: "single" | "recurring" | "tour" | "weekly" | "monthly" | "seasonal";
  }) {
    startTransition(async () => {
      const result = await enqueueBulkBookingJobAction({ orgId, ...input });
      if (!result.ok) toast.error(result.error);
      else {
        toast.success("Bulk booking job queued");
        if (result.jobId) {
          await processAgencyJobAction(orgId, result.jobId);
        }
        window.location.reload();
      }
    });
  }

  return { enqueue, pending };
}
