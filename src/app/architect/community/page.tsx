import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentDbUser } from "@/lib/current-user";
import { getLatestMembership, isMembershipActive, getActivePremiumMembers } from "@/lib/premium";
import { db } from "@/db";
import { SiteHeader } from "@/components/site-header";
import { AutoRefresh } from "@/components/auto-refresh";
import { postCommunityMessage } from "../community-actions";

export const metadata: Metadata = {
  title: "Architect Circle",
  description: "Live discussion room for Architect Circle premium members.",
};

export const dynamic = "force-dynamic";

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const user = await getCurrentDbUser();
  if (!user) redirect("/onboarding");
  if (user.role !== "architect") redirect("/manufacturer");

  const membership = await getLatestMembership(user.id);
  if (!isMembershipActive(membership)) redirect("/architect/premium");

  const activeTab = tab === "direct" ? "direct" : "group";

  const recentMessages = await db.query.communityMessages.findMany({
    orderBy: (m, { desc }) => desc(m.createdAt),
    limit: 100,
  });
  const authorIds = [...new Set(recentMessages.map((m) => m.userId))];
  const authors = authorIds.length
    ? await db.query.users.findMany({ where: (u, { inArray }) => inArray(u.id, authorIds) })
    : [];
  const authorById = new Map(authors.map((a) => [a.id, a]));
  const messages = [...recentMessages].reverse();

  let dmThreads: { partnerId: string; name: string; company: string | null; preview: string; createdAt: Date }[] = [];
  let browseMembers: { id: string; name: string | null; companyName: string | null }[] = [];

  if (activeTab === "direct") {
    const allDms = await db.query.directMessages.findMany({
      where: (d, { or, eq }) => or(eq(d.senderId, user.id), eq(d.recipientId, user.id)),
      orderBy: (d, { desc }) => desc(d.createdAt),
    });
    const latestByPartner = new Map<string, (typeof allDms)[number]>();
    for (const d of allDms) {
      const partnerId = d.senderId === user.id ? d.recipientId : d.senderId;
      if (!latestByPartner.has(partnerId)) latestByPartner.set(partnerId, d);
    }
    const partnerIds = [...latestByPartner.keys()];
    const partners = partnerIds.length
      ? await db.query.users.findMany({ where: (u, { inArray }) => inArray(u.id, partnerIds) })
      : [];
    const partnerById = new Map(partners.map((p) => [p.id, p]));
    dmThreads = partnerIds
      .map((id) => {
        const dm = latestByPartner.get(id)!;
        const partner = partnerById.get(id);
        return {
          partnerId: id,
          name: partner?.name ?? "Unknown",
          company: partner?.companyName ?? null,
          preview: dm.mediaUrl && !dm.message ? "📷 Photo" : (dm.message ?? ""),
          createdAt: dm.createdAt,
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const active = await getActivePremiumMembers(user.id);
    browseMembers = active
      .filter((m) => !latestByPartner.has(m.id))
      .map((m) => ({ id: m.id, name: m.name, companyName: m.companyName }));
  }

  return (
    <div className="flex min-h-full flex-col">
      <AutoRefresh />
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-10">
        <Link href="/architect" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Back to dashboard
        </Link>
        <div className="mt-4 flex items-center gap-2">
          <h1 className="text-2xl font-semibold">✦ Architect Circle</h1>
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
            Premium
          </span>
        </div>

        <div className="mt-5 flex gap-1 rounded-full bg-neutral-100 p-1 text-sm font-medium">
          <Link
            href="/architect/community"
            className={`flex-1 rounded-full px-4 py-2 text-center ${
              activeTab === "group" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"
            }`}
          >
            Group
          </Link>
          <Link
            href="/architect/community?tab=direct"
            className={`flex-1 rounded-full px-4 py-2 text-center ${
              activeTab === "direct" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"
            }`}
          >
            Direct messages
          </Link>
        </div>

        {activeTab === "group" ? (
          <>
            <p className="mt-3 text-sm text-neutral-500">
              One shared room for every Architect Circle member. Tap a name to message them
              privately. Updates automatically every few seconds.
            </p>

            <div className="mt-4 flex-1 overflow-y-auto rounded-xl border border-neutral-200 bg-white p-4">
              {messages.length === 0 ? (
                <p className="py-10 text-center text-sm text-neutral-400">
                  No messages yet — say hello to the circle.
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {messages.map((m) => {
                    const author = authorById.get(m.userId);
                    const isMe = m.userId === user.id;
                    return (
                      <div key={m.id} className={isMe ? "text-right" : "text-left"}>
                        <p className="text-xs font-medium text-neutral-500">
                          {isMe ? (
                            author?.name ?? "You"
                          ) : (
                            <Link
                              href={`/architect/community/dm/${m.userId}`}
                              className="hover:text-amber-700 hover:underline"
                            >
                              {author?.name ?? "Unknown"}
                            </Link>
                          )}
                          {author?.companyName && ` · ${author.companyName}`}
                          <span className="ml-2 text-neutral-400">
                            {new Date(m.createdAt).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </p>
                        <div
                          className={`mt-1 inline-block max-w-[85%] rounded-xl px-3 py-2 text-left text-sm ${
                            isMe ? "bg-amber-600 text-white" : "bg-neutral-100 text-neutral-800"
                          }`}
                        >
                          {m.mediaUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={m.mediaUrl}
                              alt="Shared photo"
                              className="max-h-64 rounded-lg object-cover"
                            />
                          )}
                          {m.message && <p className={m.mediaUrl ? "mt-2" : ""}>{m.message}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <form action={postCommunityMessage} className="mt-4 flex flex-wrap items-center gap-2">
              <input
                type="text"
                name="message"
                maxLength={2000}
                placeholder="Share something with the circle..."
                className="min-w-0 flex-1 rounded-full border border-neutral-300 px-4 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
              />
              <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-2.5 text-xs font-medium text-neutral-600 hover:border-amber-400">
                📷
                <input type="file" name="photo" accept="image/*" className="hidden" />
              </label>
              <button
                type="submit"
                className="rounded-full bg-amber-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-700"
              >
                Send
              </button>
            </form>
          </>
        ) : (
          <div className="mt-4">
            {dmThreads.length > 0 && (
              <div className="rounded-xl border border-neutral-200 bg-white">
                {dmThreads.map((t) => (
                  <Link
                    key={t.partnerId}
                    href={`/architect/community/dm/${t.partnerId}`}
                    className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3 last:border-0 hover:bg-neutral-50"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-900">{t.name}</p>
                      <p className="truncate text-xs text-neutral-500">
                        {t.company && `${t.company} · `}
                        {t.preview || "…"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {browseMembers.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Start a new conversation
                </p>
                <div className="mt-2 rounded-xl border border-neutral-200 bg-white">
                  {browseMembers.map((m) => (
                    <Link
                      key={m.id}
                      href={`/architect/community/dm/${m.id}`}
                      className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3 last:border-0 hover:bg-neutral-50"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-neutral-900">{m.name ?? "Unknown"}</p>
                        {m.companyName && <p className="truncate text-xs text-neutral-500">{m.companyName}</p>}
                      </div>
                      <span className="shrink-0 text-xs font-medium text-amber-700">Message →</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {dmThreads.length === 0 && browseMembers.length === 0 && (
              <p className="py-10 text-center text-sm text-neutral-400">
                No other Architect Circle members yet.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
