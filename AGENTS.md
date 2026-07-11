# AGENTS.md — Project Instructions

## Project
Motor Trade AI Suite is an internal V1 tool for one broker.

Two stateless tools behind Clerk auth, nothing persisted:

1. **Submission Composer** (`/composer`) — manual form → generated
   additional-information text + underwriter email (deterministic, no AI).
2. **Policy Letter Generator** (`/policy-letter`) — policy schedule PDF →
   AI extraction of endorsements/conditions/exclusions/excesses → human
   review → client letter text.

Build only what is requested. Do not build future scope.

## Core Rules

- Build the requested change only.
- Keep implementation minimal.
- Prefer boring, maintainable code.
- Do not add features not requested.
- Do not add databases, saved records, billing, roles, audit dashboards, or
  SaaS/multi-tenant features. Persistence was deliberately removed — do not
  reintroduce it without an explicit decision.

## Architecture Rules

- Use TypeScript.
- Use Zod for validation.
- Keep layers separate:
  - schemas = data contracts
  - validation = reusable validation logic
  - services = business flow/orchestration
  - providers = external integrations (AI)
  - UI = presentation only
- Do not put business logic inside UI components.
- Prefer deterministic systems before AI systems.

## Security Rules

- Never expose secrets client-side.
- Use `server-only` for server-only modules.
- Auth must be enforced server-side (Clerk middleware + `requireUser()` in
  server actions).
- Do not rely on client-side checks for protected actions.
- Do not log client data, uploaded files, prompts, or secret values.
- Never persist uploaded documents or extracted client data.

## AI / Extraction Rules

- AI drafts only; the broker reviews/edits extracted data before it goes
  into a letter.
- Never invent information.
- Never estimate missing values — use empty strings/arrays.
- Preserve endorsement/condition reference codes exactly as they appear in
  the document ('CODE - Description').

## File Upload Rules

Policy Letter Generator accepts PDF only. Validate MIME type, file size
(max 10MB), and empty files before sending to the AI provider.

## Workflow

For every change:

1. Explain the plan briefly.
2. Implement only the change.
3. Run typecheck/build where relevant.
4. Explain files created/updated.
5. State what was deliberately not built.
