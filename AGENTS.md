# AGENTS.md — Project Instructions

## Project

Motor Trade AI Suite is an internal tool for one UK motor trade insurance
broker, behind Clerk auth. It is becoming a niche CRM plus the two generation
tools, and may later be sold to his employer or other brokerages — so build it
product-shaped, not hard-wired to one company's quirks.

Built:

1. **Submission Composer** (`/composer`) — manual form → additional-information
   text + underwriter email. Deterministic, no AI, nothing saved.
2. **Policy Letter Generator** (`/policy-letter`) — policy schedule PDF → AI
   extraction → human review → opening paragraph + three copy-out blocks.
   Nothing saved.
3. **Quote Tracker** (`/quote-tracker`) — kanban pipeline with SLA urgency.
4. **Prospect Finder** (`/prospect-finder`) — Companies House SIC search →
   save as prospects.

Planned: Prospect Board + import (Phase 3); Home with Today view, reminders,
dashboard and export (Phase 4).

Build only what is requested. Do not build future scope.

## Core Rules

- Build the requested change only.
- Keep implementation minimal.
- Prefer boring, maintainable code.
- Do not add features not requested.
- Work in phases when asked: implement, verify, summarise, then wait for
  confirmation before starting the next phase.

## Architecture Rules

- Use TypeScript.
- Use Zod for validation.
- Keep layers separate:
  - schemas = data contracts
  - validation = reusable validation logic
  - repositories = persistence only
  - services = business flow/orchestration
  - providers = external integrations (AI, Companies House)
  - UI = presentation only
- Do not put business logic or database access inside UI components.
- Validate before persistence.
- Prefer deterministic systems before AI systems.

## Data Rules

One shared `business` record per firm is the spine — prospect, client and
quote all hang off it. A client is entered once and carried through; never
introduce a parallel client table or duplicate a firm across tools.

What may be stored, and what may not:

- **Store:** pipeline/CRM data — business names, Companies House details,
  quote stages, premium figures, notes.
- **Never store:** sensitive risk detail. Uploaded policy schedules and
  extracted policy data are held in memory for the request and discarded.
  Composer and Policy Letter state stays in browser memory only.

Do not move that line without an explicit decision from Nick.

## Security Rules

- Never expose secrets client-side.
- Use `server-only` for server-only modules.
- Auth must be enforced server-side (Clerk middleware + `requireUser()` in
  server actions).
- Do not rely on client-side checks for protected actions.
- The Supabase service-role key bypasses RLS, so **every repository query must
  be scoped by `user_id`**.
- Do not log client data, uploaded files, prompts, or secret values.

## AI / Extraction Rules

- AI drafts only; the broker reviews/edits extracted data before it is used.
- Never invent information.
- Never estimate missing values — use empty strings/arrays.
- Output reference codes and headings **verbatim** as printed in the document
  ('CODE - Title'). Do not summarise, paraphrase, or add parentheticals.
- The extraction prompt is tuned against real insurer schedules. Re-verify
  against real PDFs before changing it.

## File Upload Rules

Policy Letter Generator accepts PDF only. Validate MIME type, file size
(max 10MB), and empty files before sending to the AI provider.

## Workflow

For every change:

1. Explain the plan briefly.
2. Implement only the change.
3. Run typecheck, tests and build where relevant; verify against real data
   when the change affects extraction or the database.
4. Explain files created/updated.
5. State what was deliberately not built.
