import type {
  AppendResult,
  CampaignEvent,
  EventCandidate,
  EventIntegrityResult,
  EventStore,
  EventMetadataSchema,
  EventSchema,
  EventSchemaRegistry,
  EventStorageAdapter,
  RuntimeDiagnostic,
  RuntimeServices
} from "./types.ts";

export type EventStoreOptions = {
  campaignId: string;
  adapter?: EventStorageAdapter;
  schemaRegistry: EventSchemaRegistry;
  services?: RuntimeServices;
};

export class DefaultEventStore implements EventStore {
  private readonly campaignId: string;
  private readonly adapter: EventStorageAdapter;
  private readonly schemaRegistry: EventSchemaRegistry;
  private readonly services: RuntimeServices;

  constructor(options: EventStoreOptions) {
    this.campaignId = options.campaignId;
    this.adapter = options.adapter ?? new InMemoryEventStorageAdapter();
    this.schemaRegistry = options.schemaRegistry;
    this.services = options.services ?? {};
  }

  async append(candidates: EventCandidate[]): Promise<AppendResult> {
    const diagnostics = await this.validateAppend(candidates);
    if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
      return { ok: false, events: [], diagnostics };
    }

    const latestSequence = await this.adapter.readLatestSequence(this.campaignId);
    const events = candidates.map((candidate, index) => freezeEvent({
      ...candidate,
      id: this.createEventId(),
      sequence: latestSequence + index + 1
    }));

    try {
      await this.adapter.appendBatch(this.campaignId, events);
    } catch (error) {
      return {
        ok: false,
        events: [],
        diagnostics: [
          {
            code: "event_store.append_failed",
            message: error instanceof Error ? error.message : "Event append failed.",
            severity: "error",
            source: "EventStore"
          }
        ]
      };
    }

