import assert from "node:assert/strict";
import test from "node:test";
import { sampleCampaign } from "../src/data/sampleCampaign.ts";
import {
  DefaultEventSchemaRegistry, DefaultEventStore, DefaultProjectionManager,
  DefaultReplayEngine, DefaultSnapshotManager, deserializeSnapshot, serializeSnapshot,
  validateSnapshot, type Snapshot, type SnapshotStore
} from "../src/runtime/index.ts";

function snapshot(overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    id: "snapshot-1", campaignId: sampleCampaign.id,
    aggregateId: sampleCampaign.id, aggregateType: "campaign", version: 1,
    eventId: "evt-1", schemaVersion: 1, timestamp: "2026-09-06T00:00:00.000Z",
    state: { old: 1 }, ...overrides
  };
}
function projections() {
  const manager = new DefaultProjectionManager();
  for (const name of ["old", "new"]) {
    manager.register<number>({ name, initialState: () => 0, apply: (_event, state) => state + 1 });
  }
  return manager;
}
async function events() {
  let id = 0;
  const store = new DefaultEventStore({
    campaignId: sampleCampaign.id,
    schemaRegistry: new DefaultEventSchemaRegistry({
      eventSchemas: [{ type: "test.fact", schemaVersion: 1, validatePayload: () => [] }],
      metadataSchemas: [{ metadataVersion: 1 }]
    }), services: { createId: () => `evt-${++id}` }
  });
  const result = await store.append([1, 2].map(() => ({
    campaignId: sampleCampaign.id, type: "test.fact", schemaVersion: 1,
    metadataVersion: 1, timestamp: "2026-09-06T00:00:00.000Z",
    actorId: "hero-lyra", payload: {}, metadata: { sourceCommandId: "cmd-1" }
  })));
  assert.equal(result.ok, true);
  return store;
}

test("incomplete snapshot restore rejects before mutating any projection", () => {
  const manager = projections();
  assert.throws(() => manager.restore({ old: 99 }), /missing a registered projection/);
  assert.deepEqual(manager.getCurrent(), { old: 0, new: 0 });
});

test("incomplete snapshot resumes via full replay with all projection history", async () => {
  const eventStore = await events();
  const manager = new DefaultSnapshotManager();
  assert.equal((await manager.save(snapshot())).ok, true);
  const replayEngine = new DefaultReplayEngine();
  const resumed = await manager.replay({
    aggregateId: sampleCampaign.id, aggregateType: "campaign",
    campaignPackage: sampleCampaign, eventStore, replayEngine, projectionManager: projections()
  });
  const full = await replayEngine.replay({
    campaignPackage: sampleCampaign, events: await eventStore.getAll(), projectionManager: projections()
  });
  assert.equal(resumed.ok, true);
  assert.deepEqual(resumed, full);
  assert.deepEqual(resumed.projections, { old: 2, new: 2 });
});

test("complete snapshot restore and later events match full replay", async () => {
  const eventStore = await events();
  const manager = new DefaultSnapshotManager();
  await manager.save(snapshot({ state: { old: 1, new: 1 } }));
  const result = await manager.replay({
    aggregateId: sampleCampaign.id, aggregateType: "campaign",
    campaignPackage: sampleCampaign, eventStore,
    replayEngine: new DefaultReplayEngine(), projectionManager: projections()
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.projections, { old: 2, new: 2 });
  assert.equal(result.latestSequence, 2);
});

test("configured snapshot schema is preserved through manager replay", async () => {
  const manager = new DefaultSnapshotManager({ schemaVersion: 2 });
  assert.equal((await manager.save(snapshot({
    schemaVersion: 2, state: { old: 1, new: 1 }
  }))).ok, true);
  const result = await manager.replay({
    aggregateId: sampleCampaign.id, aggregateType: "campaign",
    campaignPackage: sampleCampaign, eventStore: await events(),
    replayEngine: new DefaultReplayEngine(), projectionManager: projections()
  });
  assert.equal(result.ok, true);
  assert.equal(result.latestSequence, 2);
  assert.deepEqual(result.projections, { old: 2, new: 2 });
});

for (const [name, value] of Object.entries({
  foreignCampaign: snapshot({ campaignId: "foreign" }),
  unsupportedSchema: snapshot({ schemaVersion: 999 }),
  negativeVersion: snapshot({ version: -1 }),
  fractionalVersion: snapshot({ version: 1.5 }),
  scalarState: snapshot({ state: 3 as unknown as Snapshot["state"] }),
  missingId: snapshot({ id: "" }),
  nullEnvelope: null, scalarEnvelope: 3, arrayEnvelope: []
})) {
  test(`direct snapshot replay rejects ${name} before restoring state`, async () => {
    const manager = projections();
    const result = await new DefaultReplayEngine().replay({
      campaignPackage: sampleCampaign, events: [], projectionManager: manager,
      snapshot: value as Snapshot
    });
    assert.equal(result.ok, false);
    assert.equal(result.latestSequence, 0);
    assert.deepEqual(manager.getCurrent(), { old: 0, new: 0 });
    assert.equal(result.diagnostics[0].severity, "error");
  });
}

test("serialization uses JSON optional-value semantics and stable key ordering", async () => {
  const value = snapshot({
    metadata: undefined,
    state: { optional: undefined, nested: { z: 1, absent: undefined, a: 2 }, list: [1, undefined, 3] }
  });
  const manager = new DefaultSnapshotManager();
  assert.equal((await manager.save(value)).ok, true);
  const serialized = serializeSnapshot(value);
  assert.deepEqual(deserializeSnapshot(serialized), JSON.parse(JSON.stringify(value)));
  assert.equal(serialized.includes("undefined"), false);
  assert.equal(serializeSnapshot(deserializeSnapshot(serialized)), serialized);
  assert.ok(serialized.includes('"nested":{"a":2,"z":1}'));
});

for (const malformed of [false, 0, 42, "bad", [], {}, null]) {
  test(`malformed stored envelope ${JSON.stringify(malformed)} falls back safely`, async () => {
    const store: SnapshotStore = {
      save: async () => {}, delete: async () => {},
      load: async () => malformed as Snapshot | null
    };
    assert.ok(validateSnapshot(malformed, {
      campaignId: sampleCampaign.id, aggregateId: sampleCampaign.id,
      aggregateType: "campaign", schemaVersion: 1
    }).length > 0);
    const result = await new DefaultSnapshotManager({ store }).replay({
      aggregateId: sampleCampaign.id, aggregateType: "campaign",
      campaignPackage: sampleCampaign, eventStore: await events(),
      replayEngine: new DefaultReplayEngine(), projectionManager: projections()
    });
    assert.equal(result.ok, true);
    assert.deepEqual(result.projections, { old: 2, new: 2 });
  });
}
