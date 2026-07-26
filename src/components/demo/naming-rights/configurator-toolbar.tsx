"use client";

import { Moon, Sun, Users } from "lucide-react";
import { AnimatedCounter } from "@/components/demo/naming-rights/animated-counter";
import { useSponsorVisualizer } from "@/components/demo/naming-rights/sponsor-visualizer-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ATTENDANCE_OPTIONS, EVENT_TYPES } from "@/lib/demo/sponsor-visualizer-steps";
import { cn } from "@/lib/utils";

export function ConfiguratorToolbar({ className }: { className?: string }) {
  const { form, updateForm, resetKey } = useSponsorVisualizer();
  const attendanceIndex = ATTENDANCE_OPTIONS.findIndex((n) => n === form.expectedAttendance);
  const sliderIndex = attendanceIndex >= 0 ? attendanceIndex : 3;

  return (
    <div className={cn("glass-panel space-y-4 rounded-2xl p-4", className)}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Day / Night</span>
        <Button size="sm" variant={form.timeOfDay === "day" ? "default" : "outline"} onClick={() => updateForm({ timeOfDay: "day" })}>
          <Sun className="size-4" /> Day
        </Button>
        <Button size="sm" variant={form.timeOfDay === "night" ? "default" : "outline"} onClick={() => updateForm({ timeOfDay: "night" })}>
          <Moon className="size-4" /> Night
        </Button>
        {form.timeOfDay === "night" ? (
          <Badge variant="secondary" className="border-amber-500/30 text-amber-400">LED · Neon · Fireworks</Badge>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Event Type</span>
        <Select value={form.eventType} onValueChange={(v) => v && updateForm({ eventType: v as typeof form.eventType })}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EVENT_TYPES.map((evt) => (
              <SelectItem key={evt.id} value={evt.id}>
                {evt.emoji} {evt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Users className="size-3.5" />
            Attendance Simulator
          </Label>
          <p className="text-lg font-bold">
            <AnimatedCounter value={form.expectedAttendance} format="number" resetKey={resetKey} />
          </p>
        </div>
        <input
          type="range"
          min={0}
          max={ATTENDANCE_OPTIONS.length - 1}
          step={1}
          value={sliderIndex}
          onChange={(e) => updateForm({ expectedAttendance: ATTENDANCE_OPTIONS[Number(e.target.value)] })}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-primary"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          {ATTENDANCE_OPTIONS.map((n) => (
            <span key={n}>{n >= 1000 ? `${n / 1000}K` : n}</span>
          ))}
        </div>
      </div>

      <Badge variant="secondary" className="border-primary/20">Live personalization active</Badge>
    </div>
  );
}
