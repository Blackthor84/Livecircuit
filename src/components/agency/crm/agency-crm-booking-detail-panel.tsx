"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { format } from "date-fns";
import {
  ArrowLeft,
  CheckSquare,
  DollarSign,
  FileText,
  Mail,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  addCrmNoteAction,
  createCrmContractAction,
  createCrmPaymentAction,
  createCrmTaskAction,
  markCrmPaymentPaidAction,
  toggleCrmChecklistItemAction,
  updateCrmBookingAction,
  updateCrmBookingStageAction,
  updateCrmContractStatusAction,
  updateCrmTaskAction,
} from "@/lib/actions/agency-crm";
import {
  CRM_CONTRACT_STATUSES,
  CRM_EVENT_TYPES,
  CRM_PIPELINE_STAGES,
  CRM_TASK_PRIORITIES,
  type CrmPipelineStageId,
} from "@/lib/agency/crm-constants";
import type {
  CrmActivity,
  CrmBooking,
  CrmChecklistItem,
  CrmContract,
  CrmPayment,
  CrmTask,
} from "@/lib/agency/crm-types";
import { formatCents } from "@/lib/format";

type Props = {
  orgId: string;
  booking: CrmBooking;
  tasks: CrmTask[];
  activities: CrmActivity[];
  payments: CrmPayment[];
  contracts: CrmContract[];
  checklist: CrmChecklistItem[];
  members: { user_id: string; display_name: string | null }[];
  artists: { artist_id: string; stage_name: string }[];
  venues: { id: string; name: string }[];
};

