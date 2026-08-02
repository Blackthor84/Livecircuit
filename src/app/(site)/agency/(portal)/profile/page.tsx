import { AgencyPageHeader } from "@/components/agency/agency-dashboard-layout";
import { AgencyPartnershipValueBanner } from "@/components/agency/agency-partnership-pricing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { agencyPlanLabel, getAgencyPartnershipPlan, normalizeAgencyPlan } from "@/lib/agency/partnership-program";
import { loadAgencySessionForUser } from "@/lib/agency/server";
import { getSessionUser } from "@/lib/auth/session";

export default async function AgencyProfilePage() {
  const user = await getSessionUser();
  const sessionResult = user ? await loadAgencySessionForUser(user.id) : null;
  const org = sessionResult?.ok ? sessionResult.session.organization : null;
  const plan = normalizeAgencyPlan(org?.plan as string);
  const partnership = getAgencyPartnershipPlan(plan);

  return (
    <>
      <AgencyPageHeader
        title="Agency profile"
        subtitle="Your public agency presence — logo, roster, genres, verification, and partner directory listing."
        verified={Boolean(org?.verified)}
      />
      <div className="mb-6">
        <AgencyPartnershipValueBanner plan={plan} />
      </div>
      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle>{(org?.name as string) ?? "Agency"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>{(org?.biography as string) ?? "Add a biography to introduce your agency to artists and partners."}</p>
          {org?.website_url ? (
            <p>
              Website:{" "}
              <a
                href={org.website_url as string}
                className="text-primary hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                {org.website_url as string}
              </a>
            </p>
          ) : null}
          <p>Partnership: {agencyPlanLabel(plan)} ({partnership.priceLabel})</p>
          <p>Promotional credits: {partnership.promotionalCreditsLabel}/month</p>
          <Button size="sm" variant="outline" href="/agency/pricing" className="mt-2">
            Upgrade partnership
          </Button>
          {(org?.genres as string[] | undefined)?.length ? (
            <p>Genres: {(org!.genres as string[]).join(", ")}</p>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
