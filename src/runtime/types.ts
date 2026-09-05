import type { CampaignPackage } from "../types/index.ts";

export type RuntimeDiagnosticSeverity = "info" | "warning" | "error";

export type RuntimeDiagnostic = {
  code: string;
  message: string;
  severity: RuntimeDiagnosticSeverity;
  source?: string;
  sequence?: number;
  eventId?: string;
  commandId?: string;
};

export type CommandMetadata = {
  source?: string;
  correlationId?: string;
  createdAt?: string;
  expectedProjectionVersion?: number;
};

export type CampaignCommand<TPayload = unknown> = {
  id: string;
  type: string;
  campaignId: string;
  actorId?: string;
  payload: TPayload;
  metadata?: CommandMetadata;
};

export type ValidatedCommand<TPayload = unknown> = CampaignCommand<TPayload> & {
  validated: true;
};

export type EventMetadata = {
  sourceCommandId?: string;
  correlationId?: string;
  tags?: string[];
  [key: string]: unknown;
};

export type EventCandidate<TPayload = unknown> = {
  campaignId: string;
  type: string;
  schemaVersion: number;
  metadataVersion: number;
  timestamp?: string;
  actorId?: string;
  payload: TPayload;
  metadata?: EventMetadata;
};

export type CampaignEvent<TPayload = unknown> = EventCandidate<TPayload> & {
  id: string;
  sequence: number;
};

export type CommandResult = {
  ok: boolean;
  commandId: string;
  appendedEvents: CampaignEvent[];
  diagnostics: RuntimeDiagnostic[];
};

export type ValidationResult = {
  ok: boolean;
  command?: ValidatedCommand;
  diagnostics: RuntimeDiagnostic[];
};

export type RuleExecutionResult = {
  ok: boolean;
  events: EventCandidate[];
  diagnostics: RuntimeDiagnostic[];
};

export type AppendResult = {
  ok: boolean;
  events: CampaignEvent[];
  diagnostics: RuntimeDiagnostic[];
};

export type CommandDefinition = {
  type: string;
  description?: string;
};

export type EventSchema = {
  type: string;
  schemaVersion: number;
  validatePayload?: (payload: unknown) => RuntimeDiagnostic[];
};

export type EventMetadataSchema = {
  metadataVersion: number;
  validateMetadata?: (metadata: EventMetadata | undefined) => RuntimeDiagnostic[];
};

export type ProjectionSet = Record<string, unknown>;

export type ProjectionDefinition<TState = any> = {
  name: string;
  initialState: TState | (() => TState);
  apply: ProjectionEventHandler<TState>;
};

export type ProjectionEventHandler<TState = any> = (
  event: CampaignEvent,
  state: Readonly<TState>
) => TState | void;

export type ProjectionApplyResult = {
  ok: boolean;
  latestSequence: number;
  diagnostics: RuntimeDiagnostic[];
};

export type Snapshot<TState = ProjectionSet> = {
  id: string;
  campaignId: string;
  aggregateId: string;
  aggregateType: string;
  version: number;
  eventId: string;
  schemaVersion: number;
  timestamp: string;
  state: TState;
  metadata?: Record<string, unknown>;
};

export type SnapshotCandidate<TState = ProjectionSet> = Omit<Snapshot<TState>, "id" | "timestamp"> & {
  id?: string;
  timestamp?: string;
};

export type SnapshotValidationContext = {
  campaignId: string;
  aggregateId: string;
  aggregateType: string;
  currentVersion?: number;
  schemaVersion?: number;
};

export type SnapshotResult<TState = ProjectionSet> = {
  ok: boolean;
  snapshot?: Snapshot<TState>;
  diagnostics: RuntimeDiagnostic[];
};

export type SnapshotLoadResult<TState = ProjectionSet> = SnapshotResult<TState> & {
  found: boolean;
};

export type SnapshotPolicyInput = {
  aggregateId: string;
  aggregateType: string;
  version: number;
  lastSnapshotVersion?: number;
};

export type RuntimeServices = {
  now?: () => string;
  createId?: () => string;
};

export type RuntimeContext = {
  campaignId: string;
  campaignPackage: CampaignPackage;
  projections: ProjectionSet;
  eventStore: EventStore;
  projectionManager: ProjectionManager;
  pluginRegistry: PluginRegistry;
  services: RuntimeServices;
};

export type PluginInitContext = {
  campaignId: string;
  campaignPackage: CampaignPackage;
  services: RuntimeServices;
};

export type CommandValidator = (
  command: CampaignCommand,
  context: RuntimeContext
) => RuntimeDiagnostic[] | void | Promise<RuntimeDiagnostic[] | void>;

export type RuleHandler = (
  command: ValidatedCommand,
  context: RuntimeContext
) => EventCandidate[] | RuleExecutionResult | Promise<EventCandidate[] | RuleExecutionResult>;

