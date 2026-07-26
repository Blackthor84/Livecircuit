import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArtistProfileForm } from "@/components/artist/artist-profile-form";
import { requireUserProfile } from "@/lib/auth/guards";
import { isArtistOrAdminRole } from "@/lib/auth/roles";
import { getGenres } from "@/lib/data/locations";
import { getArtistForSettings } from "@/lib/data/profiles";

export const metadata: Metadata = { title: "Artist settings" };

export default async function ArtistSettingsPage() {
  const { user, profile } = await requireUserProfile();
  if (!isArtistOrAdminRole(profile.role)) {
    redirect("/register?role=artist");
  }

  const bundle = await getArtistForSettings(user.id);
  if (!bundle) {
    redirect("/artist/dashboard");
  }

  const genres = await getGenres();
  const social = (bundle.artist.social_links ?? {}) as Record<string, string>;
  const donation = (bundle.artist.donation_links ?? {}) as Record<string, string>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Artist profile</h1>
          <p className="mt-2 text-muted-foreground">
            Banner, bio, social links, media, and verification — saved to Supabase.
          </p>
        </div>
        <Link href={`/artists/${bundle.artist.slug}`} className="text-sm text-primary hover:underline">
          View public page
        </Link>
      </div>
      <div className="mt-8">
        <ArtistProfileForm
          initial={{
            userId: user.id,
            artistId: bundle.artist.id,
            stageName: bundle.artist.stage_name,
            bio: bundle.bio,
            category: bundle.artist.category,
            bannerUrl: bundle.artist.banner_url,
            socialWebsite: social.website ?? "",
            socialInstagram: social.instagram ?? "",
            socialTwitter: social.twitter ?? "",
            socialYoutube: social.youtube ?? "",
            donationUrl: donation.default ?? "",
            genreIds: bundle.genreIds,
            genres,
            media: bundle.media,
            verificationStatus: bundle.verification?.status ?? null,
          }}
        />
      </div>
    </div>
  );
}
