# Atlas Product Vision

Architecture v1.0

Atlas is an AI-native tabletop roleplaying platform for creating and playing persistent roleplaying worlds. It is not only an offline D&D application, a virtual tabletop clone, or an AI chatbot. Atlas is intended to become a tabletop operating system: a local-first platform where campaigns are portable, rules are replaceable, AI providers are interchangeable, and worlds can remember and evolve.

This document is the product-level overview. For the operating philosophy, see [ATLAS-MANIFESTO.md](ATLAS-MANIFESTO.md). For system structure, see [ARCHITECTURE.md](ARCHITECTURE.md). For engineering guardrails, see [ARCHITECTURAL-PRINCIPLES.md](ARCHITECTURAL-PRINCIPLES.md). For accepted architecture decisions, see [DECISION-LOG.md](DECISION-LOG.md).

Supporting reference documents:

- [docs/ENGINE-CONTRACTS.md](docs/ENGINE-CONTRACTS.md)
- [docs/INTERFACE-SPECIFICATION.md](docs/INTERFACE-SPECIFICATION.md)
- [docs/DATA-MODEL.md](docs/DATA-MODEL.md)
- [docs/PLUGIN-SDK.md](docs/PLUGIN-SDK.md)
- [docs/AI-CAPABILITY-CATALOG.md](docs/AI-CAPABILITY-CATALOG.md)
- [docs/RUNTIME-STATE-MACHINE.md](docs/RUNTIME-STATE-MACHINE.md)

Foundational ADRs:

- [ADR-0001: Repository as Authoritative Source](docs/ARCHITECTURE-DECISION-RECORDS/ADR-0001-repository-as-authoritative-source.md)
- [ADR-0002: Seven-Engine Architecture](docs/ARCHITECTURE-DECISION-RECORDS/ADR-0002-seven-engine-architecture.md)
- [ADR-0005: Offline-First Architecture](docs/ARCHITECTURE-DECISION-RECORDS/ADR-0005-offline-first-architecture.md)
- [ADR-0006: Plugin-First and AI-Agnostic Design](docs/ARCHITECTURE-DECISION-RECORDS/ADR-0006-plugin-first-and-ai-agnostic-design.md)

## Mission

Build the definitive AI-powered tabletop platform for creating and playing persistent roleplaying worlds.

## North Star

Atlas enables cinematic, persistent, offline-first roleplaying for any game system through a plugin-based architecture where AI acts as an intelligent Campaign Director rather than merely a chatbot.

## Product Positioning

Atlas should be judged as a storytelling platform, not by feature count alone. Premium virtual tabletops provide useful reference points, but Atlas should differentiate through the combination of:

- Persistent worlds
- Cinematic play
- AI-directed storytelling
- Offline-first operation
- Creator extensibility
- User-owned campaign data

Atlas should use AI to enrich play without stealing authorship from players. Player agency always overrides AI convenience.

## Core Audiences

### Players

Players use Atlas to experience immersive campaigns with minimal interface friction. Play should feel cinematic, responsive, and grounded in meaningful choices.

### Game Masters

Game Masters use Atlas to run, inspect, and guide campaigns. Atlas should reduce repetitive work, preserve continuity, and provide operational visibility into the campaign without taking creative ownership away from the GM.

### Creators

Creators use Atlas to build campaigns, rulesets, maps, asset packs, AI personalities, voices, and plugins. Creator workflows should make Atlas extensible without requiring changes to the core platform.

### Contributors

Contributors use the repository as the authoritative source for product decisions, architecture, roadmap, feature status, and technical history. Important decisions should not live only in chat history.

## Product Pillars

### Campaign Director

The Campaign Director coordinates the experience. It understands story, pacing, player intent, active scenes, NPC behavior, and campaign memory. It does not own game rules.

Its detailed contract is defined in [docs/ENGINE-CONTRACTS.md](docs/ENGINE-CONTRACTS.md), [docs/INTERFACE-SPECIFICATION.md](docs/INTERFACE-SPECIFICATION.md), and [ADR-0003](docs/ARCHITECTURE-DECISION-RECORDS/ADR-0003-campaign-director-responsibilities.md).

### Rules Engine

Rules engines execute mechanics such as dice, combat, character sheets, skills, magic, inventory, and conditions. Rules must be replaceable so Atlas can support D&D, Star Frontiers, Pathfinder, Call of Cthulhu, and custom systems.

### World Engine

The World Engine owns persistent simulation state: time, NPC memory, factions, reputation, economy, weather, travel, environmental changes, and dynamic world events.

### Presentation Engine

The Presentation Engine makes the experience visible and audible: maps, tokens, portraits, fog of war, animation, music, ambience, voice, touch, desktop, tablet, and future VR or AR surfaces.

### Lore Engine

The Lore Engine automatically builds a living encyclopedia from gameplay. It turns the event stream into journals, timelines, relationships, quest history, discovered locations, organizations, family trees, and searchable campaign memory.

### Creator Platform

The Creator Platform enables campaign building, rule editing, asset import, AI personality authoring, plugin development, packaging, publishing, and eventual marketplace participation.

Plugin expectations are defined in [docs/PLUGIN-SDK.md](docs/PLUGIN-SDK.md).

## Operating Modes

### Play Mode

Play Mode is the player-facing experience. It prioritizes immersion, cinematic presentation, maps, voice or text interaction, dice, character sheets, music, and minimal visible machinery.

### Director Mode

Director Mode is the GM control room. It exposes world state, NPC goals, faction relationships, story arcs, timeline, encounter balance, AI reasoning summaries, continuity warnings, world events, and campaign health.

### Studio Mode

Studio Mode is the creator and developer workspace. It supports ruleset creation, campaign authoring, maps, AI personalities, voice packs, asset libraries, plugins, test scenarios, and publishing packages.

## Product Boundary

Atlas is not:

- A generic game engine like Unity
- A clone of Roll20 or Foundry
- An MMO
- A social network
- A cloud-only platform
- Locked to one AI provider
- Locked to one RPG system
- A tool that automates storytelling at the expense of imagination
- A tool that replaces player choice with AI convenience

## Success Criteria

Atlas succeeds when it produces memorable adventures. Every release should make Atlas more fun to play, easier to run, or easier to create for. Architectural work is valuable when it makes those outcomes durable.
