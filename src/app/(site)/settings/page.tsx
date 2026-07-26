import type { Metadata } from "next";
import Link from "next/link";
import { DeleteAccountSection } from "@/components/settings/delete-account-section";
import { ProfileSettingsForm } from "@/components/settings/profile-settings-form";
import { UpdatePasswordForm } from "@/components/settings/update-password-form";
import { Button } from "@/components/ui/button";
import { requireUserProfile } from "@/lib/auth/guards";
import { isArtistOrAdminRole } from "@/lib/auth/roles";
import { getCountries, getGenres } from "@/lib/data/locations";

export const metadata: Metadata = { title: "Settings" };

type Props = { searchParams: Promise<{ recovery?: string }> };

export default async function SettingsPage({ searchParams }: Props) {
  const { user, profile } = await requireUserProfile();
  const { recovery } = await searchParams;
  const [countries, genres] = await Promise.all([getCountries(), getGenres()]);

  const favoriteGenres = (profile.favorite_genres as string[] | null) ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="mt-2 text-muted-foreground">Profile, notifications, and security (2FA-ready).</p>
        </div>
        {isArtistOrAdminRole(profile.role) && (
          <Button variant="outline" href="/artist/settings">
            Artist profile
          </Button>
        )}
      </div>

      {recovery === "1" && (
        <div className="mt-6 rounded-xl border border-primary/30 bg-primary/10 p-4">
          <h2 className="font-medium">Set a new password</h2>
          <p className="mt-1 text-sm text-muted-foreground">You signed in from a reset link.</p>
          <div className="mt-4">
            <UpdatePasswordForm />
          </div>
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-medium">Profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your city and state feed artist heat maps — choose accurately for tour planning.
        </p>
        <div className="mt-4">
          <ProfileSettingsForm
            initial={{
              userId: user.id,
              displayName: profile.display_name ?? "",
              username: profile.username ?? "",
              bio: profile.bio ?? "",
              avatarUrl: profile.avatar_url,
              countryId: profile.country_id ?? "",
              stateId: profile.state_id ?? "",
              cityId: profile.city_id ?? "",
              favoriteGenreIds: favoriteGenres,
              emailNotifications: profile.email_notifications ?? true,
              pushNotifications: profile.push_notifications ?? true,
              countries,
              genres,
            }}
          />
        </div>
      </section>

      {recovery !== "1" && (
        <section className="mt-10">
          <h2 className="text-lg font-medium">Password</h2>
          <div className="mt-4">
            <UpdatePasswordForm />
          </div>
        </section>
      )}

      <section className="mt-10">
        <DeleteAccountSection />
      </section>
    </div>
  );
}
