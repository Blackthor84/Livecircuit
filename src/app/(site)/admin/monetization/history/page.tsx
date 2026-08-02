import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/command-center/admin-dashboard-layout";
import { AdminPricingHistoryPanel } from "@/components/admin/monetization/admin-monetization-panels";
import { listPricingHistory } from "@/lib/data/monetization-admin";

export const metadata: Metadata = { title: "Pricing History — Admin" };

export default async function AdminPricingHistoryPage() {
  const history = await listPricingHistory(100);
  return (
    <>
      <AdminPageHeader title="Pricing History" subtitle="Audit log of every pricing change with rollback support." />
      <AdminPricingHistoryPanel history={history} />
    </>
  );
}
