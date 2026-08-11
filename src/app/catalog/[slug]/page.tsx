import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { getCurrentDbUser } from "@/lib/current-user";
import { SiteHeader } from "@/components/site-header";
import { addToMoodBoard, sendEnquiry } from "./actions";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const product = await db.query.products.findFirst({
    where: (p, { eq }) => eq(p.slug, slug),
  });

  if (!product) notFound();

  await db
    .update(products)
    .set({ viewCount: sql`${products.viewCount} + 1` })
    .where(eq(products.id, product.id));

  const manufacturer = await db.query.manufacturers.findFirst({
    where: (m, { eq }) => eq(m.id, product.manufacturerId),
  });

  const user = await getCurrentDbUser();
  const isArchitect = user?.role === "architect";

  const specs: [string, string | null][] = [
    ["Code", product.code],
    ["Collection", product.collection],
    ["Wood specie", product.woodSpecie],
    ["Thickness", product.veneerThickness],
    ["Base", product.base],
    ["Finish", product.finish],
    ["Weight per panel", product.weightPerPanel],
    ["Flexibility", product.flexibility],
    ["Panel sizes", product.panelSizes?.join(", ") ?? null],
    ["Certifications", product.certifications?.join(", ") ?? null],
  ];

  async function addAction() {
    "use server";
    await addToMoodBoard(product!.id);
  }

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <Link href="/catalog" className="text-sm text-neutral-500 hover:text-neutral-900">
        ← Back to catalog
      </Link>

      <div className="mt-4 grid gap-10 md:grid-cols-2">
        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-neutral-100">
          <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
        </div>

        <div>
          <p className="text-sm font-medium text-neutral-500">{manufacturer?.name}</p>
          <h1 className="mt-1 text-2xl font-semibold">{product.name}</h1>

          <dl className="mt-6 divide-y divide-neutral-200 border-y border-neutral-200 text-sm">
            {specs
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="flex justify-between py-2.5">
                  <dt className="text-neutral-500">{k}</dt>
                  <dd className="font-medium text-neutral-900">{v}</dd>
                </div>
              ))}
          </dl>

          {product.installationGuideUrl && (
            <a
              href={product.installationGuideUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-sm font-medium text-terracotta-600 hover:text-terracotta-700"
            >
              Installation guide ↗
            </a>
          )}

          <div className="mt-6 flex flex-col gap-3">
            {isArchitect ? (
              <>
                <form action={addAction}>
                  <button
                    type="submit"
                    className="w-full rounded-lg border border-terracotta-500 px-4 py-2.5 text-sm font-medium text-terracotta-700 hover:bg-terracotta-500 hover:text-white"
                  >
                    Add to Mood Board
                  </button>
                </form>

                <form action={sendEnquiry} className="flex flex-col gap-2">
                  <input type="hidden" name="productId" value={product.id} />
                  <textarea
                    name="message"
                    placeholder={`Ask ${manufacturer?.name} about pricing, samples, or lead time...`}
                    rows={3}
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-terracotta-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-terracotta-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-terracotta-600"
                  >
                    Send Enquiry
                  </button>
                </form>
              </>
            ) : user ? (
              <p className="text-sm text-neutral-500">
                Sign in as an architect to add this to a mood board or send an enquiry.
              </p>
            ) : (
              <Link
                href="/sign-in"
                className="w-full rounded-lg bg-terracotta-500 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-terracotta-600"
              >
                Sign in to enquire
              </Link>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
