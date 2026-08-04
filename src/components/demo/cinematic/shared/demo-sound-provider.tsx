"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type SoundEngine = {
  enabled: boolean;
  toggle: () => void;
  playCrowd: (intensity?: number) => void;
  playBass: () => void;
  playClick: () => void;
  playApplause: () => void;
  playTip: () => void;
};

const DemoSoundContext = createContext<SoundEngine | null>(null);

function createNoise(ctx: AudioContext, duration: number, volume: number) {
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * volume;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.value = volume;
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start();
  return { source, gain };
}

export function DemoSoundProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const crowdRef = useRef<{ gain: GainNode; source: AudioBufferSourceNode } | null>(null);

  const getCtx = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    return ctxRef.current;
  }, []);

  const toggle = useCallback(() => {
    setEnabled((e) => {
      if (!e) {
        const ctx = getCtx();
        if (ctx?.state === "suspended") void ctx.resume();
      }
      return !e;
    });
  }, [getCtx]);

  const playCrowd = useCallback(
    (intensity = 0.3) => {
      if (!enabled) return;
      const ctx = getCtx();
      if (!ctx) return;
      if (crowdRef.current) {
        crowdRef.current.gain.gain.linearRampToValueAtTime(intensity * 0.15, ctx.currentTime + 0.5);
        return;
      }
      const { source, gain } = createNoise(ctx, 4, 0.08);
      gain.gain.value = intensity * 0.12;
      source.loop = true;
      crowdRef.current = { source, gain };
    },
    [enabled, getCtx]
  );

  const playBass = useCallback(() => {
    if (!enabled) return;
    const ctx = getCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(55, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  }, [enabled, getCtx]);

  const playClick = useCallback(() => {
    if (!enabled) return;
    const ctx = getCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 800;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  }, [enabled, getCtx]);

  const playApplause = useCallback(() => {
    if (!enabled) return;
    const ctx = getCtx();
    if (!ctx) return;
    createNoise(ctx, 1.2, 0.2);
  }, [enabled, getCtx]);

  const playTip = useCallback(() => {
    if (!enabled) return;
    const ctx = getCtx();
    if (!ctx) return;
    [523, 659, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.2);
    });
  }, [enabled, getCtx]);

  return (
    <DemoSoundContext.Provider value={{ enabled, toggle, playCrowd, playBass, playClick, playApplause, playTip }}>
      {children}
    </DemoSoundContext.Provider>
  );
}

const NOOP_SOUND: SoundEngine = {
  enabled: false,
  toggle: () => {},
  playCrowd: () => {},
  playBass: () => {},
  playClick: () => {},
  playApplause: () => {},
  playTip: () => {},
};

export function useDemoSound() {
  const ctx = useContext(DemoSoundContext);
  return ctx ?? NOOP_SOUND;
}
