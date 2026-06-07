# Motor Trade AI Suite

Internal V1 workflow tool for motor trade insurance submissions.

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Create local environment file

Copy the example environment file:

```bash
cp .env.example .env.local
```

Then open `.env.local` and fill in the values.

Important:

- Real Clerk keys must be pasted manually by the developer.
- Do not ask another person or AI assistant to handle real secrets.
- Do not paste real secrets into chat, tickets, commits, logs, or screenshots.
- Do not commit `.env.local`.

`.env.local` is intentionally ignored by Git via `.gitignore`.

### 3. Required environment variables

The app validates environment variables at startup. These values are required:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
CLERK_SECRET_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
AI_PROVIDER_API_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
SENTRY_DSN=
```

Only `NEXT_PUBLIC_*` values are intended for client-side exposure. Secret values such as `CLERK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, provider keys, Redis tokens, and Sentry DSN must stay in `.env.local`.

### 4. Run locally

```bash
npm run dev
```

The app will start on the local Next.js dev server, usually:

```bash
http://localhost:3000
```

### 5. Test from a phone on the same Wi-Fi

Use the LAN dev server script:

```bash
npm run dev:lan
```

Open the app on the phone using the Mac's LAN address:

```bash
http://192.168.0.181:3001
```

If the Mac's LAN address changes, update `allowedDevOrigins` in `next.config.ts`
to match the new address, then restart the dev server.

### 6. Validate before handing off changes

```bash
npm run typecheck
npm run test:integration
npm run build
```
