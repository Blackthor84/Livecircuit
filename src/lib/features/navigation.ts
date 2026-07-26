import { ROUTES } from "@/lib/constants";
import type { UserRole } from "@/types/database";

export type NavItem = { href: string; label: string };

type NavUser = {
  role: UserRole;
} | null;

/** Logged-out main navigation. */
export function getPublicNav(): NavItem[] {
  return [
    { href: ROUTES.home, label: "Home" },
    { href: ROUTES.discover, label: "Discover" },
    { href: ROUTES.artists, label: "Artists" },
    { href: ROUTES.venues, label: "Venues" },
    { href: ROUTES.about, label: "About" },
  ];
}

/** Logged-in main navigation (profile menu is separate). */
export function getAuthenticatedNav(_user: NavUser): NavItem[] {
  return [
    { href: ROUTES.home, label: "Home" },
    { href: ROUTES.discover, label: "Discover" },
    { href: ROUTES.dashboard, label: "Events" },
    { href: ROUTES.following, label: "Following" },
    { href: ROUTES.notifications, label: "Notifications" },
  ];
}

export function getMainNav(user: NavUser): NavItem[] {
  return user ? getAuthenticatedNav(user) : getPublicNav();
}

export type UserMenuItem = { href: string; label: string };

export function getUserMenuItems(user: { role: UserRole }): UserMenuItem[] {
  const items: UserMenuItem[] = [
    { href: ROUTES.settings, label: "My Profile" },
    { href: ROUTES.settings, label: "Settings" },
  ];

  if (user.role === "artist") {
    items.push(
      { href: ROUTES.artistDashboard, label: "Artist Dashboard" },
      { href: ROUTES.artistEventsNew, label: "Create Event" }
    );
  }

  if (user.role === "admin") {
    items.push({ href: ROUTES.admin, label: "Admin Dashboard" });
  }

  if (user.role === "super_admin") {
    items.push({ href: ROUTES.admin, label: "Command Center" });
  }

  return items;
}
