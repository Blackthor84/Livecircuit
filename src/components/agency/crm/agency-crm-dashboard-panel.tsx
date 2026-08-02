"use client";

import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowRight,
  Calendar,
  CheckSquare,
  DollarSign,
  FileText,
  MessageSquare,
  TrendingUp,
  Users,
} from "lucide-react";
import { AdminKpiGrid } from "@/components/admin/command-center/admin-kpi-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { crmStageLabel } from "@/lib/agency/crm-constants";
import type { CrmDashboardPayload } from "@/lib/agency/crm-types";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";

export function AgencyCrmDashboardPanel({ data }: { data: CrmDashboardPayload }) {
  const kpis = [
    { label: "Active bookings", value: data.performanceMetrics.activeBookings.toLocaleString() },
    { label: "Completed", value: data.performanceMetrics.completedBookings.toLocaleString() },
    { label: "Monthly revenue", value: formatCents(data.monthlyRevenueCents) },
    { label: "Expected revenue", value: formatCents(data.expectedRevenueCents) },
    { label: "Conversion rate", value: `${data.performanceMetrics.conversionRate}%` },
    { label: "Avg ticket price", value: formatCents(data.performanceMetrics.avgTicketPriceCents) },
    { label: "Today's tasks", value: data.todaysTasks.length.toLocaleString() },
    { label: "Pending contracts", value: data.pendingContracts.length.toLocaleString() },
    { label: "Pending payments", value: data.pendingPayments.length.toLocaleString() },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" href="/agency/crm/pipeline">Open Pipeline</Button>
        <Button size="sm" variant="secondary" href="/agency/crm/contacts">Contacts</Button>
        <Button size="sm" variant="outline" href="/agency/crm/search">Search</Button>
        </div>
      </div>

      <AdminKpiGrid kpis={kpis} />

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <CrmSectionCard
          title="Upcoming Events"
          icon={Calendar}
          href="/agency/crm/pipeline"
          empty="No upcoming events scheduled."
        >
          {data.upcomingEvents.map((event) => (
            <Link
              key={event.id}
              href={`/agency/crm/bookings/${event.id}`}
              className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm transition-colors hover:bg-white/5"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{event.title}</p>
                <p className="text-xs text-muted-foreground">
                  {event.starts_at ? format(new Date(event.starts_at), "MMM d, yyyy · h:mm a") : "Date TBD"}
                </p>
              </div>
              <Badge variant="outline" className="shrink-0 text-[10px]">
                {crmStageLabel(event.stage)}
              </Badge>
            </Link>
          ))}
        </CrmSectionCard>

        <CrmSectionCard
          title="Today's Tasks"
          icon={CheckSquare}
          href="/agency/crm/pipeline"
          empty="No tasks due today."
        >
          {data.todaysTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{task.title}</p>
                <p className="text-xs capitalize text-muted-foreground">{task.priority} priority</p>
              </div>
              <Badge variant="secondary" className="shrink-0 text-[10px] capitalize">
                {task.status.replace("_", " ")}
              </Badge>
            </div>
          ))}
        </CrmSectionCard>

        <CrmSectionCard
          title="Pending Contracts"
          icon={FileText}
          empty="All contracts are up to date."
        >
          {data.pendingContracts.map((c) => (
            <div key={c.id} className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm">
              <p className="font-medium">{c.title}</p>
              <p className="text-xs capitalize text-muted-foreground">{c.status.replace("_", " ")}</p>
            </div>
          ))}
        </CrmSectionCard>

        <CrmSectionCard
          title="Pending Payments"
          icon={DollarSign}
          empty="No outstanding payments."
        >
          {data.pendingPayments.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm">
              <div>
                <p className="font-medium capitalize">{p.payment_type.replace("_", " ")}</p>
                <p className="text-xs capitalize text-muted-foreground">{p.status}</p>
              </div>
              <span className="tabular-nums font-medium">{formatCents(p.amount_cents)}</span>
            </div>
          ))}
        </CrmSectionCard>

        <CrmSectionCard
          title="Recent Activity"
          icon={TrendingUp}
          empty="Activity will appear as your team works bookings."
        >
          {data.recentActivity.map((a) => (
            <div key={a.id} className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm">
              <p className="font-medium">{a.title}</p>
              {a.body ? <p className="text-xs text-muted-foreground">{a.body}</p> : null}
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
              </p>
            </div>
          ))}
        </CrmSectionCard>

        <CrmSectionCard
          title="Recent Messages"
          icon={MessageSquare}
          href="/agency/communications"
          empty="No recent conversations."
        >
          {data.recentMessages.map((m) => (
            <Link
              key={m.id}
              href="/agency/communications"
              className="block rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm transition-colors hover:bg-white/5"
            >
              <p className="truncate font-medium">{m.subject ?? "Conversation"}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(m.updated_at), { addSuffix: true })}
              </p>
            </Link>
          ))}
        </CrmSectionCard>

        <CrmSectionCard
          title="Upcoming Deadlines"
          icon={CheckSquare}
          empty="No upcoming deadlines."
        >
          {data.upcomingDeadlines.map((task) => (
            <div key={task.id} className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm">
              <p className="font-medium">{task.title}</p>
              <p className="text-xs text-muted-foreground">
                Due {task.due_at ? format(new Date(task.due_at), "MMM d, yyyy") : "—"}
              </p>
            </div>
          ))}
        </CrmSectionCard>

        <CrmSectionCard
          title="Bookings by Stage"
          icon={TrendingUp}
          href="/agency/crm/pipeline"
          empty="Create your first booking to see pipeline distribution."
        >
          <div className="space-y-1.5">
            {data.bookingsByStage
              .filter((s) => s.count > 0)
              .map((s) => (
                <div key={s.stage} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{crmStageLabel(s.stage)}</span>
                  <span className="font-medium tabular-nums">{s.count}</span>
                </div>
              ))}
          </div>
        </CrmSectionCard>

        <CrmSectionCard
          title="Top Performing Artists"
          icon={Users}
          empty="Artist performance ranks by revenue as events complete."
        >
          {data.topArtists.map((a) => (
            <div key={a.name} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm">
              <div>
                <p className="font-medium">{a.name}</p>
                <p className="text-xs text-muted-foreground">{a.bookings} bookings</p>
              </div>
              <span className="tabular-nums text-muted-foreground">{formatCents(a.revenueCents)}</span>
            </div>
          ))}
        </CrmSectionCard>

        <CrmSectionCard
          title="Calendar Preview"
          icon={Calendar}
          href="/agency/crm/calendar"
          empty="No upcoming calendar events."
        >
          {data.calendarPreview.map((e) => (
            <div key={e.id} className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm">
              <p className="font-medium">{e.title}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(e.starts_at), "MMM d · h:mm a")}
              </p>
            </div>
          ))}
        </CrmSectionCard>

        <CrmSectionCard
          title="Recent Sponsorships"
          icon={DollarSign}
          href="/agency/sponsorship"
          empty="No sponsorship proposals yet."
        >
          {data.recentSponsorships.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm">
              <p className="truncate font-medium">{s.title}</p>
              <Badge variant="outline" className="shrink-0 text-[10px] capitalize">
                {s.status.replace("_", " ")}
              </Badge>
            </div>
          ))}
        </CrmSectionCard>
      </div>
    </div>
  );
}

function CrmSectionCard({
  title,
  icon: Icon,
  href,
  empty,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  empty: string;
  children: React.ReactNode;
}) {
  const items = Array.isArray(children) ? children : [children];
  const hasContent = items.some(Boolean) && items.length > 0 && !(items.length === 1 && !items[0]);

  return (
    <Card className="glass-panel border-white/10">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4 text-primary" />
          {title}
        </CardTitle>
        {href ? (
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" href={href}>
            View all
            <ArrowRight className="size-3" />
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {hasContent ? (
          <div className="space-y-2">{children}</div>
        ) : (
          <p className={cn("text-sm text-muted-foreground")}>{empty}</p>
        )}
      </CardContent>
    </Card>
  );
}
