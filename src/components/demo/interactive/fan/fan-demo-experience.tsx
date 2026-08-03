"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Crown, Ticket } from "lucide-react";
import { DemoImmersiveArena } from "@/components/demo/interactive/shared/demo-immersive-arena";
import { DemoSeatingMap } from "@/components/demo/interactive/shared/demo-seating-map";
import { Button } from "@/components/ui/button";
import { DEMO_EVENTS } from "@/lib/demo/interactive/data";
import { cn } from "@/lib/utils";

type FanStep = "event" | "seat" | "ticket" | "arena" | "done";

export function FanDemoExperience() {
  const [step, setStep] = useState<FanStep>("event");
  const [event] = useState(DEMO_EVENTS[0]!);
  const [seat, setSeat] = useState<string | null>(null);
  const [ticketAnimating, setTicketAnimating] = useState(false);

  const confirmSeat = () => {
    setTicketAnimating(true);
    setTimeout(() => {
      setStep("ticket");
      setTicketAnimating(false);
    }, 600);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex gap-2">
        {(["event", "seat", "ticket", "arena"] as FanStep[]).map((s, i) => (
          <div
            key={s}
            className={cn(
              "h-1 flex-1 rounded-full transition-all",
              (["event", "seat", "ticket", "arena", "done"] as FanStep[]).indexOf(step) >= i ? "bg-primary" : "bg-white/10"
            )}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === "event" && (
          <motion.div key="event" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-violet-950/50 to-background">
              <div className="relative aspect-[21/9] bg-gradient-to-br from-primary/30 via-violet-900/40 to-black">
                <div className="absolute inset-0 flex items-end p-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-primary">Tonight · {event.state}</p>
                    <h1 className="mt-1 text-3xl font-bold sm:text-4xl">{event.title}</h1>
                    <p className="mt-1 text-muted-foreground">{event.artist} · {event.arena}</p>
                  </div>
                </div>
                <div className="absolute right-6 top-6 rounded-full bg-red-500/90 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
                  Live in 2h
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4 p-6">
                <div>
                  <p className="text-sm text-muted-foreground">{event.date} · General Admission from</p>
                  <p className="text-3xl font-bold">${event.ticketPrice}</p>
                  <div className="mt-2 h-1.5 w-48 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${event.soldPercent}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{event.soldPercent}% sold</p>
                </div>
                <Button size="lg" className="gap-2 bg-gradient-to-r from-primary to-accent px-8" onClick={() => setStep("seat")}>
                  <Ticket className="size-4" /> Buy Ticket
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {step === "seat" && (
          <motion.div key="seat" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
            <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
              <DemoSeatingMap selected={seat} onSelect={setSeat} />
              <div className="mt-6 flex justify-between gap-3">
                <Button variant="outline" onClick={() => setStep("event")}>Back</Button>
                <Button disabled={!seat || ticketAnimating} onClick={confirmSeat} className="gap-2">
                  {ticketAnimating ? "Processing..." : <>Confirm Seat <ArrowRight className="size-4" /></>}
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {step === "ticket" && (
          <motion.div key="ticket" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center">
            <motion.div
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 120, damping: 14 }}
              className="w-full max-w-sm overflow-hidden rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/20 via-background to-accent/10 shadow-2xl shadow-primary/20"
            >
              <div className="border-b border-white/10 bg-primary/10 px-6 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">LiveCircuit Digital Ticket</p>
              </div>
              <div className="p-6">
                <p className="text-2xl font-bold">{event.title}</p>
                <p className="text-muted-foreground">{event.artist}</p>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-xs text-muted-foreground">Date</p><p className="font-semibold">{event.date}</p></div>
                  <div><p className="text-xs text-muted-foreground">Seat</p><p className="font-semibold">{seat}</p></div>
                  <div><p className="text-xs text-muted-foreground">Venue</p><p className="font-semibold">{event.arena}</p></div>
                  <div><p className="text-xs text-muted-foreground">Price</p><p className="font-semibold">${event.ticketPrice}</p></div>
                </div>
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="mt-6 flex h-28 items-center justify-center rounded-xl border border-dashed border-primary/30 bg-black/30"
                >
                  <p className="font-mono text-lg tracking-widest">▮▮▮▮▮▮▮▮▮▮</p>
                </motion.div>
                <p className="mt-2 text-center font-mono text-xs text-muted-foreground">LC-{event.id.toUpperCase()}-{seat?.replace(/[^A-Z0-9]/gi, "")}</p>
              </div>
            </motion.div>
            <Button size="lg" className="mt-8 gap-2" onClick={() => setStep("arena")}>
              Enter Arena <ArrowRight className="size-4" />
            </Button>
          </motion.div>
        )}

        {step === "arena" && (
          <motion.div key="arena" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <DemoImmersiveArena artistName={event.artist} onComplete={() => setStep("done")} />
          </motion.div>
        )}

        {step === "done" && (
          <motion.div key="done" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <Crown className="mx-auto size-10 text-amber-400" />
            <h2 className="mt-4 text-2xl font-bold">Experience Complete</h2>
            <p className="mt-2 text-muted-foreground">You bought a ticket, entered the arena, grabbed merch, and earned a passport stamp.</p>
            <Button className="mt-6" variant="outline" onClick={() => { setStep("event"); setSeat(null); }}>
              Run It Again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
