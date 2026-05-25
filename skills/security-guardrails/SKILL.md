# Security Guardrails

Purpose:

Protect data, secrets and ownership boundaries.

Rules:

- Never expose secrets client-side.
- Service role keys remain server-only.
- Use server-only for server modules.
- Auth must be enforced server-side.
- Do not rely on client-side authorization.
- Protected actions require authenticated users.
- Do not log secrets.
- Do not log uploaded documents.
- Do not log extraction prompts.
- Do not log extracted client information.
- Ownership boundaries must be enforced.
- Validate before persistence.
- Prefer secure defaults.

Ownership:

Users must only access their own records.

Never trust client-provided ownership information.

Server determines ownership.