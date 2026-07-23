"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createTourAndRedirectAction } from "@/lib/actions/tours";

export default function NewTourPage() {
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const result = await createTourAndRedirectAction({
        title: String(form.get("title")),
        description: String(form.get("description") ?? ""),
      });
      if (result && !result.ok) {
        toast.error(result.error);
        setLoading(false);
      }
    } catch {
      // redirect throws
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Create tour</h1>
      <p className="mt-2 text-muted-foreground">
        Start with a draft tour, add stops, then publish when you are ready to sell tickets.
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Tour name</Label>
          <Input id="title" name="title" required placeholder="Summer Circuit 2026" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" rows={4} />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : "Create tour"}
        </Button>
      </form>
    </div>
  );
}
