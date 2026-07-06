# Campaign Runtime API Contracts

## 1. Purpose

This document is the canonical runtime API contract for the Hybrid D&D Solo Engine Campaign Runtime.

Future design reviews and implementations should reference this document as the single source of truth for public Campaign Runtime interfaces.

## 2. Scope

This contract covers public design-level interfaces for:

- Campaign Runtime
- Command Processor
- Validation Pipeline
- Rule Engine
- Runtime Plugins
- Plugin Registry
- Event Store
- Replay Engine
- Projection Manager
- Snapshot Manager
- Save Manager
- Runtime Services
- Diagnostics

These contracts define architectural boundaries. They do not require a specific implementation strategy.

## 3. Architectural Rules

The runtime API must preserve these rules:

- Offline-first
- No backend
- No runtime networking
- No cloud APIs
- No login or authentication
- Local campaign packages
- Local save files
- Commands are transient and never persisted
- Commands express intent
- Events express facts
- Events are authoritative
- Event candidates are not authoritative
- `EventCandidate` objects do not include final authoritative event ids
- `CampaignEvent` objects include Event Store assigned immutable ids and sequences
- Event Store assigns event ids and sequences
- Sequence determines ordering
- Timestamp is informational only
- `schemaVersion` applies to payload
- `metadataVersion` applies to metadata
- Projections are disposable
- Snapshots are performance artifacts only
- Replay executes events only
- Random outcomes must be stored in event payloads
- No runtime interface may require network, backend, cloud API, login, or authentication for core play

## 4. Contract Stability Levels

Stability statuses:

- Stable — Approved for implementation. Breaking changes require explicit architecture review.
- Draft — Design direction is accepted, but details may evolve during implementation.
- Experimental — Early concept. Do not depend on it for core runtime behavior yet.

| Interface | Stability | Notes |
| --- | --- | --- |
| CampaignRuntime | Draft | High-level facade; expected to evolve as runtime lifecycle is implemented. |
| CommandProcessor | Stable | Approved through FEAT-003A. |
| CampaignCommand | Stable | Commands are transient and never persisted. |
| CommandResult | Stable | Returned execution result for command processing. |
| ValidationPipeline | Stable | Approved as part of command execution flow. |
| RuleEngine | Stable | Stable orchestration boundary; domain rules remain plugin-owned. |
| RuntimePlugin | Stable | Unified plugin contract approved through FEAT-003A. |
| PluginRegistry | Stable | Registry surface for plugin-provided capabilities. |
| RuntimeContext | Draft | Central execution context; expected to evolve as more runtime services are implemented. |
| EventStore | Stable | Approved through FEAT-003B. |
| EventCandidate | Stable | Caller-submitted event candidate without authoritative id or sequence. |
| CampaignEvent | Stable | Persisted event with Event Store assigned id and sequence. |
| ReplayEngine | Draft | Design direction accepted; implementation still pending. |
| ProjectionManager | Draft | Design direction accepted; implementation still pending. |
| SnapshotManager | Draft | Performance artifact manager; expected to evolve. |
| SaveManager | Draft | Export/import and active save lifecycle are not fully implemented yet. |
| RuntimeServices | Draft | Service surface may evolve as ID, clock, integrity, and diagnostics mature. |
| RuntimeDiagnostic | Stable | Shared diagnostic shape for runtime validation and failure reporting. |

Rules:

- Stable interfaces may still receive additive, backward-compatible changes.
- Breaking changes to Stable interfaces require explicit architecture review.
- Draft interfaces may change during implementation, but changes must preserve approved architecture.
- Experimental interfaces must not become required for offline core play without a design review.
- No stability level may weaken offline-first requirements.

## 5. Campaign Runtime Interfaces

```ts
interface CampaignRuntime {
  start(input: RuntimeStartInput): Promise<RuntimeStartResult>;
  execute(command: CampaignCommand): Promise<CommandResult>;
  getContext(): RuntimeContext;
  getProjections(): ProjectionSet;
  save(): Promise<SaveResult>;
  restore(input: RestoreInput): Promise<RestoreResult>;
}

interface RuntimeStartInput {
  campaignPackage: CampaignPackage;
  plugins: RuntimePlugin[];
  activeSaveId?: string;
}

interface RuntimeStartResult {
  ok: boolean;
  context?: RuntimeContext;
  projections?: ProjectionSet;
  diagnostics: RuntimeDiagnostic[];
}

interface RestoreInput {
  campaignPackage: CampaignPackage;
  saveFile?: SaveFile;
  activeSaveId?: string;
}

interface RestoreResult {
  ok: boolean;
  projections?: ProjectionSet;
  diagnostics: RuntimeDiagnostic[];
}

interface SaveResult {
  ok: boolean;
  diagnostics: RuntimeDiagnostic[];
}
```

