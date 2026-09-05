import assert from "node:assert/strict";
import test from "node:test";
import { sampleCampaign } from "../src/data/sampleCampaign.ts";
import {
  DefaultEventSchemaRegistry,
  DefaultReplayEngine,
  type CampaignEvent,
  type ProjectionSet,
  type ReplayProjectionManager,
  type RuntimeDiagnostic
} from "../src/runtime/index.ts";

class FakeReplayProjectionManager implements ReplayProjectionManager {
  appliedEvents: CampaignEvent[] = [];
  failOnSequence?: number;
  failOnReset = false;
  failOnRestore = false;
  failOnGetCurrent = false;
  resetCalls = 0;
  restoreCalls = 0;
  projections: ProjectionSet = { appliedTypes: [], appliedSequences: [], randomRolls: [] };

  reset(): void {
    this.resetCalls += 1;
    if (this.failOnReset) {
      throw new Error("Projection reset failed.");
    }

    this.appliedEvents = [];
    this.projections = { appliedTypes: [], appliedSequences: [], randomRolls: [] };
  }

  restore(projections: ProjectionSet): void {
    this.restoreCalls += 1;
    if (this.failOnRestore) {
      throw new Error("Snapshot restore failed.");
    }

    this.appliedEvents = [];
    this.projections = structuredClone(projections);
  }

  apply(event: CampaignEvent): void {
    if (event.sequence === this.failOnSequence) {
      throw new Error("Projection application failed.");
    }

    this.appliedEvents.push(event);
    (this.projections.appliedTypes as string[]).push(event.type);
    (this.projections.appliedSequences as number[]).push(event.sequence);
    (this.projections.randomRolls as Array<number | undefined>).push((event.payload as { randomRoll?: number }).randomRoll);
  }

  getCurrent(): ProjectionSet {
    if (this.failOnGetCurrent) {
      throw new Error("Projection read failed.");
    }

    return {
      appliedTypes: [...(this.projections.appliedTypes as string[])],
      appliedSequences: [...(this.projections.appliedSequences as number[])],
      randomRolls: [...(this.projections.randomRolls as number[])]
    };
  }
}

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

function event(sequence: number, overrides: Partial<CampaignEvent> = {}): CampaignEvent {
  return {
    id: `evt-${sequence}`,
    campaignId: sampleCampaign.id,
    sequence,
    type: "test.fact",
    schemaVersion: 1,
    metadataVersion: 1,
    timestamp: `2026-07-06T00:00:0${sequence}.000Z`,
    actorId: "hero-lyra",
    payload: { result: "fact", randomRoll: 10 + sequence },
    metadata: { sourceCommandId: `cmd-${sequence}` },
    ...overrides
  };
}

test("full replay with an empty event log succeeds", async () => {
  const replay = new DefaultReplayEngine();
  const projectionManager = new FakeReplayProjectionManager();

  const result = await replay.replay({
    campaignPackage: sampleCampaign,
    events: [],
    projectionManager
  });

  assert.equal(result.ok, true);
  assert.equal(result.latestSequence, 0);
  assert.equal(projectionManager.resetCalls, 1);
  assert.deepEqual(result.projections?.appliedSequences, []);
});

test("full replay with a single persisted event succeeds", async () => {
  const replay = new DefaultReplayEngine();
  const projectionManager = new FakeReplayProjectionManager();

  const result = await replay.replay({
    campaignPackage: sampleCampaign,
    events: [event(1)],
    projectionManager
  });

  assert.equal(result.ok, true);
  assert.equal(result.latestSequence, 1);
  assert.deepEqual(result.projections?.appliedTypes, ["test.fact"]);
  assert.deepEqual(result.projections?.appliedSequences, [1]);
});

test("full replay with ordered events succeeds", async () => {
  const replay = new DefaultReplayEngine();
  const projectionManager = new FakeReplayProjectionManager();

  const result = await replay.replay({
    campaignPackage: sampleCampaign,
    events: [event(1), event(2)],
    projectionManager
  });

  assert.equal(result.ok, true);
  assert.equal(result.latestSequence, 2);
  assert.deepEqual(result.projections?.appliedSequences, [1, 2]);
});

