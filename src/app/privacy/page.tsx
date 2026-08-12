import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Privacy Policy — MaterialOS",
  description: "How MaterialOS collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-semibold">Privacy Policy</h1>
        <p className="mt-1 text-sm text-neutral-500">Last updated: {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>

        <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-neutral-700">
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            This is a standard template, not legal advice. Have it reviewed by a lawyer — including
            for applicability of India&apos;s DPDP Act 2023 — before relying on it for compliance.
          </p>

          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">1. What we collect</h2>
            <ul className="list-inside list-disc">
              <li>Account details: name, email, phone, company name, city, and role (via Clerk, our authentication provider).</li>
              <li>Platform activity: products viewed, searched, shortlisted, enquiries, orders, and messages you send through the platform.</li>
              <li>Content you upload: product images/specs (manufacturers), project details and BOQ files (architects), catalog files.</li>
              <li>Basic technical data (IP address, browser) collected automatically by our hosting provider for security and performance.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">2. How we use it</h2>
            <p>
              To operate the core platform: matching architects with relevant manufacturers/
              distributors/sales reps by territory, showing you your own orders and enquiries,
              powering search and demand-trend features (in aggregate/anonymized form for anything
              shown publicly), and platform administration.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">3. What we don&apos;t do</h2>
            <p>
              We don&apos;t sell your personal data to third parties. We don&apos;t show your
              individual activity publicly unless you explicitly opt in (e.g. an architect
              choosing to make their profile and specific projects public).
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">4. Who your data is shared with</h2>
            <ul className="list-inside list-disc">
              <li>The manufacturer/distributor/sales rep you contact, so they can respond to your enquiry — this is the core function of the platform.</li>
              <li>Service providers we use to run the platform: Clerk (authentication), Neon (database hosting), Vercel (application hosting).</li>
              <li>Payments: if you use a UPI payment link shown on the platform, that transaction happens directly between your UPI app and the recipient&apos;s bank — we don&apos;t process or store payment card/bank details.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">5. Your choices</h2>
            <p>
              You can update your profile information from your dashboard. Architects can enable
              or disable their public profile at any time. To request deletion of your account and
              associated data, contact the platform owner via your account.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">6. Data retention</h2>
            <p>
              We keep your account and transaction data for as long as your account is active, and
              for a reasonable period after in case it&apos;s needed for dispute resolution or legal
              compliance.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">7. Changes</h2>
            <p>We may update this policy as the platform evolves. Material changes will be reflected here with an updated date.</p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">8. Contact</h2>
            <p>Questions about this policy or your data can be sent to the platform owner via the contact details on your account.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
