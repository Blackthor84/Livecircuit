"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  approveFoundingPartnerAction,
  submitFoundingPartnerApplicationAction,
  updateFoundingPartnerMaxSlotsAction,
} from "@/lib/actions/founding-partner-program";
import type {
  FoundingPartner,
  FoundingPartnerApplication,
  FoundingPartnerProgramStats,
} from "@/lib/sponsorship/founding-partners";
import { formatCents } from "@/lib/format";

export function FoundingPartnerBadge({ className }: { className?: string }) {
  return (
    <Badge className={`gap-1 bg-amber-500/90 text-amber-950 hover:bg-amber-500/90 ${className ?? ""}`}>
      Founding Partner
    </Badge>
  );
}

export function FoundingPartnerApplicationForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const result = await submitFoundingPartnerApplicationAction({
      organizationName: String(fd.get("organizationName")),
      contactName: String(fd.get("contactName") || "") || undefined,
      contactEmail: String(fd.get("contactEmail")),
      contactPhone: String(fd.get("contactPhone") || "") || undefined,
      companyWebsite: String(fd.get("companyWebsite") || "") || undefined,
      message: String(fd.get("message") || "") || undefined,
    });
    setBusy(false);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Application submitted — our partnerships team will be in touch");
      router.refresh();
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-3">
      <Input name="organizationName" required placeholder="Company name" />
      <Input name="contactName" placeholder="Contact name" />
      <Input name="contactEmail" type="email" required placeholder="Email" />
      <Input name="contactPhone" placeholder="Phone" />
      <Input name="companyWebsite" type="url" placeholder="Website" />
      <Input name="message" placeholder="Why LiveCircuit?" />
      <Button type="submit" disabled={busy} className="w-full">
        Apply for Founding Partner
      </Button>
    </form>
  );
}

export function FoundingPartnerAdminPanel({
  stats,
  applications,
  partners,
  organizations,
}: {
  stats: FoundingPartnerProgramStats;
  applications: FoundingPartnerApplication[];
  partners: FoundingPartner[];
  organizations: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [maxSlots, setMaxSlots] = useState(stats.maxSlots);

  async function approve(appId: string, orgId: string, name: string) {
    setBusy(true);
    const result = await approveFoundingPartnerAction({
      applicationId: appId,
      organizationId: orgId,
      displayName: name,
    });
    setBusy(false);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Founding Partner approved");
      router.refresh();
    }
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Max slots" value={String(stats.maxSlots)} />
        <Stat label="Remaining slots" value={String(stats.remainingSlots)} highlight />
        <Stat label="Pending applications" value={String(stats.pendingApplications)} />
        <Stat label="Revenue generated" value={formatCents(stats.totalRevenueCents)} />
      </div>

      <section className="glass-panel rounded-xl border border-white/10 p-6">
        <h3 className="font-semibold">Program capacity</h3>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label>Max Founding Partners</Label>
            <Input type="number" min={1} value={maxSlots} onChange={(e) => setMaxSlots(Number(e.target.value))} className="w-32" />
          </div>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const r = await updateFoundingPartnerMaxSlotsAction(maxSlots);
              setBusy(false);
              if (!r.ok) toast.error(r.error);
              else {
                toast.success("Capacity updated");
                router.refresh();
              }
            }}
          >
            Save
          </Button>
        </div>
      </section>

      <section className="glass-panel rounded-xl border border-white/10 p-6">
        <h3 className="font-semibold">Applications</h3>
        <ul className="mt-4 space-y-3">
          {applications.filter((a) => a.status === "pending" || a.status === "reviewing").map((app) => (
            <li key={app.id} className="rounded-lg border border-white/10 p-4 text-sm">
              <p className="font-medium">{app.organizationName}</p>
              <p className="text-muted-foreground">{app.contactEmail}{app.contactPhone ? ` · ${app.contactPhone}` : ""}</p>
              {app.message ? <p className="mt-1 text-muted-foreground">{app.message}</p> : null}
              {organizations.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {organizations.slice(0, 3).map((org) => (
                    <Button
                      key={org.id}
                      size="sm"
                      disabled={busy}
                      onClick={() => void approve(app.id, org.id, app.organizationName)}
                    >
                      Approve as {org.name}
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-amber-300">Create a sponsor organization first to approve.</p>
              )}
            </li>
          ))}
          {!applications.filter((a) => a.status === "pending").length ? (
            <p className="text-muted-foreground">No pending applications.</p>
          ) : null}
        </ul>
      </section>

      <section className="glass-panel rounded-xl border border-white/10 p-6">
        <h3 className="font-semibold">Approved Founding Partners ({partners.length})</h3>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {partners.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-lg border border-white/10 p-3">
              <FoundingPartnerBadge />
              <div>
                <p className="font-medium">{p.displayName}</p>
                <p className="text-xs text-muted-foreground">Since {p.approvedAt.slice(0, 10)} · {formatCents(p.totalRevenueCents)}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="glass-panel rounded-xl border border-primary/20 bg-primary/5 p-6">
        <h3 className="font-semibold">Founding Partner benefits</h3>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 text-sm text-muted-foreground">
          {stats.benefits.map((b) => (
            <li key={b}>· {b}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="glass-panel rounded-xl border border-white/10 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}
