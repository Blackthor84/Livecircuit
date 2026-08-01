"use client";

import { useState, useTransition } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import { AdminKpiGrid } from "@/components/admin/command-center/admin-kpi-grid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { exportAgencyRevenueAction } from "@/lib/actions/agency-features";
import {
  downloadClientFile,
  openPdfPrintWindow,
  type AgencyRevenueReport,
} from "@/lib/agency/revenue-export";
import { formatCents } from "@/lib/format";

export function AgencyRevenuePanel({ orgId, report }: { orgId: string; report: AgencyRevenueReport }) {
  const [pending, startTransition] = useTransition();
  const [periodDays, setPeriodDays] = useState(90);

  const kpis = [
    { label: "Gross revenue", value: formatCents(report.totals.grossCents) },
    { label: "Net revenue", value: formatCents(report.totals.netCents) },
    { label: "Platform fees", value: formatCents(report.totals.feesCents) },
    { label: "Tickets", value: report.totals.tickets.toLocaleString() },
    { label: "Tips", value: formatCents(report.totals.tips) },
    { label: "Merchandise", value: formatCents(report.totals.merchandise) },
    { label: "Subscriptions", value: formatCents(report.totals.subscriptions) },
    { label: "Sponsorship", value: formatCents(report.totals.sponsorship) },
  ];

  function exportFormat(format: "csv" | "excel" | "pdf") {
    startTransition(async () => {
      const result = await exportAgencyRevenueAction({ orgId, format, periodDays });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (format === "pdf") {
        openPdfPrintWindow(result.content);
        toast.success("PDF ready — use Print to save");
      } else {
        downloadClientFile(result.content, result.filename, result.mimeType);
        toast.success(`Downloaded ${result.filename}`);
      }
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Period</label>
          <select
            className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            value={periodDays}
            onChange={(e) => setPeriodDays(Number(e.target.value))}
          >
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last 12 months</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => exportFormat("csv")}>
            <Download className="size-4" /> CSV
          </Button>
          <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => exportFormat("excel")}>
            <FileSpreadsheet className="size-4" /> Excel
          </Button>
          <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => exportFormat("pdf")}>
            <FileText className="size-4" /> PDF
          </Button>
        </div>
      </div>

      <AdminKpiGrid kpis={kpis} />

      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle>Revenue breakdown</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {report.lines.length ? (
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-muted-foreground">
                  <th className="pb-3 pr-4">Category</th>
                  <th className="pb-3 pr-4">Artist</th>
                  <th className="pb-3 pr-4">Genre</th>
                  <th className="pb-3 pr-4">State</th>
                  <th className="pb-3 pr-4">Performance</th>
                  <th className="pb-3 pr-4">Gross</th>
                  <th className="pb-3">Net</th>
                </tr>
              </thead>
              <tbody>
                {report.lines.slice(0, 100).map((line, i) => (
                  <tr key={`${line.source}-${i}`} className="border-b border-white/5">
                    <td className="py-2 pr-4">{line.category}</td>
                    <td className="py-2 pr-4">{line.artistName ?? "—"}</td>
                    <td className="py-2 pr-4 capitalize">{line.genre ?? "—"}</td>
                    <td className="py-2 pr-4">{line.state ?? "—"}</td>
                    <td className="py-2 pr-4">{line.performance ?? "—"}</td>
                    <td className="py-2 pr-4">{formatCents(line.grossCents)}</td>
                    <td className="py-2">{formatCents(line.netCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">
              Revenue lines populate as tickets, tips, merch, and sponsorship flow through your roster.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
