import assert from "node:assert/strict";
import test from "node:test";
import { sampleCampaign } from "../src/data/sampleCampaign.ts";
import {
  DefaultProjectionManager,
  DefaultReplayEngine,
  ProjectionManagerError,
  type CampaignEvent,
  type ProjectionDefinition
} from "../src/runtime/index.ts";

type CounterProjection = {
  count: number;
  sequences: number[];
};

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
    payload: { amount: sequence },
    metadata: { sourceCommandId: `cmd-${sequence}` },
    ...overrides
  };
}

function counterProjection(name = "counter"): ProjectionDefinition<CounterProjection> {
  return {
    name,
    initialState: () => ({ count: 0, sequences: [] }),
    apply(replayEvent, state) {
      return {
        count: state.count + 1,
        sequences: [...state.sequences, replayEvent.sequence]
      };
    }
  };
}

test("projection registration creates a readable projection", () => {
  const manager = new DefaultProjectionManager();

  manager.register(counterProjection());

  assert.equal(manager.has("counter"), true);
  assert.deepEqual(manager.get<CounterProjection>("counter"), { count: 0, sequences: [] });
});

test("duplicate projection registration is rejected", () => {
  const manager = new DefaultProjectionManager([counterProjection()]);

  assert.throws(
    () => manager.register(counterProjection()),
    (error) => error instanceof ProjectionManagerError
      && error.diagnostics[0].code === "projection.duplicate_registration"
  );
});

test("projection reset restores initial state", () => {
  const manager = new DefaultProjectionManager([counterProjection()]);

  manager.apply(event(1));
  manager.reset();

  assert.deepEqual(manager.get<CounterProjection>("counter"), { count: 0, sequences: [] });
});

test("events are applied to projections in event order", () => {
  const manager = new DefaultProjectionManager([counterProjection()]);

  manager.apply(event(1));
  manager.apply(event(2));
  manager.apply(event(3));

  assert.deepEqual(manager.get<CounterProjection>("counter")?.sequences, [1, 2, 3]);
});

test("multiple projections update independently from the same event stream", () => {
  const manager = new DefaultProjectionManager([
    counterProjection("counter"),
    {
      name: "types",
      initialState: () => ({ seen: [] as string[] }),
      apply(replayEvent, state) {
        return { seen: [...state.seen, replayEvent.type] };
      }
    }
  ]);

  manager.apply(event(1));
  manager.apply(event(2, { type: "test.other_fact" }));

  assert.deepEqual(manager.get<CounterProjection>("counter"), { count: 2, sequences: [1, 2] });
  assert.deepEqual(manager.get<{ seen: string[] }>("types"), { seen: ["test.fact", "test.other_fact"] });
});

test("projection lookup returns read-only copies", () => {
  const manager = new DefaultProjectionManager([counterProjection()]);

  const projection = manager.get<CounterProjection>("counter");
  assert.equal(Object.isFrozen(projection), true);
  assert.equal(Object.isFrozen(projection?.sequences), true);

  assert.throws(() => {
    (projection as CounterProjection).count = 99;
  }, TypeError);

  assert.deepEqual(manager.get<CounterProjection>("counter"), { count: 0, sequences: [] });
  assert.equal(manager.get("missing"), undefined);
});

test("replay rebuilds registered projections through the projection manager", async () => {
  const replay = new DefaultReplayEngine();
  const manager = new DefaultProjectionManager([counterProjection()]);

  const result = await replay.replay({
    campaignPackage: sampleCampaign,
    events: [event(1), event(2)],
    projectionManager: manager
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.projections?.counter, { count: 2, sequences: [1, 2] });
});

test("projection failure is isolated from other projections", () => {
  const manager = new DefaultProjectionManager([
    counterProjection("before"),
    {
      name: "failing",
      initialState: () => ({ applied: 0 }),
      apply() {
        throw new Error("Projection exploded.");
      }
    },
    counterProjection("after")
  ]);

  const result = manager.applyEvent(event(1));

  assert.equal(result.ok, false);
  assert.equal(result.latestSequence, 0);
  assert.equal(result.diagnostics[0].code, "projection.apply_failed");
  assert.equal(result.diagnostics[0].sequence, 1);
  assert.deepEqual(manager.get<CounterProjection>("before"), { count: 1, sequences: [1] });
  assert.deepEqual(manager.get<{ applied: number }>("failing"), { applied: 0 });
  assert.deepEqual(manager.get<CounterProjection>("after"), { count: 1, sequences: [1] });
});

test("rebuild is deterministic for identical event input", () => {
  const events = [event(1), event(2), event(3)];
  const first = new DefaultProjectionManager([counterProjection()]);
  const second = new DefaultProjectionManager([counterProjection()]);

  const firstResult = first.rebuild(events);
  const secondResult = second.rebuild(events);

  assert.deepEqual(firstResult, secondResult);
  assert.deepEqual(first.getCurrent(), second.getCurrent());
});
