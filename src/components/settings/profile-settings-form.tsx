"use client";

import { useEffect, useState } from "react";
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
import { AvatarUpload } from "@/components/settings/avatar-upload";
import { updateProfileAction } from "@/lib/actions/profile";
import { createClient } from "@/lib/supabase/client";

export type ProfileFormData = {
  userId: string;
  displayName: string;
  username: string;
  bio: string;
  avatarUrl: string | null;
  countryId: string;
  stateId: string;
  cityId: string;
  favoriteGenreIds: string[];
  emailNotifications: boolean;
  pushNotifications: boolean;
  countries: { id: string; name: string }[];
  genres: { id: string; name: string }[];
};

export function ProfileSettingsForm({ initial }: { initial: ProfileFormData }) {
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [username, setUsername] = useState(initial.username);
  const [bio, setBio] = useState(initial.bio);
  const [countryId, setCountryId] = useState(initial.countryId);
  const [stateId, setStateId] = useState(initial.stateId);
  const [cityId, setCityId] = useState(initial.cityId);
  const [states, setStates] = useState<{ id: string; name: string }[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>(initial.favoriteGenreIds);
  const [emailNotifications, setEmailNotifications] = useState(initial.emailNotifications);
  const [pushNotifications, setPushNotifications] = useState(initial.pushNotifications);

  async function loadStates(nextCountryId: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from("states")
      .select("id, name")
      .eq("country_id", nextCountryId)
      .order("name");
    setStates(data ?? []);
  }

  async function loadCities(nextStateId: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from("cities")
      .select("id, name")
      .eq("state_id", nextStateId)
      .order("name");
    setCities(data ?? []);
  }

  async function onCountryChange(value: string) {
    setCountryId(value);
    setStateId("");
    setCityId("");
    setCities([]);
    if (value) await loadStates(value);
  }

  async function onStateChange(value: string) {
    setStateId(value);
    setCityId("");
    if (value) await loadCities(value);
  }

  function toggleGenre(id: string) {
    setSelectedGenres((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  }

  useEffect(() => {
    if (initial.countryId) {
      void loadStates(initial.countryId).then(() => {
        if (initial.stateId) void loadCities(initial.stateId);
      });
    }
  }, [initial.countryId, initial.stateId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await updateProfileAction({
      displayName,
      username,
      bio,
      countryId: countryId || null,
      stateId: stateId || null,
      cityId: cityId || null,
      favoriteGenreIds: selectedGenres,
      emailNotifications,
      pushNotifications,
    });
    setLoading(false);
    if (!result.ok) toast.error(result.error);
    else toast.success("Profile saved — your city powers fan heat maps.");
  }

  return (
    <form onSubmit={save} className="max-w-lg space-y-6">
      <AvatarUpload userId={initial.userId} currentUrl={initial.avatarUrl} />

      <div className="space-y-2">
        <Label htmlFor="displayName">Display name</Label>
        <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Country</Label>
          <Select value={countryId || undefined} onValueChange={(v) => v && void onCountryChange(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Country" />
            </SelectTrigger>
            <SelectContent>
              {initial.countries.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>State</Label>
          <Select value={stateId || undefined} onValueChange={(v) => v && void onStateChange(v)} disabled={!countryId}>
            <SelectTrigger>
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              {states.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>City</Label>
          <Select value={cityId || undefined} onValueChange={(v) => setCityId(v ?? "")} disabled={!stateId}>
            <SelectTrigger>
              <SelectValue placeholder="City" />
            </SelectTrigger>
            <SelectContent>
              {cities.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Favorite genres</Label>
        <div className="flex flex-wrap gap-2">
          {initial.genres.map((g) => (
            <label key={g.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-sm">
              <Checkbox checked={selectedGenres.includes(g.id)} onCheckedChange={() => toggleGenre(g.id)} />
              {g.name}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label>Notifications</Label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={emailNotifications} onCheckedChange={(v) => setEmailNotifications(v === true)} />
          Email notifications
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={pushNotifications} onCheckedChange={(v) => setPushNotifications(v === true)} />
          Push notifications (when enabled)
        </label>
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
