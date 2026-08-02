import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/command-center/admin-dashboard-layout";
import { AdminFounderPricingPanel } from "@/components/admin/monetization/admin-sponsor-founder-panels";
import { getMonetizationAdminSnapshot } from "@/lib/data/monetization-admin";

export const metadata: Metadata = { title: "Founder Pricing — Admin" };

export default async function AdminFounderPricingPage() {
  const snapshot = await getMonetizationAdminSnapshot();
  return (
    <>
      <AdminPageHeader title="Founder Pricing" subtitle="Founder program copy, introductory sponsor pricing, and expiration settings." />
      <AdminFounderPricingPanel snapshot={snapshot} />
    </>
  );
}
