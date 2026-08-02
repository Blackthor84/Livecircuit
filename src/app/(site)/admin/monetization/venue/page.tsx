import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/command-center/admin-dashboard-layout";
import { AdminVenuePricingPanel } from "@/components/admin/monetization/admin-venue-pricing-panel";
import { getMonetizationAdminSnapshot } from "@/lib/data/monetization-admin";

export const metadata: Metadata = { title: "Venue Pricing — Admin" };

export default async function AdminVenuePricingPage() {
  const snapshot = await getMonetizationAdminSnapshot();
  return (
    <>
      <AdminPageHeader title="Venue Pricing" subtitle="Configure booking fees, discounts, promotions, and scheduled pricing for every venue tier." />
      <AdminVenuePricingPanel tiers={snapshot.venues} />
    </>
  );
}
