import assert from "node:assert/strict";
import test from "node:test";
import { sampleCampaign } from "../src/data/sampleCampaign.ts";
import {
  CommandProcessor,
  DefaultPluginRegistry,
  type AppendResult,
  type CampaignCommand,
  type CampaignEvent,
  type EventCandidate,
  type EventIntegrityResult,
  type EventStore,
  type ProjectionDefinition,
  type ProjectionManager,
  type ProjectionSet,
  type RuntimeContext,
  type RuntimePlugin
} from "../src/runtime/index.ts";

class FakeEventStore implements EventStore {
  appendCalls = 0;
  appendedBatches: CampaignEvent[][] = [];
  failAppend = false;
  nextSequence = 1;

  async append(events: EventCandidate[]): Promise<AppendResult> {
    this.appendCalls += 1;

    if (this.failAppend) {
      return {
        ok: false,
        events: [],
        diagnostics: [
          {
            code: "event_store.failed",
            message: "Append failed.",
            severity: "error",
            source: "FakeEventStore"
          }
        ]
      };
    }

    const appended = events.map((event) => ({
      ...event,
      id: `evt-${this.nextSequence}`,
      sequence: this.nextSequence++
    })) as CampaignEvent[];

    this.appendedBatches.push(appended);

    return {
      ok: true,
      events: appended,
      diagnostics: []
    };
  }

  async getById(): Promise<CampaignEvent | null> {
    return null;
  }

  async getLast(): Promise<CampaignEvent[]> {
    return [];
  }

  async getAfter(): Promise<CampaignEvent[]> {
    return [];
  }

  async getBetween(): Promise<CampaignEvent[]> {
    return [];
  }

  async getAll(): Promise<CampaignEvent[]> {
    return [];
  }

  async getLatestSequence(): Promise<number> {
    return this.nextSequence - 1;
  }

  async verifyIntegrity(): Promise<EventIntegrityResult> {
    return {
      ok: true,
      latestSequence: this.nextSequence - 1,
      eventCount: this.appendedBatches.flat().length,
      diagnostics: []
    };
  }
}

class FakeProjectionManager implements ProjectionManager {
  appliedEvents: CampaignEvent[] = [];

  register<TState>(_definition: ProjectionDefinition<TState>): void {
    return undefined;
  }

  reset(): void {
    this.appliedEvents = [];
  }

  restore(): void {
    this.appliedEvents = [];
  }

  apply(event: CampaignEvent): void {
    this.appliedEvents.push(event);
  }

  rebuild(events: CampaignEvent[]): ProjectionSet {
    this.reset();
    for (const event of events) {
      this.apply(event);
    }
    return this.getCurrent();
  }

  get(): undefined {
    return undefined;
  }

  has(): boolean {
    return false;
  }

  getCurrent(): ProjectionSet {
    return {};
  }
}

function createCommand(type = "test.succeed"): CampaignCommand {
  return {
    id: "cmd-1",
    type,
    campaignId: sampleCampaign.id,
    actorId: "hero-lyra",
    payload: { note: "intent only" }
  };
}

function createRuntime(plugin: RuntimePlugin, eventStore = new FakeEventStore(), projections = {}): RuntimeContext {
  const registry = new DefaultPluginRegistry();
  registry.load(plugin, {
    campaignId: sampleCampaign.id,
    campaignPackage: sampleCampaign,
    services: {}
  });

  return {
    campaignId: sampleCampaign.id,
    campaignPackage: sampleCampaign,
    projections,
    eventStore,
    projectionManager: new FakeProjectionManager(),
    pluginRegistry: registry,
    services: {}
  };
}

