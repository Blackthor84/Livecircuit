import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { VenueActiveTheme } from "@/lib/venues/theme";

export function VenueThemeShell({
  theme,
  venueSlug,
  children,
  className,
}: {
  theme: VenueActiveTheme | null;
  venueSlug?: string;
  children: ReactNode;
  className?: string;
}) {
  if (!theme) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      className={cn(
        "venue-themed",
        `venue-theme-${theme.classSuffix}`,
        className
      )}
      style={theme.cssVars as CSSProperties}
      data-venue-theme={theme.slug}
      data-venue-slug={venueSlug}
    >
      {theme.assets.icon ? (
        <div className="venue-theme-ambient pointer-events-none" aria-hidden>
          {theme.assets.icon}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function VenueThemeHeroOverlay({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "venue-theme-hero-overlay pointer-events-none absolute inset-0",
        className
      )}
    />
  );
}

export function VenueThemeBadge({ theme }: { theme: VenueActiveTheme }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/30 px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm">
      {theme.assets.icon ? <span aria-hidden>{theme.assets.icon}</span> : null}
      {theme.name}
    </span>
  );
}
