"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { isNavItemActive } from "@/lib/features/navigation";

export function HeaderNavLink({
  href,
  label,
  icon: Icon,
  badge,
  description,
  featured,
  pathname,
  className,
  onNavigate,
  showDescription = false,
}: {
  href: string;
  label: string;
  icon?: LucideIcon;
  badge?: string;
  description?: string;
  featured?: boolean;
  pathname: string;
  className?: string;
  onNavigate?: () => void;
  showDescription?: boolean;
}) {
  const active = isNavItemActive(pathname, href);

  return (
    <div className={cn(showDescription && description && "space-y-1")}>
      <Link
        href={href}
        onClick={onNavigate}
        className={cn(
          "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors hover:bg-white/5",
          active && "bg-white/10 text-foreground",
          featured &&
            "border border-primary/30 bg-gradient-to-r from-primary/15 via-primary/10 to-amber-500/10 shadow-md shadow-primary/10 hover:border-primary/40 hover:from-primary/20",
          className
        )}
      >
        {Icon ? <Icon className="size-4 shrink-0 opacity-90" aria-hidden /> : null}
        <span>{label}</span>
        {badge ? (
          <Badge variant="default" className="h-4 px-1.5 text-[10px] uppercase tracking-wide">
            {badge}
          </Badge>
        ) : null}
      </Link>
      {showDescription && description ? (
        <p className="px-3 text-sm leading-snug text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
