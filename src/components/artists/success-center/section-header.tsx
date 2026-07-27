"use client";

import { FadeUp } from "@/components/demo/naming-rights/fade-up";
import { cn } from "@/lib/utils";

export function SectionHeader({
  id,
  eyebrow,
  title,
  description,
  className,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <FadeUp className={cn("mb-10 text-center", className)}>
      {eyebrow ? (
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
          {eyebrow}
        </p>
      ) : null}
      <h2 id={id} className="text-3xl font-bold tracking-tight sm:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">{description}</p>
      ) : null}
    </FadeUp>
  );
}
