import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentDbUser } from "@/lib/current-user";
import { getLatestMembership, isMembershipActive, PREMIUM_MONTHLY_AMOUNT } from "@/lib/premium";
import { buildUpiIntentUrl, buildUpiQrDataUrl } from "@/lib/upi";
import { SiteHeader } from "@/components/site-header";
import { UpiPaymentBlock } from "@/components/upi-payment-block";
import { requestPremiumMembership } from "../premium-actions";

export const metadata: Metadata = {
  title: "Architect Circle — Premium Membership",
  description: "Join Architect Circle: a verified, private community of architects on MaterialOS.",
};

const PERKS = [
  "Live Architect Circle chat — one shared room with every premium architect on the platform",
  "A verified premium badge on your public profile",
  "Priority visibility to manufacturers and sales reps you contact",
];

export default async function PremiumMembershipPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/onboarding");
  if (user.role !== "architect") redirect("/manufacturer");

  const membership = await getLatestMembership(user.id);
  const active = isMembershipActive(membership);
  const pending = membership?.status === "pending";

  let payment: { amount: number; upiUrl: string; qrDataUrl: string } | null = null;
  if (pending && membership) {
    const upiUrl = buildUpiIntentUrl({
      amount: membership.amount,
      note: `MaterialOS Architect Circle ${membership.id.slice(0, 8)}`,
    });
    if (upiUrl) {
      payment = { amount: membership.amount, upiUrl, qrDataUrl: await buildUpiQrDataUrl(upiUrl) };
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <Link href="/architect" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Back to dashboard
        </Link>

        <div className="mt-4 rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50 via-white to-amber-50 p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">
            ✦ Architect Circle
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-neutral-900">
            A private, verified community — just for architects.
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            ₹{PREMIUM_MONTHLY_AMOUNT.toLocaleString("en-IN")}/month
          </p>

          <ul className="mt-6 flex flex-col gap-3">
            {PERKS.map((perk) => (
              <li key={perk} className="flex items-start gap-2 text-sm text-neutral-700">
                <span className="mt-0.5 text-amber-600">✦</span>
                {perk}
              </li>
            ))}
          </ul>

          <div className="mt-8">
            {active && membership ? (
              <div className="rounded-xl border border-green-300 bg-green-50 p-4">
                <p className="text-sm font-medium text-green-800">
                  ✓ You&apos;re an Architect Circle member
                </p>
                <p className="mt-1 text-xs text-green-700">
                  {membership.expiresAt &&
                    `Active until ${new Date(membership.expiresAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}.`}
                </p>
                <Link
                  href="/architect/community"
                  className="mt-3 inline-block rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
                >
                  Open Architect Circle chat →
                </Link>
              </div>
            ) : pending && payment ? (
              <div>
                <p className="mb-3 text-sm font-medium text-neutral-800">
                  Membership requested — pay to activate:
                </p>
                <UpiPaymentBlock payment={payment} />
                <p className="mt-3 text-xs text-neutral-500">
                  We&apos;ll confirm your payment and activate your membership within a day —
                  there&apos;s no automated payment gateway, so this is checked manually.
                </p>
              </div>
            ) : membership?.status === "rejected" ? (
              <div>
                <p className="mb-3 text-sm text-red-700">
                  Your last request wasn&apos;t approved. You can request again below.
                </p>
                <form action={requestPremiumMembership}>
                  <button
                    type="submit"
                    className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-700"
                  >
                    Request Architect Circle membership
                  </button>
                </form>
              </div>
            ) : membership?.status === "expired" ? (
              <div>
                <p className="mb-3 text-sm text-neutral-600">Your membership has expired. Renew below.</p>
                <form action={requestPremiumMembership}>
                  <button
                    type="submit"
                    className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-700"
                  >
                    Renew Architect Circle membership
                  </button>
                </form>
              </div>
            ) : (
              <form action={requestPremiumMembership}>
                <button
                  type="submit"
                  className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-700"
                >
                  Request Architect Circle membership
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
