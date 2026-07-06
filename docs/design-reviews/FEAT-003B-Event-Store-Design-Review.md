# FEAT-003B – Event Store Design Review

## 1. Feature Understanding

FEAT-003B designs the Event Store as the authoritative persistence layer of the Campaign Runtime.

The Event Store is the only component allowed to persist campaign history. It owns event sequencing, validation, append semantics, integrity checks, schema validation, and deterministic event retrieval.

The Event Store does not own replay, projections, snapshots, save export, domain rules, command validation, rule execution, or UI rendering.

The Event Store must preserve the approved architecture:

- Offline-first
- No backend
- No runtime networking
- No cloud APIs
- No authentication
- Append-only event history
- Events are immutable
- Events are authoritative
- Commands are transient and never persisted
- Projections are disposable
- Replay executes events only
- Random outcomes are stored in event payloads before append

## 2. Goals

The Event Store should provide a deterministic and durable local event history for a campaign.

Goals:

- Persist authoritative campaign events locally.
- Validate events before append.
- Assign or verify monotonic event sequence.
- Preserve append-only semantics.
- Provide deterministic event retrieval.
- Detect corrupted or incompatible event history.
- Support efficient active runtime storage.
- Support portable save file export/import through higher-level Save Manager workflows.
- Keep command objects out of persistence.
- Provide clear failure diagnostics.

## 3. Responsibilities

The Event Store owns:

- Event append semantics
- Event validation before append
- Event sequencing
- Event immutability boundary
- Event integrity metadata
- Event retrieval by sequence range
- Full event log retrieval
- Event schema compatibility checks
- Detection of duplicate, missing, or invalid sequence values
- Detection of campaign id mismatch
- Storage adapter coordination for active runtime event history

The Event Store is the authoritative persistence boundary for campaign history.

## 4. Non-Responsibilities

The Event Store does not own:

- Commands
- Command validation
- Rule execution
- Domain rules
- Replay execution
- Projection mutation
- Snapshot creation
- Save export/import orchestration
- UI rendering
- AI narration
- Authentication
- Networking
- Cloud APIs

The Event Store must not execute domain logic, mutate projections, or participate in replay beyond providing deterministic event retrieval.

## 5. Architecture Impact

The Event Store formalizes the campaign history boundary.

Runtime flow:

```text
Command
-> Validation
-> Rule Execution
-> Event candidates
-> Event Store append
-> Projection Manager
-> UI
```

Architecture impact:

- Only appended events become campaign history.
- Commands remain transient.
- Event candidates are not authoritative until appended.
- Projections update only after append succeeds.
- Replay consumes events retrieved from the Event Store.
- Sequence determines event order.
- Timestamp never determines event order.

## 6. Event Model

Callers submit `EventCandidate` objects. Event candidates are not authoritative and must not include final event ids or sequence values.

Required rules:

- Callers may provide a correlation id or source command id in metadata.
- Callers must not assign authoritative event ids.
- Final event ids are assigned by the Event Store during append.
- Final sequence values are assigned or verified by the Event Store during append.
- Persisted `CampaignEvent` records include the assigned immutable id and sequence.

Each persisted event should include:

- `id`
- `campaignId`
- `sequence`
- `type`
- `schemaVersion`
- `metadataVersion`
- `timestamp`
- `actorId`
- `payload`
- `metadata`

Field requirements:

| Field | Required | Immutable | Notes |
| --- | --- | --- | --- |
| `id` | Yes | Yes | Unique event identifier within the save. |
| `campaignId` | Yes | Yes | Must match active campaign. |
| `sequence` | Yes | Yes | Monotonic ordering field. |
| `type` | Yes | Yes | Stable event type name. |
| `schemaVersion` | Yes | Yes | Event payload schema version. |
| `metadataVersion` | Yes | Yes | Event metadata shape version. |
| `timestamp` | Yes | Yes | Informational only; never used for ordering. |
| `actorId` | No | Yes | Character, NPC, system, or plugin actor reference. |
| `payload` | Yes | Yes | Event-specific facts. |
| `metadata` | No | Yes | Source command id, tags, schema metadata, diagnostics context. |

Events express facts that occurred. They are immutable once appended.

## 7. Event Schema

Event schemas define the expected payload shape for each `type` and `schemaVersion`.

Metadata schemas define the expected metadata shape for each `metadataVersion`.

