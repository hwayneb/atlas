# FEAT-003C – Replay Engine Design Review

## 1. Feature Understanding

FEAT-003C designs the Replay Engine for the Campaign Runtime.

The Replay Engine rebuilds campaign projections from persisted events and optional snapshots. It is the deterministic restore path for campaign state and the correctness fallback when projections or snapshots are missing, stale, or invalid.

Replay operates only on authoritative `CampaignEvent` records from the Event Store. It never executes commands, never re-rolls randomness, never calls AI, and never depends on network services.

## 2. Goals

The Replay Engine should:

- Rebuild projections from event history.
- Support full replay from event sequence zero.
- Support replay from a compatible snapshot plus later events.
- Preserve deterministic behavior.
- Stop on unknown or unsupported event types unless migration support exists.
- Report failing event sequence and diagnostics.
- Integrate cleanly with the Projection Manager.
- Keep snapshots optional and non-authoritative.
- Provide a reliable recovery path for disposable projections.

## 3. Responsibilities

The Replay Engine owns:

- Replay orchestration
- Event ordering validation before projection application
- Snapshot compatibility checks for replay start
- Applying event streams through the Projection Manager
- Reporting replay progress and diagnostics
- Returning rebuilt projections
- Stopping safely on replay failure

The Replay Engine is responsible for restoring projection state, not for creating campaign history.

## 4. Non-Responsibilities

The Replay Engine does not own:

- Command execution
- Command validation
- Rule execution
- Event append
- Event persistence
- Event Store storage
- Domain rules
- Projection reducer definitions
- Snapshot creation
- Save export/import
- UI rendering
- AI narration
- Runtime networking
- Cloud APIs
- Authentication

Replay does not mutate the event log and does not create new events.

## 5. Architecture Impact

The Replay Engine completes the event-sourced runtime loop:

```text
Event Store
-> Replay Engine
-> Projection Manager
-> Rebuilt Projections
-> UI / Validation Context
```

Architecture impact:

- Events remain authoritative.
- Commands remain transient.
- Projections remain disposable.
- Snapshots remain performance artifacts only.
- Replay is the canonical projection rebuild process.
- Replay order is determined by event sequence, not timestamp.

## 6. Replay Inputs

Replay inputs should include:

- Campaign package
- Ordered or retrievable campaign events
- Optional compatible snapshot
- Projection Manager
- Event schema registry
- Optional migration registry
- Replay options

Input requirements:

- Events must be `CampaignEvent` records, not `EventCandidate` objects.
- Events must include Event Store assigned ids and sequences.
- Event sequence determines replay order.
- Snapshot sequence must be less than or equal to the first replayed event sequence.
- Campaign id must match the active campaign.
- Campaign package metadata must be available for projection reducers.

## 7. Replay Output

Replay output should include:

- `ok` status
- rebuilt `ProjectionSet` when successful
- latest applied sequence
- diagnostics
- failing event sequence when replay fails
- failing event id when available

Replay output must be suitable for startup, restore, projection recovery, and diagnostics.

## 8. Replay Sequence

Full replay sequence:

```text
Load campaign package
-> Load event log from Event Store
-> Validate event ordering
-> Reset Projection Manager
-> Apply events in sequence
-> Return rebuilt projections
```

Snapshot replay sequence:

```text
Load campaign package
-> Load compatible snapshot
-> Restore snapshot into Projection Manager
-> Load events after snapshot sequence
-> Validate event ordering
-> Apply events in sequence
-> Return rebuilt projections
```

Replay must stop immediately on the first unrecoverable failure.

## 9. Snapshot Interaction

Snapshots are optional performance artifacts.

The Replay Engine may use a snapshot when:

- Snapshot campaign id matches.
- Snapshot campaign package version is compatible.
- Snapshot schema version is compatible.
- Projection schema versions are compatible.
- Snapshot sequence exists in the event history.
- Snapshot integrity checks pass.

If a snapshot is missing, stale, corrupted, or incompatible, replay must fall back to an earlier compatible snapshot or full replay.

The Replay Engine must not treat snapshot contents as authoritative campaign history. Event history remains authoritative.

## 10. Projection Manager Interaction

The Replay Engine uses the Projection Manager to apply events to projections.

Projection Manager responsibilities during replay:

- Reset projections for full replay.
- Restore projections from snapshot when applicable.
- Apply events in sequence.
- Return current projection set.

Replay Engine responsibilities:

- Provide ordered events.
- Stop on projection application failure.
- Report event sequence and diagnostics.
- Avoid direct projection mutation outside Projection Manager APIs.

Projection reducers must be deterministic and side-effect free.

## 11. Event Store Interaction

The Replay Engine consumes events from the Event Store.

Required Event Store interactions:

- Read all events for full replay.
- Read events after snapshot sequence for snapshot replay.
- Retrieve latest sequence when needed.
- Use Event Store integrity results when available.

The Replay Engine must not:

- Append events.
- Modify events.
- Delete events.
- Assign ids.
- Assign sequences.
- Repair the event log by inventing data.

## 12. Save Manager Interaction

The Save Manager uses the Replay Engine during campaign restore and import validation.

Required Save Manager interactions:

- Provide the campaign package and restored event log to replay.
- Provide the latest compatible snapshot when one is available.
- Use replay results to decide whether a save can be restored safely.
- Surface replay diagnostics when restore or import validation fails.

The Replay Engine must not:

- Export save files.
- Import save files.
- Replace active saves.
- Repair save files by mutating event history.
- Treat snapshot payloads as authoritative save data.

If replay fails during restore, the Save Manager should preserve the existing active save and report diagnostics to the UI or caller.

## 13. Determinism Rules

Replay must satisfy:

