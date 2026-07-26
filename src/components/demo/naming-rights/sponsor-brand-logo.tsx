import { cn } from "@/lib/utils";
import type { BrandTheme } from "@/lib/demo/naming-rights-utils";

export function SponsorBrandLogo({
  theme,
  size = "md",
  className,
}: {
  theme: BrandTheme;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizes = {
    sm: "size-10 text-sm rounded-lg",
    md: "size-14 text-lg rounded-xl",
    lg: "size-20 text-2xl rounded-2xl",
    xl: "size-28 text-3xl rounded-3xl",
  };

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center border border-white/20 font-bold text-white shadow-lg backdrop-blur-sm",
        sizes[size],
        className
      )}
      style={{ background: theme.gradient }}
    >
      {theme.initials}
    </div>
  );
}
