# Atlas Project Blueprint

Atlas is an AI-native tabletop operating system for creating and playing persistent roleplaying worlds. It began as an offline-first solo D&D campaign engine, but Architecture v1.0 broadens the project into a rules-agnostic, plugin-driven platform for many tabletop systems and campaign styles.

The project goal is to create a local-first campaign runtime where the player owns campaign packages, save files, assets, plugin configuration, and event history. Cloud AI may become an optional enhancement later, but it must never be required for core play, save restoration, replay, rules, or campaign progression.

For the authoritative product framing, see [PRODUCT-VISION.md](PRODUCT-VISION.md), [ATLAS-MANIFESTO.md](ATLAS-MANIFESTO.md), and [ARCHITECTURE.md](ARCHITECTURE.md).

## Product Principles

- Offline-first
- Local ownership of game state
- Event-sourced campaign history
- Deterministic replay
- Campaign portability
- Save anywhere
- Plugin-driven extension
- Rules-agnostic architecture
- AI-native but provider-agnostic
- Player agency over AI convenience

## Architecture Shape

Atlas Architecture v1.0 is organized around seven engines:

- Runtime Engine
- Campaign Director
- Rules Engine
- World Engine
- Presentation Engine
- Lore Engine
- Creator Engine

Engine ownership, interfaces, events, dependencies, and extension points are defined in [docs/ENGINE-CONTRACTS.md](docs/ENGINE-CONTRACTS.md) and [docs/INTERFACE-SPECIFICATION.md](docs/INTERFACE-SPECIFICATION.md).

## Current Implementation Shape

Atlas currently includes:

- A static local-first web/PWA shell
- A sample campaign package
- Campaign, character, NPC, location, encounter, quest, and game state types
- Command Processor runtime slice
- Append-only Event Store runtime slice
- Deterministic Replay Engine slice
- Projection Manager slice
- Design reviews and implementation reviews for the runtime foundation
- Architecture v1.0 documentation and ADRs

## Next Engineering Focus

The next major implementation milestone is the Campaign Director MVP. It should validate the seven-engine architecture by coordinating scene lifecycle, player intent routing, NPC activation, AI capability requests, rules integration, campaign memory, and event generation without owning game mechanics.

## TODO

- Confirm final end-user product naming for campaign packages and save file extensions.
- Reconcile the early localStorage save manager with the event-sourced runtime Save Manager design.
- Define the first playable vertical slice that uses the runtime event log end to end.
