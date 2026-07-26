import { ArenaEntranceHero } from "@/components/demo/naming-rights/arena-entrance-hero";
import { AnimatedCounter } from "@/components/demo/naming-rights/animated-counter";
import { FadeUp, FadeUpItem, FadeUpStagger } from "@/components/demo/naming-rights/fade-up";
import { SponsorBrandLogo } from "@/components/demo/naming-rights/sponsor-brand-logo";
import type { BrandTheme } from "@/lib/demo/naming-rights-utils";

type Stat = { label: string; value: number; format: "number" | "compact" };

export function ArenaHeroFull({
  arenaName,
  companyName,
  state,
  theme,
  stats,
  resetKey,
}: {
  arenaName: string;
  companyName: string;
  state: string;
  theme: BrandTheme;
  stats: Stat[];
  resetKey: string;
}) {
  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${theme.glow}, transparent 70%)`,
        }}
      />
      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
        <FadeUp>
          <div className="glass-panel overflow-hidden rounded-3xl border-white/10">
            <div className="relative">
              <ArenaEntranceHero arenaName={arenaName} companyName={companyName} theme={theme} />
              {/* Animated light sweep */}
              <div
                className="pointer-events-none absolute inset-0 opacity-20"
                style={{
                  background:
                    "linear-gradient(105deg, transparent 40%, oklch(1 0 0 / 0.08) 50%, transparent 60%)",
                  animation: "shimmer 8s ease-in-out infinite",
                  backgroundSize: "200% 100%",
                }}
              />
            </div>

            <div className="border-t border-white/10 px-6 py-8 sm:px-10 sm:py-10">
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-400/90">
                    Presented by LiveCircuit
                  </p>
                  <h2 className="mt-2 text-3xl font-bold sm:text-4xl lg:text-5xl">{arenaName}</h2>
                  <p className="mt-2 text-muted-foreground">
                    {state} · Powered by {companyName}
                  </p>
                </div>
                <SponsorBrandLogo theme={theme} size="xl" />
              </div>

              <FadeUpStagger className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {stats.map((stat) => (
                  <FadeUpItem key={stat.label}>
                    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4 transition hover:border-amber-500/20">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {stat.label}
                      </p>
                      <p className="mt-2 text-2xl font-bold">
                        <AnimatedCounter value={stat.value} format={stat.format} resetKey={resetKey} />
                      </p>
                    </div>
                  </FadeUpItem>
                ))}
              </FadeUpStagger>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
