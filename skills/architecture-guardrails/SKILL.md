# Architecture Guardrails

Purpose:

Maintain clean architecture and reduce technical debt.

Rules:

Keep layers separated:

Schema

↓

Validation

↓

Repository

↓

Service

↓

UI

Responsibilities:

Schemas:

- Data contracts only.

Validation:

- Reusable validation logic only.

Repositories:

- Persistence only.
- No business logic.

Services:

- Business flow only.
- Orchestration only.

UI:

- Presentation only.
- No database logic.
- No business logic.

Rules:

- Validate before persistence.
- Reuse existing patterns.
- Prefer deterministic systems before AI systems.
- Prefer maintainable code over clever code.
- Repository functions using service role access must enforce ownership boundaries.
- Do not create abstractions before needed.
- Do not build future-ticket architecture.