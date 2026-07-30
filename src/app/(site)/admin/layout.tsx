import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guards";
import { isImpersonating } from "@/lib/auth/impersonation";
import { getHeaderUser } from "@/lib/auth/session";
import { AdminDashboardLayout } from "@/components/admin/command-center/admin-dashboard-layout";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (await isImpersonating()) redirect("/discover");
  await requireAdmin("/");
  const user = await getHeaderUser();

  return <AdminDashboardLayout user={user}>{children}</AdminDashboardLayout>;
}
