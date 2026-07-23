"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleFollowVenueAction } from "@/lib/actions/venues";

export function VenueFollowButton({
  venueId,
  initialFollowing,
  disabled,
}: {
  venueId: string;
  initialFollowing: boolean;
  disabled?: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const result = await toggleFollowVenueAction(venueId);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setFollowing(result.following);
    toast.success(result.following ? "Following venue" : "Unfollowed venue");
  }

  return (
    <Button
      type="button"
      disabled={loading || disabled}
      variant={following ? "secondary" : "default"}
      onClick={() => void toggle()}
    >
      {loading ? "…" : following ? "Following" : "Follow venue"}
    </Button>
  );
}
