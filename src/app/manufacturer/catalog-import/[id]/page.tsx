import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { getCurrentDbUser } from "@/lib/current-user";
import { SiteHeader } from "@/components/site-header";
import { importExtractedProducts } from "../../catalog-import-actions";

export default async function CatalogImportReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentDbUser();
  if (!user) redirect("/onboarding");
  if (user.role !== "manufacturer") redirect("/architect");

  const manufacturer = await db.query.manufacturers.findFirst({
    where: (m, { eq }) => eq(m.ownerUserId, user.id),
  });

  const extraction = await db.query.catalogExtractions.findFirst({
    where: (e, { eq }) => eq(e.id, id),
  });
  if (!extraction || !manufacturer || extraction.manufacturerId !== manufacturer.id) notFound();

  const rows = extraction.extractedProducts;

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <Link href="/manufacturer" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Back to dashboard
        </Link>
        <h1 className="mt-4 text-2xl font-semibold">Review extracted catalog</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {extraction.filename ?? "Uploaded catalog"} — AI found {rows.length} product
          {rows.length === 1 ? "" : "s"}. Only fields actually printed in the catalog were
          filled in; uncheck anything that looks wrong before importing. Imported products get a
          placeholder image — upload real photos afterward from your dashboard.
        </p>

        {rows.length === 0 ? (
          <p className="mt-8 rounded-xl border border-dashed border-neutral-300 px-6 py-16 text-center text-sm text-neutral-500">
            No products could be extracted from this file. Try a clearer scan or a different
            format.
          </p>
        ) : (
          <form action={importExtractedProducts} className="mt-8">
            <input type="hidden" name="extractionId" value={extraction.id} />
            <div className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
              {rows.map((p, idx) => (
                <label key={idx} className="flex items-start gap-3 p-4">
                  <input
                    type="checkbox"
                    name="include"
                    value={idx}
                    defaultChecked
                    className="mt-1 h-4 w-4"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-neutral-900">
                      {p.name}
                      {p.code && <span className="ml-2 text-xs text-neutral-500">{p.code}</span>}
                    </p>
                    <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-neutral-500">
                      {p.category && <span>Category: {p.category}</span>}
                      {p.collection && <span>Collection: {p.collection}</span>}
                      {p.woodSpecie && <span>Wood: {p.woodSpecie}</span>}
                      {p.veneerThickness && <span>Thickness: {p.veneerThickness}</span>}
                      {p.base && <span>Base: {p.base}</span>}
                      {p.finish && <span>Finish: {p.finish}</span>}
                      {p.flexibility && <span>Flexibility: {p.flexibility}</span>}
                      {p.weightPerPanel && <span>Weight: {p.weightPerPanel}</span>}
                      {p.panelSizes && p.panelSizes.length > 0 && (
                        <span>Sizes: {p.panelSizes.join(", ")}</span>
                      )}
                      {p.pricePerSheet != null && <span>₹{p.pricePerSheet.toLocaleString("en-IN")}/sheet</span>}
                      {p.certifications && p.certifications.length > 0 && (
                        <span>Certs: {p.certifications.join(", ")}</span>
                      )}
                      {p.fireRating && <span>Fire: {p.fireRating}</span>}
                      {p.moistureResistance && <span>Moisture: {p.moistureResistance}</span>}
                      {p.maintenanceLevel && <span>Maintenance: {p.maintenanceLevel}</span>}
                    </dl>
                  </div>
                </label>
              ))}
            </div>
            <button
              type="submit"
              className="mt-4 rounded-lg bg-terracotta-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-terracotta-600"
            >
              Import selected products
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
