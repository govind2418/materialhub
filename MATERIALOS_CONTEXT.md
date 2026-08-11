# Project context — MaterialOS

Background for Claude Code, from the product planning conversation. The full formal spec is in `MaterialOS_PRD_v1.docx` (also referenced here in plain text) — read this file for the summary, refer to the PRD for exact wording if needed.

## What this project is
MaterialOS is an AI-powered platform that makes it easier for architects, interior designers, manufacturers, and distributors to find, compare, and procure interior materials, through a centralized database and intelligent tools. The codebase currently in this repo was built under the working name "Material Hub" — same product, earlier/narrower scope. Treat "MaterialOS" as the current name going forward; renaming the UI copy from "Material Hub" to "MaterialOS" is one of the open tasks (see NEXT_STEPS_V2.md).

## Vision
To become the most trusted digital platform for interior materials by simplifying how professionals search for, evaluate, and procure materials.

## Problems being solved
Scattered product information across PDFs/WhatsApp/relationships, time-consuming manual comparison, outdated specs, manual untracked RFQs and sample requests, and no centralized intelligence connecting products, specs, and suppliers.

## People
- **Dhiren Dedhiya** — Owner, MaterialOS.
- **Govind Sharma** — Founder & CEO, Lumosys Web (agency building the platform).

## Target users (5 roles currently modeled in `src/db/schema.ts`, procurement teams not yet modeled)
Manufacturers, architects/interior designers, distributors, retailers/dealers, sales representatives — plus **procurement teams**, described in the PRD but not yet a distinct role in the schema.

## MVP scope (per PRD)
- Categories: laminates, veneers, MDF, plywood.
- 5-10 manufacturers at launch, ~10,000-20,000 products.
- Core loop: search → compare → RFQ → sample request.

## Product database — full field set per PRD
Identity (name, brand/manufacturer, category, collection), specification (finish, dimensions, technical specs, certifications), media (images, installation guides), relationships (related/alternative products, distributors carrying it, sales contacts).

Current `products` table in `src/db/schema.ts` has: name, code, collection, category, woodSpecie, veneerThickness, base, finish, flexibility, weightPerPanel, panelSizes, imageUrl. **Missing vs. PRD**: certifications, installation guides, related/alternative products, and a proper distributor/sales-contact linkage per product (today only manufacturer ownership exists).

## Workflows per PRD

**Architect workflow**: create a project → search → compare → shortlist → request samples → generate RFQ.
Currently built: browse/search/filter catalog, save to a mood board, send a basic enquiry. **Missing**: no "project" concept to group shortlists per project, no side-by-side compare tool, no distinct "sample request" vs. "enquiry" (currently one generic enquiry type), no formal RFQ generation (structured request tied to a shortlist, sent to possibly multiple manufacturers/distributors at once).

**Procurement workflow**: RFQs may need to be split across multiple distributors when no single source can fulfill the full order. **Not built at all** — current enquiry model assumes one manufacturer per enquiry, no order-splitting logic.

**Manufacturer portal**: upload/manage products and catalogs, manage distributors and sales reps. Product upload exists (manual form); distributor/sales-rep management (linking specific distributors/reps to a manufacturer account) does not exist yet.

## Phase 2 (not MVP — do not build unless explicitly asked)
AI-assisted search (intent-based, not just keyword), recommendations (alternatives/complementary materials), catalog digitization (automated extraction from manufacturer PDFs — this directly solves the Phase 1 manual-entry bottleneck, but is explicitly Phase 2).

## Long-term (not MVP)
Mobile apps, global expansion, multi-language support, integrations with design/ERP tools.

## Guiding principle
Every feature should reduce time and effort in material discovery and procurement. Use this to resolve scope disputes — if a proposed feature doesn't reduce time/effort in discovery or procurement, it probably doesn't belong in the current phase.
