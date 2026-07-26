import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UserProfileView } from "@/components/profile/user-profile-view";
import { requireUserProfile } from "@/lib/auth/guards";
import { getUserProfilePageData } from "@/lib/data/user-profile-page";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const { user } = await requireUserProfile();
  const profile = await getUserProfilePageData(user.id);
  if (!profile) redirect("/settings");

  return <UserProfileView profile={profile} />;
}
