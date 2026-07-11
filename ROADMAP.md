# Atlas Roadmap

This roadmap sequences Atlas from current foundation work to the long-term living world platform. See [PRODUCT-VISION.md](PRODUCT-VISION.md) for the mission and [ARCHITECTURE.md](ARCHITECTURE.md) for the seven-engine model.

## Phase 0: Foundation

Status: Architecture v1.0 complete; engineering implementation begins with Campaign Director MVP.

Goal: Complete the core runtime and establish durable architecture.

Focus:

- Runtime Engine
- Event Store
- Replay
- Snapshots
- Plugin framework
- Campaign Director foundation
- Rules abstraction
- Save/load
- Testing infrastructure
- Product documentation
- Engine contracts
- Plugin SDK definition
- Core data model
- AI capability catalog
- Runtime state machine
- Architecture Decision Records
- Language-independent interface specification

Exit criteria:

- Runtime architecture is documented.
- Event-sourced model is stable enough for gameplay features.
- Campaign Director MVP design is ready.
- Repository docs capture product vision, principles, roadmap, decision history, engine contracts, interface specification, plugin boundaries, data model, AI capabilities, and runtime lifecycle.
- Initial Architecture Decision Records are accepted and indexed in [DECISION-LOG.md](DECISION-LOG.md).

Phase 0 documentation status: Complete for Architecture v1.0. Future documentation changes should be driven by implementation findings, design review, or accepted ADRs.

## Phase 1: First Playable MVP

Goal: One person can play an entire campaign offline.

Focus:

- Character creation or character sheet
- Maps
- Dice
- Basic rules integration
- Combat or encounter flow
- Inventory and equipment
- AI Campaign Director
- NPCs
- Save/load
- Lore journal
- Text interaction
- Voice support where practical
- Offline Mac and iPad operation

This is the first version worth sharing beyond the immediate development team.

## Phase 2: Complete Virtual Tabletop

Goal: Provide the expected baseline capabilities of a premium VTT.

Focus:

- Multiplayer foundation
- Fog of war
- Dynamic lighting
- Initiative tracking
- Journals
- Handouts
- Campaign management
- Player permissions
- Multi-map support
- Session logging
- GM tools
- Performance optimization

At this stage, Atlas should be credible as a tabletop product even before its deepest AI differentiation is complete.

## Phase 3: AI Differentiation

Goal: Make Atlas feel like a living storytelling partner.

Focus:

- Living NPCs
- Persistent memories
- AI conversations
- Dynamic quests
- World simulation
- Automatic lore generation
- AI voices
- Multiple GM personalities
- Story pacing
- AI assistant for the GM
- Continuity warnings

This is where Atlas should stop feeling like ordinary tabletop software and start feeling like a persistent world.

## Phase 4: Creator Platform

Goal: Allow creators to build and distribute Atlas experiences.

Focus:

- Campaign builder
- Rule editor
- Asset packs
- AI personalities
- Voice packs
- Publishing tools
- Plugin SDK
- Marketplace packaging
- Community content workflows

Creators should be able to extend Atlas without changing the core engine.

## Phase 5: Living Worlds

Goal: Campaigns become persistent worlds rather than static adventures.

Focus:

- Worlds continue between sessions.
- NPCs age, remember, and pursue goals.
- Kingdoms change.
- Trade routes evolve.
- Weather affects travel.
- Politics emerge.
- Villains execute plans.
- Allies accomplish missions.
- Rumors emerge naturally.
- AI adapts over years of play.

This is the long-term vision that can make Atlas exceptional.

## Immediate Next Milestone

Implement the Campaign Director MVP.

Acceptance themes:

- Engine-agnostic orchestration layer
- Alignment with [docs/ENGINE-CONTRACTS.md](docs/ENGINE-CONTRACTS.md)
- Alignment with [docs/INTERFACE-SPECIFICATION.md](docs/INTERFACE-SPECIFICATION.md)
- Alignment with [docs/RUNTIME-STATE-MACHINE.md](docs/RUNTIME-STATE-MACHINE.md)
- Alignment with [ADR-0003: Campaign Director Responsibilities](docs/ARCHITECTURE-DECISION-RECORDS/ADR-0003-campaign-director-responsibilities.md)
- Scene lifecycle
- NPC activation
- Initiative flow coordination
- Player intent routing
- AI DM interaction through provider-agnostic interfaces
- Campaign memory integration
- Event generation
- Offline execution
- Integration with replay/event architecture
- Unit tests
- Roadmap and feature status updates
