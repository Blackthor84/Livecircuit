"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { formatCompact } from "@/lib/demo/naming-rights-utils";

function formatValue(value: number, format: "compact" | "number"): string {
  if (format === "number") return value.toLocaleString();
  return formatCompact(value);
}

export function AnimatedCounter({
  value,
  format = "compact",
  className,
  duration = 1600,
  resetKey,
}: {
  value: number;
  format?: "compact" | "number";
  className?: string;
  duration?: number;
  resetKey?: string;
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    setDisplay(0);
    const el = ref.current;
    if (!el) return;

    let frame: number;
    const start = performance.now();

    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) frame = requestAnimationFrame(tick);
      },
      { threshold: 0.2 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, duration, resetKey]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {formatValue(display, format)}
    </span>
  );
}
