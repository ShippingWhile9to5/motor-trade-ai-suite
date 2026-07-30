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
3. **`/policy-letter` — Policy Schedule Reader.** (Route kept as
   `/policy-letter`; it was renamed because it never wrote a letter.) After a
   quote is accepted:
   upload the insurer's policy schedule PDF → Claude extracts endorsements /
   conditions / exclusions / excesses (verbatim, preserving codes like
   `MD050 - Flood exclusion`) → broker reviews and edits → generates the
   opening paragraph plus three copy-out blocks for Acturis and the client
   letter. Nothing saved.
4. **`/quote-tracker` — Quote Tracker.** Kanban board of live quotes with SLA
   urgency flags. Persisted.
5. **`/prospect-finder` — Prospect Finder.** Companies House SIC search →
   save firms as prospects. Persisted.
6. **`/prospect-board` — Prospect Board.** Four tabs.
   **Pipeline** is everything still live, split by *named view* rather than
   raw filters — **Due today / To contact / Working / All**, each with a count.
   It opens on To contact, which is where a calling session starts, and each
   view carries the sort that suits its job (`DEFAULT_SORT_FOR_VIEW`). A
   search ignores the active view and looks across everything live, so a firm
   is never hidden in a pile you are not looking at. **Add prospect** is the
   cold-call entry point (name only is enough); **Import prospects** takes a
   JSON batch and shows a copyable spec of the keys it reads. Each row has
   **No answer** (counts the attempt, leaves the status alone) and **Quote**
   (opens the tracker with the firm already attached).
   **Won** and **Lost** list the closed firms, premium and commission
   editable in place. **Commission** is the quarterly return — see below.
   Persisted.

7. **`/` — Home.** The **Today** view: reminders, call-backs due from the
   board, and quotes past their SLA, overdue first. **Add reminder** takes a
   date and an *optional* firm, so a cold call to someone not yet logged still
   gets a reminder. **Top 5 for the meeting** formats the most advanced live
   deals as plain text with a Copy button — for the monthly sales meeting,
   pasted into Word or an email. Below that, the five tools in workflow order.

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
- `lib/*.ts` — pure logic, no I/O: `submission-composer.ts`, `policy-letter.ts`,
  `quote-tracker.ts` (stages + SLA), `prospect-finder.ts`, `prospect-board.ts`
  (views, sorts, import mapping), `today.ts` (the Today list), `top-five.ts`
  (the meeting list), `reporting.ts` (calendar quarters, money formatting),
  `commission.ts` (the quarterly return)
- `app/` — UI (server components/actions) only; no business or DB logic here.
  `app/nav.tsx` is the shared top bar, `app/icons.tsx` the inline SVGs. The
  single accent colour is `brand` in `tailwind.config.js` — change it there
  and it changes everywhere.

## Data model

One shared **`business`** record per motor-trade firm is the spine: it starts
as a prospect (from the Finder or a manual add) and the *same* row carries
through `prospect → contacted → quoting → won/lost`. A client is entered once.

- **`business`** — name, Companies House details, contact info, rating,
  `pipeline_status`, `follow_up` (the Prospect Board's call-back date),
  `attempts` + `last_attempt_at` (rang out, nobody answered),
  `source` (`manual` | `finder` | `import`). Unique index on
  `(user_id, company_number)` is the dedup guard, so only a real Companies
  House number belongs in that column — `splitCompanyNumber()` keeps free text
  out of it on import.
  Two rules live in `updateBusinessWorkflow`, not in a form, so they hold
  wherever the edit comes from: **setting a `follow_up` promotes a `prospect`
  to `contacted`** (a call-back date is evidence you spoke to them), and it
  never overrides a status set in the same edit nor demotes one further along.
  **Ringing out is not a status change** — `recordCallAttemptWorkflow` counts
  the attempt and leaves the firm in the queue, which is what makes the
  "best to ring" sort reorder itself as you work down it.
- **`quote`** — belongs to a business: insurer, type, submission date, 6-stage
  pipeline, premiums, outcome, `stage_entered_at` (the SLA clock). Stages 4–5
  (`Sent to Client` / `Back to Insurer`) are the client-facing loop: the quote
  goes out, the client pushes back on price, it goes back to the insurer for a
  sharper number, and round again. Setting an outcome closes the quote and
  silences its SLA flag, and stamps `closed_at` — the date the win is reported
  in, which `stage_entered_at` cannot be trusted for because moving the stage
  afterwards would reset it. `initial_quoted_premium` is captured automatically
  the first time a quoted price is entered, so a negotiated reduction does not
  erase what the insurer first put up. `policy_type` is the **product** (Motor
  Trade Combined, Fleet, Contractors Combined, Property Owners, or typed in) —
  not to be confused with `quote_type`, which is New Business vs Renewal; the
  commission return needs both and they are different columns. `fee` is fee
  income. `commission` is typed in by hand (Nick's
  choice — it varies by insurer and scheme), so the Won tab counts how many
  won deals are missing one rather than quietly understating the total.

- **`reminder`** — body, `due_date`, `done`, and an **optional** `business_id`
  (`on delete set null`, not cascade — deleting a firm must not silently bin
  your note to call them). The optional link is the point: loose cold-call
  reminders have to work without a prospect record.

A quote attaches to a firm **by id** when picked from the dropdown or reached
via the board's Quote button; typing a name falls back to find-or-create, which
can only ever be as good as the spelling. Either way the client is set to
`quoting`; a `Won` outcome flips the business to `won`, `Lost`/`NTU` to `lost`.

## The commission return

`lib/commission.ts` mirrors, column for column, the spreadsheet Nick sends his
manager each quarter: policyholder, policy type, insurers, gross premium,
commission income, fee income, total income, and his `BROKER_SHARE` (20%).
Total income is commission + fee; the share is a flat fifth of that. **Copy for
Excel** emits tab-separated text — commas do not paste into cells reliably —
with no currency symbols, and a blank figure exports blank rather than as a
misleading zero. Won deals missing a commission are counted and flagged, so a
short return says so instead of looking complete.

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
