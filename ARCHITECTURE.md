# Atlas Architecture

Architecture v1.0

Atlas is an AI-native tabletop operating system. Its architecture is organized around seven engines that coordinate through event-sourced state, plugin boundaries, and offline-first data ownership.

For product purpose, see [PRODUCT-VISION.md](PRODUCT-VISION.md). For engineering rules, see [ARCHITECTURAL-PRINCIPLES.md](ARCHITECTURAL-PRINCIPLES.md). For roadmap sequencing, see [ROADMAP.md](ROADMAP.md). For accepted architecture decisions, see [DECISION-LOG.md](DECISION-LOG.md) and [docs/ARCHITECTURE-DECISION-RECORDS/](docs/ARCHITECTURE-DECISION-RECORDS/).

Detailed reference documents:

- [docs/ENGINE-CONTRACTS.md](docs/ENGINE-CONTRACTS.md) defines responsibilities, ownership, interfaces, events, dependencies, and extension points for each engine.
- [docs/INTERFACE-SPECIFICATION.md](docs/INTERFACE-SPECIFICATION.md) defines language-independent engine-to-engine interfaces, event envelopes, contracts, and stability expectations.
- [docs/DATA-MODEL.md](docs/DATA-MODEL.md) defines the core campaign entities and ownership boundaries.
- [docs/PLUGIN-SDK.md](docs/PLUGIN-SDK.md) defines plugin lifecycle, discovery, compatibility, permissions, sandboxing, and packaging.
- [docs/AI-CAPABILITY-CATALOG.md](docs/AI-CAPABILITY-CATALOG.md) defines provider-agnostic AI capabilities.
- [docs/RUNTIME-STATE-MACHINE.md](docs/RUNTIME-STATE-MACHINE.md) defines campaign, session, scene, encounter, save, replay, and resume transitions.

Foundational ADRs:

- [ADR-0001: Repository as Authoritative Source](docs/ARCHITECTURE-DECISION-RECORDS/ADR-0001-repository-as-authoritative-source.md)
- [ADR-0002: Seven-Engine Architecture](docs/ARCHITECTURE-DECISION-RECORDS/ADR-0002-seven-engine-architecture.md)
- [ADR-0003: Campaign Director Responsibilities](docs/ARCHITECTURE-DECISION-RECORDS/ADR-0003-campaign-director-responsibilities.md)
- [ADR-0004: Event-Sourced Runtime](docs/ARCHITECTURE-DECISION-RECORDS/ADR-0004-event-sourced-runtime.md)
- [ADR-0005: Offline-First Architecture](docs/ARCHITECTURE-DECISION-RECORDS/ADR-0005-offline-first-architecture.md)
- [ADR-0006: Plugin-First and AI-Agnostic Design](docs/ARCHITECTURE-DECISION-RECORDS/ADR-0006-plugin-first-and-ai-agnostic-design.md)

## Architectural Model

Atlas should be understood as a platform rather than a single game engine. The core runtime stores events, rebuilds projections, loads plugins, manages campaign state, and coordinates engines. Each engine owns a distinct responsibility and communicates through stable contracts.

```text
Player / GM / Creator
        |
Operating Modes: Play, Director, Studio
        |
Presentation Engine
        |
Campaign Director
        |
Runtime Engine: events, replay, snapshots, save/load, plugins
        |
Rules Engine | World Engine | Lore Engine | Creator Engine
        |
Campaign Data, Assets, Plugins, AI Providers
```

## The Seven Engines

This section is the conceptual overview. Detailed ownership and interface boundaries are authoritative in [docs/ENGINE-CONTRACTS.md](docs/ENGINE-CONTRACTS.md) and [docs/INTERFACE-SPECIFICATION.md](docs/INTERFACE-SPECIFICATION.md).

### 1. Runtime Engine

The Runtime Engine is the technical foundation.

Responsibilities:

- Event store
- Replay engine
- Projection manager
- Snapshot manager
- Save/load
- Asset manager
- Plugin manager
- Synchronization foundation

The Runtime Engine should stay rules-agnostic and provider-agnostic. It records what happened, rebuilds state, and provides durable local ownership.

### 2. Campaign Director

The Campaign Director is the orchestration layer. It is the brain of active play, but it is not a rules engine.

Responsibilities:

- Session orchestration
- Scene lifecycle
- Story pacing
- Encounter management
- Initiative flow coordination
- NPC activation and scheduling
- Player intent routing
- AI DM interaction
- Context management
- Campaign memory integration
- Event generation
- Safety and consistency rules

The Campaign Director should request capabilities from rules engines, AI providers, world simulation, presentation, and lore services rather than directly owning their implementation.

### 3. Rules Engine

The Rules Engine executes mechanics.

Responsibilities:

- Rule plugins
- Dice engines
- Combat
- Character systems
- Skills
- Magic
- Inventory
- Equipment
- Conditions and status effects

Rules engines should be replaceable. Atlas should support many tabletop systems without changing the Campaign Director.

### 4. World Engine

The World Engine maintains persistent world state and simulation.

Responsibilities:

- NPC memory
- Factions
- Reputation
- Economy
- Weather
- Time
- Travel
- Environmental changes
- Dynamic events
- Long-running world simulation

The long-term Living World Engine grows out of this layer. Between sessions, worlds may evolve through simulation and AI-assisted event generation.

### 5. Presentation Engine

The Presentation Engine renders the campaign experience.

Responsibilities:

- Maps
- Tokens
- Fog of war
- Character portraits
- Handouts
- Journals
- Animation
- Music
- Ambient sound
- Voice synthesis
- Cinematic UI
- Desktop, tablet, and future VR/AR surfaces

The presentation layer should serve immersion. Atlas should avoid feeling like a spreadsheet when players are in Play Mode.

### 6. Lore Engine

The Lore Engine turns gameplay history into coherent campaign knowledge.

Responsibilities:

- Automatic encyclopedia
- Quest journal
- Timeline
- Family trees
- Relationship graph
- World history
- Search
- AI summaries
- Discovered locations
- Organizations
- NPC histories

The Lore Engine should derive from the event stream and campaign memory rather than rely entirely on manual notes.

### 7. Creator Engine

The Creator Engine supports authoring and platform extension.

Responsibilities:

- Campaign builder
- Rule editor
- Asset importer
- AI personality builder
- Voice and audio packs
- Plugin SDK
- Test scenarios
- Marketplace packaging
- Publishing workflows

Creator workflows should let Atlas grow into an ecosystem without requiring contributors to change core runtime code for ordinary content.

## Operating Modes

### Play Mode

Play Mode is for players. It emphasizes immersion, cinematic presentation, maps, voice or text interaction, dice, character sheets, music, and minimal interface machinery.

### Director Mode

Director Mode is for GMs and campaign operators. It exposes world state, NPC goals, faction relationships, story arcs, timeline, encounter balance, AI reasoning summaries, continuity warnings, world events, and campaign health.

### Studio Mode

Studio Mode is for creators and developers. It supports rulesets, campaigns, maps, AI personalities, voice packs, asset libraries, plugins, test scenarios, and publishing packages.

## AI Framework

AI should be capability-driven and replaceable.

Examples of AI capabilities:

- Generate NPC dialogue
- Summarize a session
- Propose story pacing adjustments
- Interpret player intent
- Maintain NPC memory
- Detect continuity risks
- Suggest encounter adjustments
- Generate lore entries

The Campaign Director should call capability interfaces, not provider-specific APIs. Local execution remains a first-class goal.

AI outputs are proposals until accepted through an engine interface and recorded as events. Player agency always overrides AI convenience: AI may propose, narrate, react, and remember, but it must not replace player choice. See [docs/AI-CAPABILITY-CATALOG.md](docs/AI-CAPABILITY-CATALOG.md).

## Event-Driven Behavior

Atlas should record important changes as events:

- Player actions
- NPC decisions
- Die rolls
- AI responses
- Scene changes
- Map updates
- Inventory changes
- Conditions
- Quest updates
- Lore updates
- World simulation events

Events enable replay, save/load, undo, projections, multiplayer synchronization, and AI memory.

For the full lifecycle model, see [docs/RUNTIME-STATE-MACHINE.md](docs/RUNTIME-STATE-MACHINE.md).

## Vertical Slice Priority

The next major engineering milestone is the first playable vertical slice:

- One GM or AI Campaign Director
- One player
- One map
- One complete adventure
- Character sheet
- Dice and rules integration
- NPC interaction
- Combat or encounter flow
- Save/reload
- Text and future voice support
- Offline Mac and iPad operation

Architecture should support the platform vision, but each release must move Atlas closer to playable fun.
