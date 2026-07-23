import type { Metadata } from "next";
import { LocalBusinessHub } from "@/components/local-business/local-business-hub";
import { getLocalBusinessHub } from "@/lib/data/local-business";

export const metadata: Metadata = { title: "Local businesses" };

export default async function LocalBusinessPage() {
  const report = await getLocalBusinessHub();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <LocalBusinessHub report={report} />
    </div>
  );
}
