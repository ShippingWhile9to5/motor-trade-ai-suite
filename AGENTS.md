# AGENTS.md — Codex Instructions

## Project
Motor Trade AI Suite is an internal V1 tool for one broker.

Goal:
Create Case → Upload Fact Find → Extract → Human Review → Generate Submission Pack → Edit → Mark Submitted.

Build only the requested ticket. Do not build future scope.

## Core Rules

- Build the current ticket only.
- Read `PRD.md` and `MVP-TICKETS.md` for context.
- Keep implementation minimal.
- Prefer boring, maintainable code.
- Do not add features not requested.
- Do not add Hermes, reminders, policy reader, client letters, billing, roles, audit dashboards, or SaaS/multi-tenant features.

## Architecture Rules

- Use TypeScript.
- Use Zod for validation.
- Keep layers separate:
  - schemas = data contracts
  - validation = reusable validation logic
  - repositories = persistence only
  - services = business flow/orchestration
  - UI = presentation only
- Validate before persistence.
- Do not put business logic inside UI components.
- Do not put database logic inside UI components.
- Repository functions using service role access must enforce ownership boundaries.
- Prefer deterministic systems before AI systems.

## Security Rules

- Never expose secrets client-side.
- Service role keys must remain server-only.
- Use `server-only` for server-only modules.
- Auth must be enforced server-side.
- Do not rely on client-side checks for protected actions.
- Do not log client data, uploaded files, prompts, or secret values.

## AI / Extraction Rules

- AI drafts only.
- Humans approve before submission generation.
- Never invent information.
- Never estimate missing values.
- Missing required fields must remain explicitly empty.
- Use `is_missing_required` for missing required fields.
- Uncertain fields require review.
- Preserve original AI output separately from reviewed human output.

## File Upload Rules

Allowed V1 file types:

- PDF
- JPG/JPEG
- PNG
- HEIC/HEIF

Validate:

- MIME type
- file extension
- file size
- empty files

If HEIC/HEIF is unsupported by extraction later, convert server-side. Do not rely on browser conversion.

## Workflow

For every ticket:

1. Explain the plan briefly.
2. Implement only the ticket.
3. Run typecheck/build where relevant.
4. Explain files created/updated.
5. State what was deliberately not built.