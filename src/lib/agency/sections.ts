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

export type AgencySectionHref = (typeof AGENCY_SECTIONS)[number]["href"];

export const AGENCY_DASHBOARD_PATH = "/agency/dashboard";

export function agencyPortalPath(section: string): string {
  return section === "dashboard" ? AGENCY_DASHBOARD_PATH : `/agency/${section}`;
}

/** Session-based portal path (org resolved from authenticated user, not URL). */
export function agencyPath(_orgId: string | null | undefined, section: string): string {
  return agencyPortalPath(section);
}

export function agencyDashboardPath(): string {
  return AGENCY_DASHBOARD_PATH;
}

export function agencySectionLabel(segment: string): string {
  const match = AGENCY_SECTIONS.find((item) => item.href === segment);
  return match?.label ?? "Agency";
}

export function agencySectionFromPathname(pathname: string): string {
  if (pathname === AGENCY_DASHBOARD_PATH) return "dashboard";
  const prefix = "/agency/";
  if (!pathname.startsWith(prefix)) return "dashboard";
  const segment = pathname.slice(prefix.length).split("/")[0] ?? "dashboard";
  return AGENCY_SECTIONS.some((item) => item.href === segment) ? segment : "dashboard";
}

export function revalidateAgencyPortalPaths() {
  return AGENCY_SECTIONS.map((section) => agencyPortalPath(section.href));
}
