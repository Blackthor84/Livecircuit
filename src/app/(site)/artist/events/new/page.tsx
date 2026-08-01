import type { Metadata } from "next";
import { CreateEventForm } from "@/components/artist/create-event-form";
import { requireRoles } from "@/lib/auth/guards";
import { ADMIN_ROLES } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Create tour stop" };

export default async function NewEventPage() {
  await requireRoles(["artist", ...ADMIN_ROLES], "/register?role=artist");

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Add a tour stop</h1>
      <p className="mt-2 text-muted-foreground">
        Quick path: schedule a single stop and we&apos;ll create a published tour route automatically.
        For multi-city tours, use{" "}
        <a href="/artist/tours/new" className="text-primary hover:underline">
          Create tour
        </a>{" "}
        instead — that&apos;s the primary way to build on LiveCircuit.
      </p>
      <CreateEventForm />
    </div>
  );
}
