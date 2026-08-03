"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Camera,
  Crown,
  Heart,
  MessageCircle,
  ShoppingBag,
  Star,
  Ticket,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEMO_EVENTS } from "@/lib/demo/interactive/data";
import { cn } from "@/lib/utils";

type FanStep = "browse" | "ticket" | "seat" | "confirmed" | "arena" | "merch" | "vip" | "badge" | "rate";

const STEPS: FanStep[] = ["browse", "ticket", "seat", "confirmed", "arena", "merch", "vip", "badge", "rate"];

const FAKE_FANS = ["Alex_K", "musicfan22", "texas_raver", "vip_luna", "concert_junkie"];

export function FanDemoExperience() {
  const [step, setStep] = useState<FanStep>("browse");
  const [selectedEvent, setSelectedEvent] = useState(DEMO_EVENTS[0]!);
  const [seat, setSeat] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [liveFans] = useState(() => FAKE_FANS.slice(0, 3 + Math.floor(Math.random() * 2)));

  const stepIndex = STEPS.indexOf(step);
  const next = () => setStep(STEPS[Math.min(stepIndex + 1, STEPS.length - 1)]!);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Fan Experience</h1>
        <p className="mt-2 text-muted-foreground">Your journey from discovery to unforgettable live moments.</p>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={cn(
              "h-1.5 shrink-0 rounded-full transition-all",
              i <= stepIndex ? "w-8 bg-primary" : "w-4 bg-white/10"
            )}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === "browse" && (
          <motion.div key="browse" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <h2 className="text-lg font-semibold">Browse Events</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {DEMO_EVENTS.map((event) => (
                <motion.button
                  key={event.id}
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  onClick={() => { setSelectedEvent(event); next(); }}
                  className={cn(
                    "glass-panel rounded-2xl p-5 text-left transition",
                    selectedEvent.id === event.id && "border-primary/40"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-xl bg-primary/15 text-sm font-bold">{event.artistAvatar}</div>
                    <div>
                      <p className="font-semibold">{event.title}</p>
                      <p className="text-sm text-muted-foreground">{event.artist} · {event.arena}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span>{event.date} · {event.state}</span>
                    <span className="font-semibold">${event.ticketPrice}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${event.soldPercent}%` }} />
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {step === "ticket" && (
          <motion.div key="ticket" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="mx-auto max-w-md space-y-6">
            <div className="glass-panel rounded-2xl p-6">
              <h2 className="text-xl font-bold">{selectedEvent.title}</h2>
              <p className="text-muted-foreground">{selectedEvent.artist} · {selectedEvent.arena}</p>
              <div className="mt-6 space-y-3">
                <div className="flex justify-between rounded-xl bg-white/[0.03] p-4">
                  <span>General Admission</span>
                  <span className="font-bold">${selectedEvent.ticketPrice}</span>
                </div>
                <div className="flex justify-between rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                  <span className="flex items-center gap-2"><Crown className="size-4 text-amber-400" /> VIP</span>
                  <span className="font-bold">${selectedEvent.vipPrice}</span>
                </div>
              </div>
              <Button className="mt-6 w-full" onClick={next}>Purchase Ticket</Button>
            </div>
          </motion.div>
        )}

        {step === "seat" && (
          <motion.div key="seat" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="mx-auto max-w-lg space-y-6">
            <h2 className="text-lg font-semibold">Choose Your Spot</h2>
            <div className="glass-panel rounded-2xl p-6">
              <div className="mb-6 rounded-xl bg-gradient-to-b from-primary/20 to-transparent py-8 text-center text-xs text-muted-foreground">STAGE</div>
              <div className="grid grid-cols-8 gap-2">
                {Array.from({ length: 32 }).map((_, i) => {
                  const id = `A${i + 1}`;
                  const taken = i % 5 === 0;
                  return (
                    <button
                      key={id}
                      type="button"
                      disabled={taken}
                      onClick={() => setSeat(id)}
                      className={cn(
                        "aspect-square rounded-md text-[10px] transition",
                        taken ? "bg-white/5 text-muted-foreground/30" : seat === id ? "bg-primary text-primary-foreground" : "bg-white/10 hover:bg-primary/30"
                      )}
                    >
                      {taken ? "×" : id}
                    </button>
                  );
                })}
              </div>
              <Button className="mt-6 w-full" disabled={!seat} onClick={next}>Confirm Seat {seat ?? ""}</Button>
            </div>
          </motion.div>
        )}

        {step === "confirmed" && (
          <motion.div key="confirmed" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mx-auto max-w-sm text-center">
            <motion.div
              animate={{ rotate: [0, 2, -2, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="glass-panel mx-auto rounded-2xl border-2 border-dashed border-primary/40 p-8"
            >
              <Ticket className="mx-auto size-12 text-primary" />
              <h2 className="mt-4 text-xl font-bold">Digital Ticket</h2>
              <p className="mt-2 text-sm text-muted-foreground">{selectedEvent.title}</p>
              <p className="mt-1 font-mono text-xs">LC-{selectedEvent.id.toUpperCase()}-{seat}</p>
              <div className="mt-4 h-24 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20" />
            </motion.div>
            <Button className="mt-6 gap-2" onClick={next}>Enter Arena <ArrowRight className="size-4" /></Button>
          </motion.div>
        )}

        {step === "arena" && (
          <motion.div key="arena" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="relative aspect-video overflow-hidden rounded-2xl bg-gradient-to-b from-violet-950 to-background">
              <motion.div
                className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"
                animate={{ opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <div className="absolute inset-x-0 bottom-0 top-1/3 bg-gradient-to-b from-primary/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex h-16 items-end justify-center gap-0.5 px-4">
                {Array.from({ length: 40 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 rounded-t bg-white/40"
                    style={{ height: `${20 + Math.random() * 40}px` }}
                    animate={{ height: [`${20 + (i % 3) * 10}px`, `${30 + (i % 5) * 12}px`, `${20 + (i % 3) * 10}px`] }}
                    transition={{ duration: 0.8 + (i % 4) * 0.2, repeat: Infinity }}
                  />
                ))}
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-2xl font-bold text-white/90">{selectedEvent.artist} LIVE</p>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="glass-panel rounded-xl p-4">
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><MessageCircle className="size-4" /> Live Chat</p>
                <div className="space-y-2 text-xs">
                  {liveFans.map((fan) => (
                    <div key={fan} className="text-muted-foreground"><span className="text-primary">{fan}:</span> This is incredible! 🔥</div>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {["🔥", "❤️", "🎉", "👏", "🤘"].map((emoji) => (
                  <motion.button key={emoji} whileTap={{ scale: 1.3 }} className="rounded-full bg-white/10 px-4 py-2 text-xl hover:bg-white/20">{emoji}</motion.button>
                ))}
              </div>
            </div>
            <Button onClick={next}>Continue Journey</Button>
          </motion.div>
        )}

        {(step === "merch" || step === "vip" || step === "badge") && (
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="mx-auto max-w-md space-y-6 text-center">
            {step === "merch" && (
              <>
                <ShoppingBag className="mx-auto size-12 text-primary" />
                <h2 className="text-xl font-bold">Merch Booth</h2>
                <div className="glass-panel rounded-2xl p-6">
                  <p className="font-semibold">Tour T-Shirt — ${selectedEvent.ticketPrice + 15}</p>
                  <Button className="mt-4 w-full" onClick={next}>Add to Cart & Checkout</Button>
                </div>
              </>
            )}
            {step === "vip" && (
              <>
                <Crown className="mx-auto size-12 text-amber-400" />
                <h2 className="text-xl font-bold">Upgrade to VIP Lounge</h2>
                <p className="text-muted-foreground">Exclusive access, artist Q&A, premium chat</p>
                <Button className="w-full" onClick={next}>Upgrade for ${selectedEvent.vipPrice - selectedEvent.ticketPrice}</Button>
                <Button variant="ghost" onClick={next}>Skip</Button>
              </>
            )}
            {step === "badge" && (
              <>
                <Camera className="mx-auto size-12 text-primary" />
                <h2 className="text-xl font-bold">Selfie & Digital Badge</h2>
                <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }} className="glass-panel mx-auto max-w-xs rounded-2xl p-6">
                  <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-2xl">🏆</div>
                  <p className="mt-4 font-bold">Show Attendee</p>
                  <p className="text-xs text-muted-foreground">{selectedEvent.title}</p>
                </motion.div>
                <Button onClick={next}>Collect Badge</Button>
              </>
            )}
          </motion.div>
        )}

        {step === "rate" && (
          <motion.div key="rate" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto max-w-md space-y-6 text-center">
            <Heart className="mx-auto size-12 text-red-400" />
            <h2 className="text-xl font-bold">Rate Your Experience</h2>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)}>
                  <Star className={cn("size-8 transition", n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
                </button>
              ))}
            </div>
            <p className="text-muted-foreground">Thanks for experiencing LiveCircuit!</p>
            <Button variant="outline" onClick={() => { setStep("browse"); setSeat(null); setRating(0); }}>Start Over</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
