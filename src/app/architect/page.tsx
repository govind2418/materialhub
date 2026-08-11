import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { getCurrentDbUser } from "@/lib/current-user";
import { SiteHeader } from "@/components/site-header";
import { removeFromMoodBoard } from "./actions";

export default async function ArchitectDashboard() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/onboarding");
  if (user.role !== "architect") redirect("/manufacturer");

  const board = await db.query.moodBoards.findFirst({
    where: (b, { eq }) => eq(b.architectUserId, user.id),
  });

  const items = board
    ? await db.query.moodBoardItems.findMany({
        where: (i, { eq }) => eq(i.moodBoardId, board.id),
        orderBy: (i, { desc }) => desc(i.createdAt),
      })
    : [];

  const products = await Promise.all(
    items.map((i) =>
      db.query.products.findFirst({ where: (p, { eq }) => eq(p.id, i.productId) })
    )
  );

  const myEnquiries = await db.query.enquiries.findMany({
    where: (e, { eq }) => eq(e.architectUserId, user.id),
    orderBy: (e, { desc }) => desc(e.createdAt),
  });

  const manufacturersById = new Map(
    (await db.query.manufacturers.findMany()).map((m) => [m.id, m])
  );

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-semibold">Welcome, {user.name}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Your mood board and enquiries.
        </p>

        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">My Mood Board</h2>
            <Link href="/catalog" className="text-sm font-medium text-neutral-500 hover:text-neutral-900">
              Browse catalog →
            </Link>
          </div>

          {products.filter(Boolean).length === 0 ? (
            <p className="rounded-xl border border-dashed border-neutral-300 px-6 py-10 text-center text-sm text-neutral-500">
              No products saved yet. Browse the catalog and add products to your mood board.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((item, idx) => {
                const p = products[idx];
                if (!p) return null;
                return (
                  <div key={item.id} className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
                    <Link href={`/catalog/${p.slug}`} className="relative block aspect-square w-full bg-neutral-100">
                      <Image src={p.imageUrl} alt={p.name} fill className="object-cover" />
                    </Link>
                    <div className="flex items-center justify-between p-3">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <form action={removeFromMoodBoard}>
                        <input type="hidden" name="itemId" value={item.id} />
                        <button className="text-xs text-neutral-400 hover:text-red-600">Remove</button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-14">
          <h2 className="mb-4 text-lg font-semibold">Enquiries sent</h2>
          {myEnquiries.length === 0 ? (
            <p className="rounded-xl border border-dashed border-neutral-300 px-6 py-10 text-center text-sm text-neutral-500">
              No enquiries yet.
            </p>
          ) : (
            <div className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
              {myEnquiries.map((e) => (
                <div key={e.id} className="flex items-start justify-between gap-4 p-4">
                  <div>
                    <p className="text-sm font-medium">
                      {manufacturersById.get(e.manufacturerId)?.name}
                    </p>
                    {e.message && <p className="mt-1 text-sm text-neutral-500">{e.message}</p>}
                  </div>
                  <span className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600">
                    {e.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
