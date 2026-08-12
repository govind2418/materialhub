import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { SiteHeader } from "@/components/site-header";

export default async function GuideDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const guide = await db.query.guides.findFirst({
    where: (g, { eq }) => eq(g.slug, slug),
  });
  if (!guide || !guide.published) notFound();

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <Link href="/learn" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Back to guides
        </Link>
        {guide.category && (
          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-terracotta-600">
            {guide.category}
          </p>
        )}
        <h1 className="mt-1 text-2xl font-semibold">{guide.title}</h1>
        {guide.summary && <p className="mt-2 text-sm text-neutral-500">{guide.summary}</p>}
        <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
          {guide.content}
        </div>
      </main>
    </div>
  );
}
