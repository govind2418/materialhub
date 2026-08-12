import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { getCurrentDbUser } from "@/lib/current-user";
import { SiteHeader } from "@/components/site-header";
import { ProductCard } from "@/components/product-card";

type Answers = {
  projectType?: string;
  areaType?: string;
  budget?: string;
  aesthetic?: string;
  fireRequired?: string;
  maintenance?: string;
};

const AESTHETIC_KEYWORDS: Record<string, string[]> = {
  warm: ["oak", "walnut", "jute", "warm"],
  modern: ["grey", "gloss", "steel", "linear", "modern"],
  textured: ["textured", "chevron", "embosh", "fluted", "distressed"],
  minimal: ["plain", "matte", "fine sanded", "minimal"],
};

const HIGH_MOISTURE_AREAS = ["bathroom", "kitchen", "exterior", "balcony"];

function scoreProduct(
  p: {
    pricePerSheet: number | null;
    category: string | null;
    finish: string | null;
    collection: string | null;
    woodSpecie: string | null;
    fireRating: string | null;
    moistureResistance: string | null;
    maintenanceLevel: string | null;
  },
  answers: Answers
) {
  const reasons: string[] = [];
  let score = 0;

  if (answers.budget) {
    const max = Number.parseInt(answers.budget, 10);
    if (!Number.isNaN(max) && p.pricePerSheet != null) {
      if (p.pricePerSheet <= max) {
        score += 1;
        reasons.push(`fits your ₹${max.toLocaleString("en-IN")} budget`);
      }
    }
  }

  if (answers.aesthetic) {
    const keywords = AESTHETIC_KEYWORDS[answers.aesthetic] ?? [];
    const haystack = [p.category, p.finish, p.collection, p.woodSpecie]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (keywords.some((k) => haystack.includes(k))) {
      score += 1;
      reasons.push(`matches your ${answers.aesthetic} aesthetic`);
    }
  }

  if (answers.fireRequired === "yes") {
    if (p.fireRating) {
      score += 1;
      reasons.push("has a fire rating on file");
    }
  }

  if (answers.areaType && HIGH_MOISTURE_AREAS.includes(answers.areaType)) {
    if (p.moistureResistance?.toLowerCase() === "high") {
      score += 1;
      reasons.push(`suited to moisture exposure in a ${answers.areaType}`);
    }
  }

  if (answers.maintenance && p.maintenanceLevel) {
    if (p.maintenanceLevel.toLowerCase() === answers.maintenance.toLowerCase()) {
      score += 1;
      reasons.push(`matches your ${answers.maintenance.toLowerCase()}-maintenance preference`);
    }
  }

  return { score, reasons };
}

export default async function DecisionAssistantPage({
  searchParams,
}: {
  searchParams: Promise<Answers & { submitted?: string }>;
}) {
  const user = await getCurrentDbUser();
  if (!user) redirect("/onboarding");
  if (user.role !== "architect") redirect("/manufacturer");

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

    suggestions = (scored.length > 0 ? scored : allProducts.map((p) => ({ product: p, score: 0, reasons: [] })))
      .slice(0, 5)
      .map((s) => ({ product: s.product, reasons: s.reasons }));
  }

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <Link href="/architect" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Back to dashboard
        </Link>
        <h1 className="mt-4 text-2xl font-semibold">Material decision assistant</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Answer a few questions and we&apos;ll suggest 3-5 materials that fit — rule-based
          filtering against the catalog, not AI.
        </p>

        <form action="/architect/decision-assistant" method="GET" className="mt-8 grid gap-4 rounded-xl border border-neutral-200 bg-white p-6 sm:grid-cols-2">
          <input type="hidden" name="submitted" value="1" />

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700">Project type</span>
            <select
              name="projectType"
              defaultValue={answers.projectType ?? ""}
              className="rounded-lg border border-neutral-300 px-3 py-2"
            >
              <option value="">Any</option>
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
              <option value="hospitality">Hospitality</option>
              <option value="healthcare">Healthcare</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700">Area type</span>
            <select
              name="areaType"
              defaultValue={answers.areaType ?? ""}
              className="rounded-lg border border-neutral-300 px-3 py-2"
            >
              <option value="">Any</option>
              <option value="bathroom">Bathroom</option>
              <option value="kitchen">Kitchen</option>
              <option value="living">Living area</option>
              <option value="exterior">Exterior</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700">Budget per sheet (₹, max)</span>
            <input
              type="number"
              name="budget"
              min="0"
              defaultValue={answers.budget ?? ""}
              placeholder="e.g. 1300"
              className="rounded-lg border border-neutral-300 px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700">Aesthetic preference</span>
            <select
              name="aesthetic"
              defaultValue={answers.aesthetic ?? ""}
              className="rounded-lg border border-neutral-300 px-3 py-2"
            >
              <option value="">Any</option>
              <option value="warm">Warm &amp; natural</option>
              <option value="modern">Modern &amp; sleek</option>
              <option value="textured">Bold &amp; textured</option>
              <option value="minimal">Minimal</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700">Maintenance commitment</span>
            <select
              name="maintenance"
              defaultValue={answers.maintenance ?? ""}
              className="rounded-lg border border-neutral-300 px-3 py-2"
            >
              <option value="">Any</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </label>

          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input
              type="checkbox"
              name="fireRequired"
              value="yes"
              defaultChecked={answers.fireRequired === "yes"}
              className="h-4 w-4"
            />
            <span className="text-neutral-700">Requires fire-rated materials</span>
          </label>

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-terracotta-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-terracotta-600"
            >
              Get suggestions
            </button>
          </div>
        </form>

        {hasAnswers && (
          <section className="mt-10">
            <h2 className="mb-4 text-lg font-semibold">Suggested materials</h2>
            {suggestions.length === 0 ? (
              <p className="rounded-xl border border-dashed border-neutral-300 px-6 py-16 text-center text-sm text-neutral-500">
                No products in the catalog yet.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
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
                      {reasons.length > 0
                        ? `Matches: ${reasons.join(", ")}.`
                        : "General suggestion — no specific criteria matched yet."}
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
