import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/command-center/admin-dashboard-layout";
import { AdminRuleBuilder } from "@/components/admin/business-rules/admin-business-rules-panels";
import { getBusinessRuleById } from "@/lib/business-rules/rules-resolver.server";

export const metadata: Metadata = { title: "Edit Rule — Admin" };

export default async function AdminEditRulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rule = await getBusinessRuleById(id);
  if (!rule) notFound();

  return (
    <>
      <AdminPageHeader
        title={`Edit: ${rule.name}`}
        subtitle={`Version ${rule.version} — ${rule.status}`}
      />
      <AdminRuleBuilder rule={rule} />
    </>
  );
}
