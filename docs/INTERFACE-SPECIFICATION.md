# Atlas Interface Specification

Architecture v1.0

This document defines language-independent interface expectations between Atlas engines. It complements [ENGINE-CONTRACTS.md](ENGINE-CONTRACTS.md): engine contracts define ownership; this specification defines how engines communicate.

Concrete code may be implemented in TypeScript, Rust, Swift, C#, or another language. The contracts below should remain stable across implementation languages and client surfaces.

## Interface Goals

Atlas interfaces must:

- Preserve the event log as the source of truth.
- Keep engines independently replaceable where practical.
- Support offline-first execution.
- Avoid coupling product behavior to a specific ruleset, AI provider, storage backend, or UI framework.
- Make replay, save/load, synchronization, and projection rebuilding possible.
- Keep player agency explicit when AI is involved.

## Interface Categories

### Command Interfaces

Command interfaces request an action from an engine.

Examples:

- Start a session.
- Resolve a rules action.
- Request an NPC activation.
- Generate an AI narration proposal.
- Register a plugin.

Command interfaces should:

- Validate input before producing events.
- Return accepted, rejected, or pending results.
- Avoid mutating another engine's private state.
- Emit durable events for accepted changes that affect campaign history.

### Query Interfaces

Query interfaces read projections or derived state.

Examples:

- Read the current scene.
- Fetch visible map state.
- Query a character sheet projection.
- Search lore entries.
- Inspect active plugin capabilities.

Query interfaces should:

- Treat projections as derived state.
- Include projection version or event cursor information where useful.
- Avoid hidden side effects.

### Event Interfaces

Event interfaces append, read, replay, and subscribe to durable events.

Events should:

- Be append-only once accepted.
- Use stable schema names and versions.
- Include actor, source engine, timestamp, campaign scope, and causation metadata.
- Be replayable without requiring a remote service.
- Avoid embedding provider-specific payloads when a provider-neutral representation is available.

### Capability Interfaces

Capability interfaces describe optional or replaceable behavior provided by plugins, rulesets, AI providers, asset packs, or clients.

Examples:

- `InterpretPlayerIntent`
- `ResolveAction`
- `RollDice`
- `GenerateDialogue`
- `SummarizeSession`
- `RenderScene`
- `ImportAsset`

Capability interfaces should:

- Declare required inputs and produced outputs.
- Declare offline availability.
- Declare permissions.
- Declare supported schema versions.
- Return proposals when the result requires player or GM acceptance.

## Common Envelope

Commands, events, and cross-engine responses should share common metadata even if the exact serialization differs by language.

Recommended fields:

- `id`: Stable identifier for the command, event, or response.
- `type`: Stable semantic name.
- `schemaVersion`: Version of the payload schema.
- `campaignId`: Campaign scope.
- `sessionId`: Session scope when applicable.
- `sceneId`: Scene scope when applicable.
- `actorId`: Player, GM, AI, plugin, or system actor responsible for the request.
- `sourceEngine`: Engine or plugin that produced the message.
- `timestamp`: Local runtime timestamp.
- `causationId`: Command or event that caused this message.
- `correlationId`: Workflow identifier spanning multiple messages.
- `payload`: Domain-specific data.

## Event Stability

Events are the most stable interface in Atlas because they define durable campaign history.

Event schemas should be treated as compatibility contracts. Breaking event changes require explicit migration strategy, documentation updates, and an ADR when the change affects architecture or saved campaign compatibility.

Compatibility expectations:

- Additive optional fields are preferred.
- Renaming event types is a breaking change.
- Changing event meaning is a breaking change.
- Removing fields used by replay or projections is a breaking change.
- Provider-specific details should be stored as metadata only when needed for auditability.

## Engine Interface Summary

### Runtime Engine

Primary role: durable storage, replay, snapshots, projections, assets, plugins, and synchronization foundations.

Core interfaces:

- Append event.
- Read event stream.
- Replay scope.
- Register projection.
- Query projection.
- Create and restore snapshot.
- Register and resolve plugin.
- Register and resolve asset.

Stability expectation: high. Runtime interfaces affect all engines and saved campaign compatibility.

### Campaign Director

Primary role: active play orchestration.

Core interfaces:

- Start and end session.
- Enter, update, and exit scene.
- Route player intent.
- Coordinate encounter and initiative flow.
- Request AI capability.
- Request rules resolution.
- Request world update.
- Publish orchestration event.

Stability expectation: high for session, scene, and intent interfaces; medium for pacing and AI prompt orchestration while MVP behavior evolves.

