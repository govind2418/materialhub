import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Terms of Service — MaterialOS",
  description: "Terms of Service for using the MaterialOS platform.",
};

export default function TermsPage() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-semibold">Terms of Service</h1>
        <p className="mt-1 text-sm text-neutral-500">Last updated: {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>

        <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-neutral-700">
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            This is a standard template, not legal advice. Have it reviewed by a lawyer before
            relying on it for compliance.
          </p>

          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">1. What MaterialOS is</h2>
            <p>
              MaterialOS is a platform that connects material manufacturers, distributors, sales
              representatives, architects, interior designers, and retailers to discover, compare,
              and source building materials. We do not manufacture, sell, or hold inventory of any
              product listed on the platform — we facilitate discovery and communication between
              buyers and suppliers.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">2. Accounts</h2>
            <p>
              You must provide accurate information when creating an account and choosing a role
              (manufacturer, architect, distributor, retailer, or sales representative). You are
              responsible for activity under your account and for keeping your credentials secure.
              We may suspend or terminate accounts that provide false information or misuse the
              platform.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">3. Product listings and content</h2>
            <p>
              Manufacturers are solely responsible for the accuracy of the product information,
              specifications, pricing, and images they upload. MaterialOS does not independently
              verify every listing; a &ldquo;verified&rdquo; badge reflects manufacturer or platform
              review of specific claims, not a guarantee. Buyers should confirm specifications and
              pricing directly with the manufacturer before purchasing.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">4. Orders, samples, and payments</h2>
            <p>
              Enquiries, sample requests, RFQs, and orders placed through MaterialOS are
              agreements between the buyer and the manufacturer/distributor — MaterialOS is not a
              party to the underlying sale. Where a payment link (e.g. UPI) is shown, it is a
              convenience for transferring funds; payment confirmation is manually reviewed and is
              not instantaneous. Delivery timelines, quality, freight, and returns are the
              responsibility of the manufacturer/distributor fulfilling the order.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">5. Acceptable use</h2>
            <p>
              Don&apos;t use the platform to upload false or infringing content, scrape data at
              scale, attempt to bypass access controls, or interfere with other users&apos;
              accounts. We may remove content or suspend accounts that violate this.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">6. Limitation of liability</h2>
            <p>
              MaterialOS is provided &ldquo;as is.&rdquo; To the fullest extent permitted by law, we
              are not liable for losses arising from transactions between buyers and suppliers,
              inaccurate listings, delivery issues, or platform downtime.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">7. Changes</h2>
            <p>
              We may update these terms as the platform evolves. Continued use after an update
              means you accept the revised terms.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-900">8. Contact</h2>
            <p>Questions about these terms can be sent to the platform owner via the contact details on your account.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
