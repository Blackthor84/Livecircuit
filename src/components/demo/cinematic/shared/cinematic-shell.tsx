"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { LiveCircuitLogo } from "@/components/brand/livecircuit-logo";
import { AmbientBackground } from "@/components/demo/cinematic/shared/ambient-background";
import { DemoSoundProvider } from "@/components/demo/cinematic/shared/demo-sound-provider";
import { SoundToggle } from "@/components/demo/cinematic/shared/sound-toggle";
import { ROUTES } from "@/lib/constants";

export function CinematicShell({
  children,
  showExit = true,
}: {
  children: React.ReactNode;
  showExit?: boolean;
}) {
  return (
    <DemoSoundProvider>
      <div className="fixed inset-0 z-40 overflow-hidden bg-black text-foreground">
        <AmbientBackground />
        {showExit && (
          <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="absolute left-0 right-0 top-0 z-50 flex items-center justify-between px-4 py-4 sm:px-6"
          >
            <Link
              href={ROUTES.demo}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-2 text-xs font-medium backdrop-blur-xl transition hover:bg-white/10"
            >
              <ArrowLeft className="size-3.5" />
              <LiveCircuitLogo className="h-4" />
            </Link>
            <SoundToggle />
          </motion.header>
        )}
        {children}
      </div>
    </DemoSoundProvider>
  );
}
