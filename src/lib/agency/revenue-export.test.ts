import { describe, expect, it } from "vitest";
import {
  agencyRevenueToCsv,
  agencyRevenueToExcel,
  agencyRevenueToPdfHtml,
  type AgencyRevenueReport,
} from "@/lib/agency/revenue-export";

const sampleReport: AgencyRevenueReport = {
  orgName: "Test Talent Group",
  periodLabel: "Last 30 days",
  generatedAt: "2026-07-31",
  lines: [
    {
      category: "Tickets",
      source: "ticket_sale",
      artistName: "DJ Nova",
      genre: "music",
      state: "CA",
      venue: "Sunset Arena",
      performance: "Summer Live",
      grossCents: 5000,
      feesCents: 500,
      netCents: 4500,
      count: 1,
      month: "Jul 2026",
    },
  ],
  totals: {
    grossCents: 5000,
    feesCents: 500,
    netCents: 4500,
    tickets: 1,
    subscriptions: 0,
    tips: 0,
    merchandise: 0,
    sponsorship: 0,
    advertising: 0,
    payouts: 0,
    refunds: 0,
  },
};

describe("agency revenue export", () => {
  it("generates CSV with header and totals", () => {
    const csv = agencyRevenueToCsv(sampleReport);
    expect(csv).toContain("Category,Source,Artist");
    expect(csv).toContain("Tickets");
    expect(csv).toContain("DJ Nova");
    expect(csv).toContain("TOTALS");
  });

  it("generates Excel-compatible TSV with BOM", () => {
    const excel = agencyRevenueToExcel(sampleReport);
    expect(excel.startsWith("\uFEFF")).toBe(true);
    expect(excel).toContain("Tickets");
    expect(excel).not.toContain(",");
  });

  it("generates printable PDF HTML", () => {
    const html = agencyRevenueToPdfHtml(sampleReport);
    expect(html).toContain("Test Talent Group");
    expect(html).toContain("DJ Nova");
    expect(html).toContain("<table>");
  });
});