Payload schema and metadata schema are versioned separately because they may evolve independently. For example, the payload for `world.travel_completed` may remain stable while metadata gains new diagnostics, source command references, plugin attribution, or import/export provenance.

Schema responsibilities:

- Identify supported event types.
- Validate required payload fields.
- Validate payload value shapes.
- Validate event metadata requirements when applicable.
- Validate supported metadata versions.
- Support deterministic migration decisions.

Every event type must have an explicit schema version.

Every persisted event must have an explicit metadata version.

Unknown event types, unsupported payload schema versions, or unsupported metadata versions should fail validation unless a deterministic migration path is available before append or replay.

## 8. Event Validation

Event validation occurs before append.

Validation should check:

- Required event fields exist.
- Event candidate does not include an authoritative event id.
- Campaign id matches active campaign.
- Event type is registered.
- Schema version is supported.
- Metadata version is supported.
- Payload matches registered event schema.
- Metadata matches registered metadata schema.
- Timestamp exists but is not used for ordering.
- Sequence is absent for candidates unless the Event Store design explicitly allows internal sequence preflight.
- Event payload already contains random outcomes when randomness occurred.

Validation must not execute domain rules. It verifies event structure, schema, and append compatibility only.

## 9. Event Sequencing

Sequence determines ordering.

Rules:

- Sequence values are monotonic.
- Sequence values are contiguous within a campaign event log.
- The next event sequence follows the latest committed sequence.
- Batch append assigns or validates sequence for every event in the batch.
- Duplicate sequences are invalid.
- Missing sequences are corruption.
- Timestamp never determines ordering.

The Event Store may assign sequence values during append. If callers provide sequence values, the Event Store must verify they exactly match the expected next sequence range.

## 10. Atomic Append Behavior

Event append must be atomic from the runtime perspective.

Append rules:

- Validate the entire batch before commit.
- Reject candidates that include caller-assigned authoritative event ids.
- Assign final immutable event ids during append.
- Assign or verify final sequence values during append.
- Append all events in the batch or none.
- Do not partially append a failed batch.
- Return appended events with committed ids and sequence values.
- Return diagnostics on failure.
- Preserve existing event history when append fails.

Atomic append is required so command execution cannot leave campaign history in a partial state.

## 11. Event Retrieval API

Event retrieval must be deterministic.

Required retrieval patterns:

- Get event by id.
- Get last `count` events.
- Get events after sequence.
- Get events between sequence range.
- Get all events for campaign.
- Get latest sequence.
- Verify full event log integrity.

Retrieval rules:

- Returned events must be ordered by sequence.
- Range boundaries must be explicit.
- `getLast(count)` returns the most recent events ordered by ascending sequence.
- Retrieval must not mutate events.
- Retrieval must not execute replay.
- Retrieval must not filter out corrupted events silently.

`getLast(count)` supports recent journal views, diagnostics, debugging, future undo inspection, and quick review of recent campaign history.

## 12. Integrity Verification

Integrity verification should detect:

- Duplicate sequence
- Missing sequence
- Invalid schema
- Unsupported schema version
- Campaign mismatch
- Corrupted payload
- Malformed metadata
- Unsupported metadata version
- Invalid event id
- Invalid event type
- Invalid checksum/hash if present

Recommended integrity metadata:

- Event count
- Latest sequence
- Event id uniqueness index
- Optional event hash
- Optional batch hash
- Optional save package hash generated during export

Checksums or hashes are recommended for portable save file validation, especially during import/export. Active runtime storage may maintain lighter integrity metadata and run deeper verification during load, export, or explicit repair flows.

## 13. Event Versioning Strategy

Event versioning is required for long-term campaign portability.

Rules:

- Every event has `schemaVersion`.
- Every event has `metadataVersion`.
- Event type names should be stable.
- Additive payload changes are preferred.
- Additive metadata changes are preferred.
- Breaking payload changes require deterministic migration.
- Breaking metadata changes require deterministic migration.
- Unsupported payload schema versions fail validation unless migrated.
- Unsupported metadata versions fail validation unless migrated.
- Migration must not depend on network, cloud APIs, AI, wall-clock time, or randomness.

Versioning should be managed through registered event schemas, metadata schemas, and migration metadata. Payload and metadata migration paths should be tracked separately so either can evolve without forcing unnecessary changes to the other.

