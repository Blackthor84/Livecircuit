import { requireRoles } from "@/lib/auth/guards";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRoles(["admin", "super_admin"], "/");
  return children;
}
