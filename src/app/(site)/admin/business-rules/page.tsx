import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/command-center/admin-dashboard-layout";
import { AdminBusinessRulesOverview } from "@/components/admin/business-rules/admin-business-rules-panels";
import { getBusinessRulesOverview } from "@/lib/data/business-rules-admin";

export const metadata: Metadata = { title: "Business Rules — Admin" };

export default async function AdminBusinessRulesPage() {
  const overview = await getBusinessRulesOverview();

  return (
    <>
      <AdminPageHeader
        title="Business Rules"
        subtitle="Central decision engine for pricing, permissions, discounts, venue access, and feature availability — fully configurable without code changes."
      />
      <AdminBusinessRulesOverview {...overview} />
    </>
  );
}
