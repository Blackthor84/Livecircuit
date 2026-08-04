"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { LightingPreset } from "@/lib/demo/cinematic/constants";
import type { ArenaEffects } from "@/lib/demo/cinematic/arena-types";
import { StagePerformer } from "@/components/demo/cinematic/shared/stage-performer";
import { cn } from "@/lib/utils";

export type { ArenaEffects } from "@/lib/demo/cinematic/arena-types";

const LIGHTING_COLORS: Record<LightingPreset, string> = {
  default: "from-violet-600/40 via-primary/30 to-cyan-600/20",
  purple: "from-purple-600/50 via-violet-500/40 to-fuchsia-600/30",
  cyan: "from-cyan-500/50 via-blue-500/40 to-teal-500/30",
  gold: "from-amber-500/50 via-yellow-500/40 to-orange-500/30",
  red: "from-red-600/50 via-rose-500/40 to-orange-600/30",
  strobe: "from-white/30 via-primary/50 to-white/30",
};

const CAMERA_TRANSFORMS: Record<ArenaEffects["camera"], string> = {
  default: "perspective(1200px) translateZ(0px) rotateX(8deg)",
  vip: "perspective(1200px) translateZ(180px) translateY(-40px) rotateX(12deg)",
  back: "perspective(1200px) translateZ(-280px) scale(0.82) rotateX(5deg)",
  "stage-left": "perspective(1200px) rotateY(18deg) rotateX(8deg)",
  "stage-right": "perspective(1200px) rotateY(-18deg) rotateX(8deg)",
};

function CrowdSection({ rows, intensity, dim }: { rows: number; intensity: number; dim?: boolean }) {
  return (
    <div className="flex items-end justify-center gap-px px-2">
      {Array.from({ length: rows }).map((_, i) => (
        <motion.div
          key={i}
          className={cn("w-0.5 rounded-t sm:w-1", dim ? "bg-amber-300/60" : "bg-gradient-to-t from-primary/80 to-primary/20")}
          animate={{
            height: [
              `${8 + (i % 6) * 3 + intensity * 0.05}px`,
              `${14 + (i % 8) * 4 + intensity * 0.08}px`,
              `${8 + (i % 6) * 3 + intensity * 0.05}px`,
            ],
            opacity: dim ? [0.4, 1, 0.4] : 1,
          }}
          transition={{ duration: dim ? 1.5 + (i % 5) * 0.1 : 0.4 + (i % 10) * 0.04, repeat: Infinity, delay: i * 0.02 }}
        />
      ))}
    </div>
  );
}

function StagePerformerSlot({ pulsing, visible, artistId }: { pulsing?: boolean; visible?: boolean; artistId: string }) {
  return <StagePerformer artistId={artistId} pulsing={pulsing} visible={visible} animatePoses />;
}

