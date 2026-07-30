"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  assignTourStopVenueAction,
  deleteTourAndRedirectAction,
  deleteTourStopAction,
  publishTourAction,
  updateTourAction,
  upsertTourStopAction,
} from "@/lib/actions/tours";
import { formatCents } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { AudienceSettingsFields } from "@/components/touring/audience-settings-fields";
import type { TourManagePayload } from "@/lib/data/artist-tours";
import type { EventAudienceMode } from "@/types/database";

type Country = { id: string; name: string };
type State = { id: string; name: string; code?: string };
type City = { id: string; name: string };

type Props = {
  initial: TourManagePayload;
  countries: Country[];
  venues: { id: string; slug: string; name: string; region: string }[];
};

export function TourManagePanel({ initial, countries, venues }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.tour.title);
  const [description, setDescription] = useState(initial.tour.description ?? "");
  const [savingTour, setSavingTour] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [locationLabel, setLocationLabel] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [ticketDollars, setTicketDollars] = useState("25");
  const [capacity, setCapacity] = useState("1000");
  const [countryId, setCountryId] = useState("");
  const [stateId, setStateId] = useState("");
  const [cityId, setCityId] = useState("");
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [venueId, setVenueId] = useState("");
  const [venueRoomLabel, setVenueRoomLabel] = useState("");
  const [addingStop, setAddingStop] = useState(false);

  useEffect(() => {
    if (!countryId) {
      setStates([]);
      setStateId("");
      return;
    }
    const supabase = createClient();
    void supabase
      .from("states")
      .select("id, name, code")
      .eq("country_id", countryId)
      .order("name")
      .then(({ data }) => setStates(data ?? []));
  }, [countryId]);

  useEffect(() => {
    if (!stateId) {
      setCities([]);
      setCityId("");
      return;
    }
    const supabase = createClient();
    void supabase
      .from("cities")
      .select("id, name")
      .eq("state_id", stateId)
      .order("name")
      .then(({ data }) => setCities(data ?? []));
  }, [stateId]);

  async function saveTour() {
    setSavingTour(true);
    const result = await updateTourAction({
      tourId: initial.tour.id,
      title,
      description,
    });
    setSavingTour(false);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Tour updated");
      router.refresh();
    }
  }

  async function addStop(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddingStop(true);
    const form = new FormData(e.currentTarget);
    const cents = Math.round(parseFloat(ticketDollars || "0") * 100);
    const tourCity = String(form.get("tourCity") || locationLabel.split(",")[0]?.trim() || locationLabel);
    const tourStateCode = String(form.get("tourStateCode") || "");
    const audienceMode = String(form.get("audienceMode") || "worldwide") as EventAudienceMode;
    const localPriorityMinutes = Number(form.get("localPriorityMinutes") || 30);
    const doorsOpenAt = String(form.get("doorsOpenAt") || "") || undefined;

    const result = await upsertTourStopAction({
      tourId: initial.tour.id,
      virtualLocationLabel: locationLabel,
      tourCity,
      tourStateCode: tourStateCode || null,
      audienceMode,
      localPriorityMinutes,
      doorsOpenAt,
      cityId: cityId || null,
      venueId: venueId || null,
      venueRoomLabel: venueRoomLabel.trim() || null,
      scheduledAt: scheduledAt,
      ticketPriceCents: cents,
      capacity: parseInt(capacity, 10) || 1000,
    });
    setAddingStop(false);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Stop added");
      setLocationLabel("");
      setScheduledAt("");
      router.refresh();
    }
  }

  async function assignStopVenue(stopId: string, nextVenueId: string | null) {
    const result = await assignTourStopVenueAction({
      tourId: initial.tour.id,
      stopId,
      venueId: nextVenueId || null,
      venueRoomLabel: null,
    });
    if (!result.ok) toast.error(result.error);
    else {
      toast.success(nextVenueId ? "Venue assigned" : "Venue cleared");
      router.refresh();
    }
  }

  async function removeStop(stopId: string) {
    const result = await deleteTourStopAction({ tourId: initial.tour.id, stopId });
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Stop removed");
      router.refresh();
    }
  }

  async function publish() {
    setPublishing(true);
    const result = await publishTourAction({ tourId: initial.tour.id });
    setPublishing(false);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Tour published — fans can buy tickets");
      router.refresh();
    }
  }

  async function deleteTour() {
    if (!confirm("Delete this tour and all stops? This cannot be undone.")) return;
    const result = await deleteTourAndRedirectAction({ tourId: initial.tour.id });
    if (result && !result.ok) toast.error(result.error);
  }

  const isPublished = initial.tour.status === "published";
  const publicUrl = `/artists/${initial.artistSlug}/tours/${initial.tour.slug}`;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={isPublished ? "default" : "secondary"}>{initial.tour.status}</Badge>
        {isPublished ? (
          <Button variant="outline" href={publicUrl}>
            View public page
          </Button>
        ) : null}
      </div>

      <section className="glass-panel space-y-4 rounded-xl p-6">
        <h2 className="text-lg font-semibold">Tour details</h2>
        <div className="space-y-2">
          <Label htmlFor="title">Tour name</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <Button type="button" disabled={savingTour} onClick={() => void saveTour()}>
          {savingTour ? "Saving…" : "Save details"}
        </Button>
      </section>

      <section className="glass-panel space-y-4 rounded-xl p-6">
        <h2 className="text-lg font-semibold">Stops ({initial.stops.length})</h2>
        <ol className="space-y-3">
          {initial.stops.map((stop, i) => {
            const venueMeta = Array.isArray(stop.venues) ? stop.venues[0] : stop.venues;
            return (
            <li
              key={stop.id}
              className="flex flex-col gap-2 rounded-lg border border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm text-primary">Stop {i + 1}</p>
                <p className="font-medium">
                  {stop.tour_city ?? stop.cities?.name ?? stop.virtual_location_label}
                </p>
                {(stop.tour_state_code || stop.audience_mode) && (
                  <p className="text-xs text-muted-foreground">
                    {[stop.tour_state_code, stop.audience_mode?.replace(/_/g, " ")].filter(Boolean).join(" · ")}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  {new Date(stop.scheduled_at).toLocaleString()} ·{" "}
                  {formatCents(stop.ticket_price_cents)}
                </p>
                {venueMeta ? (
                  <p className="mt-1 text-xs text-primary">
                    Venue:{" "}
                    <Link href={`/livecircuit/venues/${venueMeta.slug}`} className="underline-offset-2 hover:underline">
                      {venueMeta.name}
                    </Link>
                    {stop.venue_room_label ? ` · Room ${stop.venue_room_label}` : ""}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">No virtual venue assigned</p>
                )}
                {venues.length ? (
                  <div className="mt-2 flex max-w-md flex-wrap items-center gap-2">
                    <Select
                      value={stop.venue_id ?? "__none__"}
                      onValueChange={(v) => void assignStopVenue(stop.id, v === "__none__" || !v ? null : v)}
                    >
                      <SelectTrigger className="h-8 max-w-xs">
                        <SelectValue placeholder="Assign venue" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No venue</SelectItem>
                        {venues.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name} ({v.region})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
              {!isPublished ? (
                <Button type="button" variant="outline" size="sm" onClick={() => void removeStop(stop.id)}>
                  Remove
                </Button>
              ) : null}
            </li>
          );
          })}
          {!initial.stops.length ? (
            <p className="text-sm text-muted-foreground">Add virtual city stops with dates and ticket prices.</p>
          ) : null}
        </ol>

        {!isPublished ? (
          <form onSubmit={addStop} className="mt-6 space-y-4 border-t border-white/10 pt-6">
            <h3 className="font-medium">Add stop</h3>
            <div className="space-y-2">
              <Label htmlFor="location">Virtual location label</Label>
              <Input
                id="location"
                required
                placeholder="Boston, MA"
                value={locationLabel}
                onChange={(e) => setLocationLabel(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Country</Label>
                <Select value={countryId || undefined} onValueChange={(v) => setCountryId(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Select value={stateId || undefined} onValueChange={(v) => setStateId(v ?? "")} disabled={!states.length}>
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
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
                <Select value={cityId || undefined} onValueChange={(v) => setCityId(v ?? "")} disabled={!cities.length}>
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
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
              <Label>LiveCircuit venue (optional)</Label>
              <Select value={venueId || undefined} onValueChange={(v) => setVenueId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Virtual arena / hall" />
                </SelectTrigger>
                <SelectContent>
                  {venues.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name} — {v.region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Room label (optional)"
                value={venueRoomLabel}
                onChange={(e) => setVenueRoomLabel(e.target.value)}
                disabled={!venueId}
              />
              <p className="text-xs text-muted-foreground">
                Many shows can run at once in the same venue — each with its own room and chat.
              </p>
            </div>
            <AudienceSettingsFields />
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="scheduled">Date & time</Label>
                <Input
                  id="scheduled"
                  type="datetime-local"
                  required
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Ticket price (USD)</Label>
                <Input
                  id="price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={ticketDollars}
                  onChange={(e) => setTicketDollars(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  min={1}
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" disabled={addingStop}>
              {addingStop ? "Adding…" : "Add stop"}
            </Button>
          </form>
        ) : null}
      </section>

      <div className="flex flex-wrap gap-3">
        {!isPublished ? (
          <Button type="button" disabled={publishing || !initial.stops.length} onClick={() => void publish()}>
            {publishing ? "Publishing…" : "Publish tour"}
          </Button>
        ) : null}
        <Button type="button" variant="destructive" onClick={() => void deleteTour()}>
          Delete tour
        </Button>
        <Button variant="outline" href="/artist/dashboard">
          Back to dashboard
        </Button>
      </div>
    </div>
  );
}
