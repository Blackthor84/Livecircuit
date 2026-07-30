"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { updateProducerChecklistAction } from "@/lib/actions/producers";
import { PRODUCER_CHECKLIST_ITEMS, type ProducerChecklist } from "@/lib/production/types";

export function ProducerChecklistPanel({
  eventId,
  checklist,
}: {
  eventId: string;
  checklist: ProducerChecklist;
}) {
  const [local, setLocal] = useState(checklist);

  async function toggle(key: keyof ProducerChecklist, checked: boolean) {
    const next = { ...local, [key]: checked };
    setLocal(next);
    const result = await updateProducerChecklistAction({ eventId, checklist: next });
    if (!result.ok) toast.error(result.error);
  }

  return (
    <ul className="space-y-3">
      {PRODUCER_CHECKLIST_ITEMS.map((item) => (
        <li key={item.key} className="flex items-center gap-3">
          <Checkbox
            id={item.key}
            checked={Boolean(local[item.key])}
            onCheckedChange={(checked) => void toggle(item.key, checked === true)}
          />
          <Label htmlFor={item.key}>{item.label}</Label>
        </li>
      ))}
    </ul>
  );
}
