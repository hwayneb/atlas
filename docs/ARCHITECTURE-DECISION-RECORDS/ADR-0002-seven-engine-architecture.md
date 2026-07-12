# ADR-0002: Seven-Engine Architecture

Status: Accepted

Date: 2026-07-11

## Context

Atlas is intended to become an AI-native tabletop operating system rather than a single game, a generic VTT clone, or an AI GM chatbot. The platform must support multiple rulesets, persistent worlds, cinematic play, lore generation, creator workflows, plugin extension, offline operation, and provider-independent AI.

Without clear ownership boundaries, Atlas risks becoming a disconnected feature list or tightly coupled monolith.

## Decision

Atlas is organized around seven engines:

- Runtime Engine
- Campaign Director
- Rules Engine
- World Engine
- Presentation Engine
- Lore Engine
- Creator Engine

Every major feature should identify its owning engine. Cross-engine behavior must occur through stable interfaces, durable events, and documented contracts.

## Consequences

- Feature proposals must name the engine they affect.
- Engine contracts define ownership and non-ownership boundaries.
- Interfaces should avoid direct coupling between unrelated engines.
- The seven-engine model is the primary architectural map for Atlas v1.0 documentation.

## Related Documents

- [../../ARCHITECTURE.md](../../ARCHITECTURE.md)
- [../ENGINE-CONTRACTS.md](../ENGINE-CONTRACTS.md)
- [../INTERFACE-SPECIFICATION.md](../INTERFACE-SPECIFICATION.md)
- [../../ROADMAP.md](../../ROADMAP.md)
