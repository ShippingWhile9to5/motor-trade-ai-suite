# CLAUDE.md

Guidance for Claude Code working in this repo. The project rules live in
`AGENTS.md` — treat it as the source of truth and follow it:

@AGENTS.md

Also read `PRD.md` and `MVP-TICKETS.md` for product context and scope.

## What this is

Motor Trade AI Suite: a broker photographs a handwritten "Combined Motor Trade
Presentation" fact-find, the app extracts the fields with Claude, a human
reviews/corrects them, and a submission pack is generated. Next.js 15 (App
Router) + React 19, Clerk auth, Supabase (Postgres via service-role key),
Tailwind, Zod. Deployed on Vercel.

## Commands

- `npm run dev` — local dev server (http://localhost:3000)
- `npm run typecheck` — `tsc --noEmit`; run after any change
- `npm run test:integration` — compiles to `.test-build/` then runs the
  `node:test` suite in `tests/integration/`
- `npm run build` — production build; run before considering a change done

## Architecture layers (keep separate — see AGENTS.md)

- `lib/schemas` — Zod data contracts
- `lib/validation` — reusable validation logic
- `lib/repositories` — persistence only (Supabase); enforce ownership (user_id)
- `lib/services` — business flow / orchestration
- `lib/providers` — external integrations (AI extraction, submission)
- `app/` — UI (server components/actions) only; no business or DB logic here

## Key implementation notes (current state)

- **Extraction provider**: `lib/providers/anthropic-fact-find-provider.ts` calls
  Claude (model set at the top: `claude-opus-4-8`) via `@anthropic-ai/sdk` to
  read the fact-find into the strict `factFindExtraction` schema. API key is
  `env.AI_PROVIDER_API_KEY`. `lib/providers/get-extraction-provider.ts` picks the
  real provider when a key is present, else the placeholder.
- **Never store the raw image**: the uploaded fact-find is sent straight to
  Claude and discarded; only the extracted/reviewed data is persisted. HEIC/HEIF
  (iPhone photos) is converted server-side with `heic-convert` before sending —
  never rely on browser conversion.
- **Retention purge (auto-expiry)**: `GET /api/purge` runs
  `purgeExpiredCasesWorkflow`, deleting cases untouched longer than
  `CASE_RETENTION_DAYS` (default 30). Gated by `CRON_SECRET` (disabled until set);
  `vercel.json` invokes it daily. DB `on delete cascade` wipes each case's
  documents/extractions/reviews/submissions.
- **Freehand handling**: extraction places stray/margin handwriting into the
  right field where confident, else into `additional_notes.unmapped_fact_find_notes`.

## Testing conventions

Integration tests fake Supabase by overriding `require.cache` for
`lib/supabase.js` (see `tests/integration/*.test.ts`). Follow that pattern rather
than hitting a real database.
