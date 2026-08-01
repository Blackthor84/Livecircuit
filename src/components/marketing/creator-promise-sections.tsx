import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/lib/constants";
import {
  ARTIST_FIRST_COMPARISON,
  ARTIST_FIRST_HOMEPAGE,
  CREATOR_PROMISE_COMMITMENTS,
  CREATOR_PROMISE_FAQ,
  CREATOR_PROMISE_TAGLINE,
  LIVECIRCUIT_REVENUE_SOURCES,
  PLAN_INCLUDED_PROMISES,
  TRUST_SECTION,
} from "@/lib/home/creator-promise-content";

function PromiseCard({ text, icon: Icon }: { text: string; icon: LucideIcon }) {
  return (
    <Card className="glass-panel border-white/10">
      <CardContent className="flex items-start gap-3 p-5">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Check className="size-4" strokeWidth={2.5} />
        </span>
        <div className="min-w-0">
          <Icon className="mb-2 size-4 text-primary/80" />
          <p className="text-sm font-medium leading-snug">{text}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function CreatorPromiseCards({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`grid gap-3 ${compact ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-3"}`}>
      {CREATOR_PROMISE_COMMITMENTS.map((item) => (
        <PromiseCard key={item.text} text={item.text} icon={item.icon} />
      ))}
    </div>
  );
}

export function CreatorPromiseTagline() {
  return (
    <p className="mx-auto max-w-3xl text-center text-lg font-medium leading-relaxed text-foreground/90">
      {CREATOR_PROMISE_TAGLINE}
    </p>
  );
}

export function ArtistFirstHomeSection() {
  return (
    <>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">Our promise</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{ARTIST_FIRST_HOMEPAGE.title}</h2>
          <p className="mx-auto mt-4 max-w-3xl text-muted-foreground">{ARTIST_FIRST_HOMEPAGE.subtitle}</p>
        </div>
        <div className="mt-10">
          <CreatorPromiseCards />
        </div>
        <div className="mt-10">
          <CreatorPromiseTagline />
        </div>
        <div className="mt-8 flex justify-center">
          <Button href={ROUTES.creatorPromise} variant="outline">
            Read the full Creator Promise
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="glass-panel rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-transparent to-violet-500/10 p-8 sm:p-12">
          <h2 className="text-2xl font-semibold sm:text-3xl">{ARTIST_FIRST_HOMEPAGE.revenueTitle}</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">{ARTIST_FIRST_HOMEPAGE.revenueSubtitle}</p>
          <ul className="mt-8 columns-1 gap-x-8 text-sm sm:columns-2 lg:columns-3">
            {LIVECIRCUIT_REVENUE_SOURCES.map((source) => (
              <li key={source} className="mb-2 flex items-start gap-2 break-inside-avoid">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                {source}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="glass-panel rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center sm:p-12">
          <h2 className="text-2xl font-semibold sm:text-3xl">{TRUST_SECTION.title}</h2>
          <p className="mx-auto mt-4 max-w-3xl text-muted-foreground">{TRUST_SECTION.body}</p>
        </div>
      </section>
    </>
  );
}

export function PlanIncludedPromises() {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {PLAN_INCLUDED_PROMISES.map((item) => (
        <li key={item} className="flex items-center gap-2 text-sm">
          <Check className="size-4 shrink-0 text-emerald-400" />
          {item}
        </li>
      ))}
    </ul>
  );
}

export function CreatorPromiseComparison() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <div className="grid grid-cols-[1fr_1fr_1fr] gap-px bg-white/10 text-xs font-semibold uppercase tracking-wide sm:text-sm">
        <div className="bg-card/80 px-4 py-3 text-muted-foreground" />
        <div className="bg-primary/10 px-4 py-3 text-primary">LiveCircuit</div>
        <div className="bg-card/80 px-4 py-3 text-muted-foreground">Typical platforms</div>
      </div>
      {ARTIST_FIRST_COMPARISON.map((row) => (
        <div key={row.label} className="grid grid-cols-[1fr_1fr_1fr] gap-px bg-white/10 text-sm">
          <div className="bg-card/60 px-4 py-4 font-medium">{row.label}</div>
          <div className="bg-primary/5 px-4 py-4 text-foreground/90">{row.livecircuit}</div>
          <div className="bg-card/40 px-4 py-4 text-muted-foreground">{row.traditional}</div>
        </div>
      ))}
    </div>
  );
}

export function CreatorPromiseFaq({ limit }: { limit?: number }) {
  const items = limit ? CREATOR_PROMISE_FAQ.slice(0, limit) : CREATOR_PROMISE_FAQ;
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <details key={item.q} className="glass-panel group rounded-2xl border border-white/10">
          <summary className="cursor-pointer list-none px-6 py-4 font-medium marker:content-none [&::-webkit-details-marker]:hidden">
            {item.q}
          </summary>
          <p className="border-t border-white/5 px-6 pb-5 pt-3 text-sm text-muted-foreground">{item.a}</p>
        </details>
      ))}
      {limit && limit < CREATOR_PROMISE_FAQ.length ? (
        <p className="pt-2 text-center text-sm">
          <Link href={ROUTES.creatorPromise} className="text-primary hover:underline">
            View all Creator Promise FAQs
          </Link>
        </p>
      ) : null}
    </div>
  );
}

