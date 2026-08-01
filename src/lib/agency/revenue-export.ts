import { formatCents } from "@/lib/format";

export type AgencyRevenueLine = {
  category: string;
  source: string;
  artistName: string | null;
  genre: string | null;
  state: string | null;
  venue: string | null;
  performance: string | null;
  grossCents: number;
  feesCents: number;
  netCents: number;
  count: number;
  month: string;
};

export type AgencyRevenueReport = {
  orgName: string;
  periodLabel: string;
  generatedAt: string;
  lines: AgencyRevenueLine[];
  totals: {
    grossCents: number;
    feesCents: number;
    netCents: number;
    tickets: number;
    subscriptions: number;
    tips: number;
    merchandise: number;
    sponsorship: number;
    advertising: number;
    payouts: number;
    refunds: number;
  };
};

function escapeCsv(value: string | number | null | undefined): string {
  const str = value == null ? "" : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function agencyRevenueToCsv(report: AgencyRevenueReport): string {
  const header = [
    "Category",
    "Source",
    "Artist",
    "Genre",
    "State",
    "Venue",
    "Performance",
    "Gross",
    "Fees",
    "Net",
    "Count",
    "Month",
  ];

  const rows = report.lines.map((line) =>
    [
      line.category,
      line.source,
      line.artistName,
      line.genre,
      line.state,
      line.venue,
      line.performance,
      (line.grossCents / 100).toFixed(2),
      (line.feesCents / 100).toFixed(2),
      (line.netCents / 100).toFixed(2),
      line.count,
      line.month,
    ]
      .map(escapeCsv)
      .join(",")
  );

  const summary = [
    "",
    "TOTALS",
    "",
    "",
    "",
    "",
    "",
    (report.totals.grossCents / 100).toFixed(2),
    (report.totals.feesCents / 100).toFixed(2),
    (report.totals.netCents / 100).toFixed(2),
    "",
    report.periodLabel,
  ]
    .map(escapeCsv)
    .join(",");

  return [header.join(","), ...rows, summary].join("\n");
}

/** Excel-compatible TSV with UTF-8 BOM */
export function agencyRevenueToExcel(report: AgencyRevenueReport): string {
  const csv = agencyRevenueToCsv(report);
  return `\uFEFF${csv.replace(/,/g, "\t")}`;
}

export function agencyRevenueToPdfHtml(report: AgencyRevenueReport): string {
  const rows = report.lines
    .map(
      (line) => `
      <tr>
        <td>${line.category}</td>
        <td>${line.source}</td>
        <td>${line.artistName ?? "—"}</td>
        <td>${line.genre ?? "—"}</td>
        <td>${formatCents(line.grossCents)}</td>
        <td>${formatCents(line.netCents)}</td>
        <td>${line.count}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${report.orgName} Revenue Report</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 32px; color: #111; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    p.meta { color: #555; font-size: 13px; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f5f5f5; }
    .totals { margin-top: 24px; font-weight: 600; }
  </style>
</head>
<body>
  <h1>${report.orgName} — Revenue Report</h1>
  <p class="meta">${report.periodLabel} · Generated ${report.generatedAt}</p>
  <table>
    <thead>
      <tr>
        <th>Category</th><th>Source</th><th>Artist</th><th>Genre</th>
        <th>Gross</th><th>Net</th><th>Count</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="totals">
    Gross ${formatCents(report.totals.grossCents)} ·
    Net ${formatCents(report.totals.netCents)} ·
    Tickets ${report.totals.tickets} ·
    Tips ${formatCents(report.totals.tips)} ·
    Merch ${formatCents(report.totals.merchandise)}
  </p>
</body>
</html>`;
}

export function downloadClientFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function openPdfPrintWindow(html: string) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}