    return { ok: true, events, diagnostics };
  }

  getById(eventId: string): Promise<CampaignEvent | null> {
    return this.adapter.readById(this.campaignId, eventId);
  }

  getLast(count: number): Promise<CampaignEvent[]> {
    return this.adapter.readLast(this.campaignId, count);
  }

  getAfter(sequence: number): Promise<CampaignEvent[]> {
    return this.adapter.readAfter(this.campaignId, sequence);
  }

  getBetween(startSequence: number, endSequence: number): Promise<CampaignEvent[]> {
    return this.adapter.readBetween(this.campaignId, startSequence, endSequence);
  }

  getAll(): Promise<CampaignEvent[]> {
    return this.adapter.readAll(this.campaignId);
  }

  getLatestSequence(): Promise<number> {
    return this.adapter.readLatestSequence(this.campaignId);
  }

  async verifyIntegrity(): Promise<EventIntegrityResult> {
    const events = await this.adapter.readAll(this.campaignId);
    const diagnostics: RuntimeDiagnostic[] = [];
    const seenSequences = new Set<number>();
    const seenIds = new Set<string>();

    events.forEach((event, index) => {
      const expectedSequence = index + 1;
      if (event.sequence !== expectedSequence) {
        diagnostics.push({
          code: "event_store.sequence_gap",
          message: `Expected sequence ${expectedSequence} but found ${event.sequence}.`,
          severity: "error",
          source: "EventStore",
          sequence: event.sequence,
          eventId: event.id
        });
      }

      if (seenSequences.has(event.sequence)) {
        diagnostics.push({
          code: "event_store.duplicate_sequence",
          message: `Duplicate sequence ${event.sequence}.`,
          severity: "error",
          source: "EventStore",
          sequence: event.sequence,
          eventId: event.id
        });
      }
      seenSequences.add(event.sequence);

      if (seenIds.has(event.id)) {
        diagnostics.push({
          code: "event_store.duplicate_id",
          message: `Duplicate event id "${event.id}".`,
          severity: "error",
          source: "EventStore",
          sequence: event.sequence,
          eventId: event.id
        });
      }
      seenIds.add(event.id);

      diagnostics.push(...this.schemaRegistry.validate(event));
    });

    const latestSequence = events.at(-1)?.sequence ?? 0;
    return {
      ok: !diagnostics.some((diagnostic) => diagnostic.severity === "error"),
      latestSequence,
      eventCount: events.length,
      diagnostics
    };
  }

  private async validateAppend(candidates: EventCandidate[]): Promise<RuntimeDiagnostic[]> {
    const diagnostics: RuntimeDiagnostic[] = [];

    for (const candidate of candidates) {
      diagnostics.push(...validateCandidateBoundary(candidate, this.campaignId));
      diagnostics.push(...this.schemaRegistry.validate(candidate));
    }

    return diagnostics;
  }

  private createEventId(): string {
    if (this.services.createId) {
      return this.services.createId();
    }

    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }

    return `evt-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

export class DefaultEventSchemaRegistry implements EventSchemaRegistry {
  private readonly eventSchemas = new Map<string, EventSchema>();
  private readonly metadataSchemas = new Map<number, EventMetadataSchema>();

  constructor(options: { eventSchemas?: EventSchema[]; metadataSchemas?: EventMetadataSchema[] } = {}) {
    for (const schema of options.eventSchemas ?? []) {
      this.registerEventSchema(schema);
    }
    for (const schema of options.metadataSchemas ?? []) {
      this.registerMetadataSchema(schema);
    }
  }

  registerEventSchema(schema: EventSchema): void {
    this.eventSchemas.set(eventSchemaKey(schema.type, schema.schemaVersion), schema);
  }

  registerMetadataSchema(schema: EventMetadataSchema): void {
    this.metadataSchemas.set(schema.metadataVersion, schema);
  }

  getSchema(type: string, schemaVersion: number): EventSchema | undefined {
    return this.eventSchemas.get(eventSchemaKey(type, schemaVersion));
  }

  getMetadataSchema(metadataVersion: number): EventMetadataSchema | undefined {
    return this.metadataSchemas.get(metadataVersion);
  }

  validate(event: EventCandidate | CampaignEvent): RuntimeDiagnostic[] {
    const diagnostics: RuntimeDiagnostic[] = [];
    const eventSchema = this.getSchema(event.type, event.schemaVersion);
    if (!eventSchema) {
      diagnostics.push({
        code: "event_schema.unsupported",
        message: `Unsupported event schema "${event.type}" version ${event.schemaVersion}.`,
        severity: "error",
        source: "EventSchemaRegistry"
      });
    } else {
      diagnostics.push(...(eventSchema.validatePayload?.(event.payload) ?? []));
    }

    const metadataSchema = this.getMetadataSchema(event.metadataVersion);
    if (!metadataSchema) {
      diagnostics.push({
        code: "event_metadata.unsupported",
        message: `Unsupported event metadata version ${event.metadataVersion}.`,
        severity: "error",
        source: "EventSchemaRegistry"
      });
    } else {
      diagnostics.push(...(metadataSchema.validateMetadata?.(event.metadata) ?? []));
    }

    return diagnostics;
  }
}

export class InMemoryEventStorageAdapter implements EventStorageAdapter {
  private readonly eventsByCampaign = new Map<string, CampaignEvent[]>();

  async appendBatch(campaignId: string, events: CampaignEvent[]): Promise<void> {
    const existing = this.eventsByCampaign.get(campaignId) ?? [];
    const nextEvents = [...existing, ...events];
    this.eventsByCampaign.set(campaignId, nextEvents);
  }

  async readById(campaignId: string, eventId: string): Promise<CampaignEvent | null> {
    return this.readCampaignEvents(campaignId).find((event) => event.id === eventId) ?? null;
  }

  async readLast(campaignId: string, count: number): Promise<CampaignEvent[]> {
    if (count <= 0) {
      return [];
    }
    return this.readCampaignEvents(campaignId).slice(-count);
  }

  async readAfter(campaignId: string, sequence: number): Promise<CampaignEvent[]> {
    return this.readCampaignEvents(campaignId).filter((event) => event.sequence > sequence);
  }

  async readBetween(campaignId: string, startSequence: number, endSequence: number): Promise<CampaignEvent[]> {
    return this.readCampaignEvents(campaignId).filter(
      (event) => event.sequence >= startSequence && event.sequence <= endSequence
    );
  }

  async readAll(campaignId: string): Promise<CampaignEvent[]> {
    return this.readCampaignEvents(campaignId);
  }

  async readLatestSequence(campaignId: string): Promise<number> {
    return this.readCampaignEvents(campaignId).at(-1)?.sequence ?? 0;
  }

  protected readCampaignEvents(campaignId: string): CampaignEvent[] {
    return [...(this.eventsByCampaign.get(campaignId) ?? [])].sort((left, right) => left.sequence - right.sequence);
  }
}

function validateCandidateBoundary(candidate: EventCandidate, campaignId: string): RuntimeDiagnostic[] {
  const diagnostics: RuntimeDiagnostic[] = [];
  const candidateRecord = candidate as EventCandidate & { id?: unknown; sequence?: unknown };

  if (candidateRecord.id !== undefined) {
    diagnostics.push({
      code: "event_candidate.id_forbidden",
      message: "Event candidates must not include authoritative event ids.",
      severity: "error",
      source: "EventStore"
    });
  }

  if (candidateRecord.sequence !== undefined) {
    diagnostics.push({
      code: "event_candidate.sequence_forbidden",
      message: "Event candidates must not include authoritative sequence values.",
      severity: "error",
      source: "EventStore"
    });
  }

  if (candidate.campaignId !== campaignId) {
    diagnostics.push({
      code: "event_candidate.campaign_mismatch",
      message: `Event candidate campaign "${candidate.campaignId}" does not match active campaign "${campaignId}".`,
      severity: "error",
      source: "EventStore"
    });
  }

  if (!candidate.type) {
    diagnostics.push({
      code: "event_candidate.type_required",
      message: "Event candidate type is required.",
      severity: "error",
      source: "EventStore"
    });
  }

  if (!Number.isInteger(candidate.schemaVersion) || candidate.schemaVersion < 1) {
    diagnostics.push({
      code: "event_candidate.schema_version_invalid",
      message: "Event candidate schemaVersion must be a positive integer.",
      severity: "error",
      source: "EventStore"
    });
  }

  if (!Number.isInteger(candidate.metadataVersion) || candidate.metadataVersion < 1) {
    diagnostics.push({
      code: "event_candidate.metadata_version_invalid",
      message: "Event candidate metadataVersion must be a positive integer.",
      severity: "error",
      source: "EventStore"
    });
  }

  if (!candidate.timestamp) {
    diagnostics.push({
      code: "event_candidate.timestamp_required",
      message: "Event candidate timestamp is required.",
      severity: "error",
      source: "EventStore"
    });
  }

  if (candidate.payload === undefined) {
    diagnostics.push({
      code: "event_candidate.payload_required",
      message: "Event candidate payload is required.",
      severity: "error",
      source: "EventStore"
    });
  }

  return diagnostics;
}

function freezeEvent(event: CampaignEvent): CampaignEvent {
  return Object.freeze({
    ...event,
    metadata: event.metadata ? Object.freeze({ ...event.metadata }) : undefined,
    payload: freezePayload(event.payload)
  });
}

function freezePayload<T>(payload: T): T {
  if (payload && typeof payload === "object") {
    return Object.freeze(payload);
  }

  return payload;
}

function eventSchemaKey(type: string, schemaVersion: number): string {
  return `${type}@${schemaVersion}`;
}
