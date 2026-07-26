import { requireAdmin } from "@/lib/auth/guards";
import { getHeaderUser } from "@/lib/auth/session";
import { AdminDashboardLayout } from "@/components/admin/command-center/admin-dashboard-layout";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin("/");
  const user = await getHeaderUser();

  return <AdminDashboardLayout user={user}>{children}</AdminDashboardLayout>;
}
