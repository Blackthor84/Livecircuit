import { AGENCY_MEMBER_ROLE_LABELS, AGENCY_PLANS } from "@/lib/agency/permissions";
import type { AgencyMember } from "@/lib/agency/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AgencyTeamPanel({
  members,
  plan,
}: {
  members: AgencyMember[];
  plan: string;
}) {
  const planInfo = AGENCY_PLANS.find((p) => p.id === plan);

  return (
    <div className="space-y-6">
      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle>Team members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {members.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-white/10 p-4"
              >
                <div>
                  <p className="font-medium">
                    {member.profiles?.display_name ?? member.profiles?.username ?? "Team member"}
                  </p>
                  <p className="text-xs text-muted-foreground">@{member.profiles?.username ?? "member"}</p>
                </div>
                <Badge variant="secondary">{AGENCY_MEMBER_ROLE_LABELS[member.role]}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle>Plan: {planInfo?.name ?? plan}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{planInfo?.priceLabel}</p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {planInfo?.features.map((feature) => (
              <li key={feature}>• {feature}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
