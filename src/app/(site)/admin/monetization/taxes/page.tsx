import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/command-center/admin-dashboard-layout";
import { AdminTaxesPanel } from "@/components/admin/monetization/admin-monetization-panels";
import { getMonetizationAdminSnapshot } from "@/lib/data/monetization-admin";

export const metadata: Metadata = { title: "Taxes & Fees — Admin" };

export default async function AdminTaxesPage() {
  const snapshot = await getMonetizationAdminSnapshot();
  return (
    <>
      <AdminPageHeader title="Taxes & Fees" subtitle="Sales tax, VAT, GST, regional rules, and fee display options." />
      <AdminTaxesPanel config={snapshot.taxes} />
    </>
  );
}
