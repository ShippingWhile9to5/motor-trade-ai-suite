# CLAUDE.md

Guidance for Claude Code working in this repo. The project rules live in
`AGENTS.md` — treat it as the source of truth and follow it:

@AGENTS.md

## What this is

Motor Trade AI Suite: a CRM and tooling suite for one UK motor trade
insurance broker (Nick), behind Clerk auth. Next.js 15 (App Router) +
React 19, Tailwind, Zod, Supabase (Postgres). Deployed on Vercel.

Nick's real-world workflow, and where each tool fits:

1. Paper fact-find at the client → typed by hand into **Acturis** (his broker
   management system). No AI involved, by choice — Acturis has no import path,
   so an app that "captured" the fact-find saved him nothing.
2. **`/composer` — Submission Composer.** Manual form → deterministic template
   outputs: Motor Trade + Material Damage additional-information text and the
   underwriter email. No AI call, nothing saved.
3. **`/policy-letter` — Policy Letter Generator.** After a quote is accepted:
   upload the insurer's policy schedule PDF → Claude extracts endorsements /
   conditions / exclusions / excesses (verbatim, preserving codes like
   `MD050 - Flood exclusion`) → broker reviews and edits → generates the
   opening paragraph plus three copy-out blocks for Acturis and the client
   letter. Nothing saved.
4. **`/quote-tracker` — Quote Tracker.** Kanban board of live quotes with SLA
   urgency flags. Persisted.
5. **`/prospect-finder` — Prospect Finder.** Companies House SIC search →
   save firms as prospects. Persisted.
6. **`/prospect-board` — Prospect Board.** Every business you are working, in
   one list: search, status filter, sort, and a "Due today" view driven by the
   `follow_up` date. A prominent **Add prospect** button is the cold-call entry
   point (name only is enough). Also imports a JSON backup from the old
   standalone board. Persisted.

Planned (not built): **Phase 4** Home — Today view, reminders (including loose
ones with no business attached), won/pipeline dashboard, export.

## Commands

- `npm run dev` — local dev server (http://localhost:3000)
- `npm run typecheck` — `tsc --noEmit`; run after any change
- `npm run test:integration` — compiles to `.test-build/` then runs the
  `node:test` suite in `tests/integration/`
- `npm run build` — production build; run before considering a change done

## Architecture layers (keep separate — see AGENTS.md)

- `lib/schemas` — Zod data contracts
- `lib/validation` — reusable validation logic
- `lib/repositories` — persistence only (Supabase); every query scoped by
  `user_id`
- `lib/services` — business flow / orchestration
- `lib/providers` — external integrations (Claude extraction, Companies House)
- `lib/*.ts` — pure logic (`submission-composer.ts`, `policy-letter.ts`,
  `quote-tracker.ts`, `prospect-finder.ts`, `prospect-board.ts`)
- `app/` — UI (server components/actions) only; no business or DB logic here

## Data model

One shared **`business`** record per motor-trade firm is the spine: it starts
as a prospect (from the Finder or a manual add) and the *same* row carries
through `prospect → contacted → quoting → won/lost`. A client is entered once.

- **`business`** — name, Companies House details, contact info, rating,
  `pipeline_status`, `follow_up` (the Prospect Board's call-back date),
  `source` (`manual` | `finder` | `import`). Unique index on
  `(user_id, company_number)` is the dedup guard, so only a real Companies
  House number belongs in that column — `splitCompanyNumber()` keeps free text
  out of it on import.
- **`quote`** — belongs to a business: insurer, type, submission date, 5-stage
  pipeline, premiums, outcome, `stage_entered_at` (the SLA clock).

Creating a quote finds-or-creates the client by name and sets them to
`quoting`; a `Won` outcome flips the business to `won`, `Lost`/`NTU` to `lost`.

## What is and isn't stored

Persistence exists for the **CRM only**. The deliberate line:

- **Stored:** pipeline data — business names, Companies House info, quote
  stages, premium figures, notes. Nick's own commercial data.
- **Never stored:** the sensitive risk detail. Policy schedule PDFs are read
  into memory, sent to Claude and discarded; Composer and Policy Letter state
  lives only in browser memory. No fact-find PII, no DOBs, no addresses of
  individuals, no policy documents.

Do not blur that line without an explicit decision — it is the product's
selling point.

## Key implementation notes (current state)

- **Policy schedule extraction**:
  `lib/providers/policy-schedule-extraction-provider.ts` sends the PDF as a
  base64 document block to `claude-sonnet-5`, with a JSON template in the
  prompt (NOT strict structured outputs — large schemas hit the "compiled
  grammar too large" 400), then parses and validates with
  `extractedPolicyDataSchema`. The prompt is tuned against three real
  schedules (Niche, NIG, Covéa): codes and headings verbatim with no
  paraphrasing, exclusions must carry a code, excesses are single
  `Name - £amount` lines. **Treat that prompt as tested — re-verify against
  real PDFs before changing it.**
- **The only AI call in the suite is that extraction.** Everything else is
  deterministic. Companies House is a free external API, not AI.
- **Supabase uses the service-role key**, which bypasses RLS — so ownership is
  enforced in the repository layer. Every query must filter on `user_id`.
- **Env vars** (validated in `env.ts`): Clerk keys, `AI_PROVIDER_API_KEY`,
  `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and optional
  `COMPANIES_HOUSE_API_KEY` (optional so a missing key degrades only the
  Finder, not the whole app).
- **Migrations** live in `supabase/migrations/`. There is no CLI access — Nick
  runs the SQL manually in the Supabase SQL Editor. Give him the SQL to paste,
  and note that a leading `--` comment line can get mangled on copy.
- **`migration-source/`** holds the standalone apps being folded in. It is
  gitignored and excluded from tsconfig — reference material only, it carries
  its own `node_modules` and `.env.local`.

## Testing conventions

Integration tests fake Supabase by overriding `require.cache` for
`lib/supabase.js` — call `installFakeSupabase()` from
`tests/integration/helpers/fake-supabase.ts`. Code that imports the validated
`env` directly (e.g. external-service providers) also needs
`installFakeEnv()`. Follow that pattern rather than hitting a real database.
