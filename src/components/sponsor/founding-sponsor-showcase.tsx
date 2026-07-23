"use client";

import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitFoundingSponsorInquiryAction } from "@/lib/actions/sponsors";
import type { FoundingOpportunity } from "@/lib/data/sponsors";

export function FoundingSponsorShowcase({ venues }: { venues: FoundingOpportunity[] }) {
  return (
    <section className="glass-panel rounded-2xl border border-primary/20 p-8">
      <Badge className="mb-3">Limited availability</Badge>
      <h2 className="text-2xl font-bold">Founding Venue Sponsor</h2>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Be the first partner to put your name on a regional arena — permanent badge, venue history,
        priority renewal, and launch pricing before the network hits scale.
      </p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {venues.slice(0, 9).map((v) => (
          <li key={v.venue_id} className="rounded-xl border border-white/10 p-4">
            <p className="font-medium">{v.name}</p>
            <p className="text-sm text-muted-foreground">{v.region}</p>
            <FoundingInquiryForm venueSlug={v.slug} venueName={v.name} />
          </li>
        ))}
      </ul>
      {!venues.length ? (
        <p className="mt-4 text-sm text-muted-foreground">All flagship venues have founding partners — contact us for waitlist.</p>
      ) : null}
    </section>
  );
}

function FoundingInquiryForm({ venueSlug, venueName }: { venueSlug: string; venueName: string }) {
  async function submit(formData: FormData) {
    const result = await submitFoundingSponsorInquiryAction({
      organizationName: formData.get("organizationName"),
      contactEmail: formData.get("contactEmail"),
      venueSlug,
      message: formData.get("message") || undefined,
    });
    if (!result.ok) toast.error(result.error);
    else toast.success(`Inquiry sent for ${venueName}`);
  }

  return (
    <form action={(fd) => void submit(fd)} className="mt-3 space-y-2">
      <Input name="organizationName" required placeholder="Company" className="h-8 text-xs" />
      <Input name="contactEmail" type="email" required placeholder="Email" className="h-8 text-xs" />
      <Input name="message" placeholder="Optional note" className="h-8 text-xs" />
      <Button type="submit" size="sm" className="w-full">
        Request founding slot
      </Button>
    </form>
  );
}