export function AgencyCrmBookingDetailPanel({
  orgId,
  booking,
  tasks,
  activities,
  payments,
  contracts,
  checklist,
  members,
  artists,
  venues,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [internalNote, setInternalNote] = useState("");

  const marketingItems = checklist.filter((c) => c.checklist_type === "marketing");
  const performanceItems = checklist.filter((c) => c.checklist_type === "performance");

  function saveField(field: string, value: unknown) {
    startTransition(async () => {
      const result = await updateCrmBookingAction({
        orgId,
        bookingId: booking.id,
        [field]: value,
      });
      if (!result.ok) toast.error(result.error);
      else {
        toast.success("Saved");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" className="mb-2 -ml-2 gap-1.5" href="/agency/crm/pipeline">
            <ArrowLeft className="size-4" />
            Pipeline
          </Button>
          <h2 className="text-xl font-bold">{booking.title}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select
              className="rounded-md border border-input bg-transparent px-2 py-1 text-sm"
              value={booking.stage}
              disabled={pending}
              onChange={(e) => {
                startTransition(async () => {
                  const result = await updateCrmBookingStageAction({
                    orgId,
                    bookingId: booking.id,
                    stage: e.target.value as CrmPipelineStageId,
                  });
                  if (!result.ok) toast.error(result.error);
                  else router.refresh();
                });
              }}
            >
              {CRM_PIPELINE_STAGES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
            <Badge variant="outline" className="capitalize">{booking.priority}</Badge>
            {booking.artists?.stage_name ? (
              <Badge className="bg-primary/20 text-primary">{booking.artists.stage_name}</Badge>
            ) : null}
          </div>
        </div>
        <div className="text-right text-sm">
          <p className="text-muted-foreground">Projected</p>
          <p className="text-lg font-semibold tabular-nums">{formatCents(booking.projected_revenue_cents)}</p>
          <p className="mt-1 text-muted-foreground">Actual</p>
          <p className="font-semibold tabular-nums text-emerald-400">{formatCents(booking.actual_revenue_cents)}</p>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex h-auto flex-wrap gap-1 bg-transparent p-0">
          {["overview", "tasks", "contracts", "payments", "marketing", "activity", "files"].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="capitalize data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="glass-panel border-white/10">
              <CardHeader><CardTitle className="text-base">Event Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Field label="Event name">
                  <Input defaultValue={booking.title} onBlur={(e) => saveField("title", e.target.value)} />
                </Field>
                <Field label="Artist">
                  <select
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                    defaultValue={booking.artist_id ?? ""}
                    onChange={(e) => saveField("artistId", e.target.value || null)}
                  >
                    <option value="">—</option>
                    {artists.map((a) => (
                      <option key={a.artist_id} value={a.artist_id}>{a.stage_name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Venue (Digital Arena)">
                  <select
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                    defaultValue={booking.venue_id ?? ""}
                    onChange={(e) => saveField("venueId", e.target.value || null)}
                  >
                    <option value="">—</option>
                    {venues.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Event type">
                  <select
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                    defaultValue={booking.event_type}
                    onChange={(e) => saveField("eventType", e.target.value)}
                  >
                    {CRM_EVENT_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Start">
                    <Input
                      type="datetime-local"
                      defaultValue={booking.starts_at ? booking.starts_at.slice(0, 16) : ""}
                      onBlur={(e) => saveField("startsAt", e.target.value ? new Date(e.target.value).toISOString() : null)}
                    />
                  </Field>
                  <Field label="Timezone">
                    <Input defaultValue={booking.timezone} onBlur={(e) => saveField("timezone", e.target.value)} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Expected attendance">
                    <Input
                      type="number"
                      defaultValue={booking.expected_attendance ?? ""}
                      onBlur={(e) => saveField("expectedAttendance", e.target.value ? Number(e.target.value) : null)}
                    />
                  </Field>
                  <Field label="Ticket price (¢)">
                    <Input
                      type="number"
                      defaultValue={booking.ticket_price_cents ?? ""}
                      onBlur={(e) => saveField("ticketPriceCents", e.target.value ? Number(e.target.value) : null)}
                    />
                  </Field>
                </div>
                <Field label="Assigned to">
                  <select
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                    defaultValue={booking.assigned_to ?? ""}
                    onChange={(e) => saveField("assignedTo", e.target.value || null)}
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>{m.display_name ?? m.user_id}</option>
                    ))}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Recording status">
                    <Input defaultValue={booking.recording_status} onBlur={(e) => saveField("recordingStatus", e.target.value)} />
                  </Field>
                  <Field label="Replay status">
                    <Input defaultValue={booking.replay_status} onBlur={(e) => saveField("replayStatus", e.target.value)} />
                  </Field>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel border-white/10">
              <CardHeader><CardTitle className="text-base">Contact</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Field label="Contact name">
                  <Input defaultValue={booking.contact_name ?? ""} onBlur={(e) => saveField("contactName", e.target.value || null)} />
                </Field>
                <Field label="Email">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-9" defaultValue={booking.contact_email ?? ""} onBlur={(e) => saveField("contactEmail", e.target.value || null)} />
                  </div>
                </Field>
                <Field label="Phone">
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-9" defaultValue={booking.contact_phone ?? ""} onBlur={(e) => saveField("contactPhone", e.target.value || null)} />
                  </div>
                </Field>
                <Field label="Website">
                  <Input defaultValue={booking.contact_website ?? ""} onBlur={(e) => saveField("contactWebsite", e.target.value || null)} />
                </Field>
                <Field label="Notes">
                  <Textarea defaultValue={booking.notes ?? ""} rows={4} onBlur={(e) => saveField("notes", e.target.value || null)} />
                </Field>
                <Field label="Internal notes">
                  <Textarea defaultValue={booking.internal_notes ?? ""} rows={3} onBlur={(e) => saveField("internalNotes", e.target.value || null)} />
                </Field>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="glass-panel border-white/10">
              <CardHeader><CardTitle className="text-base">Add Note</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note to the timeline…" rows={3} />
                <Button
                  size="sm"
                  disabled={!note.trim() || pending}
                  onClick={() => {
                    startTransition(async () => {
                      const r = await addCrmNoteAction({ orgId, bookingId: booking.id, body: note });
                      if (!r.ok) toast.error(r.error);
                      else { setNote(""); toast.success("Note added"); router.refresh(); }
                    });
                  }}
                >
                  Add note
                </Button>
              </CardContent>
            </Card>
            <Card className="glass-panel border-white/10">
              <CardHeader><CardTitle className="text-base">Internal Note</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Textarea value={internalNote} onChange={(e) => setInternalNote(e.target.value)} placeholder="Team-only note…" rows={3} />
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!internalNote.trim() || pending}
                  onClick={() => {
                    startTransition(async () => {
                      const r = await addCrmNoteAction({ orgId, bookingId: booking.id, body: internalNote, internal: true });
                      if (!r.ok) toast.error(r.error);
                      else { setInternalNote(""); toast.success("Internal note added"); router.refresh(); }
                    });
                  }}
                >
                  Add internal note
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <Card className="glass-panel border-white/10">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckSquare className="size-4" /> Tasks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                className="flex flex-wrap gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  startTransition(async () => {
                    const r = await createCrmTaskAction({
                      orgId,
                      bookingId: booking.id,
                      title: String(fd.get("title")),
                      priority: String(fd.get("priority") || "medium"),
                      dueAt: fd.get("dueAt") ? new Date(String(fd.get("dueAt"))).toISOString() : undefined,
                    });
                    if (!r.ok) toast.error(r.error);
                    else { toast.success("Task created"); e.currentTarget.reset(); router.refresh(); }
                  });
                }}
              >
                <Input name="title" placeholder="Task title" required className="min-w-[200px] flex-1" />
                <select name="priority" className="rounded-md border border-input bg-transparent px-2 py-2 text-sm">
                  {CRM_TASK_PRIORITIES.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
                <Input name="dueAt" type="datetime-local" className="w-48" />
                <Button type="submit" size="sm" disabled={pending}>Add task</Button>
              </form>
              <ul className="divide-y divide-white/5">
                {tasks.map((task) => (
                  <li key={task.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className={task.status === "done" ? "text-muted-foreground line-through" : "font-medium"}>
                        {task.title}
                      </p>
                      {task.due_at ? (
                        <p className="text-xs text-muted-foreground">
                          Due {format(new Date(task.due_at), "MMM d, yyyy")}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] capitalize">{task.priority}</Badge>
                      {task.status !== "done" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            startTransition(async () => {
                              const r = await updateCrmTaskAction({
                                orgId, taskId: task.id, bookingId: booking.id, status: "done",
                              });
                              if (!r.ok) toast.error(r.error);
                              else router.refresh();
                            });
                          }}
                        >
                          Complete
                        </Button>
                      ) : (
                        <Badge className="bg-emerald-500/20 text-emerald-300">Done</Badge>
                      )}
                    </div>
                  </li>
                ))}
                {tasks.length === 0 ? (
                  <li className="py-6 text-center text-sm text-muted-foreground">No tasks yet.</li>
                ) : null}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contracts" className="mt-6">
          <Card className="glass-panel border-white/10">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="size-4" /> Contracts</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <form
                className="flex flex-wrap gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  startTransition(async () => {
                    const r = await createCrmContractAction({
                      orgId, bookingId: booking.id, title: String(fd.get("title")),
                    });
                    if (!r.ok) toast.error(r.error);
                    else { toast.success("Contract created"); router.refresh(); }
                  });
                }}
              >
                <Input name="title" placeholder="Contract title" required className="min-w-[200px] flex-1" />
                <Button type="submit" size="sm" disabled={pending}>Add contract</Button>
              </form>
              <ul className="space-y-2">
                {contracts.map((c) => (
                  <li key={c.id} className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium">{c.title}</p>
                      <p className="text-xs text-muted-foreground">v{c.version}</p>
                    </div>
                    <select
                      className="rounded border border-input bg-transparent px-2 py-1 text-xs"
                      value={c.status}
                      onChange={(e) => {
                        startTransition(async () => {
                          const r = await updateCrmContractStatusAction({
                            orgId, contractId: c.id, bookingId: booking.id, status: e.target.value,
                          });
                          if (!r.ok) toast.error(r.error);
                          else router.refresh();
                        });
                      }}
                    >
                      {CRM_CONTRACT_STATUSES.map((s) => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <Card className="glass-panel border-white/10">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><DollarSign className="size-4" /> Payments</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <form
                className="flex flex-wrap gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  startTransition(async () => {
                    const r = await createCrmPaymentAction({
                      orgId,
                      bookingId: booking.id,
                      paymentType: String(fd.get("paymentType")),
                      amountCents: Number(fd.get("amountCents")),
                    });
                    if (!r.ok) toast.error(r.error);
                    else { toast.success("Payment recorded"); router.refresh(); }
                  });
                }}
              >
                <select name="paymentType" className="rounded-md border border-input bg-transparent px-2 py-2 text-sm">
                  <option value="deposit">Deposit</option>
                  <option value="balance">Balance</option>
                  <option value="invoice">Invoice</option>
                  <option value="payout">Payout</option>
                </select>
                <Input name="amountCents" type="number" placeholder="Amount (cents)" required className="w-36" />
                <Button type="submit" size="sm" disabled={pending}>Add payment</Button>
              </form>
              <p className="text-xs text-muted-foreground">Stripe-ready architecture — connect Stripe to process payments automatically.</p>
              <ul className="space-y-2">
                {payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium capitalize">{p.payment_type.replace("_", " ")}</p>
                      <p className="text-xs capitalize text-muted-foreground">{p.status}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums font-medium">{formatCents(p.amount_cents)}</span>
                      {p.status === "pending" ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            startTransition(async () => {
                              const r = await markCrmPaymentPaidAction({
                                orgId, paymentId: p.id, bookingId: booking.id,
                              });
                              if (!r.ok) toast.error(r.error);
                              else router.refresh();
                            });
                          }}
                        >
                          Mark paid
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="marketing" className="mt-6 space-y-6">
          <ChecklistSection
            title="Marketing Checklist"
            items={marketingItems}
            orgId={orgId}
            bookingId={booking.id}
            onToggle={(itemId, completed) => {
              startTransition(async () => {
                const r = await toggleCrmChecklistItemAction({ orgId, itemId, bookingId: booking.id, completed });
                if (!r.ok) toast.error(r.error);
                else router.refresh();
              });
            }}
          />
          <ChecklistSection
            title="Performance Checklist"
            items={performanceItems}
            orgId={orgId}
            bookingId={booking.id}
            onToggle={(itemId, completed) => {
              startTransition(async () => {
                const r = await toggleCrmChecklistItemAction({ orgId, itemId, bookingId: booking.id, completed });
                if (!r.ok) toast.error(r.error);
                else router.refresh();
              });
            }}
          />
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <Card className="glass-panel border-white/10">
            <CardHeader><CardTitle className="text-base">Activity Timeline</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {activities.map((a) => (
                  <li key={a.id} className="relative border-l-2 border-primary/30 pl-4">
                    <p className="text-sm font-medium">{a.title}</p>
                    {a.body ? <p className="text-xs text-muted-foreground">{a.body}</p> : null}
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {format(new Date(a.created_at), "MMM d, yyyy · h:mm a")}
                    </p>
                  </li>
                ))}
                {activities.length === 0 ? (
                  <li className="text-sm text-muted-foreground">No activity yet.</li>
                ) : null}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files" className="mt-6">
          <Card className="glass-panel border-white/10">
            <CardHeader><CardTitle className="text-base">Files</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Upload contracts, marketing assets, press kits, and invoices via the agency attachments bucket.
                File uploads integrate with your existing agency storage.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ChecklistSection({
  title,
  items,
  onToggle,
}: {
  title: string;
  items: CrmChecklistItem[];
  orgId: string;
  bookingId: string;
  onToggle: (itemId: string, completed: boolean) => void;
}) {
  const done = items.filter((i) => i.completed).length;
  return (
    <Card className="glass-panel border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          {title}
          <span className="text-xs font-normal text-muted-foreground">{done}/{items.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={item.completed}
                onChange={(e) => onToggle(item.id, e.target.checked)}
                className="size-4 rounded border-input accent-primary"
              />
              <span className={item.completed ? "text-sm text-muted-foreground line-through" : "text-sm"}>
                {item.label}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
