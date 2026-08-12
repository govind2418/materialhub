import { redirect } from "next/navigation";
import { db } from "@/db";
import { getCurrentDbUser } from "@/lib/current-user";
import { enquiryTypeLabel } from "@/lib/enquiry-labels";
import { SiteHeader } from "@/components/site-header";
import { EnquiryDetails } from "@/components/enquiry-details";
import { markLeadContacted, updateLeadStatus, updateSampleStatus } from "./actions";

export default async function SalesRepDashboard() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/onboarding");
  if (user.role !== "sales_rep") redirect("/");

  const leads = await db.query.enquiries.findMany({
    where: (e, { eq }) => eq(e.assignedSalesRepUserId, user.id),
    orderBy: (e, { desc }) => desc(e.createdAt),
  });

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-semibold">Leads &amp; follow-ups</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Leads assigned to you.
        </p>

        <div className="mt-8">
          {leads.length === 0 ? (
            <p className="rounded-xl border border-dashed border-neutral-300 px-6 py-16 text-center text-sm text-neutral-500">
              No leads assigned to you yet.
            </p>
          ) : (
            <div className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
              {leads.map((e) => (
                <div key={e.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div>
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
                      {enquiryTypeLabel(e.type)}
                    </span>
                    {e.message && <p className="mt-1 text-sm">{e.message}</p>}
                    <p className="mt-1 text-xs text-neutral-400">
                      {new Date(e.createdAt).toLocaleDateString()}
                      {e.lastContactedAt &&
                        ` · Last contacted ${new Date(e.lastContactedAt).toLocaleDateString()}`}
                    </p>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-medium text-terracotta-600 hover:text-terracotta-700">
                        View details
                      </summary>
                      <div className="mt-2 max-w-md rounded-lg bg-neutral-50 p-3">
                        <EnquiryDetails enquiryId={e.id} />
                      </div>
                    </details>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <form action={markLeadContacted}>
                      <input type="hidden" name="enquiryId" value={e.id} />
                      <button
                        type="submit"
                        className="rounded-full border border-neutral-300 px-2.5 py-1 text-xs font-medium hover:border-terracotta-400 hover:text-terracotta-600"
                      >
                        Mark contacted
                      </button>
                    </form>
                    {e.type === "sample_request" && (
                      <form action={updateSampleStatus} className="flex items-center gap-2">
                        <input type="hidden" name="enquiryId" value={e.id} />
                        <select
                          name="sampleStatus"
                          defaultValue={e.sampleStatus ?? "requested"}
                          className="rounded-full border border-neutral-300 px-2.5 py-1 text-xs font-medium"
                        >
                          <option value="requested">Requested</option>
                          <option value="dispatched">Dispatched</option>
                          <option value="delivered">Delivered</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                        </select>
                        <button
                          type="submit"
                          className="rounded-full border border-neutral-300 px-2.5 py-1 text-xs font-medium hover:border-terracotta-400 hover:text-terracotta-600"
                        >
                          Save
                        </button>
                      </form>
                    )}
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
                        className="rounded-full border border-neutral-300 px-2.5 py-1 text-xs font-medium hover:border-terracotta-400 hover:text-terracotta-600"
                      >
                        Save
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
