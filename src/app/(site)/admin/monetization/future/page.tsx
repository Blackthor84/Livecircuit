import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/command-center/admin-dashboard-layout";
import { AdminFuturePricingPanel } from "@/components/admin/monetization/admin-monetization-panels";
import { listScheduledPricing } from "@/lib/data/monetization-admin";

export const metadata: Metadata = { title: "Future Pricing — Admin" };

export default async function AdminFuturePricingPage() {
  const scheduled = await listScheduledPricing();
  return (
    <>
      <AdminPageHeader title="Future Pricing" subtitle="Schedule pricing changes with effective dates and preview before publish." />
      <AdminFuturePricingPanel scheduled={scheduled} />
    </>
  );
}
