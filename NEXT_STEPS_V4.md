# Next steps v4 — Phase 3 / later features from the full 40-idea roadmap

Read `MATERIALOS_CONTEXT.md`, `FEATURE_ROADMAP.md`, and confirm `NEXT_STEPS_V3.md` tasks (15-23) are done before starting these. This file covers the "Phase 3 / later" bucket — the remaining items from the original 40-idea brainstorm that weren't already covered.

Important framing for this batch: several of these tasks (28-32) are data/intelligence features that depend on real usage — quotes, searches, response times. Build the instrumentation, storage, and views now; they will legitimately show sparse or "not enough data yet" results until the platform has real traffic. That's expected, not a bug — don't block the build waiting for data that only accumulates after these are live.

Two items from the original 40 (#34/#35 subscription packaging, #36 platform moat) are business/pricing decisions, not engineering tasks — they're intentionally not in this file. See `FEATURE_ROADMAP.md`'s "Not a build task" section; those need a decision from Dhiren/Govind, not code.

Give this file to Claude Code as: "Read NEXT_STEPS_V4.md, implement tasks in order, confirm each works before moving on."

## Task 24 — Visual similarity search (replace the "coming soon" stub)

The `PhotoSearchButton` component currently shows a "coming soon" placeholder. Implement it: generate an image embedding for each product (pick one hosted vision-embedding API — don't train anything custom), store the vector, and enable Postgres's `pgvector` extension (works on Neon) for nearest-neighbor search. When a user uploads a photo, embed it the same way and return the closest-matching products by vector distance. This is the most infrastructure-heavy task in this batch — get a single manufacturer's catalog working end-to-end before rolling out to all products.

## Task 25 — Foreign product → Indian alternative engine

Given a reference product (from Task 24's visual search, or manually entered characteristics), suggest the closest Indian-manufacturer matches based on shared attributes — finish, category, wood specie, and embedding similarity if Task 24 is live. Ship a v1 using structured attribute matching alone (no embeddings required) so this doesn't have to wait on Task 24.

## Task 26 — Project-to-product intelligence

Add a `projectReferences` table (curated case studies — e.g. "Taj Hotel Lobby" — tagged with the actual products used in them). This is admin/manufacturer-curated content, not user-generated; surface it as inspiration on relevant category or product pages, linking back to the real purchasable products.

## Task 27 — BOQ intelligence

Architect uploads a BOQ (start with CSV/XLSX, not scanned PDFs), the system parses line items and attempts to map each to catalog products via name/category/spec text matching, flags unmapped items, and offers to generate an RFQ from whatever mapped successfully. Text-matching is enough for v1 — no ML matching model needed yet.

## Task 28 — Price intelligence

Once `enquiries.quotedPrice` (from NEXT_STEPS_V3 Task 19) has real data in it, add a category-wise pricing trend view for manufacturers and a price-benchmarking view for architects on the compare/product pages. Ships now, fills in as quotes accumulate.

## Task 29 — Demand intelligence for manufacturers

Add a `searchLog` table (query text, filters used, resulting category/finish, timestamp) and log it from the catalog search/filter actions. Manufacturer dashboard gets a "Demand trends" panel — top searched finishes/categories over a rolling window.

## Task 30 — Search analytics as a product

Builds directly on Task 29. Add an aggregate, anonymized report view (no per-user data exposed) — "what architects are searching for," "most shortlisted finishes," "emerging categories" — that could eventually be packaged as a paid report for manufacturers not yet on the platform. This is a reporting layer on Task 29's data, not new data collection.

## Task 31 — Architect reputation layer

An opt-in, semi-public architect profile: portfolio, shareable projects (from the existing `projects` table), and material preferences derived from mood-board history. Explicit consent before anything is shown publicly — start as a profile page, not an automatic scoring system.

## Task 32 — Manufacturer reputation layer

Manufacturer profile page surfacing what already exists: verified-product badges (`verificationStatus`), certifications on file, and a basic response-time signal derived from `lastContactedAt` vs. `enquiries.createdAt`. Ships with today's signal, gets richer as more enquiries flow through.

## Task 33 — Material Knowledge Centre

A simple `/learn` or `/guides` section (article listing + detail page). This is mostly a content task, not an engineering one — build the page scaffolding and a basic content table; actual article writing ("Veneer vs laminate," "Which plywood for wet areas") is Dhiren's team's job, not Claude Code's.

## Task 34 — Sustainability intelligence

Extend the existing `certifications` field with structured sustainability attributes (FSC status, recycled content %, emissions/VOC rating). Add a "sustainable options" filter on the catalog page. Ships as an empty filter until manufacturers fill the data in.

## Task 35 — Project cost intelligence

Once Task 19/28's pricing data exists, sum estimated cost per project from shortlisted items' quoted/list prices, show a running total on the project view (`src/app/architect/page.tsx`), and add an optional `budget` field on `projects` (set at creation) with an over/under indicator. If over budget, surface cheaper alternatives using the existing "Find me an alternative" logic, filtered toward lower price.

## After finishing

Same discipline as before — confirm each task's acceptance criteria, and explicitly call out which of the data-dependent tasks (28-32) are functioning but sparse-by-design versus genuinely broken.