test("projections are rebuilt by applying events in sequence order", async () => {
  const replay = new DefaultReplayEngine();
  const projectionManager = new FakeReplayProjectionManager();

  await replay.replay({
    campaignPackage: sampleCampaign,
    events: [event(1), event(2), event(3)],
    projectionManager
  });

  assert.deepEqual(projectionManager.appliedEvents.map((applied) => applied.sequence), [1, 2, 3]);
});

test("timestamp ordering is ignored in favor of sequence order", async () => {
  const replay = new DefaultReplayEngine();
  const projectionManager = new FakeReplayProjectionManager();

  const result = await replay.replay({
    campaignPackage: sampleCampaign,
    events: [
      event(1, { timestamp: "2026-07-06T00:10:00.000Z" }),
      event(2, { timestamp: "2026-07-06T00:00:00.000Z" })
    ],
    projectionManager
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.projections?.appliedSequences, [1, 2]);
});

test("missing sequence fails", async () => {
  const replay = new DefaultReplayEngine();
  const projectionManager = new FakeReplayProjectionManager();
  const replayEvent = { ...event(1), sequence: undefined } as unknown as CampaignEvent;

  const result = await replay.replay({
    campaignPackage: sampleCampaign,
    events: [replayEvent],
    projectionManager
  });

  assert.equal(result.ok, false);
  assert.equal(result.diagnostics[0].code, "replay.sequence_missing");
  assert.equal(result.failingEventId, "evt-1");
  assert.equal(projectionManager.resetCalls, 0);
});

test("duplicate sequence fails", async () => {
  const replay = new DefaultReplayEngine();
  const projectionManager = new FakeReplayProjectionManager();

  const result = await replay.replay({
    campaignPackage: sampleCampaign,
    events: [event(1), event(1, { id: "evt-duplicate" })],
    projectionManager
  });

  assert.equal(result.ok, false);
  assert.equal(result.diagnostics[0].code, "replay.duplicate_sequence");
  assert.equal(result.failingSequence, 1);
  assert.equal(result.failingEventId, "evt-duplicate");
});

test("sequence gap fails", async () => {
  const replay = new DefaultReplayEngine();
  const projectionManager = new FakeReplayProjectionManager();

  const result = await replay.replay({
    campaignPackage: sampleCampaign,
    events: [event(1), event(3)],
    projectionManager
  });

  assert.equal(result.ok, false);
  assert.equal(result.diagnostics[0].code, "replay.sequence_gap");
  assert.equal(result.failingSequence, 3);
  assert.equal(result.failingEventId, "evt-3");
});

test("unsupported event type fails when schema validation is available", async () => {
  const replay = new DefaultReplayEngine();
  const projectionManager = new FakeReplayProjectionManager();

  const result = await replay.replay({
    campaignPackage: sampleCampaign,
    events: [event(1, { type: "test.unknown" })],
    projectionManager,
    schemaRegistry: createRegistry()
  });

  assert.equal(result.ok, false);
  assert.equal(result.diagnostics[0].code, "event_schema.unsupported");
  assert.equal(result.failingSequence, 1);
  assert.equal(result.failingEventId, "evt-1");
  assert.equal(projectionManager.resetCalls, 0);
});

test("projection reset failure is reported as a replay failure", async () => {
  const replay = new DefaultReplayEngine();
  const projectionManager = new FakeReplayProjectionManager();
  projectionManager.failOnReset = true;

  const result = await replay.replay({
    campaignPackage: sampleCampaign,
    events: [event(1)],
    projectionManager
  });

  assert.equal(result.ok, false);
  assert.equal(result.diagnostics[0].code, "replay.projection_reset_failed");
  assert.equal(result.latestSequence, 0);
  assert.equal(projectionManager.resetCalls, 1);
  assert.deepEqual(projectionManager.appliedEvents, []);
});

test("projection application failure stops replay and reports failing event", async () => {
  const replay = new DefaultReplayEngine();
  const projectionManager = new FakeReplayProjectionManager();
  projectionManager.failOnSequence = 2;

  const result = await replay.replay({
    campaignPackage: sampleCampaign,
    events: [event(1), event(2), event(3)],
    projectionManager
  });

  assert.equal(result.ok, false);
  assert.equal(result.diagnostics[0].code, "replay.projection_apply_failed");
  assert.equal(result.latestSequence, 1);
  assert.equal(result.failingSequence, 2);
  assert.equal(result.failingEventId, "evt-2");
  assert.deepEqual(projectionManager.appliedEvents.map((applied) => applied.sequence), [1]);
});

test("projection read failure is reported after replay stops safely", async () => {
  const replay = new DefaultReplayEngine();
  const projectionManager = new FakeReplayProjectionManager();
  projectionManager.failOnGetCurrent = true;

  const result = await replay.replay({
    campaignPackage: sampleCampaign,
    events: [event(1), event(2)],
    projectionManager
  });

  assert.equal(result.ok, false);
  assert.equal(result.diagnostics[0].code, "replay.projection_read_failed");
  assert.equal(result.latestSequence, 2);
  assert.equal(result.projections, undefined);
  assert.deepEqual(projectionManager.appliedEvents.map((applied) => applied.sequence), [1, 2]);
});

test("replay consumes persisted events only", async () => {
  const replay = new DefaultReplayEngine();
  const projectionManager = new FakeReplayProjectionManager();
  const eventCandidate = { ...event(1), id: undefined } as unknown as CampaignEvent;

  const result = await replay.replay({
    campaignPackage: sampleCampaign,
    events: [eventCandidate],
    projectionManager
  });

  assert.equal(result.ok, false);
  assert.equal(result.diagnostics[0].code, "replay.event_not_persisted");
});

test("replay does not append events or mutate input events", async () => {
  const replay = new DefaultReplayEngine();
  const projectionManager = new FakeReplayProjectionManager();
  const events = Object.freeze([event(1), event(2)]);
  const before = structuredClone(events);

  const result = await replay.replay({
    campaignPackage: sampleCampaign,
    events,
    projectionManager
  });

  assert.equal(result.ok, true);
  assert.deepEqual(events, before);
});

test("replay does not execute commands", async () => {
  const replay = new DefaultReplayEngine();
  const projectionManager = new FakeReplayProjectionManager();

  const result = await replay.replay({
    campaignPackage: sampleCampaign,
    events: [event(1, { metadata: { sourceCommandId: "cmd-intent-only" } })],
    projectionManager
  });

  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.commandId === "cmd-intent-only"), false);
});

