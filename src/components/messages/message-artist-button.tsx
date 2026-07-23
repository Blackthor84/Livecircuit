"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { startConversationAction } from "@/lib/actions/messaging";

export function MessageArtistButton({ artistId, disabled }: { artistId: string; disabled?: boolean }) {
  const router = useRouter();

  async function start() {
    const result = await startConversationAction({ artistId });
    if (!result.ok) toast.error(result.error);
    else if (result.conversationId) router.push(`/messages/${result.conversationId}`);
  }

  return (
    <Button type="button" variant="outline" disabled={disabled} onClick={() => void start()}>
      Message
    </Button>
  );
}
