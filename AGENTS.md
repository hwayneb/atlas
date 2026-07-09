# AGENTS.md

This repository is for Atlas.

## Source of Truth

Use these root documents as the project source of truth:

- `README.md`
- `PROJECT-BLUEPRINT.md`
- `ARCHITECTURE.md`
- `ROADMAP.md`
- `FEATURE-STATUS.md`
- `DECISION-LOG.md`

Do not contradict those documents. If a requested change conflicts with them, update the relevant source-of-truth document first or ask for clarification.

## Working Guidance

- Keep naming consistent: `Atlas`.
- Prefer small, reviewable changes.
- Avoid speculative abstractions.
- Do not implement major architecture changes without updating `DECISION-LOG.md`.
- Preserve useful existing content.
- Keep the engine offline-first, local-first, deterministic, and event-sourced.
