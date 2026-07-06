# ADR-002: Event Engine

## Status

Proposed

## Context

The campaign engine needs an authoritative history of play. MVP-001 currently stores `GameState` directly, including current scene, journal entries, completed actions, and timestamps.

As the system grows to include Story Engine, NPC Memory, Relationship Engine, Quest Engine, Combat Engine, Inventory, and World Engine, state-only saves will become fragile. They are harder to debug, migrate, replay, explain, and export.

## Decision

Introduce an append-only Event Engine as the authoritative campaign history.

The event log will become canonical. `GameState`, journal views, NPC memories, relationships, quest state, inventory state, and world state will be deterministic projections produced from replaying events.

Only the event log is authoritative. Any projection, including `GameState`, Journal, NPC Memory, Quest State, Relationship State, and World State, may be discarded and rebuilt at any time from the event history.

Events must be:

- Immutable
- Ordered by monotonic sequence
- Portable as local JSON
- Versioned
- Deterministic
- Independent of wall-clock time for game logic

## Event Shape

Each event should include:

- `id`
- `campaignId`
- `sequence`
- `type`
- `timestamp`
- `actorId`
- `payload`
- `metadata`

Timestamps are informational. Deterministic ordering comes from `sequence`.

## Storage Format

The preferred portable save format is a local JSON package containing:

- Save schema version
- Campaign package id and version
- Created and updated timestamps
- Latest sequence
- Optional snapshots
- Event list

Active browser storage may use IndexedDB long term, with JSON export/import as the portability boundary.

## Replay Strategy

Replay starts from the first event or from the latest compatible snapshot, then applies events in sequence. Random outcomes such as dice rolls must be stored as event payloads and not recomputed.

Snapshots and cached projections are performance artifacts only. They must never contain campaign facts that cannot also be derived from the event log.

## Consequences

Positive:

- Full campaign history is preserved.
- Saves become explainable and debuggable.
- Journal, NPC memory, and world state can be rebuilt.
- Projection corruption can be repaired by replaying the event log.
- Modded campaigns can reason about what happened.
- Optional AI can read context without owning state.

Tradeoffs:

- Event schemas need migration discipline.
- Replay bugs can affect many projections.
- Very long campaigns need snapshots and indexing.

## Open Questions

- Snapshot interval for long campaigns
- Event migration format
- Whether event ids are deterministic, random UUIDs, or derived from sequence plus save id
- How strictly campaign package version mismatches should be handled
