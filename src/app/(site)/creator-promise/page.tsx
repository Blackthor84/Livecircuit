import type { Metadata } from "next";
import { CreatorPromisePageContent } from "@/components/marketing/creator-promise-sections";

export const metadata: Metadata = {
  title: "Creator Promise",
  description:
    "LiveCircuit's Artist First promise: keep 100% of merch, tips, and donations. Own your content. No exclusivity. Transparent digital ticketing.",
};

export default function CreatorPromisePage() {
  return <CreatorPromisePageContent />;
}
