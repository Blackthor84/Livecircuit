"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addArtistMediaAction,
  removeArtistMediaAction,
  requestVerificationAction,
  updateArtistProfileAction,
} from "@/lib/actions/artist-profile";
import { ARTIST_CATEGORIES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

export type ArtistSettingsData = {
  userId: string;
  artistId: string;
  stageName: string;
  bio: string;
  category: string;
  bannerUrl: string | null;
  socialWebsite: string;
  socialInstagram: string;
  socialTwitter: string;
  socialYoutube: string;
  donationUrl: string;
  genreIds: string[];
  genres: { id: string; name: string }[];
  media: { id: string; title: string; url: string; media_type: string }[];
  verificationStatus: string | null;
};

export function ArtistProfileForm({ initial }: { initial: ArtistSettingsData }) {
  const router = useRouter();
  const bannerRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [stageName, setStageName] = useState(initial.stageName);
  const [bio, setBio] = useState(initial.bio);
  const [category, setCategory] = useState(initial.category);
  const [bannerUrl, setBannerUrl] = useState(initial.bannerUrl);
  const [socialWebsite, setSocialWebsite] = useState(initial.socialWebsite);
  const [socialInstagram, setSocialInstagram] = useState(initial.socialInstagram);
  const [socialTwitter, setSocialTwitter] = useState(initial.socialTwitter);
  const [socialYoutube, setSocialYoutube] = useState(initial.socialYoutube);
  const [donationUrl, setDonationUrl] = useState(initial.donationUrl);
  const [genreIds, setGenreIds] = useState(initial.genreIds);
  const [media, setMedia] = useState(initial.media);
  const [mediaTitle, setMediaTitle] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"gallery" | "video" | "album">("gallery");
  const [verifyMessage, setVerifyMessage] = useState("");

  function toggleGenre(id: string) {
    setGenreIds((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await updateArtistProfileAction({
      stageName,
      bio,
      category,
      bannerUrl,
      socialWebsite,
      socialInstagram,
      socialTwitter,
      socialYoutube,
      donationUrl,
      genreIds,
    });
    setLoading(false);
    if (!result.ok) toast.error(result.error);
    else toast.success("Artist profile saved");
  }

  async function uploadBanner(file: File) {
    const supabase = createClient();
    const path = `${initial.userId}/banner-${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("artist-media").upload(path, file, { upsert: true });
    if (error) {
      toast.error(error.message);
      return;
    }
    const { data } = supabase.storage.from("artist-media").getPublicUrl(path);
    setBannerUrl(data.publicUrl);
    toast.success("Banner uploaded — save profile to apply");
  }

  async function addMedia(e: React.FormEvent) {
    e.preventDefault();
    const result = await addArtistMediaAction({ mediaType, title: mediaTitle, url: mediaUrl });
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Media added");
      setMediaTitle("");
      setMediaUrl("");
      router.refresh();
    }
  }

  async function removeMedia(id: string) {
    const result = await removeArtistMediaAction(id);
    if (!result.ok) toast.error(result.error);
    else setMedia((m) => m.filter((x) => x.id !== id));
  }

  async function submitVerification(e: React.FormEvent) {
    e.preventDefault();
    const result = await requestVerificationAction({ message: verifyMessage });
    if (!result.ok) toast.error(result.error);
    else toast.success("Verification request submitted");
  }

  return (
    <div className="max-w-2xl space-y-10">
      <form onSubmit={saveProfile} className="space-y-4">
        <h2 className="text-lg font-medium">Public profile</h2>
        <div className="relative h-32 overflow-hidden rounded-xl border border-white/10 bg-muted">
          {bannerUrl && <Image src={bannerUrl} alt="" fill className="object-cover" />}
        </div>
        <input
          ref={bannerRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadBanner(f);
          }}
        />
        <Button type="button" variant="secondary" size="sm" onClick={() => bannerRef.current?.click()}>
          Upload banner
        </Button>

        <div className="space-y-2">
          <Label>Stage name</Label>
          <Input value={stageName} onChange={(e) => setStageName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={(v) => v && setCategory(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ARTIST_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Bio</Label>
          <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={5} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Website</Label>
            <Input value={socialWebsite} onChange={(e) => setSocialWebsite(e.target.value)} placeholder="https://" />
          </div>
          <div className="space-y-2">
            <Label>Instagram</Label>
            <Input value={socialInstagram} onChange={(e) => setSocialInstagram(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Twitter / X</Label>
            <Input value={socialTwitter} onChange={(e) => setSocialTwitter(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>YouTube</Label>
            <Input value={socialYoutube} onChange={(e) => setSocialYoutube(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Donation link</Label>
          <Input value={donationUrl} onChange={(e) => setDonationUrl(e.target.value)} placeholder="https://" />
        </div>

        <div className="space-y-2">
          <Label>Genres</Label>
          <div className="flex flex-wrap gap-2">
            {initial.genres.map((g) => (
              <label key={g.id} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-sm">
                <Checkbox checked={genreIds.includes(g.id)} onCheckedChange={() => toggleGenre(g.id)} />
                {g.name}
              </label>
            ))}
          </div>
        </div>

        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : "Save artist profile"}
        </Button>
      </form>

      <form onSubmit={addMedia} className="space-y-4 border-t border-white/10 pt-8">
        <h2 className="text-lg font-medium">Gallery, videos & albums</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Select value={mediaType} onValueChange={(v) => v && setMediaType(v as typeof mediaType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gallery">Gallery</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="album">Album</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Title" value={mediaTitle} onChange={(e) => setMediaTitle(e.target.value)} required />
          <Input placeholder="URL" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} required />
        </div>
        <Button type="submit" variant="secondary" size="sm">
          Add media link
        </Button>
        <ul className="space-y-2 text-sm">
          {media.map((m) => (
            <li key={m.id} className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2">
              <span>
                {m.title} <span className="text-muted-foreground">({m.media_type})</span>
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={() => void removeMedia(m.id)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      </form>

      <form onSubmit={submitVerification} className="space-y-4 border-t border-white/10 pt-8">
        <h2 className="text-lg font-medium">Verification</h2>
        {initial.verificationStatus === "pending" && (
          <p className="text-sm text-muted-foreground">Your verification request is pending review.</p>
        )}
        <Textarea
          placeholder="Tell us why you should be verified (links, press, metrics)…"
          value={verifyMessage}
          onChange={(e) => setVerifyMessage(e.target.value)}
          rows={4}
        />
        <Button type="submit" variant="outline" disabled={initial.verificationStatus === "pending"}>
          Request verified badge
        </Button>
      </form>
    </div>
  );
}
