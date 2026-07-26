import { notFound, permanentRedirect } from "next/navigation";
import { getArtistBySlug } from "@/lib/data/queries";
import { getArtistPublicProfile } from "@/lib/data/artist-public-profile";
import { artistProfileUrl } from "@/lib/username";

type Props = { params: Promise<{ slug: string }> };

/** Legacy route — redirects to vanity URL /[username]. */
export default async function LegacyArtistProfilePage({ params }: Props) {
  const { slug } = await params;
  const profile = await getArtistPublicProfile(slug);
  if (profile?.artist.username) {
    permanentRedirect(artistProfileUrl(profile.artist.username));
  }

  const artist = await getArtistBySlug(slug);
  if (!artist) notFound();

  permanentRedirect(artistProfileUrl(artist.slug));
}
