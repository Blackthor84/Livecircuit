import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/command-center/admin-dashboard-layout";
import { AdminRuleBuilder } from "@/components/admin/business-rules/admin-business-rules-panels";
import type { BusinessRuleCategory } from "@/lib/business-rules/types";

export const metadata: Metadata = { title: "Rule Builder — Admin" };

export default async function AdminRuleBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const defaultCategory = category as BusinessRuleCategory | undefined;

  return (
    <>
      <AdminPageHeader
        title="Rule Builder"
        subtitle="Create a new business rule with conditions, actions, priority, and target audience."
      />
      <AdminRuleBuilder defaultCategory={defaultCategory} />
    </>
  );
}
