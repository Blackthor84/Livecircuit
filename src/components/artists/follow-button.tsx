"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleFollowArtistAction } from "@/lib/actions/follow";

export function FollowButton({
  artistId,
  initialFollowing,
  disabled,
}: {
  artistId: string;
  initialFollowing: boolean;
  disabled?: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const result = await toggleFollowArtistAction(artistId);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setFollowing(result.following);
    toast.success(result.following ? "Following" : "Unfollowed");
  }

  return (
    <Button type="button" disabled={loading || disabled} variant={following ? "secondary" : "default"} onClick={toggle}>
      {loading ? "…" : following ? "Following" : "Follow"}
    </Button>
  );
}
