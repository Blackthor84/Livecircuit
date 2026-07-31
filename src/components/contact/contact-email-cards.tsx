import { Handshake, Mail, Mic2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CONTACT_EMAILS } from "@/lib/constants";

const CONTACT_CATEGORIES = [
  {
    id: "artists",
    title: "Artist Bookings & Applications",
    email: CONTACT_EMAILS.artists,
    description:
      "Interested in performing on LiveCircuit? Whether you're a musician, comedian, chef, speaker, magician, or creator, we'd love to hear from you.",
    icon: Mic2,
  },
  {
    id: "partnerships",
    title: "Partnerships & Sponsorships",
    email: CONTACT_EMAILS.partnerships,
    description:
      "For brand partnerships, sponsorships, venue collaborations, agencies, management companies, investors, and strategic business opportunities.",
    icon: Handshake,
  },
] as const;

export function ContactEmailCards() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {CONTACT_CATEGORIES.map((category) => (
        <Card key={category.id} className="glass-panel border-white/10">
          <CardHeader>
            <div className="flex items-center gap-3">
              <category.icon className="size-6 text-primary" aria-hidden="true" />
              <CardTitle className="text-lg">{category.title}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">{category.description}</p>
            <a
              href={`mailto:${category.email}`}
              aria-label={`Email ${category.title} at ${category.email}`}
              className="inline-flex items-center gap-2 rounded-lg text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Mail className="size-4 shrink-0 opacity-70" aria-hidden="true" />
              <span className="font-medium">{category.email}</span>
            </a>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
