"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AudienceSettingsFields } from "@/components/touring/audience-settings-fields";
import { createEventAndRedirectAction } from "@/lib/actions/events";
import { buildVirtualLocationLabel } from "@/lib/virtual-touring/location";

export function CreateEventForm() {
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const tourCity = String(form.get("tourCity"));
    const tourStateCode = String(form.get("tourStateCode") ?? "") || null;

    try {
      const result = await createEventAndRedirectAction({
        title: String(form.get("title")),
        virtualLocationLabel: buildVirtualLocationLabel(tourCity, tourStateCode),
        tourCity,
        tourStateCode,
        scheduledAt: String(form.get("scheduledAt")),
        doorsOpenAt: String(form.get("doorsOpenAt") ?? "") || null,
        ticketPriceDollars: Number(form.get("ticketPriceDollars") ?? 0),
        description: String(form.get("description") ?? ""),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        audienceMode: String(form.get("audienceMode") ?? "worldwide"),
        localPriorityMinutes: Number(form.get("localPriorityMinutes") ?? 30),
      });
      if (result && !result.ok) {
        toast.error(result.error);
        setLoading(false);
      }
    } catch {
      /* redirect throws */
    }
  }

  const defaultScheduled = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16);

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Tour / event title</Label>
        <Input id="title" name="title" required placeholder="Summer Tour 2026" />
      </div>

      <AudienceSettingsFields />

      <div className="space-y-2">
        <Label htmlFor="scheduledAt">Show starts</Label>
        <Input
          id="scheduledAt"
          name="scheduledAt"
          type="datetime-local"
          required
          defaultValue={defaultScheduled}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ticketPriceDollars">Ticket price (USD)</Label>
        <Input
          id="ticketPriceDollars"
          name="ticketPriceDollars"
          type="number"
          min={0}
          step="0.01"
          defaultValue="25"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={4} placeholder="What fans can expect at this stop…" />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Creating…" : "Create tour stop"}
      </Button>
    </form>
  );
}
