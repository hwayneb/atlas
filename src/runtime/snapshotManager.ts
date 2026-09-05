import type {
  EventStore,
  ReplayEngine,
  ReplayProjectionManager,
  ReplayResult,
  RuntimeDiagnostic,
  RuntimeServices,
  Snapshot,
  SnapshotCandidate,
  SnapshotLoadResult,
  SnapshotManager,
  SnapshotPolicy,
  SnapshotPolicyInput,
  SnapshotReplayInput,
  SnapshotResult,
  SnapshotStore,
  SnapshotValidationContext
} from "./types.ts";

export const SNAPSHOT_SCHEMA_VERSION = 1;

export type SnapshotManagerOptions = {
  store?: SnapshotStore;
  policy?: SnapshotPolicy;
  services?: RuntimeServices;
  schemaVersion?: number;
};

export type EventCountSnapshotPolicyOptions = {
  interval: number;
};

export class SnapshotManagerError extends Error {
  readonly diagnostics: RuntimeDiagnostic[];

  constructor(message: string, diagnostics: RuntimeDiagnostic[]) {
    super(message);
    this.name = "SnapshotManagerError";
    this.diagnostics = diagnostics;
  }
}

export class DefaultSnapshotManager implements SnapshotManager {
  private readonly store: SnapshotStore;
  private readonly policy: SnapshotPolicy;
  private readonly services: RuntimeServices;
  private readonly schemaVersion: number;

  constructor(options: SnapshotManagerOptions = {}) {
    this.store = options.store ?? new InMemorySnapshotStore();
    this.policy = options.policy ?? new EventCountSnapshotPolicy({ interval: 100 });
    this.services = options.services ?? {};
    this.schemaVersion = options.schemaVersion ?? SNAPSHOT_SCHEMA_VERSION;
  }

  async save(candidate: SnapshotCandidate): Promise<SnapshotResult> {
    const snapshot = createSnapshot(candidate, this.services);
    const diagnostics = validateSnapshot(snapshot, {
      campaignId: snapshot.campaignId,
      aggregateId: snapshot.aggregateId,
      aggregateType: snapshot.aggregateType,
      currentVersion: snapshot.version,
      schemaVersion: this.schemaVersion
    });

    if (hasErrors(diagnostics)) {
      return { ok: false, diagnostics };
    }

    await this.store.save(snapshot);
    return { ok: true, snapshot, diagnostics };
  }

  async load(aggregateId: string, context: SnapshotValidationContext): Promise<SnapshotLoadResult> {
    const snapshot = await this.store.load(aggregateId);
    if (snapshot === null) {
      return { ok: true, found: false, diagnostics: [] };
    }

    const diagnostics = validateSnapshot(snapshot, {
      ...context,
      schemaVersion: context.schemaVersion ?? this.schemaVersion
    });

    if (hasErrors(diagnostics)) {
      return { ok: false, found: true, diagnostics };
    }

    return { ok: true, found: true, snapshot, diagnostics };
  }

  delete(aggregateId: string): Promise<void> {
    return this.store.delete(aggregateId);
  }

  shouldSnapshot(input: SnapshotPolicyInput): boolean {
    return this.policy.shouldSnapshot(input);
  }

  async replay(input: SnapshotReplayInput): Promise<ReplayResult> {
    const currentVersion = await input.eventStore.getLatestSequence();
    const loadResult = await this.load(input.aggregateId, {
      campaignId: input.campaignPackage.id,
      aggregateId: input.aggregateId,
      aggregateType: input.aggregateType,
      currentVersion,
      schemaVersion: this.schemaVersion
    });

    if (loadResult.ok && loadResult.snapshot) {
      const anchorDiagnostics = await validateSnapshotAnchor(input.eventStore, loadResult.snapshot);
      if (!hasErrors(anchorDiagnostics)) {
        const events = await input.eventStore.getAfter(loadResult.snapshot.version);
        const result = await input.replayEngine.replay({
          campaignPackage: input.campaignPackage,
          events,
          projectionManager: input.projectionManager,
          schemaRegistry: input.schemaRegistry,
          snapshot: loadResult.snapshot,
          snapshotSchemaVersion: this.schemaVersion
        });
        if (!result.diagnostics.some((diagnostic) =>
          diagnostic.code === "replay.snapshot_restore_failed"
          || diagnostic.code === "replay.snapshot_restore_unsupported")) {
          return result;
        }
      }
    }

    const events = await input.eventStore.getAll();
    return input.replayEngine.replay({
      campaignPackage: input.campaignPackage,
      events,
      projectionManager: input.projectionManager,
      schemaRegistry: input.schemaRegistry
    });
  }
}

export class InMemorySnapshotStore implements SnapshotStore {
  private readonly snapshots = new Map<string, Snapshot>();

  async save(snapshot: Snapshot): Promise<void> {
    const existing = this.snapshots.get(snapshot.aggregateId);
    if (!existing || snapshot.version >= existing.version) {
      this.snapshots.set(snapshot.aggregateId, cloneSnapshot(snapshot));
    }
  }

  async load(aggregateId: string): Promise<Snapshot | null> {
    const snapshot = this.snapshots.get(aggregateId);
    return snapshot ? cloneSnapshot(snapshot) : null;
  }

