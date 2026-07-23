"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Radio, Search, Sparkles } from "lucide-react";
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
import { cn } from "@/lib/utils";

const nav = [
  { href: ROUTES.world, label: "World" },
  { href: ROUTES.discover, label: "Discover" },
  { href: ROUTES.seasons, label: "Seasons" },
  { href: ROUTES.festivals, label: "Festivals" },
  { href: ROUTES.walkOfFame, label: "Walk of Fame" },
  { href: ROUTES.awards, label: "Awards" },
  { href: ROUTES.marketplace, label: "Marketplace" },
  { href: ROUTES.localBusiness, label: "Local" },
  { href: ROUTES.friends, label: "Friends" },
  { href: ROUTES.venues, label: "Venues" },
  { href: ROUTES.artists, label: "Artists" },
  { href: "/tours", label: "Tours" },
  { href: ROUTES.vip, label: "VIP" },
];

export function SiteHeader({ user }: { user: HeaderUser | null }) {
  const pathname = usePathname();

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
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-full px-4 py-2 text-sm transition-colors hover:bg-white/5",
                pathname === item.href && "bg-white/10 text-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            className="hidden sm:inline-flex"
            href={ROUTES.search}
            aria-label="Search"
          >
            <Search className="size-4" />
          </Button>
          {!user && (
            <>
              <Button variant="outline" size="sm" className="hidden sm:inline-flex" href="/register?role=artist">
                <Sparkles className="size-3.5" />
                Become an Artist
              </Button>
              <Button size="sm" href={ROUTES.login}>
                Sign in
              </Button>
            </>
          )}
          {user && <SiteHeaderUserMenu user={user} />}
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
                {[...nav, { href: ROUTES.search, label: "Search" }].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-lg px-3 py-2 text-lg hover:bg-white/5"
                  >
                    {item.label}
                  </Link>
                ))}
                {user && (
                  <Link href={ROUTES.settings} className="rounded-lg px-3 py-2 text-lg hover:bg-white/5">
                    Settings
                  </Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
