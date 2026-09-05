# Atlas Feature Status

Architecture v1.0 is finalized. The table below tracks implemented runtime slices and the current status of each Architecture v1.0 engine.

## Implemented Runtime Foundation

| Area | Status | Notes |
| --- | --- | --- |
| Local-first PWA shell | Implemented | Static browser app with local campaign sample. |
| Campaign data types | Implemented | Character, NPC, location, encounter, quest, scene, and state types exist. |
| Command Processor | Implemented | FEAT-003A complete and reviewed. |
| Event Store | Implemented | FEAT-003B complete and reviewed. |
| Replay Engine | Implemented | FEAT-003C foundation supports full replay from provided event arrays, sequence validation, projection boundary application, and snapshot state restoration followed by replay of later events. |
| Projection Manager | Implemented | FEAT-004 foundation supports projection registration, reset, snapshot state restoration, deterministic event application, lookup, rebuild, and failure isolation. |
| Snapshot Manager | Foundation implemented; review HOLD | Save/load/delete through an in-memory store, event-count policy, serialization helpers, metadata/schema checks, and event-anchor validation before snapshot-assisted replay. Missing snapshots and metadata/anchor validation failures fall back to full replay; malformed envelopes and restore failures are not covered by that fallback. Review found gaps in incomplete projection restoration, direct replay snapshot validation, optional-value serialization, and malformed envelope handling. Durable storage and Save Manager integration remain. |
| Save Manager | Early MVP | Current localStorage save manager predates runtime event sourcing. |

## Architecture v1.0 Engine Status

| Engine | Status | Notes |
| --- | --- | --- |
| Runtime Engine | In progress | Command Processor, Event Store, Replay Engine, Projection Manager, and Snapshot Manager foundations are implemented. Durable snapshot storage, Save Manager reconciliation, asset registry, plugin registry hardening, and migration support remain. |
| Campaign Director | Next | MVP is the next major milestone. It should own orchestration, scene lifecycle, player intent routing, NPC activation, AI capability requests, campaign memory integration, and event generation without owning rules. |
| Rules Engine | Foundation only | Early dice and rule abstractions exist. Full plugin-based rules framework, character systems, combat, inventory, conditions, and rules validation remain. |
| World Engine | Not started | Persistent world state, NPC memory, factions, reputation, time, travel, economy, weather, and living-world simulation remain future work. |
| Presentation Engine | Shell only | Static PWA shell exists. Maps, tokens, fog of war, audio, animation, portraits, voice, and cinematic presentation remain future work. |
| Lore Engine | Not started | Automatic journal, encyclopedia, timeline, relationship graph, quest history, and lore summaries remain future work. |
| Creator Engine | Not started | Campaign builder, rule editor, asset pipeline, AI personality builder, packaging, and marketplace preparation remain future work. |

## Historical Names

Older docs may refer to Story, World, Combat, Quest, Inventory, NPC Memory, Relationship, or AI Adapter engines. Under Architecture v1.0, those capabilities map into the seven-engine model documented in [ARCHITECTURE.md](ARCHITECTURE.md), [docs/ENGINE-CONTRACTS.md](docs/ENGINE-CONTRACTS.md), and [docs/INTERFACE-SPECIFICATION.md](docs/INTERFACE-SPECIFICATION.md).

## TODO

- Reconcile the early localStorage save manager with the event-sourced runtime Save Manager design.
- Implement the Campaign Director MVP as the next architecture-validation milestone.
- Update this status file after each completed feature and implementation review.
