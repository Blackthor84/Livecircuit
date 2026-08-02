"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUpDown, Play, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createBusinessRuleAction,
  rollbackBusinessRuleAction,
  simulateBusinessRulesAction,
  updateBusinessRuleAction,
  updateRuleStatusAction,
} from "@/lib/actions/business-rules-admin";
import {
  ACTION_LABELS,
  ACTION_TYPES,
  CATEGORY_LABELS,
  CONDITION_LABELS,
  CONDITION_TYPES,
  TARGET_AUDIENCES,
  type BusinessRule,
  type BusinessRuleCategory,
  type BusinessRuleHoliday,
  type RuleAction,
  type RuleCondition,
} from "@/lib/business-rules/types";
import { formatCents } from "@/lib/format";
import type { BusinessRuleHistoryRow } from "@/lib/business-rules/rules-resolver.server";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400",
  inactive: "bg-zinc-500/20 text-zinc-400",
  draft: "bg-amber-500/20 text-amber-400",
  archived: "bg-red-500/20 text-red-400",
};

export function AdminBusinessRulesOverview({
  totalRules,
  activeRules,
  draftRules,
  holidayCount,
  conflicts,
  byCategory,
  rules,
}: {
  totalRules: number;
  activeRules: number;
  draftRules: number;
  holidayCount: number;
  conflicts: { ruleA: string; ruleB: string; field: string; message: string }[];
  byCategory: Record<string, number>;
  rules: BusinessRule[];
}) {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Rules", value: totalRules },
          { label: "Active", value: activeRules },
          { label: "Drafts", value: draftRules },
          { label: "Holidays", value: holidayCount },
        ].map((kpi) => (
          <Card key={kpi.label} className="glass-panel border-white/10">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">{kpi.label}</p>
              <p className="mt-2 text-3xl font-bold tabular-nums">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {conflicts.length > 0 ? (
        <Card className="glass-panel border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="size-5" /> Rule Conflicts Detected
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {conflicts.map((c, i) => (
              <p key={i} className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{c.ruleA}</span> vs{" "}
                <span className="font-medium text-foreground">{c.ruleB}</span>: {c.message}
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/business-rules/builder"
          className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          <Plus className="mr-2 size-4" /> New Rule
        </Link>
        <Link
          href="/admin/business-rules/simulate"
          className="inline-flex items-center rounded-lg border border-white/10 px-4 py-2 text-sm font-medium"
        >
          <Play className="mr-2 size-4" /> Simulation Mode
        </Link>
      </div>

      <Card className="glass-panel border-white/10">
        <CardHeader><CardTitle>Rules by Category</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(byCategory).map(([cat, count]) => (
              <Link
                key={cat}
                href={`/admin/business-rules/${cat === "feature_access" ? "feature-access" : cat}`}
                className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-3 transition-colors hover:bg-white/5"
              >
                <span className="text-sm">{CATEGORY_LABELS[cat as BusinessRuleCategory] ?? cat}</span>
                <Badge variant="outline">{count}</Badge>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <AdminRulesList rules={rules.slice(0, 10)} title="Recent Rules" compact />
    </div>
  );
}

export function AdminRulesList({
  rules,
  title = "Rules",
  compact,
  category,
}: {
  rules: BusinessRule[];
  title?: string;
  compact?: boolean;
  category?: BusinessRuleCategory;
}) {
  const [pending, startTransition] = useTransition();

  if (!rules.length) {
    return (
      <Card className="glass-panel border-white/10">
        <CardContent className="py-12 text-center text-muted-foreground">
          No rules in this category yet.{" "}
          <Link href="/admin/business-rules/builder" className="text-primary hover:underline">
            Create one
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-panel border-white/10">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        {!compact ? (
          <Link
            href={`/admin/business-rules/builder${category ? `?category=${category}` : ""}`}
            className="inline-flex items-center rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
          >
            <Plus className="mr-1 size-4" /> Add Rule
          </Link>
        ) : null}
      </CardHeader>
      <CardContent className="divide-y divide-white/5">
        {rules.map((rule) => (
          <div key={rule.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/admin/business-rules/builder/${rule.id}`} className="font-semibold hover:text-primary">
                  {rule.name}
                </Link>
                <Badge className={STATUS_COLORS[rule.status] ?? ""}>{rule.status}</Badge>
                <Badge variant="outline">P{rule.priority}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{rule.description}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {rule.conditions.slice(0, 3).map((c, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {CONDITION_LABELS[c.type] ?? c.type}
                  </Badge>
                ))}
                {rule.actions.slice(0, 2).map((a, i) => (
                  <Badge key={i} variant="outline" className="text-xs text-primary">
                    {ACTION_LABELS[a.type] ?? a.type}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              {rule.status !== "active" ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await updateRuleStatusAction(rule.id, "active");
                      if (res.ok) toast.success("Rule activated");
                      else toast.error(res.error);
                    })
                  }
                >
                  Activate
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await updateRuleStatusAction(rule.id, "inactive");
                      if (res.ok) toast.success("Rule deactivated");
                      else toast.error(res.error);
                    })
                  }
                >
                  Deactivate
                </Button>
              )}
              <Link
                href={`/admin/business-rules/builder/${rule.id}`}
                className="inline-flex items-center rounded-lg border border-white/10 px-3 py-1.5 text-sm"
              >
                Edit
              </Link>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function emptyCondition(): RuleCondition {
  return { type: "user_type", operator: "equals", value: "artist" };
}

function emptyAction(): RuleAction {
  return { type: "free_venue_booking" };
}

export function AdminRuleBuilder({
  rule,
  defaultCategory,
}: {
  rule?: BusinessRule;
  defaultCategory?: BusinessRuleCategory;
}) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(rule?.name ?? "");
  const [description, setDescription] = useState(rule?.description ?? "");
  const [category, setCategory] = useState<BusinessRuleCategory>(rule?.category ?? defaultCategory ?? "venue");
  const [priority, setPriority] = useState(rule?.priority ?? 500);
  const [status, setStatus] = useState(rule?.status ?? "draft");
  const [startsAt, setStartsAt] = useState(rule?.startsAt?.slice(0, 16) ?? "");
  const [endsAt, setEndsAt] = useState(rule?.endsAt?.slice(0, 16) ?? "");
  const [targetAudience, setTargetAudience] = useState<string[]>(rule?.targetAudience ?? []);
  const [conditions, setConditions] = useState<RuleCondition[]>(
    rule?.conditions.length ? rule.conditions : [emptyCondition()]
  );
  const [actions, setActions] = useState<RuleAction[]>(
    rule?.actions.length ? rule.actions : [emptyAction()]
  );
  const [adminNotes, setAdminNotes] = useState(rule?.adminNotes ?? "");
  const [reason, setReason] = useState("");

  function toggleAudience(aud: string) {
    setTargetAudience((prev) =>
      prev.includes(aud) ? prev.filter((x) => x !== aud) : [...prev, aud]
    );
  }

  function save() {
    startTransition(async () => {
      const payload = {
        name,
        description,
        category,
        priority,
        status,
        startsAt: startsAt || undefined,
        endsAt: endsAt || undefined,
        targetAudience: targetAudience as ("artist" | "agency" | "sponsor" | "admin" | "fan")[],
        conditions,
        actions,
        adminNotes,
        reason,
      };

      const res = rule
        ? await updateBusinessRuleAction(rule.id, payload)
        : await createBusinessRuleAction(payload);

      if (res.ok) toast.success(rule ? "Rule updated" : "Rule created");
      else toast.error(res.error);
    });
  }

  return (
    <div className="space-y-6">
      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle>{rule ? "Edit Rule" : "Rule Builder"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <Label>Rule Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Boutique — Unlimited Club Bookings" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as BusinessRuleCategory)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-background px-3 py-2 text-sm"
                >
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Priority (higher wins)</Label>
                <Input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as BusinessRule["status"])}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-background px-3 py-2 text-sm"
                >
                  {["draft", "active", "inactive", "archived"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Version</Label>
                <Input value={rule?.version ?? 1} disabled />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Target Audience</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {TARGET_AUDIENCES.map((aud) => (
                  <button
                    key={aud}
                    type="button"
                    onClick={() => toggleAudience(aud)}
                    className={`rounded-lg border px-3 py-1.5 text-sm capitalize transition-colors ${
                      targetAudience.includes(aud)
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-white/10 text-muted-foreground"
                    }`}
                  >
                    {aud}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Administrator Notes</Label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-white/10 bg-background px-3 py-2 text-sm"
              />
            </div>
            {rule ? (
              <div>
                <Label>Change Reason</Label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why are you updating this rule?" />
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel border-white/10">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Conditions (all must match)</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setConditions([...conditions, emptyCondition()])}>
            <Plus className="mr-1 size-4" /> Add Condition
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {conditions.map((cond, i) => (
            <div key={i} className="grid gap-3 rounded-lg border border-white/10 p-4 sm:grid-cols-4">
              <select
                value={cond.type}
                onChange={(e) => {
                  const next = [...conditions];
                  next[i] = { ...cond, type: e.target.value as RuleCondition["type"] };
                  setConditions(next);
                }}
                className="rounded-lg border border-white/10 bg-background px-3 py-2 text-sm"
              >
                {CONDITION_TYPES.map((t) => (
                  <option key={t} value={t}>{CONDITION_LABELS[t]}</option>
                ))}
              </select>
              <select
                value={cond.operator}
                onChange={(e) => {
                  const next = [...conditions];
                  next[i] = { ...cond, operator: e.target.value as RuleCondition["operator"] };
                  setConditions(next);
                }}
                className="rounded-lg border border-white/10 bg-background px-3 py-2 text-sm"
              >
                {["equals", "not_equals", "in", "gte", "lte", "contains"].map((op) => (
                  <option key={op} value={op}>{op}</option>
                ))}
              </select>
              <Input
                value={String(cond.value)}
                onChange={(e) => {
                  const next = [...conditions];
                  next[i] = { ...cond, value: e.target.value };
                  setConditions(next);
                }}
                placeholder="Value"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConditions(conditions.filter((_, j) => j !== i))}
                disabled={conditions.length <= 1}
              >
                Remove
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="glass-panel border-white/10">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Actions</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setActions([...actions, emptyAction()])}>
            <Plus className="mr-1 size-4" /> Add Action
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {actions.map((action, i) => (
            <div key={i} className="grid gap-3 rounded-lg border border-white/10 p-4 sm:grid-cols-4">
              <select
                value={action.type}
                onChange={(e) => {
                  const next = [...actions];
                  next[i] = { ...action, type: e.target.value as RuleAction["type"] };
                  setActions(next);
                }}
                className="rounded-lg border border-white/10 bg-background px-3 py-2 text-sm"
              >
                {ACTION_TYPES.map((t) => (
                  <option key={t} value={t}>{ACTION_LABELS[t]}</option>
                ))}
              </select>
              <Input
                value={action.value != null ? String(action.value) : ""}
                onChange={(e) => {
                  const next = [...actions];
                  const val = e.target.value;
                  next[i] = { ...action, value: isNaN(Number(val)) ? val : Number(val) };
                  setActions(next);
                }}
                placeholder="Value"
              />
              <select
                value={action.unit ?? "percent"}
                onChange={(e) => {
                  const next = [...actions];
                  next[i] = { ...action, unit: e.target.value as RuleAction["unit"] };
                  setActions(next);
                }}
                className="rounded-lg border border-white/10 bg-background px-3 py-2 text-sm"
              >
                {["percent", "cents", "dollars", "multiplier"].map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setActions(actions.filter((_, j) => j !== i))}
                disabled={actions.length <= 1}
              >
                Remove
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={save} disabled={pending || !name.trim()}>
          <Save className="mr-2 size-4" />
          {pending ? "Saving…" : rule ? "Update Rule" : "Create Rule"}
        </Button>
        <Link href="/admin/business-rules" className="inline-flex items-center rounded-lg border border-white/10 px-4 py-2 text-sm">
          Cancel
        </Link>
      </div>
    </div>
  );
}

export function AdminRuleSimulationPanel() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<Awaited<ReturnType<typeof simulateBusinessRulesAction>> | null>(null);

  function runSimulation(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await simulateBusinessRulesAction({
        userType: fd.get("userType") || undefined,
        agencyPlan: fd.get("agencyPlan") || undefined,
        venueType: fd.get("venueType") || undefined,
        eventCount: fd.get("eventCount") ? Number(fd.get("eventCount")) : undefined,
        customTags: fd.get("customTags") ? String(fd.get("customTags")).split(",").map((s) => s.trim()) : undefined,
        isHoliday: fd.get("isHoliday") === "on",
        dayOfWeek: fd.get("dayOfWeek") || undefined,
        bookingAt: fd.get("bookingAt") || undefined,
      });
      setResult(res);
      if (res.ok) toast.success("Simulation complete");
      else toast.error(res.error);
    });
  }

  return (
    <div className="space-y-6">
      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle>Rule Simulation</CardTitle>
          <p className="text-sm text-muted-foreground">
            Test what would happen for a specific booking scenario. Example: &quot;Artist books Club venue next Saturday&quot;
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={runSimulation} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { name: "userType", label: "User Type", options: ["artist", "agency", "sponsor", "fan"] },
              { name: "agencyPlan", label: "Agency Plan", options: ["boutique", "growth", "enterprise"] },
              { name: "venueType", label: "Venue Type", options: ["community", "club", "theater", "arena", "stadium"] },
              { name: "dayOfWeek", label: "Day Of Week", options: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] },
            ].map((field) => (
              <div key={field.name}>
                <Label>{field.label}</Label>
                <select name={field.name} className="mt-1 w-full rounded-lg border border-white/10 bg-background px-3 py-2 text-sm">
                  <option value="">—</option>
                  {field.options.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
            ))}
            <div>
              <Label>Event Count</Label>
              <Input name="eventCount" type="number" defaultValue={0} min={0} />
            </div>
            <div>
              <Label>Custom Tags (comma-separated)</Label>
              <Input name="customTags" placeholder="beta_user, nonprofit_verified" />
            </div>
            <div>
              <Label>Booking Date/Time</Label>
              <Input name="bookingAt" type="datetime-local" />
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isHoliday" /> Holiday
              </label>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <Button type="submit" disabled={pending}>
                <Play className="mr-2 size-4" /> {pending ? "Simulating…" : "Run Simulation"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {result?.ok ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="glass-panel border-white/10">
            <CardHeader><CardTitle>Pricing Result</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Final Venue Price</span>
                <span className="font-bold text-emerald-400">
                  {result.result.venuePrice.isFree ? "FREE" : formatCents(result.result.venuePrice.feeCents)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ticket Fee %</span>
                <span className="font-bold">{result.result.ticketFee.platformFeePercent}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Booking Allowed</span>
                <span className="font-bold">{result.result.booking.allowed ? "Yes" : "No"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discounts</span>
                <span className="font-bold">{result.result.discounts.venueDiscountPercent}% off</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Credits</span>
                <span className="font-bold">{formatCents(result.result.discounts.creditsCents)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel border-white/10">
            <CardHeader><CardTitle>Applied Rules ({result.result.venuePrice.appliedRules.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {result.result.venuePrice.appliedRules.map((r) => (
                <div key={r.ruleId} className="rounded-lg border border-white/10 px-3 py-2 text-sm">
                  <span className="font-medium">{r.ruleName}</span>
                  <Badge variant="outline" className="ml-2">P{r.priority}</Badge>
                </div>
              ))}
              {result.result.venuePrice.ignoredRules.length > 0 ? (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Ignored ({result.result.venuePrice.ignoredRules.length})</p>
                  {result.result.venuePrice.ignoredRules.slice(0, 5).map((r) => (
                    <p key={r.ruleId} className="mt-1 text-xs text-muted-foreground">{r.ruleName}: {r.reason}</p>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

export function AdminRuleHistoryPanel({ history }: { history: BusinessRuleHistoryRow[] }) {
  const [pending, startTransition] = useTransition();

  return (
    <Card className="glass-panel border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowUpDown className="size-5" /> Version History
        </CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-white/5">
        {!history.length ? (
          <p className="py-8 text-center text-muted-foreground">No rule changes logged yet.</p>
        ) : (
          history.map((row) => (
            <div key={row.id} className="flex flex-col gap-2 py-4 first:pt-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{row.updatedRule.name}</span>
                <Badge variant="outline">v{row.updatedRule.version}</Badge>
                {row.rolledBack ? <Badge className="bg-amber-500/20 text-amber-400">Rolled back</Badge> : null}
              </div>
              <p className="text-sm text-muted-foreground">
                {new Date(row.changedAt).toLocaleString()} — {row.reason ?? "Updated"}
              </p>
              {row.previousRule && !row.rolledBack ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await rollbackBusinessRuleAction(row.id);
                      if (res.ok) toast.success("Rule rolled back");
                      else toast.error(res.error);
                    })
                  }
                >
                  Rollback
                </Button>
              ) : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function AdminHolidayRulesPanel({ holidays }: { holidays: BusinessRuleHoliday[] }) {
  return (
    <Card className="glass-panel border-white/10">
      <CardHeader><CardTitle>Configured Holidays</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-2">
          {holidays.map((h) => (
            <div key={h.id} className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{h.name}</p>
                <p className="text-muted-foreground">{h.startsAt} → {h.endsAt}</p>
              </div>
              <Badge variant={h.isActive ? "default" : "outline"}>
                {h.surchargePercent}% surcharge
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
