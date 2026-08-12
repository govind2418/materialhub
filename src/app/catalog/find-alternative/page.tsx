import Link from "next/link";
import { db } from "@/db";
import { SiteHeader } from "@/components/site-header";
import { ProductCard } from "@/components/product-card";

type Answers = {
  referenceName?: string;
  category?: string;
  finish?: string;
  woodSpecie?: string;
  maxBudget?: string;
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1);
}

function scoreProduct(
  p: {
    category: string | null;
    finish: string | null;
    woodSpecie: string | null;
    collection: string | null;
    name: string;
    pricePerSheet: number | null;
  },
  answers: Answers
) {
  const reasons: string[] = [];
  let score = 0;

  const haystack = [p.category, p.finish, p.woodSpecie, p.collection, p.name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (answers.category?.trim()) {
    const tokens = tokenize(answers.category);
    if (tokens.some((t) => haystack.includes(t))) {
      score += 1;
      reasons.push(`matches category "${answers.category.trim()}"`);
    }
  }

  if (answers.finish?.trim()) {
    const tokens = tokenize(answers.finish);
    if (tokens.some((t) => haystack.includes(t))) {
      score += 1;
      reasons.push(`similar finish to "${answers.finish.trim()}"`);
    }
  }

  if (answers.woodSpecie?.trim()) {
    const tokens = tokenize(answers.woodSpecie);
    if (tokens.some((t) => haystack.includes(t))) {
      score += 1;
      reasons.push(`similar wood specie / material to "${answers.woodSpecie.trim()}"`);
    }
  }

  if (answers.maxBudget?.trim()) {
    const max = Number.parseInt(answers.maxBudget, 10);
    if (!Number.isNaN(max) && p.pricePerSheet != null && p.pricePerSheet <= max) {
      score += 1;
      reasons.push(`fits your ₹${max.toLocaleString("en-IN")} budget`);
    }
  }

  return { score, reasons };
}

export default async function FindAlternativePage({
  searchParams,
}: {
  searchParams: Promise<Answers & { submitted?: string }>;
}) {
  const answers = await searchParams;
  const hasAnswers = answers.submitted === "1";

  let suggestions: {
    product: Awaited<ReturnType<typeof db.query.products.findMany>>[number];
    reasons: string[];
  }[] = [];

  if (hasAnswers) {
    const allProducts = await db.query.products.findMany();
    const scored = allProducts
      .map((p) => ({ product: p, ...scoreProduct(p, answers) }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);

    suggestions = scored.slice(0, 8).map((s) => ({ product: s.product, reasons: s.reasons }));
  }

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <Link href="/catalog" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Back to catalog
        </Link>
        <h1 className="mt-4 text-2xl font-semibold">Find an Indian alternative</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Describe a foreign or reference material and we&apos;ll match it against Indian
          manufacturers already on MaterialOS — attribute matching, not a trained model.
        </p>

        <form
          action="/catalog/find-alternative"
          method="GET"
          className="mt-8 grid gap-4 rounded-xl border border-neutral-200 bg-white p-6 sm:grid-cols-2"
        >
          <input type="hidden" name="submitted" value="1" />

          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium text-neutral-700">Reference product name (optional)</span>
            <input
              name="referenceName"
              defaultValue={answers.referenceName ?? ""}
              placeholder="e.g. Formica Oak Veneer 8830"
              className="rounded-lg border border-neutral-300 px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700">Category</span>
            <input
              name="category"
              defaultValue={answers.category ?? ""}
              placeholder="e.g. veneer, laminate"
              className="rounded-lg border border-neutral-300 px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700">Finish</span>
            <input
              name="finish"
              defaultValue={answers.finish ?? ""}
              placeholder="e.g. matte, textured oak"
              className="rounded-lg border border-neutral-300 px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700">Wood specie / material</span>
            <input
              name="woodSpecie"
              defaultValue={answers.woodSpecie ?? ""}
              placeholder="e.g. walnut, oak"
              className="rounded-lg border border-neutral-300 px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700">Max budget per sheet (₹)</span>
            <input
              type="number"
              name="maxBudget"
              min="0"
              defaultValue={answers.maxBudget ?? ""}
              placeholder="e.g. 1500"
              className="rounded-lg border border-neutral-300 px-3 py-2"
            />
          </label>

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-terracotta-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-terracotta-600"
            >
              Find alternatives
            </button>
          </div>
        </form>

        {hasAnswers && (
          <section className="mt-10">
            <h2 className="mb-4 text-lg font-semibold">
              {answers.referenceName ? `Alternatives to "${answers.referenceName}"` : "Closest matches"}
            </h2>
            {suggestions.length === 0 ? (
              <p className="rounded-xl border border-dashed border-neutral-300 px-6 py-16 text-center text-sm text-neutral-500">
                No close matches yet — try fewer or broader criteria (e.g. just category and
                finish).
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {suggestions.map(({ product: p, reasons }) => (
                  <div key={p.id}>
                    <ProductCard
                      slug={p.slug}
                      name={p.name}
                      code={p.code}
                      imageUrl={p.imageUrl}
                      collection={p.collection}
                      verificationStatus={p.verificationStatus}
                      pricePerSheet={p.pricePerSheet}
                    />
                    <p className="mt-2 text-xs text-neutral-500">
                      {reasons.length > 0 ? `Matches: ${reasons.join(", ")}.` : "Partial match."}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
