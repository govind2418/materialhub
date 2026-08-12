import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { getCurrentDbUser } from "@/lib/current-user";
import { SiteHeader } from "@/components/site-header";
import { removeFromCart, submitCartOrder, updateCartQuantity } from "./actions";

export default async function CartPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/onboarding");
  if (user.role !== "architect") redirect("/");

  const items = await db.query.cartItems.findMany({
    where: (c, { eq }) => eq(c.userId, user.id),
    orderBy: (c, { desc }) => desc(c.createdAt),
  });

  const products = await Promise.all(
    items.map((i) => db.query.products.findFirst({ where: (p, { eq }) => eq(p.id, i.productId) }))
  );

  const manufacturerIds = Array.from(
    new Set(products.filter(Boolean).map((p) => p!.manufacturerId))
  );
  const manufacturers = manufacturerIds.length
    ? await db.query.manufacturers.findMany({
        where: (m, { inArray }) => inArray(m.id, manufacturerIds),
      })
    : [];
  const manufacturersById = new Map(manufacturers.map((m) => [m.id, m]));

  const rows = items
    .map((item, idx) => ({ item, product: products[idx] }))
    .filter((r) => r.product);

  const total = rows.reduce(
    (sum, r) => sum + (r.product!.pricePerSheet ?? 0) * r.item.quantity,
    0
  );

  const manufacturerCount = new Set(rows.map((r) => r.product!.manufacturerId)).size;

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-semibold">Cart</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {rows.length} product{rows.length === 1 ? "" : "s"} — this places an order request
          with the manufacturer(s), not an online payment.
        </p>

        {rows.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-neutral-300 px-6 py-16 text-center text-sm text-neutral-500">
            <p>Your cart is empty.</p>
            <Link
              href="/catalog"
              className="mt-3 inline-block rounded-full bg-terracotta-500 px-4 py-2 text-xs font-medium text-white hover:bg-terracotta-600"
            >
              Browse catalog
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-8 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
              {rows.map(({ item, product: p }) => (
                <div key={item.id} className="flex items-center gap-4 p-4">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                    <Image src={p!.imageUrl} alt={p!.name} fill className="object-cover" />
                  </div>
                  <div className="flex-1">
                    <Link href={`/catalog/${p!.slug}`} className="text-sm font-medium hover:text-terracotta-600">
                      {p!.name}
                    </Link>
                    <p className="text-xs text-neutral-500">
                      {manufacturersById.get(p!.manufacturerId)?.name} · ₹{p!.pricePerSheet ?? "—"}/sheet
                    </p>
                  </div>
                  <form action={updateCartQuantity} className="flex items-center gap-2">
                    <input type="hidden" name="itemId" value={item.id} />
                    <input
                      type="number"
                      name="quantity"
                      min="1"
                      defaultValue={item.quantity}
                      className="w-16 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
                    />
                    <button
                      type="submit"
                      className="rounded-full border border-neutral-300 px-2.5 py-1 text-xs font-medium hover:border-terracotta-400 hover:text-terracotta-600"
                    >
                      Update
                    </button>
                  </form>
                  <p className="w-20 shrink-0 text-right text-sm font-medium">
                    ₹{((p!.pricePerSheet ?? 0) * item.quantity).toLocaleString("en-IN")}
                  </p>
                  <form action={removeFromCart}>
                    <input type="hidden" name="itemId" value={item.id} />
                    <button className="text-xs text-neutral-400 hover:text-red-600">Remove</button>
                  </form>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-100 p-5">
              <div>
                <p className="text-sm text-neutral-600">
                  Total ({rows.reduce((s, r) => s + r.item.quantity, 0)} sheets, {manufacturerCount}{" "}
                  manufacturer{manufacturerCount === 1 ? "" : "s"})
                </p>
                <p className="text-xl font-semibold">₹{total.toLocaleString("en-IN")}</p>
              </div>
              <form action={submitCartOrder}>
                <button
                  type="submit"
                  className="rounded-lg bg-terracotta-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-terracotta-600"
                >
                  Submit order request
                </button>
              </form>
            </div>
            {manufacturerCount > 1 && (
              <p className="mt-2 text-xs text-neutral-400">
                Your cart spans {manufacturerCount} manufacturers — this will be split into
                separate order requests, one per manufacturer.
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
