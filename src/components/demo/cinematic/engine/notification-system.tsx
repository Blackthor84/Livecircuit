"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export function ToastNotification({ message }: { message: string | null }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12 }}
          className="fixed left-1/2 top-24 z-[100] -translate-x-1/2 rounded-full border border-primary/40 bg-primary/20 px-6 py-2.5 text-sm font-semibold shadow-2xl backdrop-blur-xl"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function LiveNotificationStack({
  items,
  position = "left",
}: {
  items: { id: number; text: string; icon?: LucideIcon }[];
  position?: "left" | "right";
}) {
  return (
    <div className={`space-y-2 ${position === "left" ? "" : "items-end"}`}>
      <AnimatePresence mode="popLayout">
        {items.map((n) => (
          <motion.div
            key={n.id}
            layout
            initial={{ opacity: 0, x: position === "left" ? -48 : 48, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/70 px-4 py-2.5 text-sm font-medium backdrop-blur-xl"
          >
            {n.icon ? <n.icon className="size-4 shrink-0 text-primary" /> : null}
            {n.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
