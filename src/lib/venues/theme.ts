export type VenueThemePalette = {
  primary?: string;
  accent?: string;
  glow?: string;
};

export type VenueThemeAssets = {
  icon?: string;
  heroGradient?: string;
  meshTint?: string;
  panelBorder?: string;
  backgroundImage?: string;
};

export type VenueActiveTheme = {
  slug: string;
  name: string;
  description: string | null;
  assets: VenueThemeAssets;
  palette: VenueThemePalette;
  cssVars: Record<string, string>;
  classSuffix: string;
};

export function sanitizeThemeClassSuffix(slug: string) {
  return slug.replace(/[^a-z0-9-]/gi, "");
}

export function resolveVenueActiveTheme(row: {
  slug: string;
  name: string;
  description?: string | null;
  assets?: Record<string, unknown> | null;
  default_palette?: Record<string, unknown> | null;
}): VenueActiveTheme {
  const palette = (row.default_palette ?? {}) as VenueThemePalette;
  const assets = (row.assets ?? {}) as VenueThemeAssets;
  const cssVars: Record<string, string> = {};

  if (palette.primary) {
    cssVars["--venue-primary"] = palette.primary;
    cssVars["--primary"] = palette.primary;
  }
  if (palette.accent) {
    cssVars["--venue-accent"] = palette.accent;
    cssVars["--accent"] = palette.accent;
  }
  if (palette.glow) cssVars["--venue-glow"] = palette.glow;
  if (assets.heroGradient) cssVars["--venue-hero-gradient"] = assets.heroGradient;
  if (assets.meshTint) cssVars["--venue-mesh-tint"] = assets.meshTint;
  if (assets.panelBorder) cssVars["--venue-panel-border"] = assets.panelBorder;
  if (assets.backgroundImage) cssVars["--venue-bg-image"] = assets.backgroundImage;

  return {
    slug: row.slug,
    name: row.name,
    description: row.description ?? null,
    assets,
    palette,
    cssVars,
    classSuffix: sanitizeThemeClassSuffix(row.slug),
  };
}

export type VenueThemeChip = {
  slug: string;
  name: string;
  icon: string | null;
};

export function themeToChip(theme: VenueActiveTheme | null): VenueThemeChip | null {
  if (!theme) return null;
  return {
    slug: theme.slug,
    name: theme.name,
    icon: theme.assets.icon ?? null,
  };
}
