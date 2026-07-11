# ADR-0006: Plugin-First and AI-Agnostic Design

Status: Accepted

Date: 2026-07-11

## Context

Atlas must support multiple tabletop rulesets, campaign settings, asset packs, voices, AI personalities, providers, and future creator workflows. The platform should not be locked to one RPG system, one AI provider, or one content pipeline.

## Decision

Atlas is plugin-first and AI-agnostic.

Rules, dice systems, campaign content, assets, audio, voices, AI personalities, and future extensions should be replaceable through plugins wherever practical. AI behavior should be expressed as provider-independent capabilities rather than provider-specific product logic.

Plugins must not directly mutate core state or bypass engine contracts. AI outputs are proposals until accepted through an engine interface and recorded as events.

## Consequences

- Plugin lifecycle, permissions, versioning, compatibility, sandboxing, and packaging are first-class architecture concerns.
- AI capability contracts must be stable enough to support local and remote providers.
- Rules engines remain independent from the Campaign Director.
- Player agency always overrides AI convenience.
- Extension points must preserve offline-first operation and event-sourced state.

## Related Documents

- [../../ARCHITECTURAL-PRINCIPLES.md](../../ARCHITECTURAL-PRINCIPLES.md)
- [../PLUGIN-SDK.md](../PLUGIN-SDK.md)
- [../AI-CAPABILITY-CATALOG.md](../AI-CAPABILITY-CATALOG.md)
- [../ENGINE-CONTRACTS.md](../ENGINE-CONTRACTS.md)
- [../INTERFACE-SPECIFICATION.md](../INTERFACE-SPECIFICATION.md)
