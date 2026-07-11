# Atlas Architectural Principles

Architecture v1.0

This document defines the engineering guardrails for Atlas. It should be read with [PRODUCT-VISION.md](PRODUCT-VISION.md), [ATLAS-MANIFESTO.md](ATLAS-MANIFESTO.md), [ARCHITECTURE.md](ARCHITECTURE.md), and the accepted decisions in [DECISION-LOG.md](DECISION-LOG.md).

Detailed implementation references:

- [docs/ENGINE-CONTRACTS.md](docs/ENGINE-CONTRACTS.md)
- [docs/INTERFACE-SPECIFICATION.md](docs/INTERFACE-SPECIFICATION.md)
- [docs/DATA-MODEL.md](docs/DATA-MODEL.md)
- [docs/PLUGIN-SDK.md](docs/PLUGIN-SDK.md)
- [docs/AI-CAPABILITY-CATALOG.md](docs/AI-CAPABILITY-CATALOG.md)
- [docs/RUNTIME-STATE-MACHINE.md](docs/RUNTIME-STATE-MACHINE.md)

Foundational ADRs:

- [ADR-0001: Repository as Authoritative Source](docs/ARCHITECTURE-DECISION-RECORDS/ADR-0001-repository-as-authoritative-source.md)
- [ADR-0002: Seven-Engine Architecture](docs/ARCHITECTURE-DECISION-RECORDS/ADR-0002-seven-engine-architecture.md)
- [ADR-0003: Campaign Director Responsibilities](docs/ARCHITECTURE-DECISION-RECORDS/ADR-0003-campaign-director-responsibilities.md)
- [ADR-0004: Event-Sourced Runtime](docs/ARCHITECTURE-DECISION-RECORDS/ADR-0004-event-sourced-runtime.md)
- [ADR-0005: Offline-First Architecture](docs/ARCHITECTURE-DECISION-RECORDS/ADR-0005-offline-first-architecture.md)
- [ADR-0006: Plugin-First and AI-Agnostic Design](docs/ARCHITECTURE-DECISION-RECORDS/ADR-0006-plugin-first-and-ai-agnostic-design.md)

## Core Principles

### Offline-First

Atlas must function without requiring an internet connection, cloud service, hosted account, or remote AI provider. Online services may enhance the experience, but they must not be required for the core campaign loop.

### Event-Sourced

The event log is the source of truth for campaign history. Player actions, NPC decisions, die rolls, AI responses, map changes, scene transitions, inventory updates, and world events should be captured as durable events.

Event sourcing enables replay, save/load, undo, synchronization, analytics, AI memory, and long-term campaign continuity.

See [ADR-0004](docs/ARCHITECTURE-DECISION-RECORDS/ADR-0004-event-sourced-runtime.md).

### Plugin-First

Rules, dice systems, campaign settings, maps, art, audio, voices, AI personalities, and future extensions should be replaceable through plugins wherever practical. Plugins must not bypass core state boundaries.

See [ADR-0006](docs/ARCHITECTURE-DECISION-RECORDS/ADR-0006-plugin-first-and-ai-agnostic-design.md).

### AI-Agnostic

Atlas should request AI capabilities rather than bind product behavior to one provider. Local models, OpenAI, Anthropic, Google, and future providers should be interchangeable behind capability-oriented interfaces.

AI outputs are proposals until accepted by an Atlas engine and recorded as events. Player agency always overrides AI convenience: AI may propose, narrate, react, remember, summarize, and warn, but it must not choose for players.

See [docs/AI-CAPABILITY-CATALOG.md](docs/AI-CAPABILITY-CATALOG.md) and [ADR-0006](docs/ARCHITECTURE-DECISION-RECORDS/ADR-0006-plugin-first-and-ai-agnostic-design.md).

### Rules-Independent

The Campaign Director must not contain game-specific rules. It orchestrates rules engines, presentation, world state, AI, campaign memory, and event generation. Rules engines execute mechanics.

### Campaigns Are Data

Campaigns should be portable, inspectable, versionable, and user-owned. Save files and campaign packages should remain local-first and avoid unnecessary provider lock-in.

### Creator-First Extensibility

Atlas should allow creators to extend rules, worlds, personalities, assets, and campaigns without modifying the core engine. The platform should grow through authored content and plugins, not hard-coded assumptions.

### Multiplayer-Ready

Atlas does not need online multiplayer in the first playable slice, but core architecture should avoid choices that prevent future synchronization, authority management, or collaborative play.

## Non-Negotiables

- The event log is the single source of truth.
- Plugins cannot directly modify core state outside approved interfaces.
- No core feature may require an internet connection.
- Rules engines must not be coupled to the Campaign Director.
- Save files remain user-owned and portable.
- AI providers are interchangeable.
- Player agency always overrides AI convenience.
- Backward compatibility for saved campaigns is a design goal, not an afterthought.
- The repository is the authoritative source of product knowledge.
- Major decisions must be captured in version-controlled documents.

## Product Discipline

Every proposed feature should answer:

1. Which Atlas engine owns this?
2. Does it strengthen the mission of becoming the definitive AI tabletop platform?
3. Does it make Atlas more fun to play, easier to run, or easier to create for?
4. Does it preserve offline-first, event-sourced, plugin-first, AI-agnostic architecture?

If the answer is unclear, the feature should be redesigned, deferred, or rejected.

## Development Workflow

Atlas feature work should follow this lifecycle:

1. Product decision: explain why the feature exists and which engine owns it.
2. Architecture review: define responsibilities, interfaces, data model, extensibility, performance, offline behavior, and testing strategy.
3. Implementation prompt or issue: provide acceptance criteria, tests, and documentation updates.
4. Implementation review: check architecture compliance, code quality, defects, and future extensibility.
5. Commit: keep changes logical and reviewable.
6. Documentation update: update roadmap, decision log, feature status, and related architecture docs.

No feature is complete until tests pass, documentation is updated, and the decision history is clear.