## 6. Command Processor Interfaces

```ts
interface CommandProcessor {
  execute(command: CampaignCommand): Promise<CommandResult>;
}

interface CampaignCommand<TPayload = unknown> {
  id: string;
  type: string;
  campaignId: string;
  actorId?: string;
  payload: TPayload;
  metadata?: CommandMetadata;
}

interface CommandMetadata {
  source?: string;
  correlationId?: string;
  createdAt?: string;
  expectedProjectionVersion?: number;
}

interface CommandResult {
  ok: boolean;
  commandId: string;
  appendedEvents: CampaignEvent[];
  diagnostics: RuntimeDiagnostic[];
}

interface ValidationPipeline {
  validate(command: CampaignCommand, context: RuntimeContext): Promise<ValidationResult>;
}

interface ValidationResult {
  ok: boolean;
  command?: ValidatedCommand;
  diagnostics: RuntimeDiagnostic[];
}

interface ValidatedCommand<TPayload = unknown> extends CampaignCommand<TPayload> {
  validated: true;
}

interface RuleEngine {
  execute(command: ValidatedCommand, context: RuntimeContext): Promise<RuleExecutionResult>;
}

interface RuleExecutionResult {
  ok: boolean;
  events: EventCandidate[];
  diagnostics: RuntimeDiagnostic[];
}

interface RuntimeContext {
  campaignId: string;
  campaignPackage: CampaignPackage;
  projections: ProjectionSet;
  eventStore: EventStore;
  replayEngine?: ReplayEngine;
  projectionManager: ProjectionManager;
  snapshotManager?: SnapshotManager;
  saveManager?: SaveManager;
  pluginRegistry: PluginRegistry;
  services: RuntimeServices;
}
```

## 7. Plugin Interfaces

```ts
interface RuntimePlugin {
  name: string;
  version: string;
  initialize(context: PluginInitContext): void | Promise<void>;
  register(registry: PluginRegistry): void;
}

interface PluginInitContext {
  campaignId: string;
  campaignPackage: CampaignPackage;
  services: RuntimeServices;
}

interface PluginRegistry {
  registerCommand(definition: CommandDefinition): void;
  registerValidator(commandType: string, validator: CommandValidator): void;
  registerRuleHandler(commandType: string, handler: RuleHandler): void;
  registerEventSchema(schema: EventSchema): void;
  registerMetadataSchema(schema: EventMetadataSchema): void;
  registerProjectionReducer(reducer: ProjectionReducer): void;
  registerStartupHook(hook: StartupHook): void;
  hasCommand(commandType: string): boolean;
  getValidators(commandType: string): CommandValidator[];
  getRuleHandler(commandType: string): RuleHandler | undefined;
  getEventSchema(eventType: string, schemaVersion: number): EventSchema | undefined;
  getMetadataSchema(metadataVersion: number): EventMetadataSchema | undefined;
  getProjectionReducers(): ProjectionReducer[];
  getStartupHooks(): StartupHook[];
}

interface CommandDefinition {
  type: string;
  description?: string;
}

type CommandValidator = (
  command: CampaignCommand,
  context: RuntimeContext
) => RuntimeDiagnostic[] | void | Promise<RuntimeDiagnostic[] | void>;

type RuleHandler = (
  command: ValidatedCommand,
  context: RuntimeContext
) => EventCandidate[] | RuleExecutionResult | Promise<EventCandidate[] | RuleExecutionResult>;

type StartupHook = (context: PluginInitContext) => void | Promise<void>;
```

## 8. Event Store Interfaces

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

interface EventCandidate<TPayload = unknown> {
  campaignId: string;
  type: string;
  schemaVersion: number;
  metadataVersion: number;
  timestamp: string;
  actorId?: string;
  payload: TPayload;
  metadata?: EventMetadata;
}

interface CampaignEvent<TPayload = unknown> extends EventCandidate<TPayload> {
  id: string;
  sequence: number;
}