export function VirtualArena({ effects, showArtist = true, performerArtistId, className }: { effects: ArenaEffects; showArtist?: boolean; performerArtistId: string; className?: string }) {
  const { camera, lighting, fog, confetti, pyro, glowSticks, clapping, cheering, curtainsOpen, lightsOn, crowdEnergy, venueName, hearts, emojis } = effects;
  const crowdRows = clapping || cheering ? 88 : 64;

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-black", className)}>
      <motion.div className="absolute inset-0 transition-transform duration-1000 ease-out" style={{ transform: CAMERA_TRANSFORMS[camera] }}>
        <div className={cn("absolute inset-0 bg-gradient-to-b transition-opacity duration-1000", LIGHTING_COLORS[lighting], !lightsOn && "opacity-30")} />

        {/* Audience pin lights when stage dark */}
        {!lightsOn && curtainsOpen && (
          <div className="absolute inset-0">
            {Array.from({ length: 120 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute size-1 rounded-full bg-amber-200/80"
                style={{ left: `${8 + (i * 7) % 84}%`, bottom: `${5 + (i * 3) % 45}%` }}
                animate={{ opacity: [0.3, 0.9, 0.3] }}
                transition={{ duration: 1.2 + (i % 8) * 0.15, repeat: Infinity, delay: i * 0.03 }}
              />
            ))}
          </div>
        )}

        <div className="absolute left-0 top-[8%] h-[55%] w-[12%] overflow-hidden border-r border-cyan-500/20 opacity-80">
          <motion.div className="h-full w-full bg-gradient-to-b from-cyan-500/30 via-primary/20 to-violet-600/30" animate={{ opacity: lightsOn ? [0.6, 1, 0.6] : 0.2 }} transition={{ duration: 2, repeat: Infinity }} />
        </div>
        <div className="absolute right-0 top-[8%] h-[55%] w-[12%] overflow-hidden border-l border-violet-500/20 opacity-80">
          <motion.div className="h-full w-full bg-gradient-to-b from-violet-600/30 via-primary/20 to-cyan-500/30" animate={{ opacity: lightsOn ? [0.6, 1, 0.6] : 0.2 }} transition={{ duration: 2.5, repeat: Infinity }} />
        </div>

        <div className="absolute inset-x-[15%] top-[5%] flex justify-center gap-2 sm:gap-4">
          {["LIVE", venueName.split(" ")[0]?.toUpperCase() ?? "LC", "ARENA"].map((text, i) => (
            <motion.div key={text} className="rounded border border-white/10 bg-black/60 px-2 py-0.5 text-[9px] font-bold tracking-widest text-cyan-400 sm:px-3 sm:py-1 sm:text-xs" animate={{ opacity: lightsOn ? [0.5, 1, 0.5] : 0.3 }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}>
              {text}
            </motion.div>
          ))}
        </div>

        <div className="absolute inset-x-[10%] top-[22%] h-[18%]">
          <CrowdSection rows={crowdRows} intensity={crowdEnergy} dim={!lightsOn} />
        </div>

        <AnimatePresence>
          {!curtainsOpen && (
            <>
              <motion.div initial={{ x: 0 }} exit={{ x: "-100%" }} transition={{ duration: 2.5, ease: [0.22, 1, 0.36, 1] }} className="absolute bottom-[20%] left-0 top-[15%] z-20 w-1/2 bg-gradient-to-r from-red-950 via-red-900/95 to-red-900/80" />
              <motion.div initial={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: 2.5, ease: [0.22, 1, 0.36, 1] }} className="absolute bottom-[20%] right-0 top-[15%] z-20 w-1/2 bg-gradient-to-l from-red-950 via-red-900/95 to-red-900/80" />
            </>
          )}
        </AnimatePresence>

        <div className={cn("absolute inset-x-[20%] bottom-[28%] h-[8%] rounded-t-xl border border-white/10 bg-gradient-to-b from-zinc-800/90 to-zinc-950 transition-opacity duration-700", !lightsOn && "opacity-40")}>
          {lightsOn && <motion.div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity }} />}
        </div>

        {[-25, -8, 8, 25].map((rot, i) => (
          <motion.div
            key={i}
            className="pointer-events-none absolute bottom-[36%] left-1/2 h-48 w-1 origin-bottom bg-gradient-to-t from-amber-200/60 to-transparent sm:h-64"
            style={{ marginLeft: -2 }}
            animate={{ rotate: [rot - 10, rot + 10, rot - 10], opacity: curtainsOpen && lightsOn ? [0.3, 0.9, 0.3] : 0 }}
            transition={{ duration: 2.5 + i * 0.4, repeat: Infinity }}
          />
        ))}

        {showArtist && curtainsOpen && (
          <div className="absolute inset-x-0 bottom-[30%] flex justify-center">
            <StagePerformerSlot pulsing={lightsOn} visible={lightsOn} artistId={performerArtistId} />
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-[28%] bg-gradient-to-t from-black via-black/80 to-transparent">
          <CrowdSection rows={96} intensity={crowdEnergy} dim={!lightsOn} />
        </div>

        {fog && lightsOn && <motion.div className="pointer-events-none absolute inset-x-0 bottom-[25%] h-32 bg-gradient-to-t from-white/10 to-transparent" animate={{ opacity: [0.2, 0.5, 0.2], x: [-20, 20, -20] }} transition={{ duration: 6, repeat: Infinity }} />}

        {glowSticks && (
          <div className="pointer-events-none absolute inset-0">
            {Array.from({ length: 80 }).map((_, i) => (
              <motion.div key={i} className="absolute size-1.5 rounded-full" style={{ left: `${5 + (i * 11) % 90}%`, bottom: `${10 + (i * 5) % 40}%`, background: ["#a855f7", "#22d3ee", "#fbbf24", "#f472b6"][i % 4], boxShadow: `0 0 10px ${["#a855f7", "#22d3ee", "#fbbf24", "#f472b6"][i % 4]}` }} animate={{ opacity: [0.3, 1, 0.3], y: [0, -20, 0] }} transition={{ duration: 1 + (i % 5) * 0.2, repeat: Infinity, delay: i * 0.04 }} />
            ))}
          </div>
        )}

        {pyro && [0, 1, 2].map((i) => (
          <motion.div key={i} className="absolute bottom-[36%] size-20 rounded-full bg-gradient-to-t from-orange-400/80 via-orange-500/40 to-transparent blur-md" style={{ left: `${30 + i * 15}%` }} initial={{ scale: 0, opacity: 1 }} animate={{ scale: [0, 3, 0], opacity: [1, 0.8, 0] }} transition={{ duration: 1.4, delay: i * 0.15 }} />
        ))}

        {confetti && Array.from({ length: 40 }).map((_, i) => (
          <motion.div key={i} className="pointer-events-none absolute size-2 rounded-sm" style={{ left: `${15 + (i * 17) % 70}%`, top: "15%", background: ["#a855f7", "#22d3ee", "#fbbf24", "#f472b6"][i % 4] }} animate={{ y: [0, 450], rotate: 360, opacity: [1, 0] }} transition={{ duration: 2.8, delay: i * 0.04 }} />
        ))}

        <AnimatePresence>
          {hearts.map((h) => (
            <motion.span key={h.id} className="pointer-events-none absolute text-2xl" style={{ left: `${h.x}%`, bottom: "35%" }} initial={{ opacity: 1, y: 0, scale: 0.5 }} animate={{ opacity: 0, y: -150, scale: 1.2 }} exit={{ opacity: 0 }} transition={{ duration: 2 }}>❤️</motion.span>
          ))}
          {emojis.map((e) => (
            <motion.span key={e.id} className="pointer-events-none absolute text-xl sm:text-2xl" style={{ left: `${e.x}%`, bottom: "38%" }} initial={{ opacity: 1, y: 0, scale: 0.6 }} animate={{ opacity: 0, y: -130, scale: 1.1 }} exit={{ opacity: 0 }} transition={{ duration: 2.2 }}>{e.emoji}</motion.span>
          ))}
        </AnimatePresence>
      </motion.div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,black_100%)]" />
    </div>
  );
}

export function TunnelScene({ progress }: { progress: number }) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-black" style={{ perspective: "800px" }}>
      <motion.div className="absolute inset-0" style={{ transform: `translateZ(${progress * 400}px)`, transformStyle: "preserve-3d" }}>
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} className="absolute left-1/2 border border-primary/20" style={{ width: `${100 - i * 5}%`, height: `${100 - i * 4.5}%`, top: `${i * 2.2}%`, transform: `translateX(-50%) translateZ(${-i * 75}px)`, background: `linear-gradient(180deg, rgba(168,85,247,${0.04 + i * 0.02}) 0%, transparent 100%)`, boxShadow: `inset 0 0 ${20 + i * 10}px rgba(168,85,247,0.12)` }} />
        ))}
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
      <motion.div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-primary/25 to-transparent" animate={{ opacity: [0.3, 0.9, 0.3] }} transition={{ duration: 1.2, repeat: Infinity }} />
    </div>
  );
}