export function CreatorPromiseHero() {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-20 sm:px-6 sm:pt-28">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
      </div>
      <div className="relative mx-auto max-w-4xl text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-primary">LiveCircuit Creator Promise</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          <span className="text-gradient">Artist First. Always.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          We make money by helping artists grow—not by taking money directly from artists. Every commitment below
          is part of how we build a digital-first home for live entertainment.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button size="lg" href={`${ROUTES.register}?role=artist`}>
            Join as an artist
          </Button>
          <Button size="lg" variant="secondary" href={ROUTES.artistSuccessCenter}>
            Explore Artist Success Center
          </Button>
        </div>
      </div>
    </section>
  );
}

export function CreatorPromisePageContent() {
  return (
    <div className="gradient-mesh pb-24">
      <CreatorPromiseHero />

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h2 className="text-center text-2xl font-semibold sm:text-3xl">Our commitments to creators</h2>
        <div className="mt-10">
          <CreatorPromiseCards />
        </div>
        <div className="mt-10">
          <CreatorPromiseTagline />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h2 className="text-2xl font-semibold sm:text-3xl">{ARTIST_FIRST_HOMEPAGE.revenueTitle}</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">{ARTIST_FIRST_HOMEPAGE.revenueSubtitle}</p>
        <Card className="glass-panel mt-8 border-white/10">
          <CardContent className="p-6 sm:p-8">
            <ul className="columns-1 gap-x-8 sm:columns-2 lg:columns-3">
              {LIVECIRCUIT_REVENUE_SOURCES.map((source) => (
                <li key={source} className="mb-2 flex items-start gap-2 break-inside-avoid text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  {source}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h2 className="text-2xl font-semibold sm:text-3xl">How we compare</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          LiveCircuit is built for digital creators who want to keep what they earn from fans.
        </p>
        <div className="mt-8 overflow-x-auto">
          <CreatorPromiseComparison />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="glass-panel rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-8 sm:p-12">
          <h2 className="text-2xl font-semibold sm:text-3xl">{TRUST_SECTION.title}</h2>
          <p className="mt-4 max-w-3xl text-muted-foreground">{TRUST_SECTION.body}</p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h2 className="text-center text-2xl font-semibold sm:text-3xl">Frequently asked questions</h2>
        <div className="mt-8">
          <CreatorPromiseFaq />
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
        <Card className="glass-panel border-primary/20 bg-gradient-to-br from-primary/10 to-transparent">
          <CardHeader>
            <CardTitle className="text-2xl">Ready to perform on your terms?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Create digital performances, grow your audience, and keep what your fans send you directly.
            </p>
            <Button size="lg" href={`${ROUTES.register}?role=artist`}>
              Get started free
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
