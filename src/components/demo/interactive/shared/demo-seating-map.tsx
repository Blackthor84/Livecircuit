"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Seat = { id: string; row: string; num: number; section: "floor" | "lower" | "upper" | "vip"; taken: boolean };

function buildSeats(): Seat[] {
  const seats: Seat[] = [];
  const sections: Seat["section"][] = ["vip", "floor", "lower", "upper"];
  const rows = ["A", "B", "C", "D", "E", "F", "G", "H"];
  sections.forEach((section, si) => {
    const cols = section === "vip" ? 6 : section === "floor" ? 10 : 12;
    rows.slice(0, section === "upper" ? 4 : 6).forEach((row, ri) => {
      for (let n = 1; n <= cols; n++) {
        seats.push({
          id: `${section}-${row}${n}`,
          row,
          num: n,
          section,
          taken: (si + ri + n) % 7 === 0 || (si + ri + n) % 11 === 0,
        });
      }
    });
  });
  return seats;
}

const ALL_SEATS = buildSeats();

export function DemoSeatingMap({
  selected,
  onSelect,
  occupiedIds = [],
}: {
  selected: string | null;
  onSelect: (id: string) => void;
  occupiedIds?: string[];
}) {
  const sections = ["vip", "floor", "lower", "upper"] as const;
  const labels = { vip: "VIP", floor: "Floor", lower: "Lower Bowl", upper: "Upper Bowl" };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, scaleY: 0.8 }}
        animate={{ opacity: 1, scaleY: 1 }}
        className="relative mx-auto max-w-md rounded-t-[50%] border border-primary/30 bg-gradient-to-b from-primary/25 via-primary/10 to-transparent py-6 text-center"
      >
        <div className="absolute inset-x-8 top-2 h-1 rounded-full bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent" />
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Stage</p>
      </motion.div>

      {sections.map((section, si) => {
        const sectionSeats = ALL_SEATS.filter((s) => s.section === section);
        const cols = section === "vip" ? 6 : section === "floor" ? 10 : 12;
        return (
          <motion.div
            key={section}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: si * 0.1 }}
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{labels[section]}</p>
            <div
              className="grid gap-1.5"
              style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
            >
              {sectionSeats.map((seat) => {
                const isTaken = seat.taken || occupiedIds.includes(seat.id);
                const isSelected = selected === seat.id;
                return (
                  <motion.button
                    key={seat.id}
                    type="button"
                    disabled={isTaken}
                    onClick={() => onSelect(seat.id)}
                    whileHover={!isTaken ? { scale: 1.15 } : undefined}
                    whileTap={!isTaken ? { scale: 0.95 } : undefined}
                    className={cn(
                      "aspect-square rounded-md text-[8px] font-medium transition-colors sm:text-[9px]",
                      section === "vip" && "ring-1 ring-amber-500/30",
                      isTaken && "cursor-not-allowed bg-white/5 text-muted-foreground/20",
                      isSelected && "bg-primary text-primary-foreground shadow-lg shadow-primary/40",
                      !isTaken && !isSelected && "bg-white/10 hover:bg-primary/40"
                    )}
                  >
                    {isTaken ? "×" : seat.num}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        );
      })}

      <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-white/10" /> Available</span>
        <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-primary" /> Selected</span>
        <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-white/5" /> Taken</span>
      </div>
    </div>
  );
}
