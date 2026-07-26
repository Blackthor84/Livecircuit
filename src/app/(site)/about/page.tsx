import type { Metadata } from "next";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="text-sm font-medium uppercase tracking-widest text-primary">About</p>
      <h1 className="mt-4 text-4xl font-bold tracking-tight">{APP_NAME}</h1>
      <p className="mt-6 text-lg text-muted-foreground">{APP_TAGLINE}</p>
      <div className="prose prose-invert mt-10 max-w-none text-muted-foreground">
        <p>
          LiveCircuit connects artists and fans for live virtual performances — concerts, comedy,
          podcasts, DJ sets, and more — with tools to understand where your audience lives and plan
          your next tour stop.
        </p>
        <p>
          Fans discover upcoming shows, follow artists, and join live experiences from anywhere.
          Artists publish events, go live, and grow a global audience without leaving home.
        </p>
      </div>
    </div>
  );
}
