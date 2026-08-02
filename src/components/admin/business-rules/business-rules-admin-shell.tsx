import { BusinessRulesSubNav } from "@/components/admin/business-rules/business-rules-sub-nav";

export function BusinessRulesAdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <BusinessRulesSubNav />
      {children}
    </div>
  );
}
