import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { getCurrentDbUser } from "@/lib/current-user";

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
    <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Material Hub
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-neutral-600">
          <Link href="/catalog" className="hover:text-neutral-900">
            Catalog
          </Link>
          <Link href="/catalog" className="hover:text-neutral-900">
            Collections
          </Link>
          <Link href="/architect" className="hover:text-neutral-900">
            Mood boards
          </Link>
          <Link href="/onboarding" className="hover:text-neutral-900">
            For business
          </Link>
          {!userId ? (
            <>
              <Link href="/sign-in" className="hover:text-neutral-900">
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="rounded-full bg-neutral-900 px-4 py-2 text-white hover:bg-neutral-800"
              >
                Get started
              </Link>
            </>
          ) : (
            <>
              <Link href={dashboardHref} className="hover:text-neutral-900">
                Dashboard
              </Link>
              <UserButton />
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