export type ProjectionReducer = (event: CampaignEvent, projections: ProjectionSet) => ProjectionSet | void;

export type StartupHook = (context: PluginInitContext) => void | Promise<void>;

export interface RuntimePlugin {
  name: string;
  version: string;
  initialize(context: PluginInitContext): void;
  register(registry: PluginRegistry): void;
}

export interface PluginRegistry {
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

export interface ValidationPipeline {
  validate(command: CampaignCommand, context: RuntimeContext): Promise<ValidationResult>;
}

export interface RuleEngine {
  execute(command: ValidatedCommand, context: RuntimeContext): Promise<RuleExecutionResult>;
}

export interface EventStore {
  append(events: EventCandidate[]): Promise<AppendResult>;
  getById(eventId: string): Promise<CampaignEvent | null>;
  getLast(count: number): Promise<CampaignEvent[]>;
  getAfter(sequence: number): Promise<CampaignEvent[]>;
  getBetween(startSequence: number, endSequence: number): Promise<CampaignEvent[]>;
  getAll(): Promise<CampaignEvent[]>;
  getLatestSequence(): Promise<number>;
  verifyIntegrity(): Promise<EventIntegrityResult>;
}

export interface ProjectionManager {
  register<TState>(definition: ProjectionDefinition<TState>): void;
  reset(): void | Promise<void>;
  restore(projections: ProjectionSet): void | Promise<void>;
  apply(event: CampaignEvent): void | Promise<void>;
  rebuild(events: CampaignEvent[]): ProjectionSet | Promise<ProjectionSet>;
  get<TState = unknown>(name: string): Readonly<TState> | undefined;
  has(name: string): boolean;
  getCurrent(): ProjectionSet;
}

export type EventIntegrityResult = {
  ok: boolean;
  latestSequence: number;
  eventCount: number;
  diagnostics: RuntimeDiagnostic[];
};

export interface EventStorageAdapter {
  appendBatch(campaignId: string, events: CampaignEvent[]): Promise<void>;
  readById(campaignId: string, eventId: string): Promise<CampaignEvent | null>;
  readLast(campaignId: string, count: number): Promise<CampaignEvent[]>;
  readAfter(campaignId: string, sequence: number): Promise<CampaignEvent[]>;
  readBetween(campaignId: string, startSequence: number, endSequence: number): Promise<CampaignEvent[]>;
  readAll(campaignId: string): Promise<CampaignEvent[]>;
  readLatestSequence(campaignId: string): Promise<number>;
}

export interface EventSchemaRegistry {
  getSchema(type: string, schemaVersion: number): EventSchema | undefined;
  getMetadataSchema(metadataVersion: number): EventMetadataSchema | undefined;
  validate(event: EventCandidate | CampaignEvent): RuntimeDiagnostic[];
}

export interface ReplayEngine {
  replay(input: ReplayInput): Promise<ReplayResult>;
}

export interface SnapshotStore {
  save(snapshot: Snapshot): Promise<void>;
  load(aggregateId: string): Promise<Snapshot | null>;
  delete(aggregateId: string): Promise<void>;
}

export interface SnapshotPolicy {
  shouldSnapshot(input: SnapshotPolicyInput): boolean;
}

export interface SnapshotManager {
  save(snapshot: SnapshotCandidate): Promise<SnapshotResult>;
  load(aggregateId: string, context: SnapshotValidationContext): Promise<SnapshotLoadResult>;
  delete(aggregateId: string): Promise<void>;
  shouldSnapshot(input: SnapshotPolicyInput): boolean;
  replay(input: SnapshotReplayInput): Promise<ReplayResult>;
}

export type SnapshotReplayInput = {
  aggregateId: string;
  aggregateType: string;
  campaignPackage: CampaignPackage;
  eventStore: EventStore;
  replayEngine: ReplayEngine;
  projectionManager: ReplayProjectionManager;
  schemaRegistry?: EventSchemaRegistry;
};

export type ReplayInput = {
  campaignPackage: CampaignPackage;
  events: readonly CampaignEvent[];
  projectionManager: ReplayProjectionManager;
  schemaRegistry?: EventSchemaRegistry;
  snapshot?: Snapshot;
  snapshotSchemaVersion?: number;
};

export type ReplayResult = {
  ok: boolean;
  projections?: ProjectionSet;
  latestSequence: number;
  diagnostics: RuntimeDiagnostic[];
  failingSequence?: number;
  failingEventId?: string;
};

export interface ReplayProjectionManager {
  reset(): void | Promise<void>;
  restore?(projections: ProjectionSet): void | Promise<void>;
  apply(event: CampaignEvent): void | Promise<void>;
  getCurrent(): ProjectionSet;
}
