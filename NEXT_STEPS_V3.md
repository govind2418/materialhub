# Next steps v3 — Phase 2 features from the full 40-idea roadmap

Read `MATERIALOS_CONTEXT.md` and `FEATURE_ROADMAP.md` first. This file is the "Phase 2" bucket from `FEATURE_ROADMAP.md`, turned into concrete tasks now that the MVP (NEXT_STEPS.md and NEXT_STEPS_V2.md, tasks 1-14) is fully built and verified — projects, RFQ + split-order data model, client approval links, sample status, lead assignment, verified badges, territory contact matching, "find an alternative," related products, distributor team management, and analytics are all live.

Deliberately **not** included here: anything needing real usage/transaction data that doesn't exist yet (price intelligence, demand intelligence, search-analytics-as-a-product, reputation layers), and anything the original brainstorm's own MVP filter says to avoid (3D/AR/VR/BIM, heavy AI, complex ERP integrations). Those stay in `FEATURE_ROADMAP.md` as reference, not tasks — revisit once there's real usage volume.

Give this file to Claude Code as: "Read NEXT_STEPS_V3.md, implement tasks in order, confirm each works before moving on."

## Task 15 — Material Decision Assistant (rule-based, not AI)

A guided questionnaire for architects who don't know which material to pick. Add fields to `products` that the questionnaire can filter on: `fireRating`, `moistureResistance`, `maintenanceLevel` (simple text or small enums — don't over-engineer the taxonomy on the first pass). Build a new flow (e.g. `/architect/decision-assistant` or as a step in project creation) that asks: project type, location, budget range, aesthetic preference, durability needs, fire requirement, moisture exposure — then filters `products` against the answers and returns 3-5 suggestions, each with a one-line "why this material" built from which filters it matched (e.g. "Matches your fire-rating requirement and moisture exposure for a bathroom project"). This is rule-based filtering, not a trained model — do not reach for an LLM call here yet.

## Task 16 — Typed product relationships (merges "compatibility engine" + "relationship graph")

Extend `relatedProducts` with a `relationType` enum: `alternative_to`, `compatible_with`, `used_with`, `similar_to`. (Today every row implicitly means "alternative" — this is why "Find me an alternative" already works; this task generalizes the same table instead of adding a new one.) On the product detail page, group the existing "Find me an alternative" section by relation type, and add a manufacturer-side UI (next to the existing "Link related..." dropdown in `src/app/manufacturer/page.tsx`) to pick the relation type when linking two products. This is what eventually powers "what goes with this walnut veneer" — start with manual linking, don't build an inference engine yet.

## Task 17 — Manufacturer edit approval workflow

Right now a manufacturer's product edits go live immediately. Add a lightweight review step for significant changes: when a manufacturer edits specs/certifications on an existing (already-verified) product, flag it `needsReview` instead of applying immediately, and only apply once approved. Since there's no admin role in `userRoleEnum` yet, the simplest MVP approach is an email allowlist check (e.g. an env var listing admin emails) rather than adding a full admin role/permission system — don't over-build this.

## Task 18 — Product version history

Add a `productVersions` table capturing a snapshot (all spec fields + timestamp) whenever a product's specs change. Show a simple "last updated" date on the product detail page, and — if a mood board item or enquiry references a product — record which version was active at that time, so a project always knows which spec version it was built against.

## Task 19 — Quote comparison

Extend `enquiries` with quote-response fields: `quotedPrice`, `quotedDeliveryDays`, `freightCost`, `paymentTerms`, `validUntil`. Give manufacturers/distributors a way to fill these in when responding (extend the existing status-update form in `src/app/manufacturer/page.tsx`). On the architect side, for a given RFQ group (the "Split across N suppliers" view already in `src/app/architect/page.tsx`), add a side-by-side comparison table of these fields across the suppliers in that RFQ.

## Task 20 — Manufacturer lead funnel analytics

Extend the existing analytics table (`src/app/manufacturer/page.tsx`, currently views + enquiry count per product) into a funnel: viewed → shortlisted → sample requested → RFQ'd → contacted → quoted. Most of this is derivable from data that already exists (`viewCount`, `moodBoardItems` count per product, `enquiries` by type, `lastContactedAt`, and the new `quotedPrice` from Task 19) — this is aggregation work, not new data collection, except for a "shortlisted count per product" query which doesn't exist yet.

## Task 21 — Specification generator

On the product detail page (or from a project's shortlist), add a "Generate specification" action that produces a clean, printable document: name, code, brand, category, finish, dimensions, certifications, installation guide link. A simple print-friendly HTML page (browser print-to-PDF) is enough for MVP — don't add a new PDF-generation dependency just for this.

## Task 22 — "Available near my project"

Builds on the territory-contact matching already in `src/app/catalog/[slug]/page.tsx` (Task 12 from NEXT_STEPS_V2). MVP version: match on exact project city vs. distributor/`productDistributors` city rather than a true distance radius (no geocoding integration yet) — show "Available from a distributor in [city]" on the product page when there's a match. True km-radius matching is a later refinement once there's a reason to invest in geocoding.

## Task 23 — Basic allocation suggestion for split RFQs

When generating an RFQ (`src/app/architect/rfq-actions.ts`), if a shortlisted product has multiple linked distributors (via `productDistributors`) with inventory quantities (`distributorInventory.quantity`, added in NEXT_STEPS_V2 Task 14), suggest which distributor(s) to route the RFQ to based on who can fulfill the needed quantity — greedy allocation (fill from the distributor with the most stock first) is enough. This doesn't need cost or location optimization yet — that's a further refinement once Task 22's location data is richer.

## Explicitly still out of scope (see FEATURE_ROADMAP.md "Phase 3 / later" and "Not a build task" sections)

Visual similarity search, foreign-to-Indian alternative engine, BOQ intelligence, price/demand intelligence, search-analytics-as-a-product, architect/manufacturer reputation layers, material knowledge centre, sustainability intelligence, project cost intelligence, subscription-tier packaging. These need either real usage data that doesn't exist yet, or are business/GTM decisions rather than engineering tasks. Do not start these without an explicit go-ahead.

## After finishing

Same discipline as before: confirm each task against its acceptance criteria above before moving to the next, and report what's done vs. stubbed rather than assuming.
