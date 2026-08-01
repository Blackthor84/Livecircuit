"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { LiveCircuitLogo } from "@/components/brand/livecircuit-logo";
import { SiteHeaderUserMenu, type HeaderUser } from "@/components/layout/site-header-user-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AGENCY_SECTIONS, agencyPath, agencySectionLabel } from "@/lib/agency/sections";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

function SidebarNav({ orgId, onNavigate }: { orgId: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const base = `/agency/${orgId}`;

  return (
    <nav className="flex flex-col gap-0.5" aria-label="Agency navigation">
      {AGENCY_SECTIONS.map((item) => {
        const href = agencyPath(orgId, item.href);
        const active =
          "exact" in item && item.exact
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={href}
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

export function AgencyPageHeader({
  title,
  subtitle,
  orgName,
  verified,
}: {
  title: string;
  subtitle?: string;
  orgName?: string;
  verified?: boolean;
}) {
  return (
    <div className="mb-8">
      {orgName ? (
        <p className="text-sm font-medium uppercase tracking-widest text-primary">{orgName}</p>
      ) : null}
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {verified ? <Badge className="bg-violet-500/90">Verified Agency</Badge> : null}
      </div>
      {subtitle ? <p className="mt-2 max-w-3xl text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}

export function AgencyDashboardLayout({
  orgId,
  orgName,
  user,
  children,
}: {
  orgId: string;
  orgName: string;
  user: HeaderUser | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const segment = pathname.replace(`/agency/${orgId}`, "").replace(/^\//, "") || "dashboard";

  return (
    <div className="min-h-[calc(100vh-4rem)] lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden border-r border-white/10 bg-card/20 lg:block">
        <div className="sticky top-36 flex h-[calc(100vh-9rem)] flex-col p-4">
          <p className="mb-1 px-3 text-xs font-medium uppercase tracking-wide text-primary">Agency</p>
          <p className="mb-4 truncate px-3 text-sm font-semibold">{orgName}</p>
          <SidebarNav orgId={orgId} />
          <div className="mt-auto px-3 pt-4">
            <Button variant="ghost" size="sm" href={ROUTES.agencyHome} className="w-full justify-start">
              All agencies
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-36 z-40 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-background/80 px-4 backdrop-blur-xl sm:px-6 lg:top-36">
          <div className="flex min-w-0 items-center gap-3">
            <Sheet>
              <SheetTrigger
                className="inline-flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 lg:hidden"
                aria-label="Open agency navigation"
              >
                <Menu className="size-4" />
              </SheetTrigger>
              <SheetContent side="left" className="glass-panel w-72">
                <SheetHeader>
                  <SheetTitle>{orgName}</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <SidebarNav orgId={orgId} />
                </div>
              </SheetContent>
            </Sheet>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium uppercase tracking-wide text-primary">Agency Portal</p>
              <p className="truncate text-sm font-semibold">{agencySectionLabel(segment)}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="ghost" size="sm" href={ROUTES.home} className="hidden sm:inline-flex">
              <LiveCircuitLogo size="sm" href={null} />
            </Button>
            {user ? <SiteHeaderUserMenu user={user} /> : null}
          </div>
        </header>
        <div className="flex-1 px-4 py-8 sm:px-6">{children}</div>
      </div>
    </div>
  );
}
