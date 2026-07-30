import {
  Activity,
  BarChart3,
  Building2,
  CalendarDays,
  Eye,
  Flag,
  FlaskConical,
  LayoutDashboard,
  Mic2,
  Radio,
  Route,
  Settings,
  Tags,
  ToggleLeft,
  Users,
} from "lucide-react";

/** Phase 1 Command Center sidebar navigation. */
export const ADMIN_SECTIONS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/live", label: "Live Now", icon: Radio },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/artists", label: "Artists", icon: Mic2 },
  { href: "/admin/events", label: "Events", icon: CalendarDays },
  { href: "/admin/venues", label: "Venue Management", icon: Building2 },
  { href: "/admin/tours", label: "Tours", icon: Route },
  { href: "/admin/genres", label: "Genres", icon: Tags },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/moderation", label: "Moderation", icon: Flag },
  { href: "/admin/observers", label: "Observer Accounts", icon: Eye },
  { href: "/admin/testing", label: "Testing Center", icon: FlaskConical },
  { href: "/admin/health#features", label: "Feature Flags", icon: ToggleLeft },
  { href: "/admin/health#settings", label: "Platform Settings", icon: Settings },
  { href: "/admin/health", label: "System Health", icon: Activity },
] as const;

export function adminSectionLabel(pathname: string): string {
  const match = ADMIN_SECTIONS.find((item) => {
    const pathOnly = item.href.split("#")[0] ?? item.href;
    if ("exact" in item && item.exact) return pathname === pathOnly;
    return pathname === pathOnly || pathname.startsWith(`${pathOnly}/`);
  });
  return match?.label ?? "Command Center";
}

export const ADMIN_PIPELINE_TODOS = [
  "Session watch-time telemetry (analytics_events.session_duration)",
  "Retention cohort rollups (daily fan return rate)",
  "Marketing attribution for growth KPIs",
  "LiveKit stream health metrics webhook",
  "AI insight generation from aggregated metrics",
];
