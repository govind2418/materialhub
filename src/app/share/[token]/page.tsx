import Image from "next/image";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { setApprovalStatus } from "./actions";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  alternative_requested: "Alternative requested",
};

export default async function SharedProjectPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const project = await db.query.projects.findFirst({
    where: (p, { eq }) => eq(p.shareToken, token),
  });
  if (!project) notFound();

  const board = await db.query.moodBoards.findFirst({
    where: (b, { eq }) => eq(b.projectId, project.id),
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

  return (
    <div className="flex min-h-full flex-col bg-neutral-50">
      <header className="border-b border-neutral-200 bg-neutral-50 px-6 py-4">
        <p className="font-serif text-xl font-semibold text-neutral-900">MaterialOS</p>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-semibold">{project.name}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Review the shortlisted products below and mark each as approved, rejected, or
          request an alternative.
        </p>

        {items.length === 0 ? (
          <p className="mt-8 rounded-xl border border-dashed border-neutral-300 px-6 py-16 text-center text-sm text-neutral-500">
            No products in this shortlist yet.
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, idx) => {
              const p = products[idx];
              if (!p) return null;
              return (
                <div key={item.id} className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
                  <div className="relative aspect-square w-full bg-neutral-100">
                    <Image src={p.imageUrl} alt={p.name} fill className="object-cover" />
                  </div>
                  <div className="p-4">
                    <p className="font-medium">{p.name}</p>
                    <p className="mt-0.5 text-xs text-neutral-500">{p.code}</p>
                    <span
                      className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
                        item.approvalStatus === "approved"
                          ? "bg-green-50 text-green-700"
                          : item.approvalStatus === "rejected"
                            ? "bg-red-50 text-red-700"
                            : item.approvalStatus === "alternative_requested"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      {STATUS_LABEL[item.approvalStatus]}
                    </span>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {(["approved", "rejected", "alternative_requested"] as const).map((s) => (
                        <form key={s} action={setApprovalStatus}>
                          <input type="hidden" name="token" value={token} />
                          <input type="hidden" name="itemId" value={item.id} />
                          <input type="hidden" name="status" value={s} />
                          <button
                            type="submit"
                            disabled={item.approvalStatus === s}
                            className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:border-terracotta-400 hover:text-terracotta-600 disabled:cursor-default disabled:border-terracotta-500 disabled:bg-terracotta-500 disabled:text-white"
                          >
                            {s === "approved" ? "Approve" : s === "rejected" ? "Reject" : "Request alternative"}
                          </button>
                        </form>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
