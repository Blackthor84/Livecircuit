import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/command-center/admin-dashboard-layout";
import { AdminPromotionsPanel } from "@/components/admin/monetization/admin-monetization-panels";
import { getMonetizationAdminSnapshot } from "@/lib/data/monetization-admin";

export const metadata: Metadata = { title: "Promotion Pricing — Admin" };

export default async function AdminPromotionsPage() {
  const snapshot = await getMonetizationAdminSnapshot();
  return (
    <>
      <AdminPageHeader title="Promotion Pricing" subtitle="Homepage features, boosts, campaigns, and festival promotion products." />
      <AdminPromotionsPanel products={snapshot.promotions} />
    </>
  );
}
