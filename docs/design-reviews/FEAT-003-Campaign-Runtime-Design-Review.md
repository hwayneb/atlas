# FEAT-003 – Campaign Runtime Design Review

## 1. Feature Understanding

The Campaign Runtime is the execution layer for Atlas. It processes player intent, validates commands, executes deterministic rules, records authoritative events, rebuilds projections, manages snapshots, saves local campaign state, and restores campaigns.

The runtime is the integration boundary for all future subsystems, including Story Engine, Combat Engine, Quest Engine, NPC Memory, Relationship Engine, Inventory, Journal, World Engine, and AI Adapter.

The runtime must preserve the approved architecture from ADR-001, ADR-002, and ADR-003:

- Offline-first
- Event-sourced
- Deterministic
- Local-only
- Cloud-independent
- No backend
- No runtime networking
- No authentication

Core invariant:

- Commands express intent.
- Events express facts.
- Events are authoritative.
- Commands are transient.
- Projections are disposable.
- Snapshots are performance artifacts only.
- Random outcomes are stored as event payloads.
- Replay never recalculates randomness.

## 2. Goals

The Campaign Runtime should provide a stable foundation for implementation by defining how campaigns are executed, saved, restored, and replayed.

Goals:

- Process player input through a consistent command pipeline.
- Validate intent before changing campaign history.
- Execute deterministic rules.
- Append authoritative events.
- Rebuild projections from events.
- Support save-anywhere play.
- Restore campaigns exactly where the player left off.
- Support local campaign packages and local save files.
- Work reliably in Safari/PWA on an M2 iPad Pro.
- Provide integration points for all future engine modules.
- Preserve deterministic replay across app launches and imports.

## 3. Responsibilities

The Campaign Runtime owns:

- Command Processor
- Validation Pipeline
- Rule Execution Pipeline
- Event Store
- Replay Engine
- Projection Manager
- Snapshot Manager
- Save Manager
- Runtime Services
- Runtime lifecycle

Runtime responsibilities include:

- Receiving commands from UI or subsystems
- Validating commands against campaign package data and current projections
- Running deterministic rule execution
- Producing one or more events from valid commands
- Appending events to the Event Store
- Updating projections after event append
- Replaying events to rebuild projections
- Creating and restoring snapshots
- Persisting active local save state
- Exporting and importing local save files
- Detecting corruption and incompatible schemas
- Coordinating startup, restore, command execution, and save lifecycle

## 4. Non-Responsibilities

The Campaign Runtime does not own:

- Combat rules
- Story generation
- NPC memory logic
- Quest logic
- Relationship calculations
- AI narration
- UI rendering
- Campaign authoring
- Cloud sync
- Authentication
- Backend services
- Network operations

Subsystems own their domain logic. The runtime owns execution flow, persistence, replay, and lifecycle.

## 5. Runtime Architecture

The Campaign Runtime follows this execution pipeline:

```text
Player Input
-> Command
-> Validation
-> Rule Execution
-> Event(s)
-> Event Store
-> Projection Manager
-> Updated Projections
-> UI
```

The runtime separates intent from history.

Commands are transient requests. They may succeed or fail validation. They are never stored.

Events are immutable facts. Events are appended by the Event Store and become the authoritative campaign history.

Projections are rebuildable views derived from events. They may be updated incrementally after command execution or rebuilt entirely during replay.

Snapshots are optional replay accelerators. They are never authoritative.

## 6. Component Diagram

```text
                         Local Campaign Package
                                  |
                                  v
Player Input / UI
      |
      v
Command Processor
      |
      v
Validation Pipeline
      |
      v
Rule Execution Pipeline
      |
      v
Event(s)
      |
      v
Event Store ----------------------> Local Active Store
      |
      v
Projection Manager <-------------- Replay Engine
      |                                  ^
      |                                  |
      v                                  |
Updated Projections              Snapshot Manager
      |
      v
UI Refresh

Save Manager <--------------------> Local Save File

Runtime Services:
- ID generation
- Runtime clock
- Schema registry
- Integrity checks
- Deterministic random recording
- Migration registry
```