interface EventMetadata {
  sourceCommandId?: string;
  correlationId?: string;
  tags?: string[];
  [key: string]: unknown;
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

interface EventSchema {
  type: string;
  schemaVersion: number;
}

interface EventMetadataSchema {
  metadataVersion: number;
}
```

## 9. Replay Engine Interfaces

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

## 10. Projection Manager Interfaces

```ts
interface ProjectionManager {
  apply(event: CampaignEvent): void | Promise<void>;
  rebuild(events: CampaignEvent[]): ProjectionSet;
  restore(snapshot: Snapshot): ProjectionSet;
  getCurrent(): ProjectionSet;
}

type ProjectionSet = Record<string, unknown>;

type ProjectionReducer = (event: CampaignEvent, projections: ProjectionSet) => ProjectionSet | void;
```

## 11. Snapshot Manager Interfaces

```ts
interface SnapshotManager {
  create(projections: ProjectionSet, sequence: number): Promise<Snapshot>;
  loadLatestCompatible(context: SnapshotContext): Promise<Snapshot | null>;
  discard(snapshotId: string): Promise<void>;
}

interface Snapshot {
  id: string;
  campaignId: string;
  campaignPackageVersion: string;
  schemaVersion: number;
  projectionSchemaVersions: Record<string, number>;
  sequence: number;
  projections: ProjectionSet;
  createdAt: string;
  integrity?: IntegrityMetadata;
}

interface SnapshotContext {
  campaignId: string;
  campaignPackageVersion: string;
  projectionSchemaVersions: Record<string, number>;
}
```

## 12. Save Manager Interfaces

```ts
interface SaveManager {
  loadActiveSave(campaignId: string): Promise<RuntimeLoadResult>;
  exportSaveFile(): Promise<SaveFile>;
  importSaveFile(saveFile: SaveFile): Promise<ImportResult>;
}

interface RuntimeLoadResult {
  ok: boolean;
  events: CampaignEvent[];
  snapshot?: Snapshot;
  diagnostics: RuntimeDiagnostic[];
}

interface SaveFile {
  schemaVersion: number;
  campaignId: string;
  campaignPackageVersion: string;
  createdAt: string;
  updatedAt: string;
  latestSequence: number;
  events: CampaignEvent[];
  snapshots?: Snapshot[];
  integrity?: IntegrityMetadata;
}

interface ImportResult {
  ok: boolean;
  diagnostics: RuntimeDiagnostic[];
}
```

## 13. Runtime Services

```ts
interface RuntimeServices {
  createId(): string;
  now(): string;
  diagnostics?: RuntimeDiagnosticSink;
  integrity?: IntegrityService;
}

interface RuntimeDiagnosticSink {
  record(diagnostic: RuntimeDiagnostic): void;
}

interface IntegrityService {
  hash(value: unknown): Promise<string>;
  verify(value: unknown, expectedHash: string): Promise<boolean>;
}

interface IntegrityMetadata {
  algorithm?: string;
  hash?: string;
  eventCount?: number;
  latestSequence?: number;
}
```

Runtime services may support command execution and persistence. They must not introduce nondeterminism into replay. Replay uses events only.

## 14. Diagnostics

```ts
type RuntimeDiagnosticSeverity = "info" | "warning" | "error";

interface RuntimeDiagnostic {
  code: string;
  message: string;
  severity: RuntimeDiagnosticSeverity;
  source?: string;
  sequence?: number;
  eventId?: string;
  commandId?: string;
}
```

Diagnostics are for validation, failure reporting, replay reporting, corruption reporting, and import/export feedback. Diagnostics are not authoritative campaign history unless a future explicit event type records them.

## 15. Versioning Notes

Versioning rules:

- `schemaVersion` applies to event payload shape.
- `metadataVersion` applies to event metadata shape.
- Payload and metadata may evolve independently.
- Commands are not persisted and do not require save-file migration.
- Events require deterministic migration when schema changes are breaking.
- Metadata requires deterministic migration when metadata shape changes are breaking.
- Snapshot schemas are separate from event schemas.
- Save file schemas are separate from event schemas.
- Migrations must not require network, cloud APIs, authentication, AI, wall-clock time, or random recomputation.

## 16. Non-Goals

This contract does not define:

- Combat rules
- Story generation
- Quest logic
- NPC memory logic
- Relationship calculations
- Inventory rules
- AI narration
- UI rendering
- Backend sync
- Cloud storage
- Authentication
- Runtime networking
- Concrete IndexedDB implementation details
- Concrete JSON serialization format
- Final schema validation library
