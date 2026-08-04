"use client";

import { useCallback, useState } from "react";
import { createArenaEffects, type ArenaEffects } from "@/lib/demo/cinematic/arena-types";

export function useArenaEffects(initial: Partial<ArenaEffects> = {}) {
  const [effects, setEffects] = useState<ArenaEffects>(() => createArenaEffects(initial));

  const patch = useCallback((update: Partial<ArenaEffects>) => {
    setEffects((e) => ({ ...e, ...update }));
  }, []);

  const addHeart = useCallback(() => {
    const id = Date.now();
    const x = 25 + Math.random() * 50;
    setEffects((e) => ({ ...e, hearts: [...e.hearts, { id, x }] }));
    setTimeout(() => setEffects((e) => ({ ...e, hearts: e.hearts.filter((h) => h.id !== id) })), 2200);
  }, []);

  const addEmoji = useCallback((emoji: string) => {
    const id = Date.now() + Math.random();
    const x = 15 + Math.random() * 70;
    setEffects((e) => ({ ...e, emojis: [...e.emojis.slice(-15), { id, emoji, x }] }));
    setTimeout(() => setEffects((e) => ({ ...e, emojis: e.emojis.filter((em) => em.id !== id) })), 2500);
  }, []);

  return { effects, setEffects, patch, addHeart, addEmoji };
}
