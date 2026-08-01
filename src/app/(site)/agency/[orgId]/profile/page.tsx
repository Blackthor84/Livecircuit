import { AgencyPageHeader } from "@/components/agency/agency-dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAgencyOrganization } from "@/lib/data/agencies";
import { getSessionUser } from "@/lib/auth/session";

type Props = { params: Promise<{ orgId: string }> };

export default async function AgencyProfilePage({ params }: Props) {
  const { orgId } = await params;
  const user = await getSessionUser();
  const ctx = user ? await getAgencyOrganization(orgId, user.id) : null;
  const org = ctx?.organization;

  return (
    <>
      <AgencyPageHeader
        title="Agency profile"
        subtitle="Your public agency presence — logo, roster, genres, verification, and office locations."
        verified={Boolean(org?.verified)}
      />
      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle>{org?.name ?? "Agency"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>{org?.biography ?? "Add a biography to introduce your agency to artists and partners."}</p>
          {org?.website_url ? (
            <p>
              Website:{" "}
              <a href={org.website_url as string} className="text-primary hover:underline" target="_blank" rel="noreferrer">
                {org.website_url as string}
              </a>
            </p>
          ) : null}
          <p>Plan: {(org?.plan as string) ?? "starter"}</p>
          {(org?.genres as string[] | undefined)?.length ? (
            <p>Genres: {(org.genres as string[]).join(", ")}</p>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
