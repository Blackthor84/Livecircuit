"use client";

import { useTransition } from "react";
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { toast } from "sonner";
import { AdminKpiGrid } from "@/components/admin/command-center/admin-kpi-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createAgencyInvoiceAction, createAgencyPayoutRuleAction } from "@/lib/actions/agency-business-os";
import type { AgencyFinancePayload } from "@/lib/agency/business-os-types";
import { exportAgencyRevenueAction } from "@/lib/actions/agency-features";
import { downloadClientFile, openPdfPrintWindow } from "@/lib/agency/revenue-export";
import { formatCents } from "@/lib/format";

export function AgencyOsFinancePanel({ orgId, data }: { orgId: string; data: AgencyFinancePayload }) {
  const o = data.overview;
  const kpis = [
    { label: "Monthly revenue", value: formatCents(o.monthlyRevenueCents) },
    { label: "Yearly revenue", value: formatCents(o.yearlyRevenueCents) },
    { label: "Gross revenue", value: formatCents(o.grossRevenueCents) },
    { label: "Net revenue", value: formatCents(o.netRevenueCents) },
    { label: "Platform fees", value: formatCents(o.platformFeesCents) },
    { label: "Agency revenue", value: formatCents(o.agencyRevenueCents) },
    { label: "Manager revenue", value: formatCents(o.managerRevenueCents) },
    { label: "Projected revenue", value: formatCents(o.projectedRevenueCents) },
    { label: "Recurring revenue", value: formatCents(o.recurringRevenueCents) },
    { label: "Outstanding payments", value: formatCents(o.outstandingPaymentsCents) },
    { label: "Pending payouts", value: formatCents(o.pendingPayoutsCents) },
    { label: "Cash flow", value: formatCents(o.cashFlowCents) },
  ];

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="flex h-auto flex-wrap gap-1 bg-transparent p-0">
        {["overview", "breakdown", "payouts", "commissions", "pnl", "invoices"].map((t) => (
          <TabsTrigger key={t} value={t} className="capitalize data-[state=active]:bg-primary/15 data-[state=active]:text-primary">{t === "pnl" ? "P&L" : t}</TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        <AdminKpiGrid kpis={kpis} />
        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="glass-panel border-white/10">
            <CardHeader><CardTitle>Financial trends</CardTitle></CardHeader>
            <CardContent className="h-64">
              {data.trends.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => formatCents(Number(v ?? 0))} />
                    <Line type="monotone" dataKey="grossCents" stroke="hsl(var(--primary))" name="Gross" />
                    <Line type="monotone" dataKey="netCents" stroke="#a78bfa" name="Net" />
                  </LineChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-muted-foreground">Trends populate as roster events generate revenue.</p>}
            </CardContent>
          </Card>
          <Card className="glass-panel border-white/10">
            <CardHeader><CardTitle>Revenue streams</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Ticket revenue" value={formatCents(data.streams.ticketRevenueCents)} />
              <Row label="VIP revenue" value={formatCents(data.streams.vipRevenueCents)} />
              <Row label="Backstage pass" value={formatCents(data.streams.backstagePassRevenueCents)} />
              <Row label="Pay-per-view" value={formatCents(data.streams.ppvRevenueCents)} />
              <Row label="Subscriptions" value={formatCents(data.streams.subscriptionRevenueCents)} />
              <Row label="Tax estimate" value={formatCents(o.taxEstimateCents)} />
              <Row label="Refunds" value={formatCents(o.refundsCents)} />
            </CardContent>
          </Card>
        </div>
        <ExportBar orgId={orgId} />
      </TabsContent>

      <TabsContent value="breakdown" className="grid gap-6 xl:grid-cols-2">
        <BreakdownCard title="By artist" rows={data.byArtist} />
        <BreakdownCard title="By event" rows={data.byEvent} />
        <BreakdownCard title="By venue" rows={data.byVenue} />
        <BreakdownCard title="By genre" rows={data.byGenre} />
      </TabsContent>

      <TabsContent value="payouts" className="space-y-6">
        <PayoutRulesSection orgId={orgId} rules={data.payoutRules} />
        <Card className="glass-panel border-white/10">
          <CardHeader><CardTitle>Payout history</CardTitle></CardHeader>
          <CardContent>
            {data.payouts.length ? (
              <ul className="space-y-2 text-sm">
                {data.payouts.map((p) => (
                  <li key={p.id} className="flex justify-between rounded-lg border border-white/5 px-3 py-2">
                    <span>{p.description ?? "Payout"}</span>
                    <span className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">{p.status}</Badge>
                      <span className="tabular-nums">{formatCents(p.amount_cents)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">Payouts appear as royalty statements are processed. Stripe-ready architecture.</p>}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="commissions" className="space-y-4">
        <Card className="glass-panel border-white/10">
          <CardHeader><CardTitle>Commission tracking</CardTitle></CardHeader>
          <CardContent>
            {data.commissions.length ? (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-muted-foreground"><th className="pb-2">Status</th><th className="pb-2">Rate</th><th className="pb-2">Earned</th><th className="pb-2">Paid</th></tr></thead>
                <tbody>
                  {data.commissions.map((c) => (
                    <tr key={c.id} className="border-t border-white/5">
                      <td className="py-2 capitalize">{c.status}</td>
                      <td className="py-2">{c.commission_percent}%</td>
                      <td className="py-2 tabular-nums">{formatCents(c.earned_cents)}</td>
                      <td className="py-2 tabular-nums">{formatCents(c.paid_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-sm text-muted-foreground">Manager commissions track automatically from revenue splits.</p>}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="pnl" className="space-y-4">
        {data.profitLoss.map((row) => (
          <Card key={row.label} className="glass-panel border-white/10">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
              <div>
                <p className="font-semibold">{row.label}</p>
                <p className="text-sm text-muted-foreground">Margin {row.marginPercent}%</p>
              </div>
              <div className="flex gap-6 text-sm">
                <span>Income <strong className="tabular-nums">{formatCents(row.incomeCents)}</strong></span>
                <span>Expenses <strong className="tabular-nums">{formatCents(row.expensesCents)}</strong></span>
                <span className="text-emerald-400">Net <strong className="tabular-nums">{formatCents(row.netProfitCents)}</strong></span>
              </div>
            </CardContent>
          </Card>
        ))}
      </TabsContent>

      <TabsContent value="invoices" className="space-y-4">
        <CreateInvoiceForm orgId={orgId} />
        <Card className="glass-panel border-white/10">
          <CardHeader><CardTitle>Invoices & statements</CardTitle></CardHeader>
          <CardContent>
            {data.invoices.length ? (
              <ul className="space-y-2 text-sm">
                {data.invoices.map((inv) => (
                  <li key={inv.id} className="flex justify-between rounded-lg border border-white/5 px-3 py-2">
                    <div>
                      <p className="font-medium">{inv.invoice_number}</p>
                      <p className="text-xs text-muted-foreground">{inv.recipient_name} · {inv.invoice_type}</p>
                    </div>
                    <span className="flex items-center gap-2">
                      <Badge variant="outline">{inv.status}</Badge>
                      {formatCents(inv.amount_cents)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">Generate invoices for sponsors, artists, and agency billing.</p>}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className="tabular-nums font-medium">{value}</span></div>;
}

function BreakdownCard({ title, rows }: { title: string; rows: { name: string; cents: number }[] }) {
  return (
    <Card className="glass-panel border-white/10">
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="h-56">
        {rows.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows.slice(0, 8)} layout="vertical">
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => formatCents(Number(v ?? 0))} />
              <Bar dataKey="cents" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <p className="text-sm text-muted-foreground">No data yet.</p>}
      </CardContent>
    </Card>
  );
}

function PayoutRulesSection({ orgId, rules }: { orgId: string; rules: AgencyFinancePayload["payoutRules"] }) {
  const [pending, startTransition] = useTransition();
  return (
    <Card className="glass-panel border-white/10">
      <CardHeader><CardTitle>Royalty split rules</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {rules.map((rule) => (
          <div key={rule.id} className="rounded-lg border border-white/10 p-3">
            <p className="font-medium">{rule.name} {rule.is_default ? <Badge className="ml-2">Default</Badge> : null}</p>
            <p className="mt-1 text-sm text-muted-foreground">{rule.splits.map((s) => `${s.role} ${s.percent}%`).join(" · ")}</p>
          </div>
        ))}
        <form className="flex flex-wrap gap-2" onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const r = await createAgencyPayoutRuleAction({ orgId, name: "Custom Split", splits: [{ role: "artist", percent: 80 }, { role: "agency", percent: 15 }, { role: "manager", percent: 5 }], isDefault: false });
            if (!r.ok) toast.error(r.error); else toast.success("Split rule saved");
          });
        }}>
          <Button type="submit" size="sm" disabled={pending}>Add standard split rule</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function CreateInvoiceForm({ orgId }: { orgId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <form className="glass-panel flex flex-wrap gap-2 rounded-xl border border-white/10 p-4" onSubmit={(e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      startTransition(async () => {
        const r = await createAgencyInvoiceAction({ orgId, recipientName: String(fd.get("recipient")), amountCents: Number(fd.get("amount")), recipientEmail: String(fd.get("email") || "") || undefined });
        if (!r.ok) toast.error(r.error); else { toast.success("Invoice created"); e.currentTarget.reset(); }
      });
    }}>
      <Input name="recipient" placeholder="Recipient" required className="min-w-[160px] flex-1" />
      <Input name="email" type="email" placeholder="Email" className="min-w-[160px]" />
      <Input name="amount" type="number" placeholder="Amount (¢)" required className="w-32" />
      <Button type="submit" size="sm" disabled={pending}>Generate invoice</Button>
    </form>
  );
}

function ExportBar({ orgId }: { orgId: string }) {
  const [pending, startTransition] = useTransition();
  function exp(format: "csv" | "excel" | "pdf") {
    startTransition(async () => {
      const r = await exportAgencyRevenueAction({ orgId, format, periodDays: 365 });
      if (!r.ok) toast.error(r.error);
      else if (format === "pdf") { openPdfPrintWindow(r.content); toast.success("PDF ready"); }
      else { downloadClientFile(r.content, r.filename, r.mimeType); toast.success("Exported"); }
    });
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => exp("csv")}>Export CSV</Button>
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => exp("excel")}>Export Excel</Button>
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => exp("pdf")}>Export PDF</Button>
    </div>
  );
}
