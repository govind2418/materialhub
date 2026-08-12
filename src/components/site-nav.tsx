"use client";

import { useState } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

const NAV_LINKS = [
  { href: "/catalog", label: "Catalog" },
  { href: "/catalog", label: "Collections" },
  { href: "/architect", label: "Mood boards" },
  { href: "/onboarding", label: "For business" },
];

export function SiteNav({
  signedIn,
  dashboardHref,
  showCart,
  cartCount,
}: {
  signedIn: boolean;
  dashboardHref: string;
  showCart?: boolean;
  cartCount?: number;
}) {
  const [open, setOpen] = useState(false);

  const cartLink = showCart && (
    <Link href="/cart" className="relative hover:text-neutral-900">
      Cart
      {!!cartCount && (
        <span className="ml-1 rounded-full bg-terracotta-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {cartCount}
        </span>
      )}
    </Link>
  );

  return (
    <>
      {/* Desktop nav */}
      <nav className="hidden items-center gap-6 text-sm font-medium text-neutral-600 sm:flex">
        {NAV_LINKS.map((link) => (
          <Link key={link.label} href={link.href} className="hover:text-neutral-900">
            {link.label}
          </Link>
        ))}
        {!signedIn ? (
          <>
            <Link href="/sign-in" className="hover:text-neutral-900">
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-full bg-terracotta-500 px-4 py-2 text-white hover:bg-terracotta-600"
            >
              Get started
            </Link>
          </>
        ) : (
          <>
            {cartLink}
            <Link href={dashboardHref} className="hover:text-neutral-900">
              Dashboard
            </Link>
            <UserButton />
          </>
        )}
      </nav>

      {/* Mobile controls */}
      <div className="flex items-center gap-3 sm:hidden">
        {signedIn && <UserButton />}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 text-neutral-700"
        >
          {open ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>
      </div>

      {open && (
        <div className="absolute inset-x-0 top-full border-b border-neutral-200 bg-neutral-50 px-6 py-4 shadow-sm sm:hidden">
          <nav className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-2.5 hover:bg-neutral-100"
              >
                {link.label}
              </Link>
            ))}
            {!signedIn ? (
              <>
                <Link
                  href="/sign-in"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-2 py-2.5 hover:bg-neutral-100"
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  onClick={() => setOpen(false)}
                  className="mt-2 rounded-full bg-terracotta-500 px-4 py-2.5 text-center text-white hover:bg-terracotta-600"
                >
                  Get started
                </Link>
              </>
            ) : (
              <>
                {showCart && (
                  <Link
                    href="/cart"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-2 py-2.5 hover:bg-neutral-100"
                  >
                    Cart{!!cartCount && ` (${cartCount})`}
                  </Link>
                )}
                <Link
                  href={dashboardHref}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-2 py-2.5 hover:bg-neutral-100"
                >
                  Dashboard
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
