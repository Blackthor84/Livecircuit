import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Backstage Pass" };

type Props = { searchParams: Promise<{ artist?: string }> };

export default async function VipRedirectPage({ searchParams }: Props) {
  const { artist: artistSlug } = await searchParams;
  if (artistSlug) {
    redirect(`/artists/${artistSlug}/backstage`);
  }
  redirect("/discover");
}
