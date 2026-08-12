import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-neutral-200 py-8 text-center text-xs text-neutral-400">
      <p>MaterialOS — built for manufacturers and architects.</p>
      <div className="mt-2 flex justify-center gap-4">
        <Link href="/terms" className="hover:text-neutral-600">
          Terms of Service
        </Link>
        <Link href="/privacy" className="hover:text-neutral-600">
          Privacy Policy
        </Link>
      </div>
    </footer>
  );
}
