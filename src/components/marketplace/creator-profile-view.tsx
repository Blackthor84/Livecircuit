"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createBookingRequestAction } from "@/lib/actions/marketplace";
import { creatorCategoryLabel } from "@/lib/constants/creator-marketplace";
import { formatCents } from "@/lib/format";
import type { CreatorProfileDetail } from "@/lib/types/marketplace";

export function CreatorProfileView({
  profile,
  canBook,
}: {
  profile: CreatorProfileDetail;
  canBook: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [loading, setLoading] = useState(false);

  async function requestBooking(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await createBookingRequestAction({
      creatorUserId: profile.userId,
      serviceCategory: profile.primaryCategory,
      title: title.trim(),
      brief: brief.trim(),
    });
    setLoading(false);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Booking request sent");
      router.push(`/marketplace/bookings/${result.slug}`);
    }
  }

  return (
    <div className="space-y-8">
      <div className="glass-panel rounded-xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{profile.displayName}</h1>
            <p className="mt-1 text-lg text-muted-foreground">{profile.headline}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge>{creatorCategoryLabel(profile.primaryCategory)}</Badge>
              {profile.secondaryCategories.map((c) => (
                <Badge key={c} variant="outline">
                  {creatorCategoryLabel(c)}
                </Badge>
              ))}
            </div>
          </div>
          <div className="text-right text-sm">
            <p className="text-2xl font-bold">{formatCents(profile.rateCents, profile.currency)}</p>
            <p className="text-muted-foreground">starting rate</p>
            {profile.reviewCount > 0 ? (
              <p className="mt-2 flex items-center justify-end gap-1 text-amber-400">
                <Star className="h-4 w-4 fill-current" />
                {profile.averageRating.toFixed(1)} ({profile.reviewCount} reviews)
              </p>
            ) : null}
          </div>
        </div>
        <p className="mt-6 whitespace-pre-wrap text-sm text-muted-foreground">{profile.bio}</p>
      </div>

      {profile.portfolio.length > 0 ? (
        <section>
          <h2 className="text-xl font-semibold">Portfolio</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {profile.portfolio.map((item) => (
              <li key={item.id} className="glass-panel rounded-xl p-4">
                <p className="font-medium">{item.title}</p>
                {item.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                ) : null}
                {item.mediaUrl ? (
                  <a href={item.mediaUrl} className="mt-2 block text-sm text-primary hover:underline" target="_blank" rel="noreferrer">
                    View work →
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {profile.reviews.length > 0 ? (
        <section>
          <h2 className="text-xl font-semibold">Reviews</h2>
          <ul className="mt-4 space-y-3">
            {profile.reviews.map((r) => (
              <li key={r.id} className="rounded-lg border border-white/10 px-4 py-3 text-sm">
                <p className="font-medium">
                  {r.reviewerName} · {"★".repeat(r.rating)}
                </p>
                {r.body ? <p className="mt-1 text-muted-foreground">{r.body}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {canBook ? (
        <section className="glass-panel rounded-xl p-6">
          <h2 className="text-xl font-semibold">Request booking</h2>
          <form onSubmit={requestBooking} className="mt-4 space-y-3">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Project title"
              required
              className="bg-background/50"
            />
            <Textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="Describe what you need…"
              rows={4}
              className="bg-background/50"
            />
            <Button type="submit" disabled={loading}>
              Send request
            </Button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