## 7. Command Processing Pipeline

Commands express intent.

Examples:

- `TravelToLocation`
- `AttackTarget`
- `TalkToNPC`
- `CastSpell`
- `OpenDoor`
- `LongRest`
- `Wait`

The Command Processor should:

- Accept commands from UI or subsystems
- Attach runtime context
- Route commands to validation
- Invoke rule execution after validation
- Submit produced events to the Event Store
- Trigger projection updates after successful append
- Return command results to the caller

A command may produce zero events if validation fails.

A command may produce one event or many events if validation succeeds.

Example:

```text
TravelToLocation
-> TravelStarted
-> ClockAdvanced
-> WeatherChanged
-> RandomEncounterRolled
-> TravelCompleted
-> LocationEntered
```

Commands must not be persisted.

## 8. Validation Pipeline

The Validation Pipeline determines whether a command is legal in the current campaign state.

Validation inputs:

- Command payload
- Campaign package data
- Current projections
- Runtime metadata
- Domain validators

Validation outputs:

- Valid command result
- Invalid command result
- Validation diagnostics

Validation should check:

- Required command fields
- Campaign entity existence
- Current scene or location constraints
- Character availability
- Resource availability
- Timing constraints
- Quest constraints
- World state constraints
- Combat state constraints when applicable

Validation must not mutate state.

Invalid commands do not become campaign history unless a future explicit event type records visible failed attempts.

## 9. Rule Execution Pipeline

The Rule Execution Pipeline turns valid commands into deterministic events.

Rule execution inputs:

- Validated command
- Campaign package data
- Current projections
- Runtime services
- Domain rule handlers

Rule execution outputs:

- Ordered event list
- Runtime diagnostics

Rules must be deterministic.

Random outcomes must be resolved during command execution and stored in event payloads. Replay must never recalculate randomness.

Rule execution may involve multiple subsystems. For example, travel may involve World Engine, Quest Engine, Journal, NPC schedules, random encounter rules, and merchant inventory changes.

The output of rule execution is events, not direct state mutation.

## 10. Event Store Design

The Event Store is the only runtime component allowed to append events.

The Event Store should be append-only.

Responsibilities:

- Validate event batch structure
- Assign or verify event sequence
- Append events atomically from the runtime perspective
- Persist events locally
- Return event ranges by sequence
- Return full event history for replay and export
- Detect duplicate, missing, or invalid sequences
- Preserve event order
- Coordinate event integrity metadata

Each event should include:

- `id`
- `campaignId`
- `sequence`
- `type`
- `schemaVersion`
- `timestamp`
- `actorId`
- `payload`
- `metadata`

Event ordering is determined by `sequence`, not timestamp.

Timestamps are informational and must not affect replay.

## 11. Replay Engine Design

The Replay Engine rebuilds campaign state by applying events in sequence.

Replay inputs:

- Campaign package
- Event log
- Optional compatible snapshot
- Event schema registry
- Projection registry
- Migration registry

Replay outputs:

- Projection set
- Latest applied sequence
- Replay diagnostics
- Success or failure result

Replay must:

- Execute events only
- Never execute commands
- Never reroll random outcomes
- Never call network APIs
- Never call cloud services
- Never call AI services
- Stop on unknown event types
- Stop on unsupported event versions unless migration exists
- Report the failing event sequence and reason

Replay is the source of truth for restoring campaign state.

## 12. Projection Manager Design

The Projection Manager owns rebuildable read models.

Projection examples:

- `GameState`
- `World State`
- `Journal`
- `Quest State`
- `NPC Memory`
- `Relationship State`
- `Inventory State`
- `Combat State`

The Projection Manager should:

