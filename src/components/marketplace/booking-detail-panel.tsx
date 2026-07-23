"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  completeBookingAction,
  respondBookingAction,
  sendBookingMessageAction,
  submitMarketplaceReviewAction,
} from "@/lib/actions/marketplace";
import { creatorCategoryLabel } from "@/lib/constants/creator-marketplace";
import { formatCents } from "@/lib/format";
import type { BookingDetail } from "@/lib/types/marketplace";

export function BookingDetailPanel({
  booking,
  userId,
}: {
  booking: BookingDetail;
  userId: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewBody, setReviewBody] = useState("");
  const [payLoading, setPayLoading] = useState(false);

  const isCreator = booking.creatorUserId === userId;

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const result = await sendBookingMessageAction({ bookingId: booking.id, body: message.trim() });
    if (!result.ok) toast.error(result.error);
    else {
      setMessage("");
      router.refresh();
    }
  }

  async function acceptBooking(accept: boolean) {
    const result = await respondBookingAction({
      bookingId: booking.id,
      accept,
      agreedPriceCents: booking.agreedPriceCents ?? undefined,
    });
    if (!result.ok) toast.error(result.error);
    else router.refresh();
  }

  async function pay() {
    setPayLoading(true);
    try {
      const res = await fetch("/api/stripe/marketplace-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) toast.error(data.error ?? "Checkout failed");
      else window.location.href = data.url;
    } finally {
      setPayLoading(false);
    }
  }

  async function markComplete() {
    const result = await completeBookingAction({ bookingId: booking.id });
    if (!result.ok) toast.error(result.error);
    else router.refresh();
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    const result = await submitMarketplaceReviewAction({
      bookingId: booking.id,
      rating: reviewRating,
      body: reviewBody.trim(),
    });
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Review submitted");
      router.refresh();
    }
  }

  return (
    <div className="space-y-8">
      <div className="glass-panel rounded-xl p-6">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">{booking.status.replace(/_/g, " ")}</p>
        <h1 className="mt-1 text-2xl font-bold">{booking.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {creatorCategoryLabel(booking.serviceCategory)} · Artist: {booking.artistName} · Creator:{" "}
          {booking.creatorName}
        </p>
        {booking.brief ? <p className="mt-4 text-sm whitespace-pre-wrap">{booking.brief}</p> : null}
        {booking.agreedPriceCents ? (
          <p className="mt-4 font-semibold">{formatCents(booking.agreedPriceCents, booking.currency)}</p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          {isCreator && booking.status === "pending" ? (
            <>
              <Button onClick={() => acceptBooking(true)}>Accept</Button>
              <Button variant="outline" onClick={() => acceptBooking(false)}>
                Decline
              </Button>
            </>
          ) : null}
          {booking.canPay ? (
            <Button onClick={pay} disabled={payLoading}>
              Pay with Stripe
            </Button>
          ) : null}
          {booking.status === "paid" ? (
            <Button variant="outline" onClick={markComplete}>
              Mark completed
            </Button>
          ) : null}
        </div>
      </div>

      <section className="glass-panel rounded-xl p-4">
        <h2 className="font-semibold">Messages</h2>
        <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto text-sm">
          {booking.messages.map((m) => {
            const mine = m.senderId === userId;
            return (
              <li
                key={m.id}
                className={`rounded-lg px-3 py-2 ${mine ? "ml-8 bg-primary/15" : "mr-8 bg-white/5"}`}
              >
                {m.body}
              </li>
            );
          })}
        </ul>
        <form onSubmit={sendMessage} className="mt-3 flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message about this booking…"
            className="bg-background/50"
          />
          <Button type="submit">Send</Button>
        </form>
      </section>

      {booking.canReview ? (
        <section className="glass-panel rounded-xl p-6">
          <h2 className="font-semibold">Leave a review</h2>
          <form onSubmit={submitReview} className="mt-3 space-y-3">
            <Input
              type="number"
              min={1}
              max={5}
              value={reviewRating}
              onChange={(e) => setReviewRating(Number(e.target.value))}
            />
            <Textarea
              value={reviewBody}
              onChange={(e) => setReviewBody(e.target.value)}
              placeholder="How was working with this creator?"
              className="bg-background/50"
            />
            <Button type="submit">Submit review</Button>
          </form>
        </section>
      ) : null}
      {booking.hasReview ? (
        <p className="text-sm text-muted-foreground">Review submitted — thank you.</p>
      ) : null}
    </div>
  );
}