function createPlugin(options: {
  validatorDiagnostics?: boolean;
  handlerFails?: boolean;
  validatorCalls?: { count: number };
  handlerCalls?: { count: number };
  initialized?: { count: number };
  registered?: { count: number };
} = {}): RuntimePlugin {
  return {
    name: "TestPlugin",
    version: "0.0.1",
    initialize() {
      if (options.initialized) {
        options.initialized.count += 1;
      }
    },
    register(registry) {
      if (options.registered) {
        options.registered.count += 1;
      }

      registry.registerCommand({ type: "test.succeed" });
      registry.registerValidator("test.succeed", () => {
        if (options.validatorCalls) {
          options.validatorCalls.count += 1;
        }

        if (!options.validatorDiagnostics) {
          return [];
        }

        return [
          {
            code: "test.invalid",
            message: "The command is invalid.",
            severity: "error",
            source: "TestPlugin"
          }
        ];
      });
      registry.registerRuleHandler("test.succeed", (command) => {
        if (options.handlerCalls) {
          options.handlerCalls.count += 1;
        }

        if (options.handlerFails) {
          return {
            ok: false,
            events: [],
            diagnostics: [
              {
                code: "test.rule_failed",
                message: "Rule failed.",
                severity: "error",
                source: "TestPlugin"
              }
            ]
          };
        }

        return [
          {
            campaignId: command.campaignId,
            type: "test.event_created",
            schemaVersion: 1,
            metadataVersion: 1,
            actorId: command.actorId,
            payload: {
              result: "fact",
              randomRoll: 17
            },
            metadata: {
              sourceCommandId: command.id
            }
          }
        ];
      });
      registry.registerEventSchema({ type: "test.event_created", schemaVersion: 1 });
      registry.registerProjectionReducer(() => undefined);
    }
  };
}

test("registered command executes successfully", async () => {
  const context = createRuntime(createPlugin());
  const processor = new CommandProcessor(context);

  const result = await processor.execute(createCommand());

  assert.equal(result.ok, true);
  assert.equal(result.appendedEvents.length, 1);
  assert.equal(result.appendedEvents[0].type, "test.event_created");
});

test("unknown command type fails", async () => {
  const eventStore = new FakeEventStore();
  const context = createRuntime(createPlugin(), eventStore);
  const processor = new CommandProcessor(context);

  const result = await processor.execute(createCommand("test.unknown"));

  assert.equal(result.ok, false);
  assert.equal(eventStore.appendCalls, 0);
  assert.match(result.diagnostics[0].code, /command\.unknown/);
});

test("invalid command appends no events", async () => {
  const eventStore = new FakeEventStore();
  const context = createRuntime(createPlugin({ validatorDiagnostics: true }), eventStore);
  const processor = new CommandProcessor(context);

  const result = await processor.execute(createCommand());

  assert.equal(result.ok, false);
  assert.equal(eventStore.appendCalls, 0);
  assert.equal(result.appendedEvents.length, 0);
});

test("commands are never persisted", async () => {
  const eventStore = new FakeEventStore();
  const context = createRuntime(createPlugin(), eventStore);
  const processor = new CommandProcessor(context);

  await processor.execute(createCommand());

  assert.equal(eventStore.appendedBatches.length, 1);
  assert.equal("payload" in eventStore.appendedBatches[0][0], true);
  assert.equal((eventStore.appendedBatches[0][0] as unknown as { type: string }).type, "test.event_created");
  assert.notEqual((eventStore.appendedBatches[0][0] as unknown as { type: string }).type, "test.succeed");
});

test("validation runs before rule execution", async () => {
  const validatorCalls = { count: 0 };
  const handlerCalls = { count: 0 };
  const context = createRuntime(createPlugin({ validatorCalls, handlerCalls }));
  const processor = new CommandProcessor(context);

  await processor.execute(createCommand());

  assert.equal(validatorCalls.count, 1);
  assert.equal(handlerCalls.count, 1);
});

test("rule execution does not run after validation failure", async () => {
  const validatorCalls = { count: 0 };
  const handlerCalls = { count: 0 };
  const context = createRuntime(createPlugin({ validatorDiagnostics: true, validatorCalls, handlerCalls }));
  const processor = new CommandProcessor(context);

  await processor.execute(createCommand());

  assert.equal(validatorCalls.count, 1);
  assert.equal(handlerCalls.count, 0);
});

