import { SponsorBrandLogo } from "@/components/demo/naming-rights/sponsor-brand-logo";
import type { BrandTheme } from "@/lib/demo/naming-rights-utils";

export function ArenaEntranceHero({
  arenaName,
  companyName,
  theme,
}: {
  arenaName: string;
  companyName: string;
  theme: BrandTheme;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl" style={{ perspective: "1200px" }}>
      {/* Sky / ambient */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${theme.glow}, transparent 70%), oklch(0.14 0.03 280)`,
        }}
      />

      <div className="relative px-6 py-10 sm:px-10 sm:py-14">
        {/* 3D entrance structure */}
        <div
          className="relative mx-auto max-w-lg"
          style={{ transform: "rotateX(8deg)", transformStyle: "preserve-3d" }}
        >
          {/* Canopy */}
          <div
            className="relative mx-auto h-4 w-[90%] rounded-t-full"
            style={{ background: theme.gradient, boxShadow: `0 0 60px ${theme.glow}` }}
          />

          {/* LED sign */}
          <div
            className="relative mx-auto -mt-1 w-[85%] overflow-hidden rounded-lg border-2 px-4 py-5 text-center sm:py-7"
            style={{
              borderColor: theme.gold,
              background: "oklch(0.08 0.02 280)",
              boxShadow: `0 0 40px ${theme.glow}, inset 0 0 30px oklch(0 0 0 / 0.5)`,
            }}
          >
            <div
              className="absolute inset-0 opacity-30"
              style={{
                background:
                  "repeating-linear-gradient(0deg, transparent, transparent 2px, oklch(1 0 0 / 0.03) 2px, oklch(1 0 0 / 0.03) 4px)",
              }}
            />
            <p
              className="relative text-[10px] font-semibold uppercase tracking-[0.35em] sm:text-xs"
              style={{ color: theme.gold }}
            >
              LiveCircuit Presents
            </p>
            <h3 className="relative mt-2 text-lg font-bold leading-tight sm:text-2xl md:text-3xl">
              {arenaName}
            </h3>
            <p className="relative mt-2 text-xs text-white/60 sm:text-sm">Powered by {companyName}</p>
          </div>

          {/* Entrance pillars */}
          <div className="mt-0 flex justify-between px-2">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-24 w-8 rounded-b-lg sm:h-32 sm:w-10"
                style={{
                  background: `linear-gradient(180deg, ${theme.primary}, oklch(0.2 0.04 280))`,
                  boxShadow: "inset -2px 0 8px oklch(0 0 0 / 0.3)",
                }}
              />
            ))}
          </div>

          {/* Entrance opening */}
          <div
            className="relative mx-auto -mt-24 flex h-28 w-[70%] items-end justify-center overflow-hidden rounded-t-[3rem] sm:-mt-28 sm:h-36"
            style={{
              background: `linear-gradient(180deg, oklch(0.05 0.02 280), ${theme.secondary}40)`,
              border: `1px solid ${theme.primary}40`,
            }}
          >
            <div
              className="absolute inset-x-0 top-0 h-1/2"
              style={{ background: `linear-gradient(180deg, ${theme.glow}, transparent)` }}
            />
            <SponsorBrandLogo theme={theme} size="lg" className="relative mb-4 shadow-2xl" />
          </div>

          {/* Plaza floor */}
          <div
            className="mx-auto mt-2 h-3 w-[95%] rounded-full blur-sm"
            style={{ background: theme.gold, opacity: 0.4 }}
          />
        </div>
      </div>
    </div>
  );
}
