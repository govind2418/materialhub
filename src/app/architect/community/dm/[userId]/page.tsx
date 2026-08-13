import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentDbUser } from "@/lib/current-user";
import { getLatestMembership, isMembershipActive, isUserPremiumActive } from "@/lib/premium";
import { markDmThreadRead } from "@/lib/unread";
import { db } from "@/db";
import { SiteHeader } from "@/components/site-header";
import { AutoRefresh } from "@/components/auto-refresh";
import { sendDirectMessage } from "../../dm-actions";

export const metadata: Metadata = {
  title: "Direct message — Architect Circle",
};

export const dynamic = "force-dynamic";

export default async function DirectMessagePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId: partnerId } = await params;
  const user = await getCurrentDbUser();
  if (!user) redirect("/onboarding");
  if (user.role !== "architect") redirect("/manufacturer");

  const membership = await getLatestMembership(user.id);
  if (!isMembershipActive(membership)) redirect("/architect/premium");

  if (partnerId === user.id) redirect("/architect/community?tab=direct");

  const partner = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, partnerId) });
  if (!partner) notFound();
  if (!(await isUserPremiumActive(partnerId))) {
    redirect("/architect/community?tab=direct");
  }

  const thread = await db.query.directMessages.findMany({
    where: (d, { or, and, eq }) =>
      or(
        and(eq(d.senderId, user.id), eq(d.recipientId, partnerId)),
        and(eq(d.senderId, partnerId), eq(d.recipientId, user.id))
      ),
    orderBy: (d, { asc }) => asc(d.createdAt),
  });

  await markDmThreadRead(user.id, partnerId);

  return (
    <div className="flex min-h-full flex-col">
      <AutoRefresh />
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-10">
        <Link href="/architect/community?tab=direct" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Direct messages
        </Link>
        <div className="mt-4 flex items-center gap-2">
          <h1 className="text-2xl font-semibold">{partner.name ?? "Architect"}</h1>
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
            Premium
          </span>
        </div>
        {partner.companyName && <p className="mt-0.5 text-sm text-neutral-500">{partner.companyName}</p>}

        <div className="mt-4 flex-1 overflow-y-auto rounded-xl border border-neutral-200 bg-white p-4">
          {thread.length === 0 ? (
            <p className="py-10 text-center text-sm text-neutral-400">
              No messages yet — say hello to {partner.name ?? "them"}.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {thread.map((m) => {
                const isMe = m.senderId === user.id;
                return (
                  <div key={m.id} className={isMe ? "text-right" : "text-left"}>
                    <p className="text-xs font-medium text-neutral-400">
                      {new Date(m.createdAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
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

        <form action={sendDirectMessage} className="mt-4 flex flex-wrap items-center gap-2">
          <input type="hidden" name="recipientId" value={partnerId} />
          <input
            type="text"
            name="message"
            maxLength={2000}
            placeholder={`Message ${partner.name ?? "them"}...`}
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
      </main>
    </div>
  );
}
