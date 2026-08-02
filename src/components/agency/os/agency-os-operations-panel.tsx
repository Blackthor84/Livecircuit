"use client";

import { useTransition } from "react";
import type { ComponentType } from "react";
import { format } from "date-fns";
import { AlertCircle, Calendar, CheckSquare, Users } from "lucide-react";
import { toast } from "sonner";
import { AdminKpiGrid } from "@/components/admin/command-center/admin-kpi-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateApprovalStatusAction } from "@/lib/actions/agency-business-os";
import { APPROVAL_STAGES } from "@/lib/agency/business-os-constants";
import type { AgencyOperationsPayload } from "@/lib/agency/business-os-types";
import { formatCents } from "@/lib/format";

export function AgencyOsOperationsPanel({ orgId, data }: { orgId: string; data: AgencyOperationsPayload }) {
  const overdueTotal = data.staffWorkload.reduce((s, w) => s + w.overdue_tasks, 0);
  const kpis = [
    { label: "Today's tasks", value: String(data.todaysTasks.length) },
    { label: "Approvals needed", value: String(data.approvalsNeeded.length) },
    { label: "Upcoming events", value: String(data.upcomingEvents.length) },
    { label: "Overdue tasks", value: String(overdueTotal) },
  ];

  return (
    <div className="space-y-8">
      <AdminKpiGrid kpis={kpis} />

      <div className="grid gap-6 xl:grid-cols-2">
        <TaskList title="Today's tasks" icon={CheckSquare} items={data.todaysTasks.map((t) => ({ id: t.id, primary: t.title, secondary: t.due_at ? format(new Date(t.due_at), "h:mm a") : "No time", badge: t.priority }))} empty="No tasks due today." />
        <TaskList title="Approvals needed" icon={AlertCircle} items={data.approvalsNeeded.map((a) => ({ id: a.id, primary: a.title, secondary: a.entity_type, badge: a.status, approval: true }))} empty="All clear — nothing pending approval." orgId={orgId} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="glass-panel border-white/10">
          <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="size-5" /> Upcoming events</CardTitle></CardHeader>
          <CardContent>
            {data.upcomingEvents.length ? (
              <ul className="space-y-2 text-sm">
                {data.upcomingEvents.map((e) => (
                  <li key={e.id} className="flex justify-between rounded-lg border border-white/5 px-3 py-2">
                    <span>{e.title}</span>
                    <span className="text-muted-foreground">{format(new Date(e.starts_at), "MMM d, h:mm a")}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">No upcoming bookings on the calendar.</p>}
          </CardContent>
        </Card>

        <Card className="glass-panel border-white/10">
          <CardHeader><CardTitle>Contract & payment deadlines</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {data.contractExpirations.length ? (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Contracts expiring</p>
                <ul className="space-y-2 text-sm">
                  {data.contractExpirations.map((c) => (
                    <li key={c.id} className="flex justify-between rounded-lg border border-amber-500/20 px-3 py-2">
                      <span>{c.title}</span>
                      <span className="text-amber-300">{format(new Date(c.expires_at), "MMM d")}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {data.paymentDeadlines.length ? (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Payment deadlines</p>
                <ul className="space-y-2 text-sm">
                  {data.paymentDeadlines.map((p) => (
                    <li key={p.id} className="flex justify-between rounded-lg border border-white/5 px-3 py-2">
                      <span>{p.description ?? "Payment"}</span>
                      <span className="tabular-nums">{formatCents(p.amount_cents)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {!data.contractExpirations.length && !data.paymentDeadlines.length ? (
              <p className="text-sm text-muted-foreground">Contract reminders fire at 30, 14, 7, and 1 day before expiration.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="glass-panel border-white/10">
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="size-5" /> Staff workload</CardTitle></CardHeader>
        <CardContent>
          {data.staffWorkload.length ? (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-muted-foreground"><th className="pb-2">Staff</th><th className="pb-2">Open</th><th className="pb-2">Overdue</th></tr></thead>
              <tbody>
                {data.staffWorkload.map((w) => (
                  <tr key={w.user_id} className="border-t border-white/5">
                    <td className="py-2">{w.name}</td>
                    <td className="py-2">{w.open_tasks}</td>
                    <td className="py-2">{w.overdue_tasks > 0 ? <span className="text-destructive">{w.overdue_tasks}</span> : w.overdue_tasks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-sm text-muted-foreground">Assign tasks in Booking CRM to track team workload.</p>}
        </CardContent>
      </Card>

      <Card className="glass-panel border-white/10">
        <CardHeader><CardTitle>Approval workflow</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {APPROVAL_STAGES.map((stage, i) => (
              <Badge key={stage} variant={i === APPROVAL_STAGES.length - 1 ? "default" : "outline"} className="capitalize">
                {stage.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TaskList({
  title, icon: Icon, items, empty, orgId,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  items: { id: string; primary: string; secondary: string; badge: string; approval?: boolean }[];
  empty: string;
  orgId?: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Card className="glass-panel border-white/10">
      <CardHeader><CardTitle className="flex items-center gap-2"><Icon className="size-5" /> {title}</CardTitle></CardHeader>
      <CardContent>
        {items.length ? (
          <ul className="space-y-2 text-sm">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/5 px-3 py-2">
                <div>
                  <p className="font-medium">{item.primary}</p>
                  <p className="text-xs text-muted-foreground">{item.secondary}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">{item.badge.replace(/_/g, " ")}</Badge>
                  {item.approval && orgId ? (
                    <Button size="sm" variant="secondary" disabled={pending} onClick={() => {
                      startTransition(async () => {
                        const r = await updateApprovalStatusAction({ orgId, requestId: item.id, status: "manager_approval" });
                        if (!r.ok) toast.error(r.error); else toast.success("Moved to manager approval");
                      });
                    }}>Advance</Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted-foreground">{empty}</p>}
      </CardContent>
    </Card>
  );
}
