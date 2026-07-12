# Atlas Decision Log

Architecture v1.0 status: Finalized on 2026-07-11.

This log records major product and architecture decisions for Atlas. It is intentionally concise. Detailed rationale, alternatives, and consequences belong in Architecture Decision Records under [docs/ARCHITECTURE-DECISION-RECORDS/](docs/ARCHITECTURE-DECISION-RECORDS/).

## ADR Index

| ADR | Status | Decision |
| --- | --- | --- |
| [ADR-0001](docs/ARCHITECTURE-DECISION-RECORDS/ADR-0001-repository-as-authoritative-source.md) | Accepted | Repository as Authoritative Source |
| [ADR-0002](docs/ARCHITECTURE-DECISION-RECORDS/ADR-0002-seven-engine-architecture.md) | Accepted | Seven-Engine Architecture |
| [ADR-0003](docs/ARCHITECTURE-DECISION-RECORDS/ADR-0003-campaign-director-responsibilities.md) | Accepted | Campaign Director Responsibilities |
| [ADR-0004](docs/ARCHITECTURE-DECISION-RECORDS/ADR-0004-event-sourced-runtime.md) | Accepted | Event-Sourced Runtime |
| [ADR-0005](docs/ARCHITECTURE-DECISION-RECORDS/ADR-0005-offline-first-architecture.md) | Accepted | Offline-First Architecture |
| [ADR-0006](docs/ARCHITECTURE-DECISION-RECORDS/ADR-0006-plugin-first-and-ai-agnostic-design.md) | Accepted | Plugin-First and AI-Agnostic Design |

## Chronological Summary

### 2026-07-11: Repository Is The Authoritative Project Memory

Atlas project knowledge must live in version-controlled repository documents, not only in ChatGPT or Codex conversations. See [ADR-0001](docs/ARCHITECTURE-DECISION-RECORDS/ADR-0001-repository-as-authoritative-source.md).

### 2026-07-11: Atlas Is A Tabletop Operating System

Atlas is framed as an AI-native tabletop operating system rather than a D&D app, VTT clone, or AI GM chatbot. This positioning is captured in [PRODUCT-VISION.md](PRODUCT-VISION.md) and supported by [ADR-0002](docs/ARCHITECTURE-DECISION-RECORDS/ADR-0002-seven-engine-architecture.md).

### 2026-07-11: Seven-Engine Architecture

Atlas architecture is organized around the Runtime Engine, Campaign Director, Rules Engine, World Engine, Presentation Engine, Lore Engine, and Creator Engine. See [ADR-0002](docs/ARCHITECTURE-DECISION-RECORDS/ADR-0002-seven-engine-architecture.md) and [docs/ENGINE-CONTRACTS.md](docs/ENGINE-CONTRACTS.md).

### 2026-07-11: Campaign Director Owns Orchestration, Not Rules

The Campaign Director owns session and scene orchestration, player intent routing, NPC activation, AI capability requests, campaign memory integration, and event generation. It must not contain game-specific rule logic. See [ADR-0003](docs/ARCHITECTURE-DECISION-RECORDS/ADR-0003-campaign-director-responsibilities.md).

### 2026-07-11: Event Log Is The Source Of Truth

Atlas uses an event-sourced runtime so replay, save/load, projections, snapshots, synchronization, AI memory, and lore generation share a durable campaign history. See [ADR-0004](docs/ARCHITECTURE-DECISION-RECORDS/ADR-0004-event-sourced-runtime.md).

### 2026-07-11: Offline-First, Plugin-First, AI-Agnostic

Atlas core architecture prioritizes local ownership, provider independence, replaceable rules and content, and offline play. See [ADR-0005](docs/ARCHITECTURE-DECISION-RECORDS/ADR-0005-offline-first-architecture.md) and [ADR-0006](docs/ARCHITECTURE-DECISION-RECORDS/ADR-0006-plugin-first-and-ai-agnostic-design.md).

### 2026-07-11: Three Operating Modes

Atlas distinguishes Play Mode, Director Mode, and Studio Mode so players, GMs, and creators each get workflows suited to their needs. This is documented in [PRODUCT-VISION.md](PRODUCT-VISION.md) and [ARCHITECTURE.md](ARCHITECTURE.md).

### 2026-07-11: Engine Contracts Are Required Architecture

Atlas maintains explicit engine contracts for responsibilities, ownership, non-responsibilities, public interfaces, events, dependencies, and extension points. See [docs/ENGINE-CONTRACTS.md](docs/ENGINE-CONTRACTS.md) and [docs/INTERFACE-SPECIFICATION.md](docs/INTERFACE-SPECIFICATION.md).

### 2026-07-11: Plugin SDK Is A First-Class Architecture Concern

Plugin lifecycle, discovery, versioning, compatibility, permissions, sandboxing, packaging, and best practices are documented before broad plugin implementation. See [docs/PLUGIN-SDK.md](docs/PLUGIN-SDK.md) and [ADR-0006](docs/ARCHITECTURE-DECISION-RECORDS/ADR-0006-plugin-first-and-ai-agnostic-design.md).

### 2026-07-11: Core Data Model Is Event-Centered

Core domain entities are defined while preserving the event log as the source of truth. See [docs/DATA-MODEL.md](docs/DATA-MODEL.md) and [ADR-0004](docs/ARCHITECTURE-DECISION-RECORDS/ADR-0004-event-sourced-runtime.md).

### 2026-07-11: AI Interfaces Are Capability-Based

AI behavior is documented as provider-agnostic capabilities instead of provider-specific product logic. See [docs/AI-CAPABILITY-CATALOG.md](docs/AI-CAPABILITY-CATALOG.md) and [ADR-0006](docs/ARCHITECTURE-DECISION-RECORDS/ADR-0006-plugin-first-and-ai-agnostic-design.md).

### 2026-07-11: Player Agency Overrides AI Convenience

AI may propose, narrate, react, remember, summarize, and warn, but it must not choose for players. This principle is captured in [ATLAS-MANIFESTO.md](ATLAS-MANIFESTO.md), [ARCHITECTURAL-PRINCIPLES.md](ARCHITECTURAL-PRINCIPLES.md), and [docs/AI-CAPABILITY-CATALOG.md](docs/AI-CAPABILITY-CATALOG.md).

### 2026-07-11: Runtime State Machine Guides Implementation

Campaign, session, scene, encounter, save, replay, and resume transitions are defined before Campaign Director MVP implementation. See [docs/RUNTIME-STATE-MACHINE.md](docs/RUNTIME-STATE-MACHINE.md).

### 2026-07-11: Architecture v1.0 Documentation Is Complete

The Architecture v1.0 documentation set is complete enough to begin implementation of the Campaign Director MVP. Future documentation changes should be driven by implementation needs, design review, or accepted ADRs.

## Decision Process

New architecture decisions should be recorded as ADRs when they:

- Change engine ownership or interface boundaries.
- Affect event sourcing, offline operation, plugin behavior, AI capabilities, or save compatibility.
- Introduce a durable product constraint or non-negotiable.
- Reverse or materially revise an accepted decision.

Use this log as the index and concise history. Keep detailed rationale in the relevant ADR.
