"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { ArtistImagePose } from "@/data/demo/artists/types";
import { getAvailablePoses, getStagePerformerSelection, resolvePoseImage } from "@/data/demo/artists/queries";
import { getArtistById } from "@/data/demo/artists/queries";
import type { StagePerformerSelection } from "@/lib/demo/cinematic/fictional-artists";
import { cn } from "@/lib/utils";

type StagePerformerProps = {
  visible?: boolean;
  pulsing?: boolean;
  /** Required — Artist Bible ID (never random) */
  artistId: string;
  selection?: StagePerformerSelection;
  animatePoses?: boolean;
  className?: string;
};

export function StagePerformer({
  visible = true,
  pulsing = false,
  artistId,
  selection,
  animatePoses = false,
  className,
}: StagePerformerProps) {
  const [current, setCurrent] = useState<StagePerformerSelection | null>(selection ?? null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setCurrent(selection ?? getStagePerformerSelection(artistId));
    setImageError(false);
  }, [selection, artistId]);

  useEffect(() => {
    if (!animatePoses || !visible || !current) return;
    const artist = getArtistById(artistId);
    if (!artist) return;
    const interval = setInterval(() => {
      const poses = getAvailablePoses(artist);
      const nextPose = poses[Math.floor(Date.now() / 9000) % poses.length] as ArtistImagePose;
      const nextSrc = resolvePoseImage(artist, nextPose);
      setCurrent((prev) => (prev && nextSrc !== prev.src ? { ...prev, pose: nextPose, src: nextSrc } : prev));
    }, 9000);
    return () => clearInterval(interval);
  }, [animatePoses, visible, artistId, current?.src]);

  if (!current) {
    return (
      <div
        className={cn("relative mx-auto aspect-[3/4] w-[min(42vw,220px)] animate-pulse rounded-2xl bg-white/5 sm:w-[min(36vw,280px)]", className)}
        style={{ opacity: visible ? 0.5 : 0.2 }}
      />
    );
  }

  const displayName = current.band ?? current.artistName;

  return (
    <motion.div
      animate={pulsing ? { scale: [1, 1.015, 1] } : {}}
      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      className={cn("relative mx-auto w-[min(42vw,220px)] sm:w-[min(36vw,280px)]", className)}
      style={{ opacity: visible ? 1 : 0.35 }}
    >
      {visible && (
        <motion.div
          className="pointer-events-none absolute -inset-8 rounded-full bg-primary/25 blur-3xl"
          animate={{ opacity: [0.25, 0.55, 0.25], scale: [0.92, 1.08, 0.92] }}
          transition={{ duration: 2.2, repeat: Infinity }}
        />
      )}

      <motion.div
        key={current.src}
        initial={{ opacity: 0, y: 12, scale: 0.96 }}
        animate={{ opacity: visible ? 1 : 0.35, y: 0, scale: 1 }}
        transition={{ duration: 0.65, ease: "easeOut" }}
        className="relative aspect-[3/4] w-full"
      >
        <Image
          src={current.src}
          alt={current.alt}
          fill
          priority
          sizes="(max-width: 640px) 42vw, 280px"
          className={cn(
            "object-contain object-bottom drop-shadow-[0_0_35px_rgba(168,85,247,0.55)]",
            imageError && "hidden",
          )}
          onError={() => setImageError(true)}
        />
        {imageError && (
          <div className="absolute inset-0 flex items-end justify-center pb-2">
            <div className="h-[85%] w-[45%] rounded-t-full bg-gradient-to-t from-primary/40 via-violet-500/20 to-transparent blur-[1px]" />
          </div>
        )}
      </motion.div>

      {visible && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="pointer-events-none absolute -bottom-6 inset-x-0 text-center text-[10px] font-bold uppercase tracking-[0.25em] text-primary/90 sm:text-xs"
        >
          {displayName}
        </motion.p>
      )}
    </motion.div>
  );
}
