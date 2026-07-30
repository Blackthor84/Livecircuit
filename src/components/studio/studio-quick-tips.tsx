"use client";

import { useEffect, useState } from "react";
import { Lightbulb } from "lucide-react";
import { randomTip } from "@/lib/streaming/studio/tips";

export function StudioQuickTips() {
  const [tip, setTip] = useState(randomTip());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTip((current) => randomTip([current.id]));
    }, 12000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
      <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" />
      <p>{tip.text}</p>
    </div>
  );
}
