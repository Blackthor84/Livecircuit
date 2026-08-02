import { redirect } from "next/navigation";

export default function LegacyAdminPricingRedirect() {
  redirect("/admin/monetization/venue");
}
