import { MonetizationSubNav } from "@/components/admin/monetization/monetization-sub-nav";

export function MonetizationAdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <MonetizationSubNav />
      {children}
    </div>
  );
}
