import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getCurrentDbUser } from "@/lib/current-user";
import { SiteNav } from "./site-nav";

const DASHBOARD_BY_ROLE: Record<string, string> = {
  manufacturer: "/manufacturer",
  architect: "/architect",
  distributor: "/distributor",
  retailer: "/retailer",
  sales_rep: "/sales-rep",
};

export async function SiteHeader() {
  const { userId } = await auth();
  const dbUser = userId ? await getCurrentDbUser() : null;
  const dashboardHref = dbUser ? DASHBOARD_BY_ROLE[dbUser.role] ?? "/onboarding" : "/onboarding";

  return (
    <header className="sticky top-0 z-10 border-b border-neutral-200 bg-neutral-50/90 backdrop-blur">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-serif text-xl font-semibold tracking-tight text-neutral-900">
          Material Hub
        </Link>
        <SiteNav signedIn={!!userId} dashboardHref={dashboardHref} />
      </div>
    </header>
  );
}
