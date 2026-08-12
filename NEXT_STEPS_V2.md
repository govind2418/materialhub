# Next steps v2 — close the gap to the MaterialOS PRD

Read `MATERIALOS_CONTEXT.md` first (background), then work through these tasks in order. This supersedes `NEXT_STEPS.md` (that file's tasks are done — verified by code review). Give this file to Claude Code as: "Read MATERIALOS_CONTEXT.md and NEXT_STEPS_V2.md, then implement the tasks in order. Confirm each task works before moving to the next."

## Task 1 — Rename Material Hub → MaterialOS

Search the codebase for "Material Hub" (site header, home page copy, footer, page titles/metadata in `src/app/layout.tsx`, `package.json` name field) and replace with "MaterialOS". This is a find-and-replace, not a redesign — don't change layout or styling while doing this.

## Task 2 — Expand the product schema (`src/db/schema.ts`)

Add to the `products` table: `certifications` (text or jsonb array), `installationGuideUrl` (text, nullable). Add a new `relatedProducts` join table (`productId`, `relatedProductId`) for the "related/alternative products" requirement. Add a `productDistributors` join table (`productId`, `distributorUserId` or `manufacturerId`-scoped, however fits the existing distributor model) so a product can list which distributors carry it — this is what powers "distributors carrying it" and "sales contacts" per product in the PRD's database structure. Update `src/app/manufacturer/page.tsx`'s add-product form to capture certifications and installation guide URL at minimum; related products and distributor linkage can be a simple admin UI, doesn't need to be polished.

## Task 3 — Introduce "projects" for architects

Add a `projects` table (`id`, `architectUserId`, `name`, `createdAt`). Change `moodBoards` to belong to a project instead of directly to an architect (`moodBoards.projectId` instead of/alongside `architectUserId`), so an architect can run multiple projects with separate shortlists. Update `src/app/architect/page.tsx` to show a project list, with each project having its own mood board. Keep this simple — a project is just a named container, no need for dates/budgets/status yet.

## Task 4 — Split "sample request" from "enquiry", and add a real RFQ

Currently `enquiries` is one generic type used for architect enquiries, retailer restock requests, and (implicitly) everything else. Per the PRD these are distinct:
- **Sample request**: architect asks for a physical sample of a specific product. Keep this close to the existing enquiry model — it's fine to reuse the `enquiries` table with a `type` column (`sample_request` / `rfq` / `restock`) rather than three separate tables, as long as the UI clearly distinguishes them.
- **RFQ (request for quote)**: generated from a project's shortlist (multiple products, possibly multiple manufacturers/distributors at once), not a single-product ask. Add `enquiryItems` usage here — that table already exists in the schema but isn't populated anywhere yet; wire it up so an RFQ can carry multiple line items.

Update `src/app/architect/page.tsx` so "Generate RFQ" is a distinct action from the existing mood-board enquiry button, pulling all items in the current project's mood board into one RFQ.

## Task 5 — Split-order procurement (multi-distributor RFQ)

When an RFQ is generated, it should be possible to route it to more than one distributor if the shortlist spans manufacturers/distributors who can't each fulfill the whole thing. Minimum viable version: an RFQ can have multiple `enquiries` rows under one `rfqId` (add this grouping column), one per manufacturer/distributor involved, so the architect sees "1 RFQ" but each recipient only sees their portion. Don't over-build this — no automatic fulfillment-matching logic yet, just the data model and a basic "this RFQ was split across N suppliers" view for the architect.

## Task 6 — Compare tool

On the catalog or a shortlist, let a user select 2-4 products and view them side by side (finish, dimensions, specs, certifications in a comparison table). This can be a new `/compare?ids=a,b,c` page reusing the existing product fields — no new backend needed, this is a UI-only task reading from the existing `products` table (plus the new certifications field from Task 2).

## Task 7 — Distributor/sales-rep management on the manufacturer portal

Manufacturer dashboard (`src/app/manufacturer/page.tsx`) should let a manufacturer see and manage which distributors and sales reps are linked to their account (per the PRD's "Manufacturer Portal" section). Minimum viable version: a simple list + invite-by-email flow, reusing the existing `users` table role field to identify eligible distributor/sales-rep accounts.

## Task 8 — Client approval on shortlists

Add an `approvalStatus` field (`pending` / `approved` / `rejected` / `alternative_requested`) to `moodBoardItems` (or wherever the project shortlist lives after Task 3). Add a lightweight client-facing view — doesn't need its own login, a shareable link with a token is enough at this stage — where a client can set each item's status. This turns scattered WhatsApp approvals into structured project history.

## Task 9 — Sample request status tracking

For the `sample_request` enquiry type introduced in Task 4, add a `sampleStatus` field: `requested` → `dispatched` → `delivered` → `approved` / `rejected`. Show this status in both the architect's project view and the manufacturer/sales-rep dashboard, with a simple dropdown to advance it (same pattern as the existing enquiry-status dropdown in `src/app/manufacturer/page.tsx`).

## Task 10 — Lead ownership on enquiries

Add an `assignedSalesRepUserId` column to `enquiries`, and a `lastContactedAt` timestamp. Sales rep dashboard (`src/app/sales-rep/page.tsx`) should only show enquiries assigned to that rep (currently it shows all enquiries for the manufacturer). Manufacturer dashboard should be able to assign/reassign an enquiry to a specific rep.

## Task 11 — Verified data badge

Add a `verificationStatus` enum to `products` (`manufacturer_verified` / `platform_verified` / `pending`). Default new products to `pending`. Show the badge on `ProductCard` and the product detail page. No approval workflow needed yet — a manufacturer marking their own product `manufacturer_verified` is enough for now; platform-level verification can be a manual admin action later.

## Task 12 — Territory mapping

Add a `territory` field to distributor and sales-rep user records (can reuse the existing `city` field on `users`, or add a proper `territories` table if multiple cities per person are needed — start with the simpler `city` reuse). On a manufacturer's product or profile page, surface "your contact for [project city]" by matching the architect's project location (once Task 3's `projects` table has a location field — add one if it doesn't) to the nearest sales rep/distributor territory.

## Task 13 — "Find me an alternative" button

On the product detail page (`src/app/catalog/[slug]/page.tsx`), add a button that queries the `relatedProducts` table from Task 2 and shows 3-5 alternatives. If `relatedProducts` is empty for a product, fall back to same-category/same-finish products as a naive substitute so the button always returns something.

## Task 14 — Quantity on distributor inventory

Extend `distributorInventory` (currently just a status enum) with a `quantity` integer field. Update the distributor dashboard's stock form to capture a quantity alongside status. This is the minimum data needed to eventually show "200 sheets at Distributor A, 100 at Distributor B" — the actual cross-distributor allocation logic is Phase 2 (see `FEATURE_ROADMAP.md`), this task is just making the data representable.

## Explicitly out of scope for this round (Phase 2 / long-term per PRD — do not build)

AI-assisted search, recommendations engine, automated PDF catalog digitization, mobile apps, multi-language support, ERP/design-tool integrations, procurement-team role (mentioned in PRD as a target user but not yet specced as a distinct workflow — flag it for a follow-up spec pass rather than guessing at requirements).

## After finishing

Confirm each task against `MaterialOS_PRD_v1.docx`: does the built feature match what's written there, not just what seemed reasonable? Report which tasks are fully done vs. partially stubbed.