- Register projections
- Apply events to projections in sequence
- Rebuild projections from the full event log
- Restore projections from compatible snapshots
- Replay post-snapshot events
- Provide current projections to validation and UI
- Discard and rebuild projections when needed

Projection reducers must be deterministic and side-effect free.

Projections are disposable and must not contain facts that cannot be rebuilt from events.

## 13. Snapshot Manager Design

The Snapshot Manager creates and restores projection snapshots.

Snapshots are performance artifacts only.

A snapshot should include:

- Snapshot id
- Campaign id
- Campaign package version
- Snapshot schema version
- Projection schema versions
- Covered event sequence
- Projection payloads
- Created timestamp
- Integrity metadata

The Snapshot Manager should:

- Create snapshots at configured intervals
- Create snapshots at major runtime boundaries
- Load the latest compatible snapshot
- Validate snapshot compatibility
- Discard invalid snapshots
- Fall back to replay when snapshots are unavailable or invalid

Snapshots must never become authoritative.

## 14. Save Manager Design

The Save Manager coordinates local active state and local save files.

Responsibilities:

- Load active local campaign runtime data
- Persist active runtime metadata
- Coordinate Event Store and Snapshot Manager persistence
- Export portable save files
- Import portable save files
- Validate save files before activation
- Prevent failed imports from overwriting active saves
- Restore campaigns without login, cloud APIs, or network access

The Save Manager persists authoritative events and optional performance artifacts. It does not own campaign facts.

## 15. Runtime Service Interfaces

Runtime Services provide deterministic support functions for command processing, replay, save/load, and validation.

Runtime Services include:

- ID generation
- Runtime clock
- Schema registry
- Event validation
- Event migration
- Integrity checks
- Deterministic random recording
- Storage adapter access
- Runtime diagnostics

Runtime Services must not introduce nondeterminism into replay.

Runtime clocks may produce informational timestamps during command execution, but replay ordering must use event sequence.

Random services may generate random outcomes during command execution, but those outcomes must be stored in events and reused during replay.

## 16. Startup Sequence

Startup should follow this sequence:

```text
Open app
-> Load local campaign package
-> Initialize Runtime Services
-> Initialize Event Store
-> Initialize Save Manager
-> Load active save metadata
-> Load latest compatible snapshot if available
-> Load event log or post-snapshot event range
-> Replay events
-> Rebuild projections
-> Publish projections to UI
```

Startup must not require network access.

If no active save exists, the runtime may initialize a new campaign by appending initial campaign events through the Event Store.

## 17. Command Execution Sequence

Command execution should follow this sequence:

```text
Player Input
-> Build Command
-> Command Processor
-> Validation Pipeline
-> Rule Execution Pipeline
-> Event(s)
-> Event Store append
-> Projection Manager applies appended events
-> Save Manager marks runtime dirty or persisted
-> UI receives updated projections
```

If validation fails:

```text
Command
-> Validation failure
-> No events appended
-> No campaign history change
-> UI receives validation result
```

If append fails:

```text
Event(s)
-> Event Store append failure
-> Projections are not finalized
-> UI receives failure result
-> Prior campaign state remains authoritative
```

## 18. Save Sequence

Save should persist the authoritative event log and relevant runtime metadata.

Recommended save sequence:

```text
Command execution completes
-> Event Store confirms append
-> Projection Manager updates projections
-> Snapshot Manager creates snapshot if needed
-> Save Manager persists active metadata
-> Runtime marks save complete
```

Export sequence:

```text
Export requested
-> Event Store reads full event log
-> Snapshot Manager provides optional compatible snapshots
-> Save Manager builds portable save file
-> Integrity metadata is generated
-> Local file is produced
```

Commands are not saved.

## 19. Restore Sequence

Restore should rebuild campaign state from local data.

Recommended restore sequence:

