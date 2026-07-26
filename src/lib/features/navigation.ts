import { ROUTES } from "@/lib/constants";
import type { UserRole } from "@/types/database";
import { isCommandCenterAdmin, isSuperAdmin } from "@/lib/features/access";

export type NavItem = { href: string; label: string };

type NavUser = {
  role: UserRole;
} | null;

export function getPublicNav(): NavItem[] {
  return [
    { href: ROUTES.home, label: "Home" },
    { href: ROUTES.discover, label: "Events" },
    { href: ROUTES.artists, label: "Artists" },
    { href: ROUTES.venues, label: "Venues" },
    { href: "/about", label: "About" },
  ];
}

export function getAuthenticatedNav(user: NavUser): NavItem[] {
  if (!user) return getPublicNav();

  const items: NavItem[] = [
    { href: ROUTES.home, label: "Home" },
    { href: ROUTES.discover, label: "Discover" },
    { href: ROUTES.dashboard, label: "My Events" },
    { href: "/following", label: "Following" },
    { href: ROUTES.settings, label: "Profile" },
  ];

  if (user.role === "artist") {
    items.push(
      { href: ROUTES.artistDashboard, label: "Dashboard" },
      { href: ROUTES.artistEventsNew, label: "Create Event" },
      { href: "/artist/momentum", label: "Analytics" }
    );
  }

  return items;
}

export function getMainNav(user: NavUser): NavItem[] {
  return user ? getAuthenticatedNav(user) : getPublicNav();
}

export type UserMenuItem = { href: string; label: string; feature?: "hidden" };

export function getUserMenuItems(user: { role: UserRole; sponsorPortal?: boolean }): UserMenuItem[] {
  const items: UserMenuItem[] = [
    { href: ROUTES.dashboard, label: "My Events" },
    { href: ROUTES.settings, label: "Profile" },
    { href: ROUTES.notifications, label: "Notifications" },
  ];

  if (user.role === "artist" || isCommandCenterAdmin(user.role)) {
    items.splice(1, 0, { href: ROUTES.artistDashboard, label: "Artist dashboard" });
  }

  if (isCommandCenterAdmin(user.role)) {
    items.push({ href: ROUTES.admin, label: "Admin" });
  }

  if (isSuperAdmin(user.role)) {
    items.push(
      { href: ROUTES.world, label: "World (preview)" },
      { href: ROUTES.festivals, label: "Festivals (preview)" },
      { href: ROUTES.marketplace, label: "Marketplace (preview)" },
      { href: ROUTES.friends, label: "Friends (preview)" },
      { href: ROUTES.messages, label: "Messages (preview)" },
      { href: ROUTES.coins, label: "Coins (preview)" }
    );
    if (user.sponsorPortal) {
      items.push({ href: "/sponsor/dashboard", label: "Sponsor portal" });
    }
  }

  return items;
}
