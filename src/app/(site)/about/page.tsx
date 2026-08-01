import type { Metadata } from "next";
import Link from "next/link";
import { APP_NAME, ROUTES } from "@/lib/constants";
import { DIGITAL_ONLY_STATEMENT, TRUST_SECTION } from "@/lib/home/creator-promise-content";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="text-sm font-medium uppercase tracking-widest text-primary">About</p>
      <h1 className="mt-4 text-4xl font-bold tracking-tight">{APP_NAME}</h1>
      <p className="mt-6 text-lg text-muted-foreground">
        Digital live entertainment — built Artist First.
      </p>
      <div className="prose prose-invert mt-10 max-w-none space-y-6 text-muted-foreground">
        <p>
          LiveCircuit connects artists and fans for digital live performances — virtual concerts, comedy
          specials, podcast recordings, DJ sets, digital festivals, and meet-and-greets. We are digital
          only: not a marketplace for physical concerts.
        </p>
        <p>
          Our Artist First philosophy means we do not profit from the direct relationship between artists
          and their fans. Artists keep 100% of merchandise revenue, tips, and donations, own their content,
          and face no exclusivity contracts. LiveCircuit earns through premium tools, transparent digital
          ticketing, sponsorships, and enhanced fan experiences.
        </p>
        <p>{DIGITAL_ONLY_STATEMENT}</p>
        <p>{TRUST_SECTION.body}</p>
        <p>
          <Link href={ROUTES.creatorPromise} className="text-primary hover:underline">
            Read the full LiveCircuit Creator Promise →
          </Link>
        </p>
      </div>
    </div>
  );
}
