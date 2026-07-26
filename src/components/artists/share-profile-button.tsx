"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ShareProfileButton({
  username,
  displayName,
}: {
  username: string;
  displayName: string;
}) {
  const [loading, setLoading] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/${username}` : `/${username}`;

  async function share() {
    setLoading(true);
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${displayName} on LiveCircuit`,
          text: `Check out ${displayName} on LiveCircuit`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Profile link copied!");
      }
    } catch {
      // User cancelled share sheet
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" variant="outline" disabled={loading} onClick={() => void share()}>
      <Share2 className="size-4" />
      Share Profile
    </Button>
  );
}
