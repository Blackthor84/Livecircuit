import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/command-center/admin-dashboard-layout";
import { AdminRuleSimulationPanel } from "@/components/admin/business-rules/admin-business-rules-panels";

export const metadata: Metadata = { title: "Rule Simulation — Admin" };

export default function AdminRuleSimulationPage() {
  return (
    <>
      <AdminPageHeader
        title="Simulation Mode"
        subtitle="Test business rules before publishing. See applied rules, ignored rules, final pricing, and discounts."
      />
      <AdminRuleSimulationPanel />
    </>
  );
}
