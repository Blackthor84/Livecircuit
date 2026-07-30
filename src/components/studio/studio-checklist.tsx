"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { STUDIO_CHECKLIST_ITEMS, checklistProgress } from "@/lib/streaming/studio/checklist";
import type { StudioChecklist } from "@/lib/streaming/studio/types";

type Props = {
  checklist: StudioChecklist;
  onChange: (checklist: StudioChecklist) => void;
};

export function StudioChecklistPanel({ checklist, onChange }: Props) {
  const progress = checklistProgress(checklist);

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        {progress.completedRequired}/{progress.requiredTotal} required checks complete
      </div>
      <ul className="space-y-3">
        {STUDIO_CHECKLIST_ITEMS.map((item) => (
          <li key={item.key} className="flex items-start gap-3">
            <Checkbox
              id={item.key}
              checked={Boolean(checklist[item.key])}
              onCheckedChange={(checked) =>
                onChange({ ...checklist, [item.key]: checked === true })
              }
            />
            <Label htmlFor={item.key} className="leading-snug">
              {item.label}
              {!item.required ? (
                <span className="ml-1 text-xs text-muted-foreground">(optional)</span>
              ) : null}
            </Label>
          </li>
        ))}
      </ul>
      {!progress.ready ? (
        <p className="text-xs text-amber-200/90">
          Complete required checks before going live, or proceed anyway if you are confident.
        </p>
      ) : null}
    </div>
  );
}
