"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, GripVertical, Loader2, Plus } from "lucide-react";
import { useDemoSound } from "@/components/demo/cinematic/shared/demo-sound-provider";
import { PUBLISH_STEPS, TOUR_MAP_NODES } from "@/lib/demo/cinematic/constants";
import { cn } from "@/lib/utils";

type TourCity = (typeof TOUR_MAP_NODES)[number];

export function TourBuilderMap({ onBack }: { onBack: () => void }) {
  const [selected, setSelected] = useState<TourCity | null>(null);
  const [route, setRoute] = useState<TourCity[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishStep, setPublishStep] = useState(0);
  const [published, setPublished] = useState(false);
  const sound = useDemoSound();

  const addCity = () => {
    if (!selected || route.some((r) => r.id === selected.id)) return;
    sound.playClick();
    setRoute((r) => [...r, selected]);
    setSelected(null);
  };

  const publish = () => {
    if (route.length < 2) return;
    sound.playClick();
    setPublishing(true);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setPublishStep(step);
      if (step >= PUBLISH_STEPS.length) {
        clearInterval(interval);
        setTimeout(() => { setPublishing(false); setPublished(true); sound.playApplause(); }, 800);
      }
    }, 1200);
  };

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    setRoute((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      if (item) next.splice(to, 0, item);
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col px-4 pb-6 sm:px-8">
      <div className="mb-4 flex items-center justify-between">
        <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Back</button>
        <div className="text-center"><p className="text-xs uppercase tracking-widest text-primary">Tour Builder</p><h2 className="text-lg font-bold">Build Your Route</h2></div>
        <div className="w-16" />
      </div>

      <div className="relative min-h-[280px] flex-1 overflow-hidden rounded-3xl border border-white/10 bg-black/50 sm:min-h-[360px]">
        <svg viewBox="0 0 100 85" className="absolute inset-0 h-full w-full opacity-15"><path d="M12 12 L88 8 L92 28 L82 32 L78 48 L88 58 L85 72 L72 78 L58 72 L48 78 L38 68 L28 72 L18 62 L8 48 L12 32 Z" fill="currentColor" className="text-primary" /></svg>
        <svg viewBox="0 0 100 85" className="absolute inset-0 h-full w-full">
          {route.map((city, i) => {
            if (i === 0) return null;
            const prev = route[i - 1]!;
            return <motion.line key={`line-${city.id}`} x1={prev.x} y1={prev.y} x2={city.x} y2={city.y} stroke="url(#routeGrad)" strokeWidth="0.8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} />;
          })}
          <defs><linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#a855f7" /><stop offset="100%" stopColor="#22d3ee" /></linearGradient></defs>
        </svg>
        {TOUR_MAP_NODES.map((node) => {
          const inRoute = route.some((r) => r.id === node.id);
          const isSelected = selected?.id === node.id;
          return (
            <motion.button key={node.id} type="button" onClick={() => { sound.playClick(); setSelected(node); }} className="absolute z-10 -translate-x-1/2 -translate-y-1/2" style={{ left: `${node.x}%`, top: `${node.y}%` }} whileHover={{ scale: 1.25 }} whileTap={{ scale: 0.9 }}>
              <motion.div animate={inRoute ? { boxShadow: ["0 0 0 0 rgba(168,85,247,0.5)", "0 0 0 14px rgba(168,85,247,0)", "0 0 0 0 rgba(168,85,247,0.5)"] } : {}} transition={{ duration: 2, repeat: Infinity }} className={cn("size-4 rounded-full border-2 sm:size-5", inRoute ? "border-primary bg-primary shadow-lg shadow-primary/50" : isSelected ? "border-cyan-400 bg-cyan-400/60" : "border-white/30 bg-white/20")} />
              <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium">{node.city}</span>
            </motion.button>
          );
        })}
      </div>

      {route.length > 0 && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tour Order · drag to reorder</p>
          <div className="space-y-1">
            {route.map((city, i) => (
              <div
                key={city.id}
                draggable
                onDragStart={() => setDragIdx(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (dragIdx != null) { reorder(dragIdx, i); setDragIdx(null); sound.playClick(); } }}
                className={cn("flex cursor-grab items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm active:cursor-grabbing", dragIdx === i && "border-primary/40 bg-primary/10")}
              >
                <GripVertical className="size-4 text-muted-foreground" />
                <span className="font-bold text-primary">{i + 1}.</span>
                <span className="flex-1 font-medium">{city.city}</span>
                <span className="text-xs text-muted-foreground">{city.attendance.toLocaleString()} expected</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {selected && !published && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 rounded-2xl border border-primary/30 bg-primary/10 p-5">
            <h3 className="text-xl font-bold">{selected.city}</h3>
            <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
              <div><p className="text-xs text-muted-foreground">Capacity</p><p className="font-bold">{selected.capacity.toLocaleString()}</p></div>
              <div><p className="text-xs text-muted-foreground">Expected</p><p className="font-bold">{selected.attendance.toLocaleString()}</p></div>
              <div><p className="text-xs text-muted-foreground">Projected</p><p className="font-bold text-emerald-400">${selected.revenue.toLocaleString()}</p></div>
            </div>
            <button type="button" onClick={addCity} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground"><Plus className="size-4" /> Add to Tour</button>
          </motion.div>
        )}
      </AnimatePresence>

      {!published && route.length >= 2 && (
        <motion.button type="button" onClick={publish} disabled={publishing} whileHover={{ scale: 1.02 }} className="mt-4 rounded-full bg-gradient-to-r from-primary to-accent py-4 text-lg font-bold disabled:opacity-60">Publish Tour</motion.button>
      )}

      <AnimatePresence>
        {(publishing || published) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md">
            <div className="text-center px-6">
              {publishing && !published && (<><Loader2 className="mx-auto size-12 animate-spin text-primary" /><p className="mt-4 text-xl font-bold">{PUBLISH_STEPS[publishStep - 1] ?? PUBLISH_STEPS[0]}</p></>)}
              {published && (
                <>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mx-auto flex size-20 items-center justify-center rounded-full bg-emerald-500/20"><Check className="size-10 text-emerald-400" /></motion.div>
                  <p className="mt-4 text-3xl font-bold text-emerald-400">Tour Published</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">{route.map((c, i) => (<span key={c.id} className="flex items-center gap-1 rounded-full border border-primary/30 px-3 py-1 text-sm">{i > 0 && "↓"} {c.city}</span>))}</div>
                  <button type="button" onClick={onBack} className="mt-8 rounded-full border border-white/20 px-8 py-3 text-sm font-semibold">Return</button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
