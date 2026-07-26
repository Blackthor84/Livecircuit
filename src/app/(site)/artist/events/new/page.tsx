import type { Metadata } from "next";
import { CreateEventForm } from "@/components/artist/create-event-form";
import { requireRoles } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Create event" };

export default async function NewEventPage() {
  await requireRoles(["artist", "admin"], "/register?role=artist");

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Create event</h1>
      <p className="mt-2 text-muted-foreground">
        Schedule a standalone live performance. A published tour stop and ticketed event will be
        created automatically so you can go live when ready.
      </p>
      <CreateEventForm />
    </div>
  );
}
