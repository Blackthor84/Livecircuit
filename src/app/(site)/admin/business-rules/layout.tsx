import { BusinessRulesAdminShell } from "@/components/admin/business-rules/business-rules-admin-shell";

export default function BusinessRulesLayout({ children }: { children: React.ReactNode }) {
  return <BusinessRulesAdminShell>{children}</BusinessRulesAdminShell>;
}
