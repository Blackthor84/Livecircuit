"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createCrmBookingAction,
  updateCrmBookingStageAction,
} from "@/lib/actions/agency-crm";
import {
  CRM_PIPELINE_STAGES,
  crmStageLabel,
  type CrmPipelineStageId,
} from "@/lib/agency/crm-constants";
import type { CrmBooking } from "@/lib/agency/crm-types";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";

export function AgencyCrmPipelinePanel({
  orgId,
  bookings: initialBookings,
  artists,
}: {
  orgId: string;
  bookings: CrmBooking[];
  artists: { artist_id: string; stage_name: string }[];
}) {
  const router = useRouter();
  const [bookings, setBookings] = useState(initialBookings);
  const [search, setSearch] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (!search.trim()) return bookings;
    const q = search.toLowerCase();
    return bookings.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.contact_name?.toLowerCase().includes(q) ||
        b.artists?.stage_name?.toLowerCase().includes(q)
    );
  }, [bookings, search]);

  const columns = useMemo(
    () =>
      CRM_PIPELINE_STAGES.map((stage) => ({
        ...stage,
        bookings: filtered.filter((b) => b.stage === stage.id),
      })),
    [filtered]
  );

  function handleDragStart(e: React.DragEvent, bookingId: string) {
    setDraggingId(bookingId);
    e.dataTransfer.setData("text/plain", bookingId);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDrop(e: React.DragEvent, stage: CrmPipelineStageId) {
    e.preventDefault();
    const bookingId = e.dataTransfer.getData("text/plain") || draggingId;
    if (!bookingId) return;

    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking || booking.stage === stage) {
      setDraggingId(null);
      return;
    }

    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, stage } : b))
    );
    setDraggingId(null);

    startTransition(async () => {
      const result = await updateCrmBookingStageAction({ orgId, bookingId, stage });
      if (!result.ok) {
        toast.error(result.error);
        setBookings(initialBookings);
      } else {
        toast.success(`Moved to ${crmStageLabel(stage)}`);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search bookings, artists, contacts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setShowCreate((v) => !v)} className="gap-1.5">
          <Plus className="size-4" />
          New Booking
        </Button>
      </div>

      {showCreate ? (
        <form
          className="glass-panel grid gap-3 rounded-xl border border-white/10 p-4 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const result = await createCrmBookingAction({
                orgId,
                title: String(fd.get("title")),
                artistId: String(fd.get("artistId") || "") || undefined,
                contactName: String(fd.get("contactName") || "") || undefined,
                contactEmail: String(fd.get("contactEmail") || "") || undefined,
                projectedRevenueCents: Number(fd.get("projectedRevenueCents") || 0),
              });
              if (!result.ok) toast.error(result.error);
              else {
                toast.success("Booking created");
                setShowCreate(false);
                router.refresh();
              }
            });
          }}
        >
          <Input name="title" placeholder="Event name *" required />
          <select name="artistId" className="rounded-md border border-input bg-transparent px-3 py-2 text-sm">
            <option value="">Select artist</option>
            {artists.map((a) => (
              <option key={a.artist_id} value={a.artist_id}>{a.stage_name}</option>
            ))}
          </select>
          <Input name="contactName" placeholder="Contact name" />
          <Input name="contactEmail" type="email" placeholder="Contact email" />
          <Input name="projectedRevenueCents" type="number" placeholder="Projected revenue (cents)" className="sm:col-span-2" />
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={pending}>Create booking</Button>
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </form>
      ) : null}

      <div className="flex gap-3 overflow-x-auto pb-4">
        {columns.map((col) => (
          <div
            key={col.id}
            className={cn(
              "min-w-[260px] max-w-[280px] flex-shrink-0 rounded-xl border border-white/10 bg-white/[0.02] transition-colors",
              draggingId && "ring-1 ring-primary/20"
            )}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            <div className="sticky top-0 z-10 rounded-t-xl border-b border-white/5 bg-card/80 px-3 py-2.5 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-2">
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", col.color)}>
                  {col.label}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">{col.bookings.length}</span>
              </div>
            </div>
            <ul className="space-y-2 p-2">
              {col.bookings.map((booking) => (
                <li
                  key={booking.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, booking.id)}
                  onDragEnd={() => setDraggingId(null)}
                  className={cn(
                    "cursor-grab rounded-lg border border-white/10 bg-background/60 p-3 text-sm shadow-sm transition-all duration-150 active:cursor-grabbing",
                    draggingId === booking.id && "scale-[0.98] opacity-50",
                    "hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
                  )}
                >
                  <Link href={`/agency/crm/bookings/${booking.id}`} className="block space-y-1.5">
                    <p className="font-medium leading-snug">{booking.title}</p>
                    {booking.artists?.stage_name ? (
                      <p className="text-xs text-muted-foreground">{booking.artists.stage_name}</p>
                    ) : null}
                    {booking.contact_name ? (
                      <p className="text-xs text-muted-foreground">{booking.contact_name}</p>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {booking.projected_revenue_cents > 0 ? (
                        <span className="text-xs tabular-nums text-primary">
                          {formatCents(booking.projected_revenue_cents)}
                        </span>
                      ) : null}
                      {booking.starts_at ? (
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(booking.starts_at), "MMM d")}
                        </span>
                      ) : null}
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {booking.priority}
                      </Badge>
                    </div>
                  </Link>
                </li>
              ))}
              {col.bookings.length === 0 ? (
                <li className="rounded-lg border border-dashed border-white/10 px-3 py-6 text-center text-xs text-muted-foreground">
                  Drop bookings here
                </li>
              ) : null}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
