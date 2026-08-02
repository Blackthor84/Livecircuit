import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/command-center/admin-dashboard-layout";
import { AdminMonetizationOverview } from "@/components/admin/monetization/admin-monetization-panels";
import { getMonetizationAdminSnapshot, getMonetizationAnalytics } from "@/lib/data/monetization-admin";

export const metadata: Metadata = { title: "Monetization Center — Admin" };

export default async function AdminMonetizationPage() {
  const [snapshot, analytics] = await Promise.all([getMonetizationAdminSnapshot(), getMonetizationAnalytics()]);

  return (
    <>
      <AdminPageHeader
        title="Monetization Center"
        subtitle="Unified control for venue fees, ticketing, agency plans, sponsor/founder pricing, coupons, feature flags, scheduled pricing, and the Rules Engine — no code changes required."
      />
      <AdminMonetizationOverview snapshot={snapshot} analytics={analytics} />
    </>
  );
}
