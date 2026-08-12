import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
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

  let cartCount = 0;
  if (dbUser?.role === "architect") {
    const items = await db.query.cartItems.findMany({
      where: (c, { eq }) => eq(c.userId, dbUser.id),
    });
    cartCount = items.reduce((sum, i) => sum + i.quantity, 0);
  }

  return (
    <header className="sticky top-0 z-10 border-b border-neutral-200 bg-neutral-50/90 backdrop-blur">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-serif text-xl font-semibold tracking-tight text-neutral-900">
          MaterialOS
        </Link>
        <SiteNav
          signedIn={!!userId}
          dashboardHref={dashboardHref}
          showCart={dbUser?.role === "architect"}
          cartCount={cartCount}
        />
      </div>
    </header>
  );
}
