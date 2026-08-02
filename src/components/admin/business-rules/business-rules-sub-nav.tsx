"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CATEGORY_LABELS, type BusinessRuleCategory } from "@/lib/business-rules/types";
import { cn } from "@/lib/utils";

export const BUSINESS_RULES_SECTIONS = [
  { href: "/admin/business-rules", label: "Overview", exact: true },
  { href: "/admin/business-rules/venue", label: "Venue Rules", category: "venue" as BusinessRuleCategory },
  { href: "/admin/business-rules/pricing", label: "Pricing Rules", category: "pricing" as BusinessRuleCategory },
  { href: "/admin/business-rules/subscription", label: "Subscription Rules", category: "subscription" as BusinessRuleCategory },
  { href: "/admin/business-rules/agency", label: "Agency Rules", category: "agency" as BusinessRuleCategory },
  { href: "/admin/business-rules/artist", label: "Artist Rules", category: "artist" as BusinessRuleCategory },
  { href: "/admin/business-rules/sponsor", label: "Sponsor Rules", category: "sponsor" as BusinessRuleCategory },
  { href: "/admin/business-rules/discount", label: "Discount Rules", category: "discount" as BusinessRuleCategory },
  { href: "/admin/business-rules/promotion", label: "Promotion Rules", category: "promotion" as BusinessRuleCategory },
  { href: "/admin/business-rules/ticket", label: "Ticket Rules", category: "ticket" as BusinessRuleCategory },
  { href: "/admin/business-rules/feature-access", label: "Feature Access", category: "feature_access" as BusinessRuleCategory },
  { href: "/admin/business-rules/automation", label: "Automation", category: "automation" as BusinessRuleCategory },
  { href: "/admin/business-rules/holiday", label: "Holiday Rules", category: "holiday" as BusinessRuleCategory },
  { href: "/admin/business-rules/regional", label: "Regional Rules", category: "regional" as BusinessRuleCategory },
  { href: "/admin/business-rules/experimental", label: "Experimental", category: "experimental" as BusinessRuleCategory },
  { href: "/admin/business-rules/simulate", label: "Simulation", exact: true },
  { href: "/admin/business-rules/history", label: "Audit Log", exact: true },
] as const;

export function BusinessRulesSubNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-8 flex flex-wrap gap-1 rounded-xl border border-white/10 bg-white/[0.02] p-1">
      {BUSINESS_RULES_SECTIONS.map((item) => {
        const active =
          "exact" in item && item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-lg px-3 py-2 text-sm transition-colors",
              active ? "bg-primary/15 font-medium text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function categoryLabel(category: BusinessRuleCategory): string {
  return CATEGORY_LABELS[category] ?? category;
}
