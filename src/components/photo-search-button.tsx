"use client";

import { useState } from "react";
import { searchByPhoto } from "@/app/photo-search/actions";

export function PhotoSearchButton() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Search by photo"
        className="flex h-full items-center gap-2 rounded-full border border-neutral-300 bg-white px-4 py-3 text-sm font-medium text-neutral-700 hover:border-terracotta-400 hover:text-terracotta-600"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          className="h-4 w-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 9a2 2 0 0 1 2-2h1.5l1-1.5h9l1 1.5H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"
          />
          <circle cx="12" cy="13" r="3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Photo search
      </button>

      {open && (
        <div className="absolute left-0 top-full z-10 mt-2 w-[min(18rem,calc(100vw-3rem))] rounded-lg border border-neutral-200 bg-white p-4 text-sm shadow-lg sm:left-auto sm:right-0 sm:w-72">
          <p className="font-medium text-neutral-900">Search by photo</p>
          <p className="mt-1 text-neutral-500">
            Upload a photo of a material and we&apos;ll find the closest visual matches in the
            catalog.
          </p>
          <form
            action={searchByPhoto}
            onSubmit={() => setSubmitting(true)}
            className="mt-3 flex flex-col gap-2"
          >
            <input
              type="file"
              name="photo"
              accept="image/*"
              required
              className="text-xs"
            />
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-terracotta-500 px-3 py-2 text-xs font-medium text-white hover:bg-terracotta-600 disabled:opacity-60"
            >
              {submitting ? "Searching…" : "Find matches"}
            </button>
          </form>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-3 text-xs font-medium text-neutral-500 hover:text-neutral-900"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
