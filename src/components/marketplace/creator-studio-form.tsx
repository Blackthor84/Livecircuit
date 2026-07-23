"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addPortfolioItemAction, upsertCreatorProfileAction } from "@/lib/actions/marketplace";
import { CREATOR_SERVICE_CATEGORIES } from "@/lib/constants/creator-marketplace";
import type { CreatorProfileDetail } from "@/lib/types/marketplace";

export function CreatorStudioForm({ initial }: { initial: CreatorProfileDetail | null }) {
  const router = useRouter();
  const [headline, setHeadline] = useState(initial?.headline ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [primaryCategory, setPrimaryCategory] = useState(
    initial?.primaryCategory ?? CREATOR_SERVICE_CATEGORIES[0].value
  );
  const [rateDollars, setRateDollars] = useState(
    initial ? String((initial.rateCents / 100).toFixed(0)) : "150"
  );
  const [portfolioTitle, setPortfolioTitle] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    const result = await upsertCreatorProfileAction({
      headline: headline.trim(),
      bio: bio.trim(),
      primaryCategory,
      secondaryCategories: [],
      rateCents: Math.round(Number(rateDollars) * 100),
      isListed: true,
    });
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Profile saved");
      if (result.slug) router.push(`/marketplace/creators/${result.slug}`);
      else router.refresh();
    }
  }

  async function addPortfolio(e: React.FormEvent) {
    e.preventDefault();
    const result = await addPortfolioItemAction({
      title: portfolioTitle.trim(),
      mediaUrl: portfolioUrl.trim() || undefined,
    });
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Portfolio item added");
      setPortfolioTitle("");
      setPortfolioUrl("");
      router.refresh();
    }
  }

  return (
    <div className="space-y-10">
      <form onSubmit={saveProfile} className="glass-panel space-y-4 rounded-xl p-6">
        <h2 className="text-xl font-semibold">Creator profile</h2>
        <div className="space-y-2">
          <Label htmlFor="headline">Headline</Label>
          <Input id="headline" value={headline} onChange={(e) => setHeadline(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={5} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Primary specialty</Label>
          <select
            id="category"
            className="w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm"
            value={primaryCategory}
            onChange={(e) => setPrimaryCategory(e.target.value)}
          >
            {CREATOR_SERVICE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rate">Starting rate (USD)</Label>
          <Input
            id="rate"
            type="number"
            min={0}
            value={rateDollars}
            onChange={(e) => setRateDollars(e.target.value)}
          />
        </div>
        <Button type="submit">Save & publish</Button>
      </form>

      {initial ? (
        <form onSubmit={addPortfolio} className="glass-panel space-y-4 rounded-xl p-6">
          <h2 className="text-xl font-semibold">Add portfolio piece</h2>
          <Input
            value={portfolioTitle}
            onChange={(e) => setPortfolioTitle(e.target.value)}
            placeholder="Title"
            required
          />
          <Input
            value={portfolioUrl}
            onChange={(e) => setPortfolioUrl(e.target.value)}
            placeholder="Link to sample work (optional)"
          />
          <Button type="submit" variant="outline">
            Add to portfolio
          </Button>
        </form>
      ) : null}
    </div>
  );
}
