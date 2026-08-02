import { MonetizationAdminShell } from "@/components/admin/monetization/monetization-admin-shell";

export default function MonetizationLayout({ children }: { children: React.ReactNode }) {
  return <MonetizationAdminShell>{children}</MonetizationAdminShell>;
}