test("valid command produces expected event candidates", async () => {
  const eventStore = new FakeEventStore();
  const context = createRuntime(createPlugin(), eventStore);
  const processor = new CommandProcessor(context);

  await processor.execute(createCommand());

  assert.equal(eventStore.appendedBatches[0].length, 1);
  assert.deepEqual(eventStore.appendedBatches[0][0].payload, { result: "fact", randomRoll: 17 });
});

test("event store append is called only after successful rule execution", async () => {
  const eventStore = new FakeEventStore();
  const context = createRuntime(createPlugin({ handlerFails: true }), eventStore);
  const processor = new CommandProcessor(context);

  const result = await processor.execute(createCommand());

  assert.equal(result.ok, false);
  assert.equal(eventStore.appendCalls, 0);
});

test("event store append failure returns command failure", async () => {
  const eventStore = new FakeEventStore();
  eventStore.failAppend = true;
  const context = createRuntime(createPlugin(), eventStore);
  const processor = new CommandProcessor(context);

  const result = await processor.execute(createCommand());

  assert.equal(result.ok, false);
  assert.equal(result.appendedEvents.length, 0);
  assert.equal(eventStore.appendCalls, 1);
});

test("projection manager updates after successful append", async () => {
  const context = createRuntime(createPlugin());
  const projectionManager = context.projectionManager as FakeProjectionManager;
  const processor = new CommandProcessor(context);

  await processor.execute(createCommand());

  assert.equal(projectionManager.appliedEvents.length, 1);
  assert.equal(projectionManager.appliedEvents[0].sequence, 1);
});

test("command processor does not mutate projections directly", async () => {
  const projections = { stable: true };
  const context = createRuntime(createPlugin(), new FakeEventStore(), projections);
  const processor = new CommandProcessor(context);

  await processor.execute(createCommand());

  assert.deepEqual(projections, { stable: true });
});

test("command processor does not append events outside event store", async () => {
  const eventStore = new FakeEventStore();
  const context = createRuntime(createPlugin(), eventStore);
  const processor = new CommandProcessor(context);

  await processor.execute(createCommand());

  assert.equal(eventStore.appendCalls, 1);
  assert.equal(eventStore.appendedBatches.flat().length, 1);
});

test("plugin validators are invoked", async () => {
  const validatorCalls = { count: 0 };
  const context = createRuntime(createPlugin({ validatorCalls }));
  const processor = new CommandProcessor(context);

  await processor.execute(createCommand());

  assert.equal(validatorCalls.count, 1);
});

test("plugin rule handlers are invoked", async () => {
  const handlerCalls = { count: 0 };
  const context = createRuntime(createPlugin({ handlerCalls }));
  const processor = new CommandProcessor(context);

  await processor.execute(createCommand());

  assert.equal(handlerCalls.count, 1);
});

test("runtime plugins self-register through plugin registry", () => {
  const initialized = { count: 0 };
  const registered = { count: 0 };
  const registry = new DefaultPluginRegistry();

  registry.load(createPlugin({ initialized, registered }), {
    campaignId: sampleCampaign.id,
    campaignPackage: sampleCampaign,
    services: {}
  });

  assert.equal(initialized.count, 1);
  assert.equal(registered.count, 1);
  assert.equal(registry.hasCommand("test.succeed"), true);
  assert.equal(registry.getProjectionReducers().length, 1);
});

test("command processor depends on plugin registry instead of direct domain plugins", async () => {
  const registry = new DefaultPluginRegistry();
  registry.registerCommand({ type: "test.succeed" });
  registry.registerRuleHandler("test.succeed", (command) => [
    {
      campaignId: command.campaignId,
      type: "test.event_created",
      schemaVersion: 1,
      metadataVersion: 1,
      payload: {}
    }
  ]);

  const context: RuntimeContext = {
    campaignId: sampleCampaign.id,
    campaignPackage: sampleCampaign,
    projections: {},
    eventStore: new FakeEventStore(),
    projectionManager: new FakeProjectionManager(),
    pluginRegistry: registry,
    services: {}
  };
  const processor = new CommandProcessor(context);

  const result = await processor.execute(createCommand());

  assert.equal(result.ok, true);
  assert.equal(result.appendedEvents[0].type, "test.event_created");
});
