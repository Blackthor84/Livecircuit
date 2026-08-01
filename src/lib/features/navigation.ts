import type { LucideIcon } from "lucide-react";
import { Building2, Mic } from "lucide-react";
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

export type NavItem = {
  href: string;
  label: string;
  icon?: LucideIcon;
  badge?: string;
  description?: string;
  featured?: boolean;
};

type NavUser = {
  role: UserRole;
} | null;

/** Logged-out main navigation. */
export function getPublicNav(): NavItem[] {
  return [
    { href: ROUTES.home, label: "Home" },
    { href: ROUTES.tours, label: "Tours" },
    { href: ROUTES.discover, label: "Discover" },
    { href: ROUTES.artists, label: "Artists" },
    { href: ROUTES.passport, label: "Passport" },
    { href: ROUTES.venues, label: "Venues" },
    { href: ROUTES.about, label: "About" },
    { href: ROUTES.creatorPromise, label: "Creator Promise" },
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

/** Artist resources — always public. */
export function getArtistNav(): NavItem[] {
  return [
    {
      href: ROUTES.artistSuccessCenter,
      label: "Artist Success Center",
      icon: Mic,
      badge: "NEW",
      description:
        "Artist First tools — keep 100% of merch, tips, and donations. Book smarter digital shows and grow your audience.",
      featured: true,
    },
  ];
}

/** Business & sponsorship links — always public. */
export function getBusinessNav(): NavItem[] {
  return [
    {
      href: ROUTES.namingRightsDemo,
      label: "Sponsor Visualizer",
      icon: Building2,
      badge: "New",
      description: "See your company sponsor a LiveCircuit venue in real time.",
      featured: true,
    },
  ];
}

export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
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
