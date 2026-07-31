import type { Metadata } from "next";
import { ContactEmailCards } from "@/components/contact/contact-email-cards";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with LiveCircuit for artist bookings, applications, partnerships, and sponsorship opportunities.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <p className="text-sm font-medium uppercase tracking-widest text-primary">Contact</p>
      <h1 className="mt-4 text-4xl font-bold tracking-tight">Get in touch</h1>
      <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
        Whether you want to perform on {APP_NAME} or explore a partnership, our team is here to help.
      </p>
      <section className="mt-12" aria-labelledby="contact-options-heading">
        <h2 id="contact-options-heading" className="sr-only">
          Contact options
        </h2>
        <ContactEmailCards />
      </section>
    </div>
  );
}
