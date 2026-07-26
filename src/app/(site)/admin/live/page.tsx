import type { Metadata } from "next";
import { AdminCommandShell } from "@/components/admin/command-center/admin-command-shell";
import { AdminLiveOpsTable } from "@/components/admin/command-center/admin-live-ops-table";
import { AdminTodoPanel } from "@/components/admin/command-center/admin-todo-panel";
import { getAdminLiveOperations } from "@/lib/data/admin-live-ops";

export const metadata: Metadata = { title: "Live Operations — Admin" };

export default async function AdminLivePage() {
  const report = await getAdminLiveOperations();

  return (
    <AdminCommandShell
      title="Live Operations"
      subtitle="Active streams, concurrent viewers, moderation activity, and system health."
    >
      <div className="space-y-8">
        <AdminLiveOpsTable report={report} />
        <AdminTodoPanel items={report.todos} title="Live ops pipeline TODOs" />
      </div>
    </AdminCommandShell>
  );
}
