"use client";

import { useTransition } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { castWalkOfFameVoteAction } from "@/lib/actions/walk-of-fame";

export function WalkOfFameVoteButton({
  artistId,
  disabled,
  fanVoteCount,
}: {
  artistId: string;
  disabled?: boolean;
  fanVoteCount: number;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={disabled || pending}
      onClick={() => {
        startTransition(async () => {
          await castWalkOfFameVoteAction({ artistId });
        });
      }}
    >
      <Heart className="mr-1 h-3.5 w-3.5" />
      {disabled ? "Voted" : "Vote"} ({fanVoteCount})
    </Button>
  );
}