```text
Load campaign package
-> Load local save file or active store
-> Validate save metadata
-> Validate event log
-> Validate schemas
-> Load latest compatible snapshot if available
-> Replay events after snapshot sequence
-> Rebuild projections
-> Publish restored projections
```

If snapshot validation fails, restore should fall back to an earlier snapshot or full replay.

If event log validation fails, restore should stop with diagnostics.

## 20. Failure Recovery

Command validation failure:

- Append no events.
- Persist nothing.
- Return validation diagnostics.

Rule execution failure:

- Append no events.
- Persist nothing.
- Return runtime diagnostics.

Event append failure:

- Treat events as uncommitted.
- Do not finalize projection updates.
- Preserve prior event log and projections.

Replay failure:

- Stop at the failing event.
- Report event sequence, type, and failure reason.
- Do not skip events silently.

Snapshot failure:

- Discard invalid snapshot.
- Try older compatible snapshot.
- Fall back to full replay.

Import failure:

- Reject imported file.
- Preserve active save.
- Report validation diagnostics.

## 21. Corruption Detection

Corruption detection should include:

- Malformed save file
- Campaign id mismatch
- Campaign package version incompatibility
- Missing event fields
- Unknown event type
- Unsupported event schema version
- Invalid event payload
- Non-monotonic event sequence
- Duplicate event sequence
- Missing event sequence
- Snapshot sequence mismatch
- Snapshot schema mismatch
- Projection schema mismatch
- Integrity hash/checksum mismatch where available

The runtime must not repair corruption by inventing campaign facts.

Valid recovery options are:

- Discard invalid snapshots
- Replay from known-good events
- Restore from valid exported save
- Stop with diagnostics

## 22. Replay Performance

Replay performance should support long-running campaigns.

Strategies:

- Use snapshots to reduce replay length.
- Read event ranges after snapshot sequence.
- Keep event payloads compact.
- Avoid embedding large content in events.
- Reference campaign entities by id.
- Reference assets by id.
- Keep projection reducers small.
- Avoid expensive projection scans where possible.
- Maintain indexes by event sequence and optionally by event type or entity id.
- Preserve full replay as the correctness fallback.

Performance must not compromise determinism.

## 23. Snapshot Strategy

Initial snapshot strategy:

- Create a snapshot every `100` events.
- Create snapshots at major stable boundaries:
  - Long rest completed
  - Travel completed
  - Combat completed
  - Scene transition completed
  - Major quest update
  - Save export
  - Import activation
- Retain the latest `3` to `5` compatible snapshots.
- Discard incompatible or corrupted snapshots.
- Fall back to replay when needed.

Snapshots are optional caches and must not contain unique campaign facts.

## 24. Memory Strategy for M2 iPad

The runtime should assume Safari/PWA memory constraints even on an M2 iPad Pro.

Memory guidelines:

- Keep event payloads small.
- Do not embed assets in events.
- Do not duplicate full projection sets unnecessarily.
- Release replay buffers after use.
- Load large event logs in ranges when needed.
- Keep only necessary snapshots in active memory.
- Prefer ids and deltas over repeated campaign data.
- Avoid retaining obsolete projections after rebuild.
- Use compact projection structures for long campaigns.

The target experience should allow the player to close the iPad and resume exactly where they left off.

## 25. Public TypeScript Interfaces

Design-level public interfaces:

