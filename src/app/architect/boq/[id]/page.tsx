import Image from "next/image";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { getCurrentDbUser } from "@/lib/current-user";
import { SiteHeader } from "@/components/site-header";
import { generateRfqFromBoq } from "../../boq-actions";

export default async function BoqReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentDbUser();
  if (!user) redirect("/onboarding");
  if (user.role !== "architect") redirect("/manufacturer");

  const upload = await db.query.boqUploads.findFirst({
    where: (u, { eq }) => eq(u.id, id),
  });
  if (!upload || upload.architectUserId !== user.id) notFound();

  const matchedProductIds = upload.rows
    .map((r) => r.matchedProductId)
    .filter((id): id is string => !!id);
  const matchedProducts = matchedProductIds.length
    ? await db.query.products.findMany({
        where: (p, { inArray }) => inArray(p.id, matchedProductIds),
      })
    : [];
  const productsById = new Map(matchedProducts.map((p) => [p.id, p]));

  const mappedCount = upload.rows.filter((r) => r.matchedProductId).length;

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <Link href="/architect" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Back to dashboard
        </Link>
        <h1 className="mt-4 text-2xl font-semibold">BOQ review</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {upload.filename ?? "Uploaded file"} · {mappedCount} of {upload.rows.length} line items
          matched to catalog products via text matching.
        </p>

        <div className="mt-8 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
          {upload.rows.map((row, i) => {
            const product = row.matchedProductId ? productsById.get(row.matchedProductId) : null;
            return (
              <div key={i} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.description}</p>
                  <p className="text-xs text-neutral-500">Qty: {row.quantity}</p>
                </div>
                {product ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="relative h-10 w-10 overflow-hidden rounded bg-neutral-100">
                      <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-neutral-900">{product.name}</p>
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">
                        Matched
                      </span>
                    </div>
                  </div>
                ) : (
                  <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                    Unmapped
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {mappedCount > 0 ? (
          <form action={generateRfqFromBoq} className="mt-6">
            <input type="hidden" name="uploadId" value={upload.id} />
            <button
              type="submit"
              className="rounded-lg bg-terracotta-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-terracotta-600"
            >
              Generate RFQ from {mappedCount} matched item{mappedCount === 1 ? "" : "s"}
            </button>
          </form>
        ) : (
          <p className="mt-6 rounded-lg border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-500">
            No line items matched — try a BOQ with clearer material descriptions (category,
            finish, wood specie).
          </p>
        )}
      </main>
    </div>
  );
}
