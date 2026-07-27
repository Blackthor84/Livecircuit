"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Radio } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { HeaderNavLink } from "@/components/layout/header-nav-link";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  SiteHeaderUserMenu,
  type HeaderUser,
} from "@/components/layout/site-header-user-menu";
import { APP_NAME, ROUTES } from "@/lib/constants";
import { getArtistNav, getBusinessNav, getGuestAuthCTAs, getMainNav } from "@/lib/features/navigation";
import { getAccountMenuLinks } from "@/lib/features/account-menu";
import { cn } from "@/lib/utils";

function ArtistNavLinks({
  pathname,
  variant = "desktop",
  onNavigate,
}: {
  pathname: string;
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
}) {
  const artistNav = getArtistNav();

  if (variant === "mobile") {
    return (
      <>
        <p className="px-3 pt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Artist
        </p>
        <div className="mx-1 space-y-2 rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-transparent to-primary/5 p-2">
          {artistNav.map((item) => (
            <HeaderNavLink
              key={`${item.href}-${item.label}`}
              href={item.href}
              label={item.label}
              icon={item.icon}
              badge={item.badge}
              description={item.description}
              featured={item.featured}
              pathname={pathname}
              onNavigate={onNavigate}
              showDescription
              className="w-full rounded-lg px-3 py-3 text-lg"
            />
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="flex items-center gap-1 border-l border-white/10 pl-2 ml-1">
      <span className="hidden lg:inline px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Artist
      </span>
      {artistNav.map((item) => (
        <HeaderNavLink
          key={`${item.href}-${item.label}`}
          href={item.href}
          label={item.label}
          icon={item.icon}
          badge={item.badge}
          featured={item.featured}
          pathname={pathname}
        />
      ))}
    </div>
  );
}

function BusinessNavLinks({
  pathname,
  variant = "desktop",
  onNavigate,
}: {
  pathname: string;
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
}) {
  const businessNav = getBusinessNav();

  if (variant === "mobile") {
    return (
      <>
        <p className="px-3 pt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Business
        </p>
        <div className="mx-1 space-y-2 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-transparent to-amber-500/5 p-2">
          {businessNav.map((item) => (
            <HeaderNavLink
              key={`${item.href}-${item.label}`}
              href={item.href}
              label={item.label}
              icon={item.icon}
              badge={item.badge}
              description={item.description}
              featured={item.featured}
              pathname={pathname}
              onNavigate={onNavigate}
              showDescription
              className="w-full rounded-lg px-3 py-3 text-lg"
            />
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="flex items-center gap-1 border-l border-white/10 pl-2 ml-1">
      <span className="hidden lg:inline px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Business
      </span>
      {businessNav.map((item) => (
        <HeaderNavLink
          key={`${item.href}-${item.label}`}
          href={item.href}
          label={item.label}
          icon={item.icon}
          badge={item.badge}
          featured={item.featured}
          pathname={pathname}
        />
      ))}
    </div>
  );
}

export function SiteHeader({ user }: { user: HeaderUser | null }) {
  const pathname = usePathname();
  const nav = getMainNav(user);
  const guestCtas = getGuestAuthCTAs();
  const profileMenuItems = user ? getAccountMenuLinks(user) : [];

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href={ROUTES.home} className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg shadow-primary/25">
            <Radio className="size-4" />
          </span>
          <span className="hidden sm:inline">{APP_NAME}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {nav.map((item) => (
            <HeaderNavLink
              key={`${item.href}-${item.label}`}
              href={item.href}
              label={item.label}
              icon={item.icon}
              pathname={pathname}
            />
          ))}
          <ArtistNavLinks pathname={pathname} />
          <BusinessNavLinks pathname={pathname} />
        </nav>

        <div className="flex items-center gap-2">
          {!user ? (
            <>
              {guestCtas.map((item) => (
                <Button
                  key={item.label}
                  size="sm"
                  variant={item.variant ?? "default"}
                  href={item.href}
                  className={cn(item.label === "Create Account" && "hidden sm:inline-flex")}
                >
                  {item.label}
                </Button>
              ))}
            </>
          ) : (
            <SiteHeaderUserMenu user={user} />
          )}
          <Sheet>
            <SheetTrigger
              className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "md:hidden")}
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="right" className="glass-panel">
              <SheetHeader>
                <SheetTitle>{APP_NAME}</SheetTitle>
              </SheetHeader>
              <nav className="mt-8 flex flex-col gap-2" aria-label="Mobile">
                {nav.map((item) => (
                  <HeaderNavLink
                    key={`${item.href}-${item.label}`}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    pathname={pathname}
                    className="rounded-lg px-3 py-2 text-lg"
                  />
                ))}
                <ArtistNavLinks pathname={pathname} variant="mobile" />
                <BusinessNavLinks pathname={pathname} variant="mobile" />
                {!user ? (
                  <>
                    <p className="px-3 pt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Get Started
                    </p>
                    {guestCtas.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        className="rounded-lg px-3 py-2 text-lg hover:bg-white/5"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </>
                ) : (
                  <>
                    {profileMenuItems.map((item) => (
                      <Link
                        key={`${item.href}-${item.label}`}
                        href={item.href}
                        className="rounded-lg px-3 py-2 text-lg hover:bg-white/5"
                      >
                        {item.label}
                      </Link>
                    ))}
                    <div className="px-3 pt-2">
                      <SignOutButton className="w-full justify-start" variant="outline" />
                    </div>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
