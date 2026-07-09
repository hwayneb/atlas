# ChatGPT Handoff Archive - Atlas

Date: 2026-07-07

## Project Identity

The repository now presents itself as **Atlas**.

Atlas is an offline-first solo D&D campaign engine designed for local iPad/PWA play. Cloud AI is an optional enhancement, not a dependency.

## Source-of-Truth Documents

Use these root documents first:

- `README.md`
- `PROJECT-BLUEPRINT.md`
- `ARCHITECTURE.md`
- `ROADMAP.md`
- `FEATURE-STATUS.md`
- `DECISION-LOG.md`
- `AGENTS.md`

Supporting architecture and implementation records live under:

- `docs/adr/`
- `docs/contracts/`
- `docs/design-reviews/`
- `docs/implementation-reviews/`

## Current Architecture Rules

- Offline-first
- No backend services
- No runtime network calls
- No cloud APIs
- No login or authentication
- Local campaign packages
- Local save files
- Event log is authoritative
- Commands express intent and are transient
- Events express facts and are persisted
- Projections are disposable and rebuildable
- Snapshots are performance artifacts only
- Random outcomes must be stored in event payloads
- Replay executes events only

## Recent Hygiene Pass

### Files Created

- `AGENTS.md`
- `PROJECT-BLUEPRINT.md`
- `ARCHITECTURE.md`
- `ROADMAP.md`
- `FEATURE-STATUS.md`
- `DECISION-LOG.md`

### Files Changed

- `README.md`
- `package.json`
- `index.html`
- `public/manifest.webmanifest`
- `public/sw.js`
- `src/storage/saveManager.ts`
- `src/ui/app.js`
- `docs/contracts/runtime-api.md`
- `docs/design-reviews/FEAT-003-Campaign-Runtime-Design-Review.md`
- `docs/implementation-reviews/FEAT-003A-Command-Processor-Implementation-Review.md`

### Files Consolidated

- `docs/ARCHITECTURE.md` was consolidated into root `ARCHITECTURE.md`.

### Generated Junk Removed

- `.DS_Store`
- `docs/.DS_Store`

## Stale Identity Cleanup

Normalized outward-facing identity from stale `Hybrid D&D Solo Engine` / `hybrid-dnd` references to `Atlas`.

Updated:

- README project title
- package name and description
- browser title
- PWA manifest name
- service worker cache name
- localStorage keys
- runtime contract/design review naming references

Stale-reference scan was clean for:

- `Altas`
- `codex-to-atlas`
- `new-rpg-test`
- `Hybrid D&D`
- `hybrid-dnd`
- old `docs/ARCHITECTURE` links

## Runtime Implementation Status

Implemented:

- Command Processor
- Plugin Registry
- Validation Pipeline
- Rule Engine boundary
- Event Store
- In-memory Event Storage Adapter
- Event Schema Registry
- Event validation
- Event id assignment
- Contiguous sequence assignment
- Deterministic retrieval APIs
- Integrity verification

Designed but not yet implemented:

- Replay Engine
- Projection Manager
- Snapshot Manager
- event-sourced Save Manager
- domain engines

## Test Status

Command:

```text
/Users/wayne/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test --experimental-strip-types tests/*.test.ts
```

Result:

```text
tests 36
pass 36
fail 0
```

## Open TODOs

- Confirm final end-user product naming for campaign packages and save file extensions.
- Define the first playable vertical slice that uses the runtime event log end to end.
- Prioritize Replay Engine implementation after FEAT-003C design approval.
- Reconcile early localStorage save manager with the event-sourced Save Manager design.
- Promote ADR statuses from Proposed to Accepted when approved by the project owner.

## Notes for ChatGPT

- Treat root `ARCHITECTURE.md` as the current architecture source, not the removed `docs/ARCHITECTURE.md`.
- Keep naming consistent as `Atlas`.
- Do not add cloud, network, login, or backend requirements to core play.
- Before major architecture changes, update `DECISION-LOG.md`.
- Prefer small, reviewable changes over broad refactors.
