"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { ADMIN_SECTIONS } from "@/lib/admin/sections";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {ADMIN_SECTIONS.map((item) => {
        const active =
          "exact" in item && item.exact ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
              active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
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

export function AdminCommandShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1600px] gap-6 px-4 py-6 sm:px-6">
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-20 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Super Admin</p>
            <p className="text-lg font-semibold">Command Center</p>
          </div>
          <NavLinks />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            {subtitle ? <p className="mt-2 text-muted-foreground">{subtitle}</p> : null}
          </div>
          <Sheet>
            <SheetTrigger
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-md border border-white/10 lg:hidden"
              )}
              aria-label="Open admin navigation"
            >
              <Menu className="size-4" />
            </SheetTrigger>
            <SheetContent side="left" className="glass-panel w-72">
              <SheetHeader>
                <SheetTitle>Command Center</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <NavLinks />
              </div>
            </SheetContent>
          </Sheet>
        </div>
        {children}
      </div>
    </div>
  );
}
