import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRoles } from "@/lib/auth/guards";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { STREAMING_ACADEMY } from "@/lib/streaming/studio/academy-content";

export const metadata: Metadata = {
  title: "Artist Streaming Academy",
  description: "Guides for camera, audio, lighting, and going live on LiveCircuit.",
};

export default async function StreamingAcademyPage() {
  await requireRoles(["artist", ...ADMIN_ROLES], "/register?role=artist");

  const grouped = {
    "getting-started": STREAMING_ACADEMY.filter((a) => a.category === "getting-started"),
    hardware: STREAMING_ACADEMY.filter((a) => a.category === "hardware"),
    performance: STREAMING_ACADEMY.filter((a) => a.category === "performance"),
    platform: STREAMING_ACADEMY.filter((a) => a.category === "platform"),
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center gap-3">
        <GraduationCap className="size-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Artist Streaming Academy</h1>
          <p className="text-muted-foreground">
            Everything you need to look and sound great before every livestream.
          </p>
        </div>
      </div>

      {Object.entries(grouped).map(([category, articles]) =>
        articles.length ? (
          <section key={category} className="mb-10">
            <h2 className="mb-4 text-lg font-semibold capitalize">{category.replace("-", " ")}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {articles.map((article) => (
                <Link key={article.slug} href={`/artist/streaming-academy/${article.slug}`}>
                  <Card className="h-full transition hover:ring-primary/30">
                    <CardHeader>
                      <CardTitle>{article.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{article.summary}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ) : null
      )}
    </div>
  );
}
