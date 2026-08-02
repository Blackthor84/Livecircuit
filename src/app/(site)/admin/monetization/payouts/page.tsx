import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/command-center/admin-dashboard-layout";
import { AdminPayoutsPanel } from "@/components/admin/monetization/admin-monetization-panels";
import { getMonetizationAdminSnapshot } from "@/lib/data/monetization-admin";

export const metadata: Metadata = { title: "Payout Settings — Admin" };

export default async function AdminPayoutsPage() {
  const snapshot = await getMonetizationAdminSnapshot();
  return (
    <>
      <AdminPageHeader title="Payout Settings" subtitle="Payout delays, thresholds, reserves, and Stripe Connect readiness." />
      <AdminPayoutsPanel config={snapshot.payouts} />
    </>
  );
}
