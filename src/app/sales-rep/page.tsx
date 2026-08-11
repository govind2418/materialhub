import { redirect } from "next/navigation";
import { db } from "@/db";
import { getCurrentDbUser } from "@/lib/current-user";
import { SiteHeader } from "@/components/site-header";
import { updateLeadStatus } from "./actions";

export default async function SalesRepDashboard() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/onboarding");
  if (user.role !== "sales_rep") redirect("/");

  const manufacturer = await db.query.manufacturers.findFirst({
    where: (m, { eq }) => eq(m.ownerUserId, user.id),
  });

  const leads = manufacturer
    ? await db.query.enquiries.findMany({
        where: (e, { eq }) => eq(e.manufacturerId, manufacturer.id),
        orderBy: (e, { desc }) => desc(e.createdAt),
      })
    : [];

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-semibold">Leads &amp; follow-ups</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Enquiries for {manufacturer?.name ?? "your company"}.
        </p>

        <div className="mt-8">
          {leads.length === 0 ? (
            <p className="rounded-xl border border-dashed border-neutral-300 px-6 py-16 text-center text-sm text-neutral-500">
              No leads yet.
            </p>
          ) : (
            <div className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
              {leads.map((e) => (
                <div key={e.id} className="flex items-start justify-between gap-4 p-4">
                  <div>
                    {e.message && <p className="text-sm">{e.message}</p>}
                    <p className="mt-1 text-xs text-neutral-400">
                      {new Date(e.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <form action={updateLeadStatus} className="flex items-center gap-2">
                    <input type="hidden" name="enquiryId" value={e.id} />
                    <select
                      name="status"
                      defaultValue={e.status}
                      className="rounded-full border border-neutral-300 px-2.5 py-1 text-xs font-medium"
                    >
                      <option value="new">New</option>
                      <option value="responded">Responded</option>
                      <option value="closed">Closed</option>
                    </select>
                    <button
                      type="submit"
                      className="rounded-full border border-neutral-300 px-2.5 py-1 text-xs font-medium hover:border-neutral-500"
                    >
                      Save
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
