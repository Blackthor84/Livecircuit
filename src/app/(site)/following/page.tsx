import type { Metadata } from "next";
import Link from "next/link";
import { ArtistCard } from "@/components/artists/artist-card";
import { requireUserProfile } from "@/lib/auth/guards";
import { getFollowingArtists } from "@/lib/data/profiles";
import type { ArtistCategory } from "@/types/database";

export const metadata: Metadata = { title: "Following" };

export default async function FollowingPage() {
  const { user } = await requireUserProfile();
  const following = await getFollowingArtists(user.id, 48);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Following</h1>
      <p className="mt-2 text-muted-foreground">Artists you follow across LiveCircuit.</p>

      {following.length === 0 ? (
        <p className="mt-8 text-muted-foreground">
          You&apos;re not following anyone yet.{" "}
          <Link href="/artists" className="text-primary hover:underline">
            Discover artists
          </Link>
          .
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {following.map((row) => {
            const artist = row as {
              slug: string;
              stage_name: string;
              banner_url?: string | null;
              verified?: boolean;
              category?: string;
              follower_count?: number;
            };
            if (!artist?.slug) return null;
            return (
              <ArtistCard
                key={artist.slug}
                artist={{
                  slug: artist.slug,
                  stage_name: artist.stage_name,
                  banner_url: artist.banner_url ?? null,
                  verified: artist.verified ?? false,
                  category: (artist.category ?? "music") as ArtistCategory,
                  follower_count: artist.follower_count ?? 0,
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
