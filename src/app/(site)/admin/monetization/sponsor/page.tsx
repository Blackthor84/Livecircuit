import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/command-center/admin-dashboard-layout";
import { AdminSponsorPricingPanel } from "@/components/admin/monetization/admin-sponsor-founder-panels";
import { getMonetizationAdminSnapshot } from "@/lib/data/monetization-admin";

export const metadata: Metadata = { title: "Sponsor Pricing — Admin" };

export default async function AdminSponsorPricingPage() {
  const snapshot = await getMonetizationAdminSnapshot();
  return (
    <>
      <AdminPageHeader title="Sponsor Pricing" subtitle="Arena naming rights, sponsorship addons, and contract options — fully database-driven." />
      <AdminSponsorPricingPanel snapshot={snapshot} />
    </>
  );
}
