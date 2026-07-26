import { AdminKpiGrid } from "@/components/admin/command-center/admin-kpi-grid";
import { getAdminOverviewKpis } from "@/lib/data/admin-command-center";

export async function AdminOverviewMetrics() {
  const kpis = await getAdminOverviewKpis();
  return <AdminKpiGrid kpis={kpis} />;
}
