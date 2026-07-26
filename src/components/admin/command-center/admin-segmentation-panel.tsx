"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SegmentationResult } from "@/lib/data/admin-segmentation";
import {
  runCrossArtistSegmentAction,
  runCrossGenreSegmentAction,
  runGenreSegmentAction,
  runRepeatViewerSegmentAction,
  runVipConversionSegmentAction,
} from "@/lib/actions/admin-segmentation";

type ArtistOption = { id: string; stage_name: string; slug: string };
type GenreOption = { id: string; name: string; slug: string };

export function AdminSegmentationPanel({
  artists,
  genres,
}: {
  artists: ArtistOption[];
  genres: GenreOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [artistA, setArtistA] = useState("");
  const [artistB, setArtistB] = useState("");
  const [genreId, setGenreId] = useState("");
  const [result, setResult] = useState<SegmentationResult | null>(null);

  function run(task: () => Promise<SegmentationResult>) {
    startTransition(() => {
      void task()
        .then(setResult)
        .catch(() => toast.error("Segmentation query failed"));
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle className="text-base">Cross-artist overlap</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Artist A</Label>
                <Select value={artistA} onValueChange={(value) => setArtistA(value ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select artist" />
                  </SelectTrigger>
                  <SelectContent>
                    {artists.map((artist) => (
                      <SelectItem key={artist.id} value={artist.id}>
                        {artist.stage_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Artist B</Label>
                <Select value={artistB} onValueChange={(value) => setArtistB(value ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select artist" />
                  </SelectTrigger>
                  <SelectContent>
                    {artists.map((artist) => (
                      <SelectItem key={artist.id} value={artist.id}>
                        {artist.stage_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              type="button"
              disabled={pending || !artistA || !artistB}
              onClick={() => run(() => runCrossArtistSegmentAction([artistA, artistB]))}
            >
              Find overlap
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle className="text-base">Genre interest</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Genre</Label>
              <Select value={genreId} onValueChange={(value) => setGenreId(value ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select genre" />
                </SelectTrigger>
                <SelectContent>
                  {genres.map((genre) => (
                    <SelectItem key={genre.id} value={genre.id}>
                      {genre.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              disabled={pending || !genreId}
              onClick={() => run(() => runGenreSegmentAction(genreId))}
            >
              Segment fans
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={pending} onClick={() => run(runRepeatViewerSegmentAction)}>
          Repeat viewers
        </Button>
        <Button type="button" variant="outline" disabled={pending} onClick={() => run(runVipConversionSegmentAction)}>
          VIP conversion
        </Button>
        <Button type="button" variant="outline" disabled={pending} onClick={() => run(runCrossGenreSegmentAction)}>
          Cross-genre viewers
        </Button>
      </div>

      {result ? (
        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle className="text-base">
              {result.title} · {result.count.toLocaleString()} fans
            </CardTitle>
            <p className="text-sm text-muted-foreground">{result.description}</p>
            {result.todo ? <p className="text-xs text-amber-300/80">TODO: {result.todo}</p> : null}
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-muted-foreground">
                  <th className="py-2 pr-4">Fan</th>
                  <th className="py-2 pr-4">Tickets</th>
                  <th className="py-2 pr-4">VIP</th>
                  <th className="py-2">Genres</th>
                </tr>
              </thead>
              <tbody>
                {result.fans.map((fan) => (
                  <tr key={fan.userId} className="border-b border-white/5">
                    <td className="py-2 pr-4">
                      {fan.displayName ?? fan.username ?? fan.userId.slice(0, 8)}
                    </td>
                    <td className="py-2 pr-4 tabular-nums">{fan.ticketCount}</td>
                    <td className="py-2 pr-4">{fan.vipActive ? "Yes" : "No"}</td>
                    <td className="py-2 text-muted-foreground">{fan.genres.join(", ") || "—"}</td>
                  </tr>
                ))}
                {!result.fans.length ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted-foreground">
                      No fans matched this segment.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
