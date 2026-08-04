"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Crown, MessageCircle, ShoppingBag, Sparkles } from "lucide-react";
import { CHAT_MESSAGES } from "@/lib/demo/interactive/data";
import { getPrimaryDemoArtist } from "@/lib/demo/originals";

export function DigitalArenaExperience() {
  const headliner = getPrimaryDemoArtist();
  const [chatIndex, setChatIndex] = useState(0);
  const [pan, setPan] = useState(0);

  useEffect(() => {
    const chatInterval = setInterval(() => setChatIndex((i) => (i + 1) % CHAT_MESSAGES.length), 3000);
    const panInterval = setInterval(() => setPan((p) => (p + 1) % 360), 50);
    return () => { clearInterval(chatInterval); clearInterval(panInterval); };
  }, []);

  const chat = CHAT_MESSAGES[chatIndex]!;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Digital Arena</h1>
        <p className="mt-2 text-muted-foreground">Immersive live concert — camera pans automatically.</p>
      </div>

      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-black">
        <motion.div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 30%, oklch(0.4 0.25 280 / 0.6), transparent), radial-gradient(ellipse 60% 40% at 50% 80%, oklch(0.2 0.1 280), black)",
            transform: `perspective(800px) rotateY(${Math.sin(pan * 0.02) * 8}deg)`,
          }}
        />

        {/* Stage */}
        <div className="absolute inset-x-[15%] bottom-[35%] h-[25%] rounded-t-2xl bg-gradient-to-b from-violet-900/80 to-violet-950/90 border border-white/10">
          <div className="absolute inset-x-4 top-2 flex justify-center gap-8">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="h-16 w-1 origin-bottom bg-gradient-to-t from-amber-400/80 to-transparent"
                animate={{ rotate: [-15, 15, -15] }}
                transition={{ duration: 2 + i * 0.3, repeat: Infinity }}
              />
            ))}
          </div>
          <motion.div
            className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>

        {/* LED screens */}
        <div className="absolute left-[5%] top-[15%] rounded-lg border border-white/20 bg-black/60 px-3 py-2 text-[10px] font-bold text-cyan-400">{headliner.stageName.toUpperCase()} LIVE</div>
        <div className="absolute right-[5%] top-[15%] rounded-lg border border-amber-500/30 bg-black/60 px-3 py-2 text-[10px] font-bold text-amber-400">SPONSOR</div>

        {/* Crowd */}
        <div className="absolute inset-x-0 bottom-0 flex h-[30%] items-end justify-center gap-px px-2">
          {Array.from({ length: 60 }).map((_, i) => (
            <motion.div
              key={i}
              className="w-1 rounded-t bg-gradient-to-t from-primary/60 to-primary/20"
              animate={{ height: [`${15 + (i % 7) * 4}px`, `${25 + (i % 5) * 6}px`, `${15 + (i % 7) * 4}px`] }}
              transition={{ duration: 0.6 + (i % 10) * 0.05, repeat: Infinity }}
            />
          ))}
        </div>

        {/* Lasers */}
        {Array.from({ length: 4 }).map((_, i) => (
          <motion.div
            key={i}
            className="pointer-events-none absolute bottom-[35%] left-1/2 h-32 w-0.5 origin-bottom bg-gradient-to-t from-cyan-400/60 to-transparent"
            style={{ rotate: -30 + i * 20 }}
            animate={{ opacity: [0.2, 0.8, 0.2], rotate: [-30 + i * 20, -20 + i * 20, -30 + i * 20] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}

        {/* Smoke */}
        <motion.div
          className="pointer-events-none absolute inset-x-0 bottom-[30%] h-20 bg-gradient-to-t from-white/5 to-transparent"
          animate={{ opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 4, repeat: Infinity }}
        />

        {/* VIP lounge indicator */}
        <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-400">
          <Crown className="size-3" /> VIP Lounge Active
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="glass-panel rounded-xl p-4">
          <MessageCircle className="size-4 text-primary" />
          <p className="mt-2 text-xs text-muted-foreground">Live Chat</p>
          <motion.p key={chat.user} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1 text-sm">
            <span className="text-primary">{chat.user}</span>: {chat.message} {chat.emoji}
          </motion.p>
        </div>
        <div className="glass-panel rounded-xl p-4">
          <ShoppingBag className="size-4 text-primary" />
          <p className="mt-2 text-xs text-muted-foreground">Merch Booth</p>
          <p className="mt-1 text-sm font-semibold">Tour merch selling fast</p>
        </div>
        <div className="glass-panel rounded-xl p-4">
          <Sparkles className="size-4 text-amber-400" />
          <p className="mt-2 text-xs text-muted-foreground">Sponsor Banners</p>
          <p className="mt-1 text-sm font-semibold">TechCorp · StreamMax</p>
        </div>
      </div>
    </div>
  );
}
