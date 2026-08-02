"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, Search, Star } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createCrmContactAction } from "@/lib/actions/agency-crm";
import { CRM_CONTACT_TYPES, crmContactTypeLabel } from "@/lib/agency/crm-constants";
import type { CrmContact } from "@/lib/agency/crm-types";

export function AgencyCrmContactsPanel({
  orgId,
  contacts: initialContacts,
  initialSearch = "",
}: {
  orgId: string;
  contacts: CrmContact[];
  initialSearch?: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [showCreate, setShowCreate] = useState(false);
  const [filterType, setFilterType] = useState("");
  const [pending, startTransition] = useTransition();

  const filtered = initialContacts.filter((c) => {
    if (filterType && c.contact_type !== filterType) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search contacts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          className="rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">All types</option>
          {CRM_CONTACT_TYPES.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
        <Button onClick={() => setShowCreate((v) => !v)} className="gap-1.5">
          <Plus className="size-4" />
          Add Contact
        </Button>
      </div>

      {showCreate ? (
        <form
          className="glass-panel grid gap-3 rounded-xl border border-white/10 p-4 sm:grid-cols-2 lg:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const r = await createCrmContactAction({
                orgId,
                name: String(fd.get("name")),
                contactType: String(fd.get("contactType") || "other"),
                company: String(fd.get("company") || "") || undefined,
                email: String(fd.get("email") || "") || undefined,
                phone: String(fd.get("phone") || "") || undefined,
                website: String(fd.get("website") || "") || undefined,
                notes: String(fd.get("notes") || "") || undefined,
              });
              if (!r.ok) toast.error(r.error);
              else {
                toast.success("Contact created");
                setShowCreate(false);
                router.refresh();
              }
            });
          }}
        >
          <Input name="name" placeholder="Full name *" required />
          <select name="contactType" className="rounded-md border border-input bg-transparent px-3 py-2 text-sm">
            {CRM_CONTACT_TYPES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
          <Input name="company" placeholder="Company" />
          <Input name="email" type="email" placeholder="Email" />
          <Input name="phone" placeholder="Phone" />
          <Input name="website" placeholder="Website" />
          <Input name="notes" placeholder="Notes" className="sm:col-span-2 lg:col-span-3" />
          <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
            <Button type="submit" disabled={pending}>Create contact</Button>
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </form>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((contact) => (
          <ContactCard key={contact.id} contact={contact} />
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="glass-panel border-white/10">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No contacts match your filters. Add brands, sponsors, managers, venues, and talent buyers to build your network.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function ContactCard({ contact }: { contact: CrmContact }) {
  return (
    <Card className="glass-panel border-white/10 transition-all duration-150 hover:border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{contact.name}</CardTitle>
          <Badge variant="outline" className="shrink-0 text-[10px]">
            {crmContactTypeLabel(contact.contact_type)}
          </Badge>
        </div>
        {contact.company ? (
          <p className="text-sm text-muted-foreground">{contact.company}</p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {contact.email ? <p className="text-muted-foreground">{contact.email}</p> : null}
        {contact.phone ? <p className="text-muted-foreground">{contact.phone}</p> : null}
        <div className="flex items-center gap-1.5 pt-1">
          <Star className="size-3.5 text-amber-400" />
          <span className="text-xs tabular-nums">{contact.relationship_score}/100</span>
        </div>
        {contact.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1 pt-1">
            {contact.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
            ))}
          </div>
        ) : null}
        {contact.notes ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">{contact.notes}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
