# CLAUDE.md

Guidance for Claude Code working in this repo. The project rules live in
`AGENTS.md` — treat it as the source of truth and follow it:

@AGENTS.md

## What this is

Motor Trade AI Suite: two stateless tools for a UK motor trade insurance
broker, behind Clerk auth. **Nothing is persisted** — no database, no file
storage; every tool is fill-in → copy-out. Next.js 15 (App Router) +
React 19, Tailwind, Zod. Deployed on Vercel.

1. **`/composer` — Submission Composer.** Manual form (filled from the paper
   fact-find) → deterministic template outputs: Motor Trade + Material Damage
   additional-information text and the underwriter email. No AI call.
2. **`/policy-letter` — Policy Letter Generator.** Used after a quote is
   accepted: upload the insurer's policy schedule PDF → Claude extracts
   endorsements/conditions/exclusions/excesses (preserving reference codes
   like `MD050 - Flood exclusion`) → broker reviews/edits → adds premium and
   finance figures → generates the client letter body to paste into Acturis.

## Commands

- `npm run dev` — local dev server (http://localhost:3000)
- `npm run typecheck` — `tsc --noEmit`; run after any change
- `npm run test:integration` — compiles to `.test-build/` then runs the
  `node:test` suite in `tests/integration/`
- `npm run build` — production build; run before considering a change done

## Architecture layers (keep separate — see AGENTS.md)

- `lib/schemas` — Zod data contracts
- `lib/validation` — reusable validation logic
- `lib/services` — business flow / orchestration
- `lib/providers` — external integrations (AI extraction)
- `lib/*.ts` — pure generation logic (`submission-composer.ts`,
  `policy-letter.ts`)
- `app/` — UI (server components/actions) only; no business logic here

There is deliberately no `lib/repositories` layer and no database — do not
reintroduce persistence without an explicit decision (it brings back GDPR
storage-limitation obligations).

## Key implementation notes (current state)

- **Policy schedule extraction**:
  `lib/providers/policy-schedule-extraction-provider.ts` sends the PDF as a
  base64 document block to `claude-sonnet-5` via `@anthropic-ai/sdk`, with a
  JSON template in the prompt (NOT strict structured outputs — large schemas
  hit the "compiled grammar too large" 400), then parses and validates with
  `extractedPolicyDataSchema`. API key is `env.AI_PROVIDER_API_KEY`.
- **Nothing is stored**: the PDF is read into memory, sent to Claude, and
  discarded. Composer/letter state lives only in browser memory.
- **Env vars** (validated in `env.ts`): Clerk keys + `AI_PROVIDER_API_KEY`
  only.
