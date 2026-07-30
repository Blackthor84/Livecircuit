"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addPipelineInteractionAction,
  createPipelineDealAction,
  generateDigitalContractAction,
  updatePipelineStageAction,
} from "@/lib/actions/founding-partner-program";
import { PIPELINE_STAGES } from "@/lib/sponsorship/program-constants";
import type { PipelineDeal } from "@/lib/sponsorship/pipeline";
import { formatCents } from "@/lib/format";

export function SponsorshipPipelinePanel({ deals }: { deals: PipelineDeal[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const grouped = PIPELINE_STAGES.map((stage) => ({
    ...stage,
    deals: deals.filter((d) => d.stage === stage.id),
  }));

  return (
    <div className="space-y-6">
      <form
        className="glass-panel flex flex-wrap gap-3 rounded-xl border border-white/10 p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const fd = new FormData(e.currentTarget);
          const r = await createPipelineDealAction({
            title: String(fd.get("title")),
            organizationName: String(fd.get("organizationName") || "") || undefined,
            contactEmail: String(fd.get("contactEmail") || "") || undefined,
            estimatedValueCents: Number(fd.get("estimatedValueCents") || 0),
          });
          setBusy(false);
          if (!r.ok) toast.error(r.error);
          else {
            toast.success("Deal created");
            router.refresh();
          }
        }}
      >
        <Input name="title" placeholder="Deal title" required className="min-w-[200px] flex-1" />
        <Input name="organizationName" placeholder="Company" className="min-w-[160px]" />
        <Input name="contactEmail" type="email" placeholder="Email" className="min-w-[160px]" />
        <Input name="estimatedValueCents" type="number" placeholder="Value (cents)" className="w-36" />
        <Button type="submit" disabled={busy}>Add lead</Button>
      </form>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {grouped.map((col) => (
          <div key={col.id} className="min-w-[220px] flex-shrink-0 rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {col.label} ({col.deals.length})
            </p>
            <ul className="space-y-2">
              {col.deals.map((deal) => (
                <li key={deal.id} className="rounded-lg border border-white/10 bg-background/50 p-3 text-sm">
                  <p className="font-medium">{deal.title}</p>
                  {deal.organizationName ? <p className="text-xs text-muted-foreground">{deal.organizationName}</p> : null}
                  {deal.estimatedValueCents ? (
                    <p className="mt-1 text-xs tabular-nums">{formatCents(deal.estimatedValueCents)}</p>
                  ) : null}
                  <select
                    className="mt-2 w-full rounded border border-input bg-transparent px-2 py-1 text-xs"
                    value={deal.stage}
                    onChange={async (e) => {
                      setBusy(true);
                      const r = await updatePipelineStageAction(deal.id, e.target.value as PipelineDeal["stage"]);
                      setBusy(false);
                      if (!r.ok) toast.error(r.error);
                      else router.refresh();
                    }}
                  >
                    {PIPELINE_STAGES.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-1 h-7 w-full text-xs"
                    onClick={async () => {
                      const note = prompt("Log interaction:");
                      if (!note) return;
                      setBusy(true);
                      const r = await addPipelineInteractionAction({
                        dealId: deal.id,
                        interactionType: "note",
                        body: note,
                      });
                      setBusy(false);
                      if (!r.ok) toast.error(r.error);
                      else toast.success("Logged");
                    }}
                  >
                    Log interaction ({deal.interactionCount})
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ContractDocumentActions({ contractId }: { contractId: string }) {
  const [docId, setDocId] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="secondary"
        onClick={async () => {
          const r = await generateDigitalContractAction(contractId);
          if (!r.ok) toast.error(r.error);
          else {
            setDocId(r.documentId ?? null);
            toast.success("Contract generated");
          }
        }}
      >
        Generate contract
      </Button>
      {docId ? (
        <a
          href={`/api/sponsorship/contracts/${docId}/export`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 items-center rounded-md border border-input px-3 text-sm hover:bg-accent"
        >
          Export PDF (print)
        </a>
      ) : null}
    </div>
  );
}
