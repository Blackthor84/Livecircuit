import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";

export function ArtistSuccessPlanBanner() {
  return (
    <div className="relative mb-10 overflow-hidden rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/15 via-primary/10 to-transparent p-6 sm:p-8">
      <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">Artist Success Center</p>
          <h2 className="mt-1 text-xl font-bold sm:text-2xl">Build smarter shows. Sell more tickets.</h2>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            Interactive venue matching, pricing advisor, and growth roadmap — free for all performers.
          </p>
        </div>
        <Button size="lg" href={ROUTES.artistSuccessCenter} className="shrink-0 gap-2">
          <Sparkles className="size-4" />
          Start My Success Plan
        </Button>
      </div>
    </div>
  );
}