  async delete(aggregateId: string): Promise<void> {
    this.snapshots.delete(aggregateId);
  }
}

export class EventCountSnapshotPolicy implements SnapshotPolicy {
  private readonly interval: number;

  constructor(options: EventCountSnapshotPolicyOptions) {
    if (!Number.isInteger(options.interval) || options.interval <= 0) {
      throw new SnapshotManagerError("Snapshot interval must be a positive integer.", [
        {
          code: "snapshot_policy.interval_invalid",
          message: "Snapshot interval must be a positive integer.",
          severity: "error",
          source: "SnapshotPolicy"
        }
      ]);
    }

    this.interval = options.interval;
  }

  shouldSnapshot(input: SnapshotPolicyInput): boolean {
    if (!Number.isInteger(input.version) || input.version <= 0) {
      return false;
    }

    const lastSnapshotVersion = input.lastSnapshotVersion ?? 0;
    return input.version - lastSnapshotVersion >= this.interval;
  }
}

export function serializeSnapshot(snapshot: Snapshot): string {
  return stableStringify(JSON.parse(JSON.stringify(snapshot)));
}

export function deserializeSnapshot(serialized: string): Snapshot {
  return JSON.parse(serialized) as Snapshot;
}

export function validateSnapshot(snapshot: unknown, context: SnapshotValidationContext): RuntimeDiagnostic[] {
  const diagnostics: RuntimeDiagnostic[] = [];
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return [error("snapshot.envelope_invalid", "Snapshot must be an object.")];
  }
  const record = snapshot as Snapshot & Record<string, unknown>;

  if (typeof record.id !== "string" || !record.id) {
    diagnostics.push(error("snapshot.id_invalid", "Snapshot id is required."));
  }

  if (record.campaignId !== context.campaignId) {
    diagnostics.push(error("snapshot.campaign_mismatch", "Snapshot campaign does not match active campaign."));
  }

  if (record.aggregateId !== context.aggregateId || typeof record.aggregateId !== "string" || !record.aggregateId) {
    diagnostics.push(error("snapshot.aggregate_mismatch", "Snapshot aggregate id does not match the requested aggregate."));
  }

  if (record.aggregateType !== context.aggregateType || typeof record.aggregateType !== "string" || !record.aggregateType) {
    diagnostics.push(error("snapshot.aggregate_type_mismatch", "Snapshot aggregate type does not match the requested aggregate type."));
  }

  if (!Number.isInteger(record.version) || record.version < 0) {
    diagnostics.push(error("snapshot.version_invalid", "Snapshot version must be a non-negative integer."));
  } else if (context.currentVersion !== undefined && record.version > context.currentVersion) {
    diagnostics.push(error("snapshot.version_ahead", "Snapshot version cannot be greater than the current event stream."));
  }

  if (typeof record.eventId !== "string" || !record.eventId) {
    diagnostics.push(error("snapshot.event_id_invalid", "Snapshot must include the last applied event id."));
  }

  if (record.schemaVersion !== context.schemaVersion) {
    diagnostics.push(error("snapshot.schema_mismatch", "Snapshot schema version is incompatible with this runtime."));
  }

  if (typeof record.timestamp !== "string" || !record.timestamp) {
    diagnostics.push(error("snapshot.timestamp_invalid", "Snapshot timestamp is required."));
  }

  if (!record.state || typeof record.state !== "object" || Array.isArray(record.state)) {
    diagnostics.push(error("snapshot.state_invalid", "Snapshot state is required."));
  }

  return diagnostics;
}

async function validateSnapshotAnchor(eventStore: EventStore, snapshot: Snapshot): Promise<RuntimeDiagnostic[]> {
  if (snapshot.version === 0) {
    return [];
  }

  const event = await eventStore.getById(snapshot.eventId);
  if (!event || event.sequence !== snapshot.version || event.campaignId !== snapshot.campaignId) {
    return [
      error("snapshot.anchor_invalid", "Snapshot event id does not match the event at the snapshot version.")
    ];
  }

  return [];
}

function createSnapshot(candidate: SnapshotCandidate, services: RuntimeServices): Snapshot {
  return deepFreeze({
    ...cloneValue(candidate),
    id: candidate.id ?? createSnapshotId(services),
    timestamp: candidate.timestamp ?? createTimestamp(services)
  });
}

function createSnapshotId(services: RuntimeServices): string {
  if (services.createId) {
    return services.createId();
  }

  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `snapshot-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createTimestamp(services: RuntimeServices): string {
  return services.now?.() ?? new Date().toISOString();
}

function cloneSnapshot(snapshot: Snapshot): Snapshot {
  return deepFreeze(cloneValue(snapshot));
}

function cloneValue<TValue>(value: TValue): TValue {
  if (value === undefined || value === null) {
    return value;
  }

  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as TValue;
}

function deepFreeze<TValue>(value: TValue): TValue {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }

  Object.freeze(value);
  for (const child of Object.values(value)) {
    deepFreeze(child);
  }

  return value;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function error(code: string, message: string): RuntimeDiagnostic {
  return {
    code,
    message,
    severity: "error",
    source: "SnapshotManager"
  };
}

function hasErrors(diagnostics: RuntimeDiagnostic[]): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === "error");
}
