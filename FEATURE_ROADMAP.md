# MaterialOS — full feature roadmap (triaged)

Source: a 40-idea brainstorm covering everything from a guided material-decision assistant to a long-term platform moat. This file triages all 40 into four buckets so nothing is lost, but nothing jumps the queue either. The brainstorm's own closing framework (items 37-39 below) is the filter used for triage: avoid 3D/AR/VR/BIM/complex ERP/dozens-of-AI-features at MVP; the only question that matters early is "did this get the architect from 30 minutes to 3 minutes, and did the manufacturer get a genuine enquiry."

The concrete engineering tasks for the "Now" bucket are in `NEXT_STEPS_V2.md` (tasks 8+). This file is the map; that file is the punch list.

## Now — near-term, added to NEXT_STEPS_V2.md as Tasks 8-14
Cheap relative to their value, and directly serve the existing MVP loop (search → shortlist → sample/RFQ → supplier contact) rather than adding a new one.

- **#3 Material shortlisting & approval system** — client approves/rejects/asks-for-alternative on a shortlist. Extends the existing mood board with almost no new concepts.
- **#8 Sample management status tracking** — Requested → Dispatched → Delivered → Approved → Rejected. Extends the sample-request type already being split out in NEXT_STEPS_V2 Task 4.
- **#12 Lead ownership & protection** — which sales rep an enquiry is assigned to, when contacted, quoted or not. Extends the enquiry status tracking that already exists.
- **#15 Verified data layer** — a status badge (Manufacturer Verified / Platform Verified / Pending) on each product. One field, high trust payoff.
- **#11 Territory intelligence** — map distributors/sales reps to territories so the right salesperson surfaces automatically for a project's location. Directly reduces "who do I call" friction, which is the platform's core promise.
- **#32 "Find me an alternative" button** — reuses the `relatedProducts` table already planned in NEXT_STEPS_V2 Task 2. Nearly free once that table exists.
- **#9 Real-time availability (basic)** — add a quantity field to `distributorInventory` (currently only has a status enum) so "200 sheets at Distributor A" is representable. Stop short of full allocation logic (that's #10, Phase 2).

## Phase 2 — after MVP is validated with real users
Meaningful build effort, or dependent on having real usage data first.

- **#1 Material Decision Assistant** — a rule-based questionnaire version (project type, budget, aesthetic, durability, fire/moisture requirements → filtered suggestions with a short "why this material" reason) is realistic in Phase 2 without needing a trained model. A true AI-reasoned version comes later, folded into the PRD's existing "AI-assisted search" Phase 2 item.
- **#4 Digital material board (multi-category)** — combine laminate + veneer + hardware + flooring in one board with brand/code/finish auto-attached, convertible to a quotation.
- **#7 Material compatibility engine** — "what goes with this walnut veneer" — needs a rules/compatibility dataset that doesn't exist yet.
- **#10 Smart allocation engine** — optimize sourcing across multiple distributors by quantity, location, delivery time, landed cost. Needs #9's quantity data first.
- **#13 Manufacturer data control + approval workflow** — manufacturers self-serve catalog updates; platform admin approves changes before they go live.
- **#14 Product version history** — track spec changes over time so a project always knows which version it specified. Matters more once there's enough catalog churn to track.
- **#17 Product relationship graph (typed)** — beyond "related products": similar-to, alternative-to, used-with, belongs-to-collection, recommended-for. Basic untyped related-products is already a "Now" item; typed relationships are Phase 2.
- **#20 Multi-brand RFQ** and **#21 Quote comparison** — already scoped as NEXT_STEPS_V2 Tasks 4-5 (RFQ + split-order); quote-side comparison (price/delivery/freight/terms) is the natural Phase 2 follow-on once suppliers are actually returning quotes through the platform.
- **#25 Manufacturer lead analytics (funnel)** — viewed → shortlisted → sample requested → RFQ → contacted → quoted → order. Needs enough volume to be meaningful.
- **#29 Specification generator** — turn a selected product's structured data into tender/BOQ-ready documentation.
- **#33 "Available near my project"** — depends on #11 (territory data) existing first.

## Phase 3 / later — needs scale, data, or is a genuine differentiator worth investing in once the base is proven
- **#5 Visual similarity search** — same as the PRD's existing Phase 3 image-similarity item.
- **#6 Foreign product → Indian alternative engine** — powerful but needs a mapped characteristics model across manufacturers; a real differentiator, not a starting point.
- **#16 Material Passport** — the full single-record rollup (image + specs + certifications + warranty + installation + manufacturer + distributor + sales contact + related products + documents) is really the end-state of Tasks in NEXT_STEPS_V2 Task 2 plus Phase 2 items combined — track it as the north star for the product schema, not a standalone task.
- **#18 Project-to-product intelligence** — tagging real projects (e.g. a hotel) to the materials used in them. Needs curated case-study content.
- **#19 BOQ intelligence** — upload a BOQ, auto-map line items to catalog products. Complex parsing; matches the original PRD's contractor/BOQ tool, already flagged as a later-phase item.
- **#22 Price intelligence**, **#23 demand intelligence**, **#24 search analytics as a product** — all need real transaction/search volume before they mean anything. Revisit once there's usage data.
- **#26 Architect reputation layer**, **#27 Manufacturer reputation layer** — need a critical mass of verified users before a "reputation" signal is meaningful.
- **#28 Material knowledge centre** — educational content hub. Valuable for SEO/trust but parallel-track, not core product engineering.
- **#30 Sustainability intelligence** — needs certification data (from #15/Task 2) populated at scale first.
- **#31 Project cost intelligence** — needs real pricing data flowing through the platform first.

## Not a build task — business/strategy framing, revisit at GTM stage
- **#34 / #35 Manufacturer & architect subscription value bundling** — which already-built features justify a paid tier. A packaging decision once enough of the above exists to bundle.
- **#36 Platform moat** — the strategic thesis (proprietary structured data + relationships + behavior data compounding over time), not a feature to build.

## The filter itself (from the original brainstorm — keep re-reading this)
- **#37 What NOT to build at MVP**: 3D rendering, AR, VR, BIM, complex mobile apps, huge category breadth, complicated ERP integrations, dozens of AI features.
- **#38 First pilot workflow**: one manufacturer → their catalog → PDFs converted to structured products → images + specs uploaded → simple searchable interface → architect can search, shortlist, compare, request a sample, and contact the salesperson. Test with real users before adding anything else.
- **#39 Success metric**: not "the website looks beautiful." It's "I used to find this material in 30 minutes, now it takes 3" (architect) and "I'm getting genuine enquiries" (manufacturer).
- **#40 Ultimate vision**: the long-term goal isn't a product catalog — it's the full workflow: discovery → decision → sample → specification → RFQ → supplier matching → procurement → fulfilment → project documentation. Every "Now" and "Phase 2" task above is a step toward that chain, not a detour from it.
