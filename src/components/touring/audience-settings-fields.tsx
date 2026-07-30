"use client";

import { Label } from "@/components/ui/label";
import { EVENT_AUDIENCE_MODES } from "@/lib/virtual-touring/constants";
import type { EventAudienceMode } from "@/types/database";

export function AudienceSettingsFields({
  defaultMode = "worldwide",
  defaultPriorityMinutes = 30,
  defaultCity = "",
  defaultStateCode = "",
}: {
  defaultMode?: EventAudienceMode;
  defaultPriorityMinutes?: number;
  defaultCity?: string;
  defaultStateCode?: string;
}) {
  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div>
        <p className="font-medium">Audience & location</p>
        <p className="text-sm text-muted-foreground">
          Set the tour stop city and who may attend this performance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tourCity">Tour city</Label>
          <input
            id="tourCity"
            name="tourCity"
            defaultValue={defaultCity}
            placeholder="Boston"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tourStateCode">State code</Label>
          <input
            id="tourStateCode"
            name="tourStateCode"
            defaultValue={defaultStateCode}
            placeholder="MA"
            maxLength={2}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm uppercase"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="audienceMode">Who may attend</Label>
        <select
          id="audienceMode"
          name="audienceMode"
          defaultValue={defaultMode}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
        >
          {EVENT_AUDIENCE_MODES.map((mode) => (
            <option key={mode.value} value={mode.value}>
              {mode.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          {EVENT_AUDIENCE_MODES.find((m) => m.value === defaultMode)?.description}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="localPriorityMinutes">Local priority window (minutes)</Label>
        <input
          id="localPriorityMinutes"
          name="localPriorityMinutes"
          type="number"
          min={0}
          max={180}
          defaultValue={defaultPriorityMinutes}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="doorsOpenAt">Doors open (optional)</Label>
        <input
          id="doorsOpenAt"
          name="doorsOpenAt"
          type="datetime-local"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
        />
      </div>
    </div>
  );
}
