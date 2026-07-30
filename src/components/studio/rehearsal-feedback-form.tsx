"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitRehearsalFeedbackAction } from "@/lib/actions/studio";

type Props = {
  eventId: string;
};

function RatingInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((score) => (
          <Button
            key={score}
            type="button"
            size="sm"
            variant={value === score ? "default" : "outline"}
            onClick={() => onChange(score)}
          >
            {score}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function RehearsalFeedbackForm({ eventId }: Props) {
  const [loading, setLoading] = useState(false);
  const [ratings, setRatings] = useState({
    audio: 4,
    video: 4,
    lighting: 4,
    camera: 4,
    sync: 4,
    overall: 4,
  });
  const [comment, setComment] = useState("");

  async function submit() {
    setLoading(true);
    const result = await submitRehearsalFeedbackAction({
      eventId,
      audioRating: ratings.audio,
      videoRating: ratings.video,
      lightingRating: ratings.lighting,
      syncRating: ratings.sync,
      overallRating: ratings.overall,
      cameraRating: ratings.camera,
      comment,
    });
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Feedback sent to the artist");
    setComment("");
  }

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-card/80 p-4">
      <h3 className="font-semibold">Report issues for the artist</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <RatingInput label="Audio" value={ratings.audio} onChange={(v) => setRatings((r) => ({ ...r, audio: v }))} />
        <RatingInput label="Video" value={ratings.video} onChange={(v) => setRatings((r) => ({ ...r, video: v }))} />
        <RatingInput label="Lighting" value={ratings.lighting} onChange={(v) => setRatings((r) => ({ ...r, lighting: v }))} />
        <RatingInput label="Camera" value={ratings.camera} onChange={(v) => setRatings((r) => ({ ...r, camera: v }))} />
        <RatingInput label="Sync" value={ratings.sync} onChange={(v) => setRatings((r) => ({ ...r, sync: v }))} />
        <RatingInput label="Overall" value={ratings.overall} onChange={(v) => setRatings((r) => ({ ...r, overall: v }))} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="feedback-comment">Comments</Label>
        <Textarea
          id="feedback-comment"
          placeholder='e.g. "Vocals are too quiet." or "Camera is blurry."'
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
        />
      </div>
      <Button type="button" disabled={loading} onClick={() => void submit()}>
        {loading ? "Sending…" : "Submit feedback"}
      </Button>
    </div>
  );
}
