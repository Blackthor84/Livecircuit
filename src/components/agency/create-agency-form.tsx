"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { agencyDashboardPath } from "@/lib/agency/sections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAgencyOrganizationAction } from "@/lib/actions/agencies";
import { toast } from "sonner";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export function CreateAgencyForm({ starterPlanLabel }: { starterPlanLabel?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  return (
    <form
      className="glass-panel max-w-lg space-y-4 rounded-2xl border border-white/10 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await createAgencyOrganizationAction({
            name,
            slug: slug || slugify(name),
          });
          if (!result.ok) toast.error(result.error);
          else {
            toast.success("Partnership workspace created — Boutique plan activated");
            router.push(agencyDashboardPath());
            router.refresh();
          }
        });
      }}
    >
      <div className="flex items-center gap-2 text-sm text-primary">
        <Sparkles className="size-4" />
        Starts on {starterPlanLabel ?? "Boutique Partnership"}
      </div>
      <div className="space-y-2">
        <Label htmlFor="agency-name">Agency name</Label>
        <Input
          id="agency-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slug) setSlug(slugify(e.target.value));
          }}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="agency-slug">URL slug</Label>
        <Input
          id="agency-slug"
          value={slug}
          onChange={(e) => setSlug(slugify(e.target.value))}
          required
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Included Community & Club venues, Booking CRM, and $100/mo promotional credits from day one.
      </p>
      <Button type="submit" disabled={pending}>
        Start partnership
      </Button>
    </form>
  );
}
