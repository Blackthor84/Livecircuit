"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const MONETIZATION_SECTIONS = [
  { href: "/admin/monetization", label: "Overview", exact: true },
  { href: "/admin/monetization/venue", label: "Venue Pricing" },
  { href: "/admin/monetization/ticketing", label: "Ticket Pricing" },
  { href: "/admin/monetization/agency", label: "Agency Plans" },
  { href: "/admin/monetization/sponsor", label: "Sponsor Pricing" },
  { href: "/admin/monetization/founder", label: "Founder Pricing" },
  { href: "/admin/monetization/promotions", label: "Promotions" },
  { href: "/admin/monetization/credits", label: "Marketing Credits" },
  { href: "/admin/monetization/coupons", label: "Coupons" },
  { href: "/admin/monetization/taxes", label: "Taxes & Fees" },
  { href: "/admin/monetization/payouts", label: "Payout Settings" },
  { href: "/admin/monetization/future", label: "Scheduled Pricing" },
  { href: "/admin/monetization/notifications", label: "Notifications" },
  { href: "/admin/monetization/monitoring", label: "Monitoring" },
  { href: "/admin/business-rules", label: "Rules Engine" },
  { href: "/admin/platform/feature-flags", label: "Feature Flags" },
  { href: "/admin/monetization/history", label: "Pricing History" },
] as const;

export function MonetizationSubNav() {
  const pathname = usePathname();
  return (
    <nav className="mb-8 flex flex-wrap gap-1 rounded-xl border border-white/10 bg-white/[0.02] p-1">
      {MONETIZATION_SECTIONS.map((item) => {
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
