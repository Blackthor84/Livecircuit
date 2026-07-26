import { ROUTES } from "@/lib/constants";
import type { UserRole } from "@/types/database";

export type { AccountMenuItem, AccountMenuSection } from "@/lib/features/account-menu";
export {
  formatRoleBadge,
  getAccountMenuLinks,
  getAccountMenuSections,
  getUserMenuItems,
  roleBadgeClass,
} from "@/lib/features/account-menu";

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

/** Logged-in main navigation (account menu is separate). */
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

export type AuthCTAItem = {
  href: string;
  label: string;
  variant?: "default" | "outline" | "secondary";
};

/** Guest-only auth calls-to-action (header, footer, mobile menu). */
export function getGuestAuthCTAs(): AuthCTAItem[] {
  return [
    { href: ROUTES.register, label: "Get Started", variant: "default" },
    { href: ROUTES.register, label: "Create Account", variant: "secondary" },
    { href: ROUTES.login, label: "Sign In", variant: "outline" },
  ];
}
