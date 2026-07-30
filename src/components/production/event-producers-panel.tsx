"use client";

import { useState } from "react";
import { Copy, Link2, Mail, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  generateProducerLinkAction,
  inviteProducerEmailAction,
  inviteProducerUserAction,
  removeProducerAction,
  updateProducerPermissionsAction,
} from "@/lib/actions/producers";
import type { EventProducerRow } from "@/lib/data/producers";
import {
  ALL_PRODUCER_PERMISSIONS,
  PRODUCER_LABEL_OPTIONS,
  PRODUCER_STAFF_ROLES,
  type ProducerLabel,
  type ProducerPermissions,
  type ProducerStaffRole,
} from "@/lib/production/types";

export function EventProducersPanel({
  eventId,
  initialProducers,
}: {
  eventId: string;
  initialProducers: EventProducerRow[];
}) {
  const [producers, setProducers] = useState(initialProducers);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [staffRole, setStaffRole] = useState<ProducerStaffRole>("assistant_producer");
  const [producerLabel, setProducerLabel] = useState<ProducerLabel>("manager");
  const [loading, setLoading] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  async function inviteUser() {
    setLoading("user");
    const result = await inviteProducerUserAction({
      eventId,
      username,
      staffRole,
      producerLabel,
    });
    setLoading(null);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Producer invited");
      setUsername("");
      window.location.reload();
    }
  }

  async function inviteEmail() {
    setLoading("email");
    const result = await inviteProducerEmailAction({ eventId, email, staffRole, producerLabel });
    setLoading(null);
    if (!result.ok) toast.error(result.error);
    else {
      setInviteUrl(result.inviteUrl ?? null);
      toast.success("Email invite created");
      setEmail("");
    }
  }

  async function generateLink() {
    setLoading("link");
    const result = await generateProducerLinkAction({ eventId, staffRole, producerLabel });
    setLoading(null);
    if (!result.ok) toast.error(result.error);
    else {
      setInviteUrl(result.inviteUrl ?? null);
      toast.success("Producer link generated");
    }
  }

  async function removeProducer(id: string) {
    const result = await removeProducerAction(id, eventId);
    if (!result.ok) toast.error(result.error);
    else {
      setProducers((prev) => prev.filter((p) => p.id !== id));
      toast.success("Producer removed");
    }
  }

  async function togglePermission(producer: EventProducerRow, key: keyof ProducerPermissions) {
    const next = {
      ...(producer.permissions as ProducerPermissions),
      [key]: !(producer.permissions as ProducerPermissions)[key],
    };
    const result = await updateProducerPermissionsAction({
      producerId: producer.id,
      eventId,
      permissions: next,
    });
    if (!result.ok) toast.error(result.error);
    else {
      setProducers((prev) =>
        prev.map((p) => (p.id === producer.id ? { ...p, permissions: next } : p))
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Select value={staffRole} onValueChange={(v) => setStaffRole(v as ProducerStaffRole)}>
          <SelectTrigger>
            <SelectValue placeholder="Staff role" />
          </SelectTrigger>
          <SelectContent>
            {PRODUCER_STAFF_ROLES.map((role) => (
              <SelectItem key={role.value} value={role.value}>
                {role.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={producerLabel} onValueChange={(v) => setProducerLabel(v as ProducerLabel)}>
          <SelectTrigger>
            <SelectValue placeholder="Label" />
          </SelectTrigger>
          <SelectContent>
            {PRODUCER_LABEL_OPTIONS.map((label) => (
              <SelectItem key={label.value} value={label.value}>
                {label.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Invite existing user</Label>
        <div className="flex gap-2">
          <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@username" />
          <Button type="button" disabled={loading === "user"} onClick={() => void inviteUser()}>
            <UserPlus className="size-4" />
            Invite
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Invite by email</Label>
        <div className="flex gap-2">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="producer@email.com" type="email" />
          <Button type="button" variant="outline" disabled={loading === "email"} onClick={() => void inviteEmail()}>
            <Mail className="size-4" />
            Send
          </Button>
        </div>
      </div>

      <Button type="button" variant="secondary" disabled={loading === "link"} onClick={() => void generateLink()}>
        <Link2 className="size-4" />
        Generate producer link
      </Button>

      {inviteUrl ? (
        <div className="flex flex-wrap gap-2 rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
          <code className="break-all text-xs">{inviteUrl}</code>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              void navigator.clipboard.writeText(inviteUrl);
              toast.success("Link copied");
            }}
          >
            <Copy className="size-4" />
            Copy
          </Button>
        </div>
      ) : null}

      <ul className="space-y-4">
        {producers.map((producer) => (
          <li key={producer.id} className="rounded-xl border border-white/10 bg-card/50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">
                  {producer.profiles?.display_name ??
                    producer.profiles?.username ??
                    producer.email ??
                    "Pending invite"}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge variant="outline">{producer.staff_role}</Badge>
                  <Badge variant="secondary">{producer.producer_label}</Badge>
                  <Badge>{producer.status}</Badge>
                </div>
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={() => void removeProducer(producer.id)}>
                Remove
              </Button>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {ALL_PRODUCER_PERMISSIONS.map((perm) => (
                <label key={perm.key} className="flex items-center gap-2 text-xs">
                  <Checkbox
                    checked={(producer.permissions as ProducerPermissions)[perm.key] === true}
                    onCheckedChange={() =>
                      void togglePermission(producer, perm.key as keyof ProducerPermissions)
                    }
                  />
                  {perm.label}
                </label>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