- Replay executes events only.
- Replay never executes commands.
- Replay never re-rolls randomness.
- Replay never calls AI.
- Replay never calls network services.
- Replay never calls cloud APIs.
- Replay never depends on authentication.
- Replay is deterministic for the same campaign package, event log, snapshot, and projection schemas.
- Event order is determined by sequence, not timestamp.
- Random outcomes must already exist in event payloads.
- Wall-clock time must not affect replay.

## 14. Failure Handling

Replay failure should:

- Stop at the first failing event.
- Report failing event sequence.
- Report failing event id when available.
- Report diagnostic code, message, severity, and source.
- Return no partially trusted projection set unless explicitly marked partial.
- Avoid skipping events silently.

Failure cases:

- Unknown event type
- Unsupported event schema version
- Unsupported metadata version
- Missing migration
- Invalid event ordering
- Campaign id mismatch
- Projection reducer failure
- Snapshot incompatibility
- Snapshot corruption

Snapshot failure should trigger fallback before replay fails, when a valid fallback path exists.

## 15. Corruption Handling

The Replay Engine should rely on Event Store integrity verification where possible, but it must still guard against corrupted replay inputs.

Replay should detect:

- Missing sequence
- Duplicate sequence
- Out-of-order events
- Campaign id mismatch
- Unsupported event type
- Unsupported schema version
- Unsupported metadata version
- Snapshot sequence mismatch
- Projection schema mismatch

Replay must not repair corruption by inventing events, changing payloads, skipping unknown events, or mutating event history.

Valid recovery options:

- Fall back to full replay.
- Fall back to an earlier compatible snapshot.
- Stop with diagnostics.
- Ask Save Manager or UI layer to restore from a valid portable save file.

## 16. Performance Strategy

Replay performance should support long-running campaigns on an M2 iPad Pro in Safari/PWA context.

Strategies:

- Prefer latest compatible snapshot for startup and restore.
- Replay only events after snapshot sequence when safe.
- Keep projection reducers small and deterministic.
- Process events in sequence order.
- Avoid loading large assets during replay.
- Store asset ids and campaign entity ids in events rather than large payload blobs.
- Allow event paging later for very long campaigns.
- Keep full replay available as the correctness fallback.

Performance optimizations must not weaken deterministic replay.

## 17. Public Interfaces

Canonical runtime interfaces are defined in `docs/contracts/runtime-api.md`. The interfaces below are design-level excerpts for FEAT-003C context and should not supersede the canonical contract.

```ts
interface ReplayEngine {
  replay(input: ReplayInput): Promise<ReplayResult>;
}

interface ReplayInput {
  campaignPackage: CampaignPackage;
  events: CampaignEvent[];
  snapshot?: Snapshot;
  projectionManager: ProjectionManager;
}

interface ReplayResult {
  ok: boolean;
  projections?: ProjectionSet;
  latestSequence: number;
  diagnostics: RuntimeDiagnostic[];
}
```

Future implementation may add explicit replay options, migration registry references, and failing sequence fields, but those additions must preserve the canonical contract.

## 18. Testing Strategy

Required test coverage:

- Full replay from empty event log
- Full replay from event log
- Replay from compatible snapshot
- Snapshot fallback when snapshot is invalid
- Events applied in sequence order
- Timestamp ignored for ordering
- Unknown event type stops replay
- Unsupported schema version stops replay
- Failing event sequence reported
- Projection reducer failure reported
- Replay never executes commands
- Replay never re-rolls randomness
- Replay does not append events
- Replay does not mutate Event Store
- Replay produces identical projections for identical inputs
- Replay remains offline-only with no network, backend, cloud API, login, or authentication dependency

Tests should use deterministic fixture event logs and fake projection reducers.

## 19. Risks

Primary risks:

- Replay accidentally executes command logic.
- Replay skips unknown events and hides corruption.
- Snapshot contents are treated as authoritative.
- Projection reducers introduce side effects.
- Event ordering accidentally uses timestamp.
- Random outcomes are recalculated instead of read from payloads.
- Long campaigns replay too slowly without snapshots.
- Replay diagnostics are insufficient for recovery.
- Migration behavior becomes mixed into projection logic.

## 20. Alternatives Considered

State-only restore:

- Faster and simpler.
- Rejected because projections are disposable and events are authoritative.

Snapshot-only restore:

- Fast startup.
- Rejected because snapshots are performance artifacts only.

Replay owned by Event Store:

- Centralizes event access and replay.
- Rejected because Event Store owns persistence and retrieval, while Replay Engine owns projection rebuild.

Projection Manager owning replay:

- Keeps projection logic close to reducers.
- Rejected because replay orchestration, snapshot selection, diagnostics, and failure handling need a dedicated runtime component.

## 21. Open Questions

- Should FEAT-003C implement full replay only first, or include snapshot-aware replay in the first slice behind a minimal interface?
- Should replay accept preloaded events only, or should it optionally read event ranges directly from the Event Store?
- What exact diagnostic shape should identify failing sequence, event id, and projection reducer source?
- Should migration support be stubbed in FEAT-003C or deferred until the first event schema migration is needed?
- Should projection reset/restore methods be defined in Projection Manager before Replay Engine implementation begins?

## 22. Recommendation

Treat the Replay Engine design as ready for owner approval before implementation.

The Replay Engine should be implemented as a deterministic runtime component that rebuilds disposable projections from authoritative events and optional compatible snapshots.

Replay must execute events only, never commands. It must never re-roll randomness, call AI, call network services, mutate event history, append events, or treat snapshots as authoritative.

This design preserves the approved offline-first, event-sourced architecture and prepares the runtime for reliable startup, restore, projection recovery, and future snapshot integration.
