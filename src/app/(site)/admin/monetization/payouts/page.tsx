import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/command-center/admin-dashboard-layout";
import { AdminPayoutsPanel } from "@/components/admin/monetization/admin-monetization-panels";
import { AdminArtistPayoutsDashboard } from "@/components/admin/monetization/admin-artist-payouts-dashboard";
import { AdminFinancialHardeningPanel } from "@/components/admin/monetization/admin-financial-hardening-panel";
import { AdminTicketRevenueSummaryCard } from "@/components/admin/monetization/admin-ticket-revenue-summary";
import { getMonetizationAdminSnapshot } from "@/lib/data/monetization-admin";
import { listArtistReceivables } from "@/lib/services/artist-recovery.service";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Payout Settings — Admin" };

export default async function AdminPayoutsPage() {
  const snapshot = await getMonetizationAdminSnapshot();
  const supabase = await createClient();
  const receivables = await listArtistReceivables(supabase, {
    status: undefined,
    limit: 50,
  }).then((rows) => rows.filter((row) => row.status !== "recovered" && row.status !== "none"));
  return (
    <>
      <AdminPageHeader title="Payout Settings" subtitle="Payout delays, thresholds, reserves, and Stripe Connect readiness." />
      <div className="space-y-6">
        <AdminTicketRevenueSummaryCard />
        <AdminArtistPayoutsDashboard />
        <AdminFinancialHardeningPanel receivables={receivables} />
        <AdminPayoutsPanel config={snapshot.payouts} />
      </div>
    </>
  );
}
