import { AGENCY_MEMBER_ROLE_LABELS, AGENCY_PARTNERSHIP_PLANS, agencyPlanLabel, normalizeAgencyPlan } from "@/lib/agency/permissions";
import { getAgencyPartnershipPlan } from "@/lib/agency/partnership-program";
import type { AgencyMember } from "@/lib/agency/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/format";

export function AgencyTeamPanel({
  members,
  plan,
}: {
  members: AgencyMember[];
  plan: string;
}) {
  const normalized = normalizeAgencyPlan(plan);
  const partnership = getAgencyPartnershipPlan(normalized);
  const planInfo = AGENCY_PARTNERSHIP_PLANS.find((p) => p.id === normalized);

  return (
    <div className="space-y-6">
      <Card className="glass-panel border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle>{partnership.name} Partnership</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-2xl font-semibold">{partnership.priceLabel}</p>
          <p className="text-muted-foreground">
            {partnership.promotionalCreditsLabel}/mo promotional credits ·{" "}
            {partnership.includedVenueTiers.map((t) => t).join(", ")} venues included
          </p>
          <Button size="sm" variant="secondary" href="/agency/pricing">
            View partnership tiers
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle>
            Team members ({members.length}
            {planInfo?.staffLimit ? ` / ${planInfo.staffLimit}` : ""})
          </CardTitle>
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
          <CardTitle>Partnership includes</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2 text-sm text-muted-foreground">
            {partnership.highlights.map((feature) => (
              <li key={feature}>• {feature}</li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            Monthly credits balance: {formatCents(partnership.promotionalCreditsCents)} · Plan: {agencyPlanLabel(plan)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
