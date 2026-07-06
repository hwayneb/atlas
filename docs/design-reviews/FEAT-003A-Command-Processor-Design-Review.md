# FEAT-003A – Command Processor Design Review

## 1. Feature Understanding

FEAT-003A designs the Command Processor as the first implementation slice of the Campaign Runtime.

The Command Processor receives transient commands, coordinates validation, routes valid commands through deterministic rule execution, submits resulting events to the Event Store, and triggers projection updates after events are successfully appended.

The Command Processor is an orchestration layer. It does not own domain rules, persistence, replay, projections, UI rendering, plugin behavior, or AI behavior.

The design must preserve the approved architecture:

- Offline-first
- No backend
- No runtime networking
- No cloud APIs
- No authentication
- Commands are transient
- Commands are never persisted
- Commands express intent, not facts
- Invalid commands append no events
- Events are authoritative
- Only the Event Store appends events
- Projections are disposable
- Replay executes events only
- Random outcomes are stored in event payloads and never recomputed during replay

## 2. Goals

The Command Processor should provide a single, consistent entry point for runtime command execution.

Goals:

- Receive commands from UI or subsystems.
- Resolve command type registration.
- Build a runtime execution context.
- Validate commands before rule execution.
- Route valid commands to registered rule handlers.
- Collect events produced by rule execution.
- Submit events to the Event Store.
- Trigger projection updates after successful event append.
- Return command results and diagnostics to callers.
- Prevent invalid or failed commands from becoming campaign history.
- Keep domain-specific behavior behind a unified runtime plugin contract.

## 3. Responsibilities

The Command Processor owns:

- Command intake
- Command type lookup
- Command execution orchestration
- Validation pipeline coordination
- Rule Engine coordination
- Event Store append request coordination
- Projection Manager update coordination
- Command result construction
- Failure routing and diagnostics

The Command Processor ensures the runtime flow is followed:

```text
Command
-> Validation
-> Rule Execution
-> Event(s)
-> Event Store
-> Projection Manager
-> Command Result
```

## 4. Non-Responsibilities

The Command Processor does not own:

- Domain rules
- Combat rules
- Story generation
- Quest logic
- NPC memory logic
- Relationship calculations
- Inventory behavior
- Journal projection behavior
- World simulation rules
- AI narration
- Event persistence
- Event replay
- Projection reducers
- Snapshot creation
- Save export/import
- UI rendering
- Authentication
- Networking

The Command Processor should not mutate projections directly and should not append events directly outside the Event Store contract.

## 5. Architecture Impact

The Command Processor becomes the front door for runtime execution.

All future subsystems should integrate with campaign execution by implementing a unified runtime plugin contract rather than bypassing the runtime or registering scattered capabilities directly.

Expected Campaign Runtime structure:

```text
Campaign Runtime
├── Command Processor
├── Validation Pipeline
├── Rule Engine
├── Plugin Registry
├── Event Store
├── Replay Engine
├── Projection Manager
├── Snapshot Manager
├── Save Manager
└── Runtime Services
```

Architecture impact:

- Commands become the standard expression of player or subsystem intent.
- Validation is centralized before rule execution.
- Rule execution remains deterministic and plugin-provided.
- The Campaign Runtime loads plugins.
- Plugins self-register capabilities through a single plugin contract.
- The Command Processor depends on the Plugin Registry, not individual domain modules.
- Event persistence remains isolated in the Event Store.
- Projections update only from appended events.
- Replay remains event-only and never invokes commands.

## 6. Command Model

Commands represent requested actions. They are not campaign history.

Examples:

- `TravelToLocation`
- `AttackTarget`
- `TalkToNPC`
- `CastSpell`
- `OpenDoor`
- `LongRest`
- `Wait`
- `AddJournalNote`
- `UseItem`
- `AcceptQuest`

A command should include:

- `id`
- `type`
- `campaignId`
- `actorId`
- `payload`
- `metadata`

Command metadata may include:

- UI source
- created timestamp
- correlation id
- expected projection version
- optional debug tags

Command metadata is runtime-only. Commands and command metadata are never persisted as authoritative campaign history.

## 7. Command Lifecycle

Command lifecycle:

```text
Created by UI or subsystem
-> Submitted to Command Processor
-> Resolved through Plugin Registry
-> Runtime Context created
-> Validation Pipeline executes
-> Invalid commands stop
-> Valid commands enter Rule Engine
-> Rule handlers produce event candidates
-> Event Store validates and appends events
-> Projection Manager applies appended events
-> Command result returned
```

Invalid command lifecycle:

```text
Command
-> Validation failure
-> No rule execution
-> No events appended
-> No projection update
-> Failure result returned
```

Failed append lifecycle:

```text
Command
-> Validation success
-> Rule execution success
-> Event Store append failure
-> Events not committed
-> Projections not finalized
-> Failure result returned
```

## 8. Validation Integration

The Command Processor coordinates validation but does not own validator logic.

Validators may be registered by plugins and subsystems.

