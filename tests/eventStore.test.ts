import assert from "node:assert/strict";
import test from "node:test";
import { sampleCampaign } from "../src/data/sampleCampaign.ts";
import {
  DefaultEventSchemaRegistry,
  DefaultEventStore,
  InMemoryEventStorageAdapter,
  type CampaignEvent,
  type EventCandidate,
  type RuntimeDiagnostic
} from "../src/runtime/index.ts";

function createRegistry() {
  return new DefaultEventSchemaRegistry({
    eventSchemas: [
      {
        type: "test.fact",
        schemaVersion: 1,
        validatePayload(payload: unknown): RuntimeDiagnostic[] {
          if (!payload || typeof payload !== "object" || !("result" in payload)) {
            return [
              {
                code: "payload.invalid",
                message: "Payload must include result.",
                severity: "error",
                source: "TestSchema"
              }
            ];
          }
          return [];
        }
      }
    ],
    metadataSchemas: [{ metadataVersion: 1 }]
  });
}

function createStore(adapter = new InMemoryEventStorageAdapter()) {
  let id = 0;
  return new DefaultEventStore({
    campaignId: sampleCampaign.id,
    adapter,
    schemaRegistry: createRegistry(),
    services: {
      createId: () => `evt-${++id}`
    }
  });
}

function candidate(overrides: Partial<EventCandidate> = {}): EventCandidate {
  return {
    campaignId: sampleCampaign.id,
    type: "test.fact",
    schemaVersion: 1,
    metadataVersion: 1,
    timestamp: "2026-07-06T00:00:00.000Z",
    actorId: "hero-lyra",
    payload: { result: "stored", randomRoll: 12 },
    metadata: { sourceCommandId: "cmd-1" },
    ...overrides
  };
}

test("append success assigns immutable event ids and contiguous sequences", async () => {
  const store = createStore();

  const result = await store.append([candidate(), candidate({ metadata: { sourceCommandId: "cmd-2" } })]);

  assert.equal(result.ok, true);
  assert.deepEqual(result.events.map((event) => event.id), ["evt-1", "evt-2"]);
  assert.deepEqual(result.events.map((event) => event.sequence), [1, 2]);
  assert.equal(Object.isFrozen(result.events[0]), true);
});

test("append failure rejects invalid schema and appends nothing", async () => {
  const store = createStore();

  const result = await store.append([candidate({ schemaVersion: 999 })]);

  assert.equal(result.ok, false);
  assert.equal(await store.getLatestSequence(), 0);
  assert.equal((await store.getAll()).length, 0);
});

test("atomic append rejects entire batch when one candidate is invalid", async () => {
  const store = createStore();

  const result = await store.append([candidate(), candidate({ payload: {} })]);

  assert.equal(result.ok, false);
  assert.equal(await store.getLatestSequence(), 0);
  assert.deepEqual(await store.getAll(), []);
});

test("deterministic retrieval returns events ordered by sequence", async () => {
  const store = createStore();
  await store.append([candidate(), candidate(), candidate()]);

  assert.deepEqual((await store.getAll()).map((event) => event.sequence), [1, 2, 3]);
  assert.deepEqual((await store.getAfter(1)).map((event) => event.sequence), [2, 3]);
  assert.deepEqual((await store.getBetween(2, 3)).map((event) => event.sequence), [2, 3]);
  assert.deepEqual((await store.getLast(2)).map((event) => event.sequence), [2, 3]);
  assert.equal((await store.getById("evt-2"))?.sequence, 2);
});

test("getLatestSequence returns latest committed sequence", async () => {
  const store = createStore();

  assert.equal(await store.getLatestSequence(), 0);
  await store.append([candidate(), candidate()]);
  assert.equal(await store.getLatestSequence(), 2);
});

test("integrity verification passes for a valid log", async () => {
  const store = createStore();
  await store.append([candidate(), candidate()]);

  const result = await store.verifyIntegrity();

  assert.equal(result.ok, true);
  assert.equal(result.eventCount, 2);
  assert.equal(result.latestSequence, 2);
});

test("integrity verification detects duplicate sequence", async () => {
  const adapter = new InMemoryEventStorageAdapter();
  const store = createStore(adapter);
  const first: CampaignEvent = {
    ...candidate(),
    id: "evt-a",
    sequence: 1
  };
  const second: CampaignEvent = {
    ...candidate(),
    id: "evt-b",
    sequence: 1
  };
  await adapter.appendBatch(sampleCampaign.id, [first, second]);

  const result = await store.verifyIntegrity();

  assert.equal(result.ok, false);
  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.code === "event_store.duplicate_sequence"), true);
});

test("integrity verification detects missing sequence", async () => {
  const adapter = new InMemoryEventStorageAdapter();
  const store = createStore(adapter);
  await adapter.appendBatch(sampleCampaign.id, [
    { ...candidate(), id: "evt-a", sequence: 1 },
    { ...candidate(), id: "evt-b", sequence: 3 }
  ]);

  const result = await store.verifyIntegrity();

  assert.equal(result.ok, false);
  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.code === "event_store.sequence_gap"), true);
});

test("invalid metadata version is rejected", async () => {
  const store = createStore();

  const result = await store.append([candidate({ metadataVersion: 999 })]);

  assert.equal(result.ok, false);
  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.code === "event_metadata.unsupported"), true);
});

test("caller assigned event id is rejected", async () => {
  const store = createStore();
  const withId = { ...candidate(), id: "caller-event-id" } as EventCandidate;

  const result = await store.append([withId]);

  assert.equal(result.ok, false);
  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.code === "event_candidate.id_forbidden"), true);
});

test("caller assigned sequence is rejected", async () => {
  const store = createStore();
  const withSequence = { ...candidate(), sequence: 9 } as EventCandidate;

  const result = await store.append([withSequence]);

  assert.equal(result.ok, false);
  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.code === "event_candidate.sequence_forbidden"), true);
});

test("invalid campaign id is rejected", async () => {
  const store = createStore();

  const result = await store.append([candidate({ campaignId: "wrong-campaign" })]);

  assert.equal(result.ok, false);
  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.code === "event_candidate.campaign_mismatch"), true);
});

test("commands are not persisted as events", async () => {
  const store = createStore();

  await store.append([candidate()]);
  const events = await store.getAll();

  assert.equal(events.length, 1);
  assert.equal(events[0].type, "test.fact");
  assert.equal(events[0].metadata?.sourceCommandId, "cmd-1");
  assert.equal("command" in events[0], false);
});

test("offline-only operation uses in-memory storage without network dependencies", async () => {
  const store = createStore();

  const result = await store.append([candidate()]);

  assert.equal(result.ok, true);
  assert.equal((await store.getAll()).length, 1);
});
