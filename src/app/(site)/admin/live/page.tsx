import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/command-center/admin-dashboard-layout";
import { AdminLiveOpsTable } from "@/components/admin/command-center/admin-live-ops-table";
import { AdminTodoPanel } from "@/components/admin/command-center/admin-todo-panel";
import { getAdminLiveOperations } from "@/lib/data/admin-live-ops";

export const metadata: Metadata = { title: "Live Now — Command Center" };

export default async function AdminLivePage() {
  const report = await getAdminLiveOperations();

  return (
    <>
      <AdminPageHeader
        title="Live Now"
        subtitle="Active streams, concurrent viewers, moderation activity, and system health."
      />
      <div className="space-y-8">
        <AdminLiveOpsTable report={report} />
        <AdminTodoPanel items={report.todos} title="Live ops pipeline TODOs" />
      </div>
    </>
  );
}
