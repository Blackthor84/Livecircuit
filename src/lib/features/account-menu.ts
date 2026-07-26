import type { LucideIcon } from "lucide-react";
import { Bell, Mic2, Rocket, Settings, Shield, User } from "lucide-react";
import { ROUTES } from "@/lib/constants";
import type { UserRole } from "@/types/database";

export type AccountMenuItem = {
  label: string;
  href: string;
  icon?: LucideIcon;
  emoji?: string;
};

export type AccountMenuSection = {
  items: AccountMenuItem[];
};

/** Phase 1 account dropdown — core links + one role-specific entry. */
export function getAccountMenuSections(user: { role: UserRole }): AccountMenuSection[] {
  const sections: AccountMenuSection[] = [
    {
      items: [
        { label: "Profile", href: ROUTES.profile, icon: User },
        { label: "Settings", href: ROUTES.settings, icon: Settings },
        { label: "Notifications", href: ROUTES.notifications, icon: Bell },
      ],
    },
  ];

  if (user.role === "artist") {
    sections.push({
      items: [{ label: "Artist Dashboard", href: ROUTES.artistDashboard, icon: Mic2 }],
    });
  } else if (user.role === "admin") {
    sections.push({
      items: [{ label: "Admin Dashboard", href: ROUTES.admin, icon: Shield }],
    });
  } else if (user.role === "super_admin") {
    sections.push({
      items: [{ label: "Command Center", href: ROUTES.admin, icon: Rocket }],
    });
  }

  return sections;
}

export function getAccountMenuLinks(user: { role: UserRole }): AccountMenuItem[] {
  return getAccountMenuSections(user).flatMap((section) => section.items);
}

export function formatRoleBadge(role: UserRole): string {
  switch (role) {
    case "super_admin":
      return "SUPER ADMIN";
    case "admin":
      return "ADMIN";
    case "artist":
      return "ARTIST";
    default:
      return "FAN";
  }
}

export function roleBadgeClass(role: UserRole): string {
  switch (role) {
    case "super_admin":
      return "border-primary/40 bg-primary/15 text-primary";
    case "admin":
      return "border-violet-400/40 bg-violet-500/15 text-violet-200";
    case "artist":
      return "border-emerald-400/40 bg-emerald-500/15 text-emerald-200";
    default:
      return "border-white/15 bg-white/5 text-muted-foreground";
  }
}

/** @deprecated Use getAccountMenuLinks */
export function getUserMenuItems(user: { role: UserRole }) {
  return getAccountMenuLinks(user).map(({ href, label }) => ({ href, label }));
}