```ts
interface CommandProcessor {
  execute(command: CampaignCommand): Promise<CommandResult>;
}

interface ValidationPipeline {
  validate(command: CampaignCommand, context: RuntimeContext): Promise<ValidationResult>;
}

interface RuleExecutionPipeline {
  execute(command: ValidatedCommand, context: RuntimeContext): Promise<CampaignEvent[]>;
}

interface EventStore {
  append(events: CampaignEvent[]): Promise<AppendResult>;
  getEventsAfter(sequence: number): Promise<CampaignEvent[]>;
  getEventsBetween(startSequence: number, endSequence: number): Promise<CampaignEvent[]>;
  getAllEvents(): Promise<CampaignEvent[]>;
}

interface ReplayEngine {
  replay(input: ReplayInput): Promise<ReplayResult>;
}

interface ProjectionManager {
  apply(event: CampaignEvent): void;
  rebuild(events: CampaignEvent[]): ProjectionSet;
  restore(snapshot: Snapshot): ProjectionSet;
  getCurrent(): ProjectionSet;
}

interface SnapshotManager {
  create(projections: ProjectionSet, sequence: number): Promise<Snapshot>;
  loadLatestCompatible(context: SnapshotContext): Promise<Snapshot | null>;
  discard(snapshotId: string): Promise<void>;
}

interface SaveManager {
  loadActiveSave(campaignId: string): Promise<RuntimeLoadResult>;
  exportSaveFile(): Promise<SaveFile>;
  importSaveFile(saveFile: SaveFile): Promise<ImportResult>;
}
```

These interfaces define architectural boundaries, not final implementation details.

## 26. Testing Strategy

Required test coverage:

- Valid command produces expected events.
- Invalid command appends no events.
- Commands are never persisted.
- Rule execution is deterministic.
- Event Store appends events in order.
- Event Store rejects malformed events.
- Event Store rejects invalid sequences.
- Replay from empty event log succeeds.
- Replay from full event log rebuilds projections.
- Replay from snapshot matches full replay.
- Invalid snapshot falls back safely.
- Projections are disposable and rebuildable.
- Random outcomes are stored in events.
- Replay never recalculates randomness.
- Event migrations are deterministic.
- Unknown event type stops replay.
- Unsupported event version stops replay.
- Save export/import round trips correctly.
- Corruption is detected.
- Failed import does not overwrite active save.
- Startup restores expected projections.
- Long campaign replay meets performance expectations.
- Memory usage remains acceptable for iPad/PWA constraints.

Tests should use deterministic fixture event logs.

## 27. Risks

Primary risks:

- Commands accidentally persisted.
- Snapshots accidentally treated as authoritative.
- Projection state treated as durable truth.
- Event schema migrations become fragile.
- Replay slows down on long campaigns.
- Safari/PWA storage behavior differs from desktop browsers.
- Random outcomes accidentally recomputed.
- Corruption errors are difficult for users to recover from.
- Save imports overwrite active data before validation.
- Subsystems bypass the runtime and mutate projections directly.
- AI Adapter later attempts to own state instead of suggesting outputs.

## 28. Alternatives Considered

State-only saves:

- Simpler to implement.
- Rejected because they violate event authority and weaken deterministic replay.

Snapshot-only saves:

- Fast to load.
- Rejected because snapshots are projections and must not become authoritative.

Portable JSON as active runtime store:

- Simple and portable.
- Rejected as the primary active store because long campaign append, range reads, and snapshot access are better suited to structured local storage.

IndexedDB-only storage:

- Strong active runtime performance.
- Rejected as the only persistence strategy because player ownership requires portable local save files.

Hybrid active store plus portable save file:

- Best fit.
- Supports fast local runtime behavior and player-owned campaign portability.

## 29. Recommendation

Approve the Campaign Runtime design as the first implementation layer for the engine foundation.

The runtime should be organized as:

```text
Campaign Runtime
├── Command Processor
├── Validation Pipeline
├── Rule Execution Pipeline
├── Event Store
├── Replay Engine
├── Projection Manager
├── Snapshot Manager
├── Save Manager
└── Runtime Services
```

Use the runtime flow:

```text
Player Input
-> Command
-> Validation
-> Rule Execution
-> Event(s)
-> Event Store
-> Projection Manager
-> Updated Projections
-> UI
```

Persist events as the authoritative campaign history. Never persist commands. Treat projections as disposable. Treat snapshots as performance artifacts only. Store random outcomes in event payloads and never recompute randomness during replay.

This design is ready for architectural approval before implementation begins.
