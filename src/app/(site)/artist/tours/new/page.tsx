"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createTourAndRedirectAction } from "@/lib/actions/tours";
import { TOUR_TEMPLATES, TOUR_TYPE_LABELS } from "@/lib/touring/tour-templates";
import type { TourType } from "@/types/database";
import { cn } from "@/lib/utils";

export default function NewTourPage() {
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>("usa-tour");
  const [tourType, setTourType] = useState<TourType>("regional");

  const selected = TOUR_TEMPLATES.find((t) => t.slug === selectedTemplate);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const result = await createTourAndRedirectAction({
        title: String(form.get("title")),
        description: String(form.get("description") ?? ""),
        templateSlug: selectedTemplate ?? undefined,
        tourType: selected?.tourType ?? tourType,
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
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Create tour</h1>
      <p className="mt-2 text-muted-foreground">
        Start from a global template or build a custom route. Every stop is a real city on the map.
      </p>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Tour templates</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a route — customize stops, order, and dates after creation.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setSelectedTemplate(null);
              setTourType("regional");
            }}
            className={cn(
              "glass-panel rounded-xl border p-4 text-left transition",
              selectedTemplate === null ? "border-primary bg-primary/5" : "border-white/10 hover:border-primary/30"
            )}
          >
            <p className="font-medium">Custom tour</p>
            <p className="mt-1 text-xs text-muted-foreground">Add your own cities and stops manually.</p>
          </button>
          {TOUR_TEMPLATES.map((template) => (
            <button
              key={template.slug}
              type="button"
              onClick={() => {
                setSelectedTemplate(template.slug);
                setTourType(template.tourType);
              }}
              className={cn(
                "glass-panel rounded-xl border p-4 text-left transition",
                selectedTemplate === template.slug
                  ? "border-primary bg-primary/5"
                  : "border-white/10 hover:border-primary/30"
              )}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-primary">
                {TOUR_TYPE_LABELS[template.tourType]}
              </p>
              <p className="mt-1 font-medium">{template.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{template.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">{template.stops.length} stops</p>
            </button>
          ))}
        </div>
      </section>

      <form onSubmit={onSubmit} className="mt-10 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Tour name</Label>
          <Input
            id="title"
            name="title"
            required
            placeholder={selected?.name ?? "Summer Circuit 2026"}
            defaultValue={selected?.name ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" rows={4} defaultValue={selected?.description ?? ""} />
        </div>
        {selectedTemplate === null ? (
          <div className="space-y-2">
            <Label htmlFor="tourType">Tour type</Label>
            <select
              id="tourType"
              value={tourType}
              onChange={(e) => setTourType(e.target.value as TourType)}
              className="w-full rounded-md border border-white/10 bg-background px-3 py-2 text-sm"
            >
              {(Object.keys(TOUR_TYPE_LABELS) as TourType[]).map((type) => (
                <option key={type} value={type}>
                  {TOUR_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <Button type="submit" disabled={loading}>
          {loading ? "Creating tour…" : selectedTemplate ? "Create tour from template" : "Create custom tour"}
        </Button>
      </form>
    </div>
  );
}
