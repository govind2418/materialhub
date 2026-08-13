import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentDbUser } from "@/lib/current-user";
import { getLatestMembership, isMembershipActive } from "@/lib/premium";
import { db } from "@/db";
import { SiteHeader } from "@/components/site-header";
import { AutoRefresh } from "@/components/auto-refresh";
import { postCommunityMessage } from "../community-actions";

export const metadata: Metadata = {
  title: "Architect Circle",
  description: "Live discussion room for Architect Circle premium members.",
};

export default async function CommunityPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/onboarding");
  if (user.role !== "architect") redirect("/manufacturer");

  const membership = await getLatestMembership(user.id);
  if (!isMembershipActive(membership)) redirect("/architect/premium");

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
        <p className="mt-1 text-sm text-neutral-500">
          One shared room for every Architect Circle member. Updates automatically every few
          seconds.
        </p>

        <div className="mt-6 flex-1 overflow-y-auto rounded-xl border border-neutral-200 bg-white p-4">
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
                      {author?.name ?? "Unknown"}
                      {author?.companyName && ` · ${author.companyName}`}
                      <span className="ml-2 text-neutral-400">
                        {new Date(m.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </p>
                    <p
                      className={`mt-1 inline-block max-w-[85%] rounded-xl px-3 py-2 text-left text-sm ${
                        isMe ? "bg-amber-600 text-white" : "bg-neutral-100 text-neutral-800"
                      }`}
                    >
                      {m.message}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <form action={postCommunityMessage} className="mt-4 flex gap-2">
          <input
            type="text"
            name="message"
            required
            maxLength={2000}
            placeholder="Share something with the circle..."
            className="min-w-0 flex-1 rounded-full border border-neutral-300 px-4 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-full bg-amber-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-700"
          >
            Send
          </button>
        </form>
      </main>
    </div>
  );
}
