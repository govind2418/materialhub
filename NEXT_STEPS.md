# Next steps — align Material Hub with the original vision

Give this whole file to Claude Code as the prompt: "Read NEXT_STEPS.md and implement it, task by task. Ask me before each task if you're unsure, but don't skip or simplify tasks." Background/context for the project is already in CLAUDE.md — read that first if you haven't.

Current state (verified): Next.js + Clerk auth + Neon Postgres/Drizzle. `users.role` enum already supports `manufacturer`, `architect`, `distributor`, `retailer`, `sales_rep` — but only manufacturer and architect have UI (onboarding option + dashboard page). Home page is a generic hero + category pills, no search, no visual finish browsing, no role picker.

Work through these tasks in order. Each one should be a working, tested change before moving to the next — don't batch all five into one untested commit.

## Task 1 — Rebuild the home page (`src/app/page.tsx`)

Replace the current hero section with a search-first hero:
- Headline: "Find the exact finish you're picturing" (or similar — keep it about visual search, not generic marketing copy).
- One search input with placeholder text like "light oak texture, office" — wire it to filter/search products by name, code, category, or finish (server action or client-side filter against existing `products` query is fine for now; full text search can come later).
- A "Photo search" button next to the search input. If reverse-image search isn't built yet, the button can open a placeholder/"coming soon" state — but it must be visually present and clickable, not hidden or removed. Do not skip this because the backend isn't ready — stub it.

Add a new section directly below the hero, before "Browse by category": **Browse by finish** — a horizontal grid of 5-6 image tiles pulled from distinct `finish` values in the `products` table (fall back to a fixed set like Oak, Walnut, Marble, Matte, Gloss, Stone if data is sparse). Each tile links to `/catalog?finish=<value>` (you'll need to add `finish` as a filter param on the catalog page — see Task 1b).

Add a new section: **Continue as** — 4 cards, one per role: Manufacturer, Architect/Designer, Distributor/Retailer, Sales rep. Each card has a short one-line description (reuse the copy from CLAUDE.md's "Home page — exact spec" section) and links to `/onboarding?role=<value>` for signed-out users, or the relevant dashboard for signed-in users of that role.

Keep the existing "Featured products" grid at the bottom — that part already matches the vision.

### Task 1b — Add `finish` filter to the catalog page (`src/app/catalog/page.tsx`)
Mirror the existing `category`/`collection` filter pattern — add `finish` to `searchParams`, derive distinct finish values, filter the product list, and render a filter pill row for it.

## Task 2 — Update the header (`src/components/site-header.tsx`)

Add nav links: **Collections**, **Mood boards**, **For business** (next to the existing Catalog link). "Mood boards" should link to `/architect` for now (that's where the mood board lives) — rename or route this properly once mood boards aren't architect-only. "For business" can link to `/onboarding` or a new `/for-business` landing section — your call, but it must exist and be clickable, not a dead link.

## Task 3 — Expand onboarding to all 5 roles (`src/app/onboarding/page.tsx` + `actions.ts`)

Currently only "Manufacturer" and "Architect / Designer" are offered. Add **Distributor**, **Retailer**, and **Sales rep** as selectable options (the DB enum already supports all 5 — this is a UI-only gap). Keep the same radio-card pattern already used.

After choosing a role, `completeOnboarding` should still write the correct `role` value and redirect to that role's dashboard (see Task 4 for the new dashboards it needs to redirect to).

## Task 4 — Build dashboards for the 3 missing roles

Use `src/app/manufacturer/page.tsx` and `src/app/architect/page.tsx` as the structural pattern (SiteHeader + redirect guard + main content sections) — don't reinvent the layout, just adapt it:

- **`src/app/distributor/page.tsx`** — stock/territory view. MVP version: list of products the distributor has been given access to (or all products, if there's no assignment model yet) with a simple "in stock / low stock / out of stock" status field you'll need to add to a `distributorInventory` or similar table in `src/db/schema.ts`. Keep it minimal — this does not need to be feature-complete, just present and functional.
- **`src/app/retailer/page.tsx`** — simple reorder view. MVP version: browse the same product grid pattern as `/catalog`, with a lightweight "request restock" action that creates an `enquiries` row (reuse the existing enquiries table/flow — a retailer enquiry to a manufacturer is structurally the same as an architect one).
- **`src/app/sales-rep/page.tsx`** — lead/follow-up view. MVP version: list of `enquiries` assigned to or visible to this rep (for now, all enquiries tied to their manufacturer is fine — a proper assignment model can come later), with the same status-update pattern already used in the manufacturer dashboard.

Update `src/components/site-header.tsx`'s `dashboardHref` logic so all 5 roles route to their correct dashboard, not just manufacturer/architect.

## Explicitly out of scope for this round (do not build yet)

Image similarity / reverse-image search backend, Universal Material ID, knowledge graph, contractor BOQ comparison tool, analytics dashboard, notifications. These are Phase 3/4 per CLAUDE.md — building them now is scope creep that will slow down the MVP. Stub UI entry points only where noted above (the photo-search button).

## After finishing

Run the app locally, click through: home page search bar + photo-search stub + finish tiles + all 4 role cards, onboarding with all 5 roles, and each of the 5 dashboards. Report back what's done and what's still stubbed, rather than assuming everything works.
