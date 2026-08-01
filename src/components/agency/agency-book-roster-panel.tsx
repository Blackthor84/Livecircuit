"use client";

import { useState, useTransition } from "react";
import { Check, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createBookRosterRequestAction,
  runAutoMatchAction,
  updateBookingMatchStatusAction,
} from "@/lib/actions/agencies";
import { enqueueBulkBookingJobAction, processAgencyJobAction } from "@/lib/actions/agency-features";
import type { AgencyBookingMatch, AgencyManagedArtist } from "@/lib/agency/types";
import { ARTIST_CATEGORIES } from "@/lib/constants";
import { toast } from "sonner";

type BookingRequest = {
  id: string;
  title: string;
  status: string;
  artist_ids: string[];
  created_at: string;
};

export function AgencyBookRosterPanel({
  orgId,
  roster,
  requests,
  matches,
}: {
  orgId: string;
  roster: AgencyManagedArtist[];
  requests: BookingRequest[];
  matches: AgencyBookingMatch[];
}) {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("Spring roster tour");
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
  const [states, setStates] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [bookingMode, setBookingMode] = useState<"single" | "recurring" | "tour" | "weekly" | "monthly" | "seasonal">("single");
  const [localMatches, setLocalMatches] = useState(matches);

  const activeRoster = roster.filter((r) => r.status === "active");

  function toggleArtist(id: string) {
    setSelectedArtists((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    );
  }

  function selectAll() {
    setSelectedArtists(activeRoster.map((r) => r.artist_id));
  }

  async function submitBulkJob(runMatch = true) {
    if (!selectedArtists.length) {
      toast.error("Select at least one artist");
      return;
    }
    startTransition(async () => {
      const result = await enqueueBulkBookingJobAction({
        orgId,
        title,
        artistIds: selectedArtists,
        preferredStates: states.split(",").map((s) => s.trim()).filter(Boolean),
        preferredGenres: genres,
        runAutoMatch: runMatch,
        bookingMode,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Bulk booking job queued");
      if (result.jobId) {
        const run = await processAgencyJobAction(orgId, result.jobId);
        if (!run.ok) toast.error(run.error);
        else toast.success("Bulk booking completed");
      }
      window.location.reload();
    });
  }

  async function submitRequest(runMatch = false) {
    if (!selectedArtists.length) {
      toast.error("Select at least one artist");
      return;
    }
    startTransition(async () => {
      const result = await createBookRosterRequestAction({
        orgId,
        title,
        artistIds: selectedArtists,
        preferredStates: states.split(",").map((s) => s.trim()).filter(Boolean),
        preferredGenres: genres,
        isBulk: selectedArtists.length > 1,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Booking request created");
      if (runMatch && result.requestId) {
        const matchResult = await runAutoMatchAction(orgId, result.requestId);
        if (matchResult.ok) toast.success(`Auto Match found ${matchResult.matchCount ?? 0} recommendations`);
        else toast.error(matchResult.error);
      }
    });
  }

  async function handleMatchAction(matchId: string, status: "accepted" | "rejected") {
    startTransition(async () => {
      const result = await updateBookingMatchStatusAction({ orgId, matchId, status });
      if (!result.ok) toast.error(result.error);
      else {
        setLocalMatches((current) =>
          current.map((m) => (m.id === matchId ? { ...m, status } : m))
        );
        toast.success(status === "accepted" ? "Match accepted" : "Match rejected");
      }
    });
  }

  return (
    <div className="space-y-8">
      <Card className="glass-panel border-violet-500/20 bg-violet-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-violet-300" />
            Book Entire Roster
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="booking-title">Plan name</Label>
              <Input id="booking-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="booking-states">Preferred states (comma-separated)</Label>
              <Input
                id="booking-states"
                placeholder="CA, NY, TX"
                value={states}
                onChange={(e) => setStates(e.target.value)}
              />
            </div>
          </div>

          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <Label>Select artists</Label>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={selectAll}>
                  Entire roster ({activeRoster.length})
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedArtists([])}>
                  Clear
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeRoster.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => toggleArtist(row.artist_id)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    selectedArtists.includes(row.artist_id)
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-white/10 hover:border-white/20"
                  }`}
                >
                  {row.artists?.stage_name ?? "Artist"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Preferred genres</Label>
            <div className="flex flex-wrap gap-2">
              {ARTIST_CATEGORIES.slice(0, 8).map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() =>
                    setGenres((current) =>
                      current.includes(cat.value)
                        ? current.filter((g) => g !== cat.value)
                        : [...current, cat.value]
                    )
                  }
                  className={`rounded-lg border px-2.5 py-1 text-xs capitalize transition ${
                    genres.includes(cat.value)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-white/10"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Bulk booking mode</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={bookingMode}
              onChange={(e) => setBookingMode(e.target.value as typeof bookingMode)}
            >
              <option value="single">Single event</option>
              <option value="recurring">Recurring events</option>
              <option value="tour">Tour</option>
              <option value="weekly">Weekly series</option>
              <option value="monthly">Monthly residency</option>
              <option value="seasonal">Seasonal events</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button" disabled={pending} onClick={() => void submitRequest(false)}>
              Save request
            </Button>
            <Button type="button" disabled={pending} onClick={() => void submitRequest(true)}>
              Auto Match
            </Button>
            {selectedArtists.length >= 3 ? (
              <Button type="button" variant="secondary" disabled={pending} onClick={() => void submitBulkJob(true)}>
                Bulk job ({selectedArtists.length} artists)
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {requests.length > 0 ? (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Recent booking requests</h2>
          <ul className="space-y-2">
            {requests.map((req) => (
              <li key={req.id} className="glass-panel flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 p-4">
                <div>
                  <p className="font-medium">{req.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {req.artist_ids.length} artist(s) · {new Date(req.created_at).toLocaleString()}
                  </p>
                </div>
                <Badge variant="outline">{req.status}</Badge>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="mb-4 text-lg font-semibold">Auto Match recommendations</h2>
        {localMatches.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {localMatches.map((match) => (
              <Card key={match.id} className="glass-panel border-white/10">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">
                      {match.recommendation.artistName} → {match.recommendation.venueName}
                    </CardTitle>
                    <Badge>{match.match_score}% fit</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <ul className="space-y-1 text-muted-foreground">
                    {match.recommendation.reasons?.map((reason) => (
                      <li key={reason}>• {reason}</li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={pending || match.status !== "recommended"}
                      onClick={() => void handleMatchAction(match.id, "accepted")}
                    >
                      <Check className="size-3.5" /> Accept
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending || match.status !== "recommended"}
                      onClick={() => void handleMatchAction(match.id, "rejected")}
                    >
                      <X className="size-3.5" /> Reject
                    </Button>
                    <Badge variant="secondary">{match.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Run Auto Match to see venue recommendations scored by genre, audience, and market fit.
          </p>
        )}
      </section>
    </div>
  );
}
