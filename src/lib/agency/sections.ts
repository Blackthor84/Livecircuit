import {
  BarChart3,
  CalendarDays,
  Handshake,
  LayoutDashboard,
  MessageSquare,
  Mic2,
  Sparkles,
  Users,
  Wallet,
  Wand2,
} from "lucide-react";

export const AGENCY_SECTIONS = [
  { href: "dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "artists", label: "Artists", icon: Mic2 },
  { href: "book-roster", label: "Book Entire Roster", icon: Wand2 },
  { href: "calendar", label: "Calendar", icon: CalendarDays },
  { href: "revenue", label: "Revenue", icon: Wallet },
  { href: "analytics", label: "Analytics", icon: BarChart3 },
  { href: "team", label: "Team", icon: Users },
  { href: "communications", label: "Communications", icon: MessageSquare },
  { href: "sponsorship", label: "Sponsorship", icon: Handshake },
  { href: "profile", label: "Agency Profile", icon: Sparkles },
] as const;

export function agencySectionLabel(segment: string): string {
  const match = AGENCY_SECTIONS.find((item) => item.href === segment);
  return match?.label ?? "Agency";
}

export function agencyBasePath(orgId: string) {
  return `/agency/${orgId}`;
}

export function agencyPath(orgId: string, section: string) {
  return section === "dashboard" ? agencyBasePath(orgId) : `${agencyBasePath(orgId)}/${section}`;
}
