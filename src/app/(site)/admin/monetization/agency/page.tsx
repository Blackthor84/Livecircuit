import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/command-center/admin-dashboard-layout";
import { AdminAgencyPlansPanel } from "@/components/admin/monetization/admin-monetization-panels";
import { getMonetizationAdminSnapshot } from "@/lib/data/monetization-admin";

export const metadata: Metadata = { title: "Agency Plans — Admin" };

export default async function AdminAgencyPlansPage() {
  const snapshot = await getMonetizationAdminSnapshot();
  return (
    <>
      <AdminPageHeader title="Agency Plans" subtitle="Boutique, Growth, and Enterprise subscription pricing, limits, trials, and promotional rates." />
      <AdminAgencyPlansPanel plans={snapshot.agencyPlans} />
    </>
  );
}
