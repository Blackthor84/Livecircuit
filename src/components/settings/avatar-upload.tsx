"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateAvatarUrlAction } from "@/lib/actions/profile";
import { createClient } from "@/lib/supabase/client";

export function AvatarUpload({
  userId,
  currentUrl,
}: {
  userId: string;
  currentUrl: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(currentUrl);
  const [loading, setLoading] = useState(false);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/avatar-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setLoading(false);
      toast.error(uploadError.message);
      return;
    }

    const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(path);
    const result = await updateAvatarUrlAction(publicUrl.publicUrl);
    setLoading(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setUrl(publicUrl.publicUrl);
    toast.success("Avatar updated");
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative size-20 overflow-hidden rounded-full border border-white/10 bg-muted">
        {url ? (
          <Image src={url} alt="" fill className="object-cover" sizes="80px" />
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
            ?
          </div>
        )}
      </div>
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChange}
        />
        <Button type="button" variant="secondary" size="sm" disabled={loading} onClick={() => inputRef.current?.click()}>
          {loading ? "Uploading…" : "Upload avatar"}
        </Button>
      </div>
    </div>
  );
}
