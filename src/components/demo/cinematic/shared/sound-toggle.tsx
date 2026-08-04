"use client";

import { motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import { useDemoSound } from "@/components/demo/cinematic/shared/demo-sound-provider";
import { cn } from "@/lib/utils";

export function SoundToggle({ className }: { className?: string }) {
  const { enabled, toggle } = useDemoSound();

  return (
    <motion.button
      type="button"
      onClick={toggle}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-4 py-2 text-xs font-medium backdrop-blur-xl transition",
        enabled ? "border-primary/40 text-primary" : "text-muted-foreground hover:text-foreground",
        className
      )}
    >
      {enabled ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
      {enabled ? "Sound On" : "Enable Sound"}
    </motion.button>
  );
}