Validation inputs:

- Command
- Runtime Context
- Current projections
- Campaign package data
- Registered validators

Validation outputs:

- valid result
- invalid result
- diagnostics

Validation should check:

- Command type is registered.
- Required fields are present.
- Actor exists and can act.
- Referenced campaign entities exist.
- Current projection state permits the command.
- Domain constraints are satisfied.
- Required resources are available.
- Timing, location, combat, quest, or world constraints are satisfied.

Validation must not mutate state.

Invalid commands append no events.

## 9. Rule Engine Integration

The Command Processor routes valid commands to the Rule Engine.

The Rule Engine owns deterministic execution of registered command handlers. Domain-specific rule handlers should be supplied by runtime plugins through the Plugin Registry.

Rule Engine inputs:

- Validated command
- Runtime Context
- Current projections
- Campaign package data
- Runtime services
- Plugin-registered rule handlers

Rule Engine outputs:

- ordered event candidates
- diagnostics

Rule execution rules:

- Rule handlers must be deterministic.
- Rule handlers must not persist commands.
- Rule handlers must not mutate projections directly.
- Rule handlers must not append events directly.
- Rule handlers must store random outcomes in event payloads.
- Rule handlers must not depend on network, cloud APIs, authentication, or AI.
- Rule handlers must be registered through a `RuntimePlugin`, not through ad hoc domain module wiring.

## 10. Event Store Integration

The Command Processor submits event candidates to the Event Store after rule execution.

Only the Event Store may append events.

Event Store responsibilities remain:

- Validate event batch structure.
- Assign or verify sequence.
- Append events atomically from the runtime perspective.
- Persist events locally.
- Preserve ordering.
- Return appended events or append diagnostics.

The Command Processor must treat append failure as a command failure. Event candidates that fail append are not campaign history.

Events express facts and become authoritative only after the Event Store successfully appends them.

## 11. Projection Manager Integration

After the Event Store appends events, the Command Processor coordinates projection updates.

The Projection Manager applies appended events to disposable projections.

Projection update rules:

- Projections update only from appended events.
- Projections are not authoritative.
- Projections may be discarded and rebuilt from the event log.
- Command execution must not directly mutate projections.

If projection update fails after events were appended, the runtime should fall back to replay from the event log or latest compatible snapshot. The appended events remain authoritative.

## 12. Runtime Context

The Command Processor should depend on Runtime Context, not scattered global state.

Runtime Context should provide access to:

- campaign package
- active campaign id
- current projections
- Event Store
- Projection Manager
- Runtime Services
- Plugin Registry
- schema registry
- diagnostics collector

Runtime Context should be created or resolved per command execution so validation and rule handlers receive a consistent view of runtime state.

Runtime Context must not introduce nondeterministic dependencies into replay. Replay executes events only and does not use command context.

Runtime Context should expose plugin-provided capabilities through the Plugin Registry. It should not require the Command Processor to import or know about `WorldPlugin`, `CombatPlugin`, `QuestPlugin`, `InventoryPlugin`, `RelationshipPlugin`, `NPCMemoryPlugin`, `JournalPlugin`, or other domain plugins directly.

## 13. Plugin Registry Integration

Domain-specific behavior should come from runtime plugins.

Each domain plugin implements one unified plugin contract. Examples:

- `WorldPlugin`
- `CombatPlugin`
- `QuestPlugin`
- `InventoryPlugin`
- `RelationshipPlugin`
- `NPCMemoryPlugin`
- `JournalPlugin`

Each plugin exposes a single registration surface. During runtime startup, the Campaign Runtime loads plugins, initializes them, and asks each plugin to register its capabilities with the Plugin Registry.

A plugin may register its own:

- command definitions
- validators
- rule handlers
- event schemas
- projection reducers
- startup hooks if needed

The Command Processor should use the Plugin Registry to resolve:

- whether a command type is known
- which validators apply
- which rule handler should execute
- which event schemas are valid

Plugin integration rules:

- Plugins self-register through the unified runtime plugin contract.
- The Command Processor depends on the Plugin Registry, not individual domain modules.
- Plugins must not bypass the Event Store.
- Plugins must not mutate projections directly.
- Plugins must not persist commands.
- Plugins must not use runtime networking or cloud APIs for core execution.
- Plugins must store random outcomes in event payloads.
- Plugin behavior must be deterministic for command execution and replay.

## 14. Failure Handling

Command type not registered:

- Return failure result.
- Append no events.
- Mutate no projections.

Validation failure:

- Return validation diagnostics.
- Execute no rules.
- Append no events.

Rule execution failure:

- Return runtime diagnostics.
- Append no events.
- Persist nothing.

Event append failure:

- Treat event candidates as uncommitted.
- Return append diagnostics.
- Do not finalize projection updates.

Projection update failure after append:

- Preserve appended events as authoritative.
- Rebuild projections through Replay Engine.
- Return recovery diagnostics if needed.

Unexpected runtime failure:

