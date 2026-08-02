import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/command-center/admin-dashboard-layout";
import { AdminRuleHistoryPanel } from "@/components/admin/business-rules/admin-business-rules-panels";
import { getBusinessRuleHistory } from "@/lib/data/business-rules-admin";

export const metadata: Metadata = { title: "Rule Audit Log — Admin" };

export default async function AdminRuleHistoryPage() {
  const history = await getBusinessRuleHistory(100);

  return (
    <>
      <AdminPageHeader
        title="Audit Log"
        subtitle="Every rule change is logged with administrator, timestamp, previous version, and rollback support."
      />
      <AdminRuleHistoryPanel history={history} />
    </>
  );
}