## 14. Storage Abstraction

The Event Store should depend on a storage abstraction rather than direct browser APIs.

Storage abstraction responsibilities:

- Append event records.
- Read event records by sequence range.
- Read latest sequence.
- Read full event log.
- Clear or replace a campaign event log only through explicit import/reset workflows.
- Support integrity metadata reads/writes.

This keeps active storage swappable while preserving Event Store semantics.

## 15. IndexedDB Responsibilities

IndexedDB is the preferred active runtime storage for iPad/PWA play.

IndexedDB responsibilities:

- Fast append for active campaign events
- Efficient sequence range reads
- Efficient latest sequence reads
- Local resume
- Storage for integrity metadata
- Storage for event records keyed by campaign id and sequence

IndexedDB is optimized for active play and replay performance. It is not the sole ownership format.

## 16. Portable JSON Responsibilities

Portable JSON save files are the ownership, backup, export, and import format.

Portable JSON responsibilities:

- Preserve player-owned campaign history
- Support local export/import
- Support long-term compatibility
- Carry schema and integrity metadata
- Enable backup outside browser storage
- Support migration and validation workflows

Portable JSON is optimized for portability and durability, not active append performance.

## 17. Runtime Context Integration

The Event Store should be available through Runtime Context.

Runtime Context provides:

- active campaign id
- campaign package metadata
- Event Store
- Plugin Registry
- Runtime Services
- diagnostics

The Event Store should validate campaign id using runtime context or store configuration. It should not depend on scattered global state.

## 18. Command Processor Integration

The Command Processor submits event candidates to the Event Store after validation and rule execution.

Integration rules:

- Command Processor does not append outside the Event Store.
- Command Processor does not assign authoritative event ids.
- Command Processor does not assign authoritative sequence outside the Event Store contract.
- Invalid commands never reach Event Store append.
- Rule failures never reach Event Store append.
- Event candidates become authoritative only after successful append.
- Event Store assigns final immutable event ids during append.
- Commands are never persisted by the Event Store.

## 19. Replay Engine Integration

The Replay Engine consumes events retrieved from the Event Store.

Integration rules:

- Replay retrieves events in sequence order.
- Replay executes events only.
- Replay never executes commands.
- Replay never recalculates random outcomes.
- Replay depends on event payload facts already stored by the Event Store.
- Event Store does not execute replay.
- Event Store does not mutate replay projections.

## 20. Failure Handling

Append validation failure:

- Append no events.
- Return diagnostics.
- Preserve existing event log.

Storage write failure:

- Treat batch as uncommitted.
- Return diagnostics.
- Preserve previous committed event log.

Sequence conflict:

- Append no events.
- Return sequence diagnostics.
- Caller may reload latest sequence and retry command execution if appropriate.

Schema failure:

- Append no events.
- Return schema diagnostics.

Retrieval failure:

- Return diagnostics.
- Do not synthesize missing events.
- Do not skip corrupted events silently.

## 21. Corruption Detection

Corruption detection should include:

- Duplicate sequence
- Missing sequence
- Invalid schema
- Invalid event type
- Unsupported schema version
- Unsupported metadata version
- Campaign mismatch
- Corrupted payload
- Malformed metadata
- Invalid timestamp shape
- Invalid checksum/hash when available
- Event count/latest sequence mismatch

The Event Store must not repair corruption by inventing events or modifying payloads.

Valid recovery options:

- Stop with diagnostics.
- Restore from a valid portable save file.
- Rebuild active IndexedDB state from a validated portable JSON package.
- Re-run integrity verification after import.

## 22. Public TypeScript Interfaces

Canonical runtime interfaces are defined in `docs/contracts/runtime-api.md`. The interfaces below are design-level excerpts for FEAT-003B context and should not supersede the canonical contract.

Design-level public interfaces:

