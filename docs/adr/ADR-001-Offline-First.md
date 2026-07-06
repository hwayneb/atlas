# ADR-001: Offline First

## Status

Accepted

## Context

The project goal is to create the best single-player D&D experience that can run completely offline on an iPad. The engine must not depend on cloud services, user accounts, backend APIs, or runtime network access.

The current MVP already establishes these hard boundaries:

- No runtime network calls
- No cloud APIs
- No login or authentication
- All campaign data is local
- Campaign state persists locally
- The app is usable as a local-first web app/PWA

## Decision

The engine will be offline-first by default and cloud-independent by design.

All core gameplay systems must operate using local campaign packages, local assets, local state, and local save files. Network access is not part of the core runtime contract.

Cloud AI, if added later, will be treated only as an optional enhancement layer and must never become required for campaign loading, save restoration, rules execution, event replay, or campaign progression.

## Consequences

Positive:

- Players own their campaign state.
- The app remains usable during travel, poor connectivity, or long-term archival.
- Campaigns and saves can be portable local files.
- Core engine behavior stays deterministic and testable.

Tradeoffs:

- Rich AI features need a local fallback.
- Large campaigns require careful local storage and asset management.
- Sync across devices is outside the core architecture unless implemented as explicit import/export.

## Requirements

- Runtime code must not call external network APIs.
- Saves must be restorable without a user account.
- Campaign packages must be loadable from local data.
- Core rules and state transitions must be deterministic.
- Optional integrations must degrade cleanly when unavailable.

## Notes

This ADR is the foundation for later Event Engine, World Engine, and AI Adapter decisions.
