"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TicketScanner() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    valid: boolean;
    checkedIn?: boolean;
    tier?: string;
    eventTitle?: string | null;
    artistName?: string | null;
    error?: string;
  } | null>(null);

  async function verify() {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch(`/api/tickets/verify?code=${encodeURIComponent(code.trim())}`);
      const data = await response.json();
      setResult(data);
    } catch {
      toast.error("Could not verify ticket");
    } finally {
      setLoading(false);
    }
  }

  async function checkIn() {
    setLoading(true);
    try {
      const response = await fetch("/api/tickets/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Check-in failed");
      toast.success(data.alreadyCheckedIn ? "Already checked in" : "Fan checked in");
      await verify();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Check-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ticket-code">Ticket QR code</Label>
        <Input
          id="ticket-code"
          placeholder="Paste ticket code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={loading || !code.trim()} onClick={() => void verify()}>
          Verify
        </Button>
        <Button type="button" disabled={loading || !code.trim()} onClick={() => void checkIn()}>
          Check in fan
        </Button>
      </div>
      {result ? (
        <div className="rounded-lg border border-white/10 bg-card/50 p-3 text-sm">
          {!result.valid ? (
            <p className="text-destructive">{result.error ?? "Invalid ticket"}</p>
          ) : (
            <>
              <p className="font-medium">{result.eventTitle ?? "Valid ticket"}</p>
              <p className="text-muted-foreground">
                {result.artistName ?? "Artist"} · {result.tier?.toUpperCase() ?? "GENERAL"}
              </p>
              <p className="mt-1 text-muted-foreground">
                {result.checkedIn ? "Already checked in" : "Not checked in yet"}
              </p>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