- Preserve prior authoritative event log.
- Avoid partial command persistence.
- Return diagnostics suitable for local recovery.

## 15. Public TypeScript Interfaces

Canonical runtime interfaces are defined in `docs/contracts/runtime-api.md`. The interfaces below are design-level excerpts for FEAT-003A context and should not supersede the canonical contract.

Design-level public interfaces:

```ts
interface CommandProcessor {
  execute(command: CampaignCommand): Promise<CommandResult>;
}

interface CampaignCommand {
  id: string;
  type: string;
  campaignId: string;
  actorId?: string;
  payload: unknown;
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

interface RuleEngine {
  execute(command: ValidatedCommand, context: RuntimeContext): Promise<RuleExecutionResult>;
}

interface RuleExecutionResult {
  ok: boolean;
  events: CampaignEvent[];
  diagnostics: RuntimeDiagnostic[];
}

interface RuntimeContext {
  campaignId: string;
  campaignPackage: CampaignPackage;
  projections: ProjectionSet;
  eventStore: EventStore;
  projectionManager: ProjectionManager;
  pluginRegistry: PluginRegistry;
  services: RuntimeServices;
}

interface RuntimePlugin {
  name: string;
  version: string;
  initialize(context: PluginInitContext): void;
  register(registry: PluginRegistry): void;
}

interface PluginRegistry {
  registerCommand(definition: CommandDefinition): void;
  registerValidator(commandType: string, validator: CommandValidator): void;
  registerRuleHandler(commandType: string, handler: RuleHandler): void;
  registerEventSchema(schema: EventSchema): void;
  registerProjectionReducer(reducer: ProjectionReducer): void;
  registerStartupHook?(hook: StartupHook): void;
}

interface PluginInitContext {
  campaignId: string;
  campaignPackage: CampaignPackage;
  services: RuntimeServices;
}
```

These interfaces define architectural boundaries, not final implementation details.

## 16. Testing Strategy

Required test coverage:

- Registered command executes successfully.
- Unknown command type fails.
- Invalid command appends no events.
- Commands are never persisted.
- Validation runs before rule execution.
- Rule execution does not run after validation failure.
- Valid command produces expected event candidates.
- Event Store append is called only after successful rules.
- Event Store append failure returns command failure.
- Projection Manager updates after successful append.
- Projection update failure triggers rebuild path.
- Command Processor does not mutate projections directly.
- Command Processor does not append events outside Event Store.
- Runtime Context is passed consistently.
- Plugin validators are invoked.
- Plugin rule handlers are invoked.
- Runtime plugins self-register through the Plugin Registry.
- Command Processor does not import domain plugins directly.
- Random outcomes appear in event payloads.
- Replay never depends on commands.
- No test requires network, backend, cloud APIs, or authentication.

Tests should use deterministic fixtures and fake runtime services.

## 17. Risks

Primary risks:

- Command Processor becomes too domain-aware.
- Plugins bypass runtime boundaries.
- Plugin registration becomes fragmented across multiple registries.
- Domain modules are imported directly instead of going through the Plugin Registry.
- Commands accidentally persist.
- Invalid commands accidentally append events.
- Projection updates are treated as authoritative.
- Rule handlers mutate projections directly.
- Random outcomes are generated but not stored in events.
- Runtime Context becomes hidden global state.
- Failure handling leaves UI inconsistent with event history.
- AI Adapter later attempts to execute or persist commands outside runtime rules.

## 18. Alternatives Considered

Direct UI-to-engine calls:

- Simpler initially.
- Rejected because it scatters validation, rule execution, and event append behavior.

Domain-specific command processors:

- Allows each subsystem to move quickly.
- Rejected as the primary model because it risks inconsistent command lifecycle and persistence rules.

Event Store called directly by subsystems:

- Reduces orchestration overhead.
- Rejected because it weakens validation and command lifecycle consistency.

Command Processor as rule owner:

- Centralizes behavior.
- Rejected because domain rules belong in subsystem plugins and handlers.

Command Processor as orchestrator:

- Best fit.
- Preserves clean runtime boundaries while allowing domain-specific plugins.

## 19. Recommendation

Implement the Command Processor as the first Campaign Runtime slice.

The Command Processor should be a thin orchestration layer that follows this flow:

```text
Command
-> Validation
-> Rule Engine
-> Event candidates
-> Event Store append
-> Projection Manager update
-> Command Result
```

The Command Processor must not own domain rules, persist commands, append events directly, mutate projections, import domain plugins directly, or participate in replay.

Domain behavior should be registered through a unified plugin contract:

```ts
interface RuntimePlugin {
  name: string;
  version: string;
  initialize(context: PluginInitContext): void;
  register(registry: PluginRegistry): void;
}
```

Each plugin may register its own command definitions, validators, rule handlers, event schemas, projection reducers, and startup hooks through the Plugin Registry.

This design preserves the approved architecture and gives future subsystems a single deterministic, offline-first, event-sourced path into campaign history.
