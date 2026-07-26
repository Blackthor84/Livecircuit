import Link from "next/link";
import { Heart, Play, Users } from "lucide-react";
import { ArtistCard } from "@/components/artists/artist-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRoleBadge, roleBadgeClass } from "@/lib/features/account-menu";
import { ROUTES } from "@/lib/constants";
import type { UserProfilePageData } from "@/lib/data/user-profile-page";
import type { ArtistCategory } from "@/types/database";
import { cn } from "@/lib/utils";

export function UserProfileView({ profile }: { profile: UserProfilePageData }) {
  const initials = (profile.displayName ?? profile.email).slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Card className="glass-panel overflow-hidden border-white/10">
        <div className="bg-gradient-to-br from-primary/20 via-transparent to-accent/10 px-6 py-8 sm:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <Avatar className="size-24 ring-4 ring-primary/30">
              {profile.avatarUrl ? <AvatarImage src={profile.avatarUrl} alt="" /> : null}
              <AvatarFallback className="bg-primary/20 text-2xl font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold">{profile.displayName ?? "Your profile"}</h1>
                <Badge
                  variant="outline"
                  className={cn("text-[10px] font-semibold tracking-wider", roleBadgeClass(profile.role))}
                >
                  {formatRoleBadge(profile.role)}
                </Badge>
              </div>
              <p className="mt-1 text-muted-foreground">{profile.email}</p>
              {profile.bio ? <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{profile.bio}</p> : null}
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="size-4 text-primary" />
                  <strong className="tabular-nums">{profile.followerCount.toLocaleString()}</strong> followers
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Heart className="size-4 text-primary" />
                  <strong className="tabular-nums">{profile.followingCount.toLocaleString()}</strong> following
                </span>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button href={ROUTES.settings} variant="secondary" size="sm">
                  Edit profile
                </Button>
                <Button href={ROUTES.following} variant="outline" size="sm">
                  View following
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle className="text-lg">Favorite genres</CardTitle>
          </CardHeader>
          <CardContent>
            {profile.favoriteGenres.length ? (
              <div className="flex flex-wrap gap-2">
                {profile.favoriteGenres.map((genre) => (
                  <Badge key={genre} variant="secondary">
                    {genre}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No genres selected yet.{" "}
                <Link href={ROUTES.settings} className="text-primary hover:underline">
                  Update in settings
                </Link>
                .
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Play className="size-5 text-primary" />
              Recently watched
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profile.recentlyWatched.length ? (
              <ul className="space-y-3">
                {profile.recentlyWatched.map((event) => (
                  <li key={event.id}>
                    <Link
                      href={event.href}
                      className="block rounded-lg border border-white/5 px-3 py-2 transition-colors hover:bg-white/5"
                    >
                      <p className="font-medium">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.artistName} · {new Date(event.scheduledAt).toLocaleString()}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Your ticket history will appear here after you attend live events.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="text-xl font-semibold">Liked artists</h2>
          <Link href={ROUTES.following} className="text-sm text-primary hover:underline">
            See all
          </Link>
        </div>
        {profile.likedArtists.length ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {profile.likedArtists.map((artist) => (
              <ArtistCard
                key={artist.slug}
                artist={{
                  slug: artist.slug,
                  stage_name: artist.stageName,
                  banner_url: artist.bannerUrl,
                  verified: artist.verified,
                  category: artist.category as ArtistCategory,
                  follower_count: 0,
                }}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Follow artists you love from{" "}
            <Link href={ROUTES.discover} className="text-primary hover:underline">
              Discover
            </Link>
            .
          </p>
        )}
      </section>
    </div>
  );
}