```ts
interface EventStore {
  append(events: EventCandidate[]): Promise<EventAppendResult>;
  getById(eventId: string): Promise<CampaignEvent | null>;
  getLast(count: number): Promise<CampaignEvent[]>;
  getAfter(sequence: number): Promise<CampaignEvent[]>;
  getBetween(startSequence: number, endSequence: number): Promise<CampaignEvent[]>;
  getAll(): Promise<CampaignEvent[]>;
  getLatestSequence(): Promise<number>;
  verifyIntegrity(): Promise<EventIntegrityResult>;
}

interface EventCandidate {
  campaignId: string;
  type: string;
  schemaVersion: number;
  metadataVersion: number;
  timestamp: string;
  actorId?: string;
  payload: unknown;
  metadata?: EventMetadata;
}

interface CampaignEvent extends EventCandidate {
  id: string;
  sequence: number;
}

interface EventAppendResult {
  ok: boolean;
  events: CampaignEvent[];
  diagnostics: RuntimeDiagnostic[];
}

interface EventIntegrityResult {
  ok: boolean;
  latestSequence: number;
  eventCount: number;
  diagnostics: RuntimeDiagnostic[];
}

interface EventStorageAdapter {
  appendBatch(campaignId: string, events: CampaignEvent[]): Promise<void>;
  readById(campaignId: string, eventId: string): Promise<CampaignEvent | null>;
  readLast(campaignId: string, count: number): Promise<CampaignEvent[]>;
  readAfter(campaignId: string, sequence: number): Promise<CampaignEvent[]>;
  readBetween(campaignId: string, startSequence: number, endSequence: number): Promise<CampaignEvent[]>;
  readAll(campaignId: string): Promise<CampaignEvent[]>;
  readLatestSequence(campaignId: string): Promise<number>;
}

interface EventSchemaRegistry {
  getSchema(type: string, schemaVersion: number): EventSchema | undefined;
  getMetadataSchema(metadataVersion: number): EventMetadataSchema | undefined;
  validate(event: EventCandidate | CampaignEvent): RuntimeDiagnostic[];
}
```

These interfaces define architectural boundaries, not implementation details.

## 23. Testing Strategy

Required test coverage:

- Append success
- Append failure
- Event Store assigns final event ids
- Caller-assigned authoritative event ids are rejected
- Duplicate sequence rejection
- Missing sequence detection
- Invalid schema rejection
- Invalid event type rejection
- Unsupported schema version rejection
- Unsupported metadata version rejection
- Campaign mismatch rejection
- Event ordering by sequence
- Atomic append behavior
- Deterministic retrieval by range
- Deterministic recent retrieval with `getLast(count)`
- Deterministic full retrieval
- Corruption detection
- No command persistence
- Random outcome payload preservation
- Timestamp not used for ordering
- Offline-only operation
- Storage adapter contract behavior
- Portable JSON validation path

Tests should use deterministic fixtures and fake storage adapters.

## 24. Risks

Primary risks:

- Partial append creates inconsistent history.
- Event Store takes on domain validation.
- Event Store mutates projections.
- Event Store becomes coupled to replay logic.
- Sequence assignment conflicts during rapid commands.
- Event id assignment conflicts or non-unique ids corrupt history.
- Event schema validation is too weak.
- Metadata versioning is ignored and metadata changes break old saves.
- Portable JSON integrity is insufficient for long-term saves.
- IndexedDB behavior differs across Safari/PWA versions.
- Commands accidentally enter persisted event storage.
- Random outcomes are omitted from event payloads.

## 25. Alternatives Considered

State-only persistence:

- Simpler to implement.
- Rejected because events are authoritative and projections are disposable.

JSON-only active event log:

- Easy to export and inspect.
- Rejected as active runtime storage because append and range reads are better served by IndexedDB.

IndexedDB-only persistence:

- Good active runtime performance.
- Rejected as the sole persistence approach because player ownership requires portable local save files.

Event Store owning replay:

- Centralizes history and rebuild logic.
- Rejected because Event Store should persist and retrieve events only. Replay Engine owns replay.

Event Store owning domain validation:

- Could catch more errors before append.
- Rejected because domain rules belong to plugins, validators, and rule handlers. Event Store validates event shape, schema, sequence, and integrity only.

## 26. Recommendation

Approve the Event Store design as FEAT-003B.

The Event Store should be implemented as an append-only, local-first persistence boundary for authoritative campaign events. It should validate event shape, payload schema, metadata schema, campaign id, integrity, and sequence before append. It should assign final immutable event ids and sequence values during append. It should provide deterministic event retrieval for replay, recent history views, diagnostics, debugging, and export workflows.

Use IndexedDB for active runtime event storage and portable JSON save files for player ownership, export, import, backup, and long-term compatibility.

The Event Store must not persist commands, mutate projections, execute replay, execute domain rules, call network services, call cloud APIs, or depend on authentication.
