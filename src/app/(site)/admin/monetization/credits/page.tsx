import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/command-center/admin-dashboard-layout";
import { AdminCreditsPanel } from "@/components/admin/monetization/admin-monetization-panels";
import { getMonetizationAdminSnapshot } from "@/lib/data/monetization-admin";

export const metadata: Metadata = { title: "Marketing Credits — Admin" };

export default async function AdminCreditsPage() {
  const snapshot = await getMonetizationAdminSnapshot();
  return (
    <>
      <AdminPageHeader title="Marketing Credits" subtitle="Credits included with each agency plan, expiration, rollover, and add-on pricing." />
      <AdminCreditsPanel credits={snapshot.marketingCredits} plans={snapshot.agencyPlans} />
    </>
  );
}