test("replay does not generate randomness", async () => {
  const replay = new DefaultReplayEngine();
  const projectionManager = new FakeReplayProjectionManager();

  const result = await replay.replay({
    campaignPackage: sampleCampaign,
    events: [event(1, { payload: { result: "fact", randomRoll: 19 } })],
    projectionManager
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.projections?.randomRolls, [19]);
});

test("identical inputs produce identical replay results", async () => {
  const replay = new DefaultReplayEngine();
  const firstProjectionManager = new FakeReplayProjectionManager();
  const secondProjectionManager = new FakeReplayProjectionManager();
  const events = [event(1), event(2)];

  const first = await replay.replay({
    campaignPackage: sampleCampaign,
    events,
    projectionManager: firstProjectionManager
  });
  const second = await replay.replay({
    campaignPackage: sampleCampaign,
    events,
    projectionManager: secondProjectionManager
  });

  assert.deepEqual(first, second);
});

test("snapshot replay restores projections before applying later events", async () => {
  const replay = new DefaultReplayEngine();
  const projectionManager = new FakeReplayProjectionManager();

  const result = await replay.replay({
    campaignPackage: sampleCampaign,
    events: [event(2)],
    projectionManager,
    snapshot: {
      id: "snapshot-1",
      campaignId: sampleCampaign.id,
      aggregateId: sampleCampaign.id,
      aggregateType: "campaign",
      version: 1,
      eventId: "evt-1",
      schemaVersion: 1,
      timestamp: "2026-07-06T00:00:01.000Z",
      state: {
        appliedTypes: ["test.fact"],
        appliedSequences: [1],
        randomRolls: [11]
      }
    }
  });

  assert.equal(result.ok, true);
  assert.equal(projectionManager.resetCalls, 0);
  assert.equal(projectionManager.restoreCalls, 1);
  assert.equal(result.latestSequence, 2);
  assert.deepEqual(result.projections?.appliedSequences, [1, 2]);
});
