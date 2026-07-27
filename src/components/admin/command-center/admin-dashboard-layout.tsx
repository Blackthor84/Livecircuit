"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Sparkles } from "lucide-react";
import { LiveCircuitLogo } from "@/components/brand/livecircuit-logo";
import { ADMIN_SECTIONS, adminSectionLabel } from "@/lib/admin/sections";
import { SiteHeaderUserMenu, type HeaderUser } from "@/components/layout/site-header-user-menu";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5" aria-label="Command Center">
      {ADMIN_SECTIONS.map((item) => {
        const pathOnly = item.href.split("#")[0] ?? item.href;
        const active =
          "exact" in item && item.exact
            ? pathname === pathOnly
            : pathname === pathOnly || pathname.startsWith(`${pathOnly}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-150",
              active
                ? "bg-primary/15 font-medium text-primary shadow-sm shadow-primary/10"
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function AdminTopBar({ user }: { user: HeaderUser | null }) {
  const pathname = usePathname();
  const section = adminSectionLabel(pathname);

  return (
    <header className="sticky top-16 z-40 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-background/80 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Sheet>
          <SheetTrigger
            className="inline-flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 lg:hidden"
            aria-label="Open Command Center navigation"
          >
            <Menu className="size-4" />
          </SheetTrigger>
          <SheetContent side="left" className="glass-panel w-72">
            <SheetHeader>
              <SheetTitle>Command Center</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <SidebarNav />
            </div>
          </SheetContent>
        </Sheet>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-primary">Command Center</p>
          <p className="truncate text-sm font-semibold">{section}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="ghost" size="sm" href={ROUTES.home} className="hidden sm:inline-flex">
          <LiveCircuitLogo size="xs" href={null} />
        </Button>
        {user ? <SiteHeaderUserMenu user={user} /> : null}
      </div>
    </header>
  );
}

export function AdminDashboardLayout({
  user,
  children,
}: {
  user: HeaderUser | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      <AdminTopBar user={user} />
      <div className="mx-auto flex w-full max-w-[1600px] flex-1 gap-0 lg:gap-6">
        <aside className="hidden w-64 shrink-0 border-r border-white/5 lg:block">
          <div className="sticky top-[8.5rem] p-4">
            <div className="mb-4 flex items-center gap-2 px-2">
              <LiveCircuitLogo size="sm" href={ROUTES.home} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Command Center</p>
              </div>
            </div>
            <SidebarNav />
            <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="size-3.5 text-primary" />
                Phase 1 · Platform ops
              </p>
            </div>
          </div>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}

export function AdminPageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {subtitle ? <p className="mt-2 max-w-3xl text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}