### Rules Engine

Primary role: execute game mechanics through replaceable rulesets.

Core interfaces:

- Register ruleset.
- Validate action.
- Resolve action.
- Roll dice.
- Apply condition.
- Query character or NPC mechanics projection.

Stability expectation: high at the capability boundary, lower inside specific rules plugins.

### World Engine

Primary role: persistent world state and simulation.

Core interfaces:

- Query world state.
- Advance world time.
- Update NPC memory.
- Update faction, reputation, weather, economy, travel, and environmental state.
- Produce world simulation events.

Stability expectation: medium during early MVP, increasing as persistent world behavior stabilizes.

### Presentation Engine

Primary role: render visible and audible campaign experience.

Core interfaces:

- Render scene.
- Update map projection.
- Reveal or hide fog of war.
- Display handout or journal entry.
- Play audio or voice output.
- Report player input event.

Stability expectation: stable at semantic command level; client-specific rendering APIs may vary.

### Lore Engine

Primary role: convert event history into coherent campaign knowledge.

Core interfaces:

- Ingest event range.
- Generate lore entry.
- Update timeline.
- Update relationship graph.
- Search campaign knowledge.
- Summarize session or history.

Stability expectation: medium. Lore extraction will evolve, but event ingestion and query boundaries should stay stable.

### Creator Engine

Primary role: authoring, packaging, validation, and publishing workflows.

Core interfaces:

- Create campaign package.
- Validate plugin.
- Import asset.
- Build ruleset package.
- Build AI personality package.
- Run test scenario.

Stability expectation: medium. Creator workflows may evolve, but package metadata and validation contracts should remain backward-conscious.

## Cross-Engine Flows

### Player Intent Flow

1. Presentation Engine captures player input.
2. Campaign Director interprets or requests `InterpretPlayerIntent`.
3. Campaign Director routes the intent to Rules, World, Lore, AI, or Presentation as needed.
4. Target engines validate and return results or proposals.
5. Accepted changes are appended as events through the Runtime Engine.
6. Projections update and Presentation renders the new state.

### Rules Resolution Flow

1. Campaign Director requests rules validation or resolution.
2. Rules Engine evaluates the action using the active ruleset plugin.
3. Rules Engine returns accepted, rejected, or pending result.
4. Accepted mechanical outcomes are recorded as events.
5. Campaign Director uses the result to continue scene, encounter, or turn flow.

### AI Proposal Flow

1. Campaign Director requests an AI capability.
2. AI provider or local model returns a provider-neutral proposal.
3. Campaign Director, GM, or player accepts, edits, rejects, or routes the proposal.
4. Only accepted outcomes become campaign events.

AI must not silently choose for players. Player agency always overrides AI convenience.

### Save, Replay, Resume Flow

1. Runtime Engine stores durable events.
2. Projections and snapshots are derived from events.
3. Replay rebuilds state from the event stream.
4. Resume uses snapshots plus subsequent events when available.
5. Engines rehydrate from projections and runtime state, not hidden external state.

## Versioning Expectations

Atlas should version:

- Event schemas.
- Plugin manifests.
- Capability contracts.
- Save package formats.
- Projection schemas where persisted.
- Public engine interface contracts.

Versioning should support migration and compatibility checks. When a change affects saved campaigns, replay, plugin compatibility, or engine ownership boundaries, update the relevant documentation and consider an ADR.

## Authority Rules

- Runtime Engine owns event persistence and replay.
- Campaign Director owns orchestration decisions during active play.
- Rules Engine owns mechanics.
- World Engine owns persistent simulation state.
- Presentation Engine owns rendering and input surfaces.
- Lore Engine owns derived campaign knowledge.
- Creator Engine owns authoring and packaging workflows.

No engine may directly mutate another engine's private state. Cross-engine changes must flow through interfaces and durable events.

## Related Decisions

- [ADR-0002: Seven-Engine Architecture](ARCHITECTURE-DECISION-RECORDS/ADR-0002-seven-engine-architecture.md)
- [ADR-0003: Campaign Director Responsibilities](ARCHITECTURE-DECISION-RECORDS/ADR-0003-campaign-director-responsibilities.md)
- [ADR-0004: Event-Sourced Runtime](ARCHITECTURE-DECISION-RECORDS/ADR-0004-event-sourced-runtime.md)
- [ADR-0006: Plugin-First and AI-Agnostic Design](ARCHITECTURE-DECISION-RECORDS/ADR-0006-plugin-first-and-ai-agnostic-design.md)
