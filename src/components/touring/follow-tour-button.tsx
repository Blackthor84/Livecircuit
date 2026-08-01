"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleFollowTourAction } from "@/lib/actions/tour-follow";

export function FollowTourButton({
  tourId,
  artistSlug,
  tourSlug,
  initialFollowing,
  disabled,
}: {
  tourId: string;
  artistSlug: string;
  tourSlug: string;
  initialFollowing: boolean;
  disabled?: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const result = await toggleFollowTourAction(tourId, artistSlug, tourSlug);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setFollowing(result.following);
    toast.success(result.following ? "Following tour" : "Unfollowed tour");
  }

  return (
    <Button
      type="button"
      disabled={loading || disabled}
      variant={following ? "secondary" : "default"}
      onClick={toggle}
    >
      {loading ? "…" : following ? "Following tour" : "Follow tour"}
    </Button>
  );
}
