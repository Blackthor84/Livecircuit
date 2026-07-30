import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { requireRoles } from "@/lib/auth/guards";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { getAcademyArticle } from "@/lib/streaming/studio/academy-content";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getAcademyArticle(slug);
  return { title: article?.title ?? "Streaming Academy" };
}

export default async function StreamingAcademyArticlePage({ params }: Props) {
  await requireRoles(["artist", ...ADMIN_ROLES], "/register?role=artist");

  const { slug } = await params;
  const article = getAcademyArticle(slug);
  if (!article) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Button variant="ghost" size="sm" href="/artist/streaming-academy">
        ← Streaming Academy
      </Button>
      <h1 className="mt-4 text-3xl font-bold">{article.title}</h1>
      <p className="mt-2 text-muted-foreground">{article.summary}</p>
      <div className="prose prose-invert mt-8 max-w-none space-y-8">
        {article.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-xl font-semibold">{section.heading}</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">{section.body}</p>
          </section>
        ))}
      </div>
      <div className="mt-10 rounded-xl border border-white/10 bg-card/50 p-4 text-sm">
        <p>
          Ready to test your setup? Open{" "}
          <Link href="/artist/dashboard" className="text-primary hover:underline">
            Pre-Show Studio
          </Link>{" "}
          from any upcoming event.
        </p>
      </div>
    </article>
  );
}
