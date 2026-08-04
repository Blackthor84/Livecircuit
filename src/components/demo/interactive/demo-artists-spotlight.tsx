"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Mic2 } from "lucide-react";
import { FadeUp, FadeUpItem, FadeUpStagger } from "@/components/demo/naming-rights/fade-up";
import { DemoContentNotice } from "@/components/demo/shared/demo-content-notice";
import { ROUTES } from "@/lib/constants";
import { getFeaturedArtists, resolvePoseImage } from "@/data/demo/artists";
import { cn } from "@/lib/utils";

/** Demo hub strip — fictional roster for interactive demos only */
export function DemoArtistsSpotlight() {
  const artists = getFeaturedArtists();

  return (
    <section className="relative border-t border-white/5 bg-black/30 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <FadeUp className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Demo Roster</p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Fictional artists in this product demo</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              These performers exist only inside LiveCircuit demos — not real platform users.
            </p>
          </div>
          <Link href={ROUTES.demoFan} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
            Enter Fan Demo <ArrowRight className="size-3.5" />
          </Link>
        </FadeUp>

        <FadeUpStagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {artists.map((artist) => (
            <FadeUpItem key={artist.id}>
              <Link href={ROUTES.demoFan}>
                <motion.div
                  whileHover={{ y: -4 }}
                  className="group overflow-hidden rounded-2xl border border-white/10 bg-black/50 backdrop-blur-xl"
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-b from-primary/10 to-black">
                    <Image
                      src={resolvePoseImage(artist, "hero")}
                      alt={artist.stageName}
                      fill
                      className="object-contain object-bottom transition duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 50vw, 25vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-primary">{artist.genre}</p>
                      <p className="text-lg font-bold">{artist.stageName}</p>
                      <p className="text-xs text-muted-foreground">{artist.currentTour.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 text-xs">
                    <span className="text-muted-foreground">{(artist.monthlyListeners / 1_000_000).toFixed(1)}M listeners</span>
                    <span className={cn("rounded-full bg-gradient-to-r px-2 py-0.5 font-bold text-white", artist.brand.gradientClass)}>
                      {artist.liveStatus}
                    </span>
                  </div>
                </motion.div>
              </Link>
            </FadeUpItem>
          ))}
        </FadeUpStagger>

        <FadeUp className="mt-8 flex flex-col items-center gap-4">
          <Link
            href={ROUTES.demoArtist}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium transition hover:bg-white/10"
          >
            <Mic2 className="size-4 text-primary" />
            Manage {artists[0]?.stageName ?? "an artist"} in the Artist Demo
          </Link>
          <DemoContentNotice variant="inline" className="max-w-xl text-center" />
        </FadeUp>
      </div>
    </section>
  );
}
