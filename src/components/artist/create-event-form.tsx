"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createEventAndRedirectAction } from "@/lib/actions/events";

export function CreateEventForm() {
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const result = await createEventAndRedirectAction({
        title: String(form.get("title")),
        virtualLocationLabel: String(form.get("location")),
        scheduledAt: String(form.get("scheduledAt")),
        ticketPriceDollars: Number(form.get("ticketPriceDollars") ?? 0),
        description: String(form.get("description") ?? ""),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Event title</Label>
        <Input id="title" name="title" required placeholder="Acoustic Session Live" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="location">Virtual location label</Label>
        <Input id="location" name="location" required placeholder="Studio A · Live from Austin" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="scheduledAt">Scheduled start</Label>
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
        <Textarea id="description" name="description" rows={4} placeholder="What fans can expect…" />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Creating…" : "Create event"}
      </Button>
    </form>
  );
}
