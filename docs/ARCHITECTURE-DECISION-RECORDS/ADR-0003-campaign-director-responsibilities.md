# ADR-0003: Campaign Director Responsibilities

Status: Accepted

Date: 2026-07-11

## Context

The Campaign Director is central to Atlas play. It must coordinate active sessions, scenes, encounters, player intent, NPC activation, AI narration, and campaign memory. At the same time, Atlas must remain rules-independent and plugin-first.

If the Campaign Director owns rules, provider-specific AI calls, world simulation internals, or presentation rendering, it will become difficult to support multiple games, providers, and clients.

## Decision

The Campaign Director owns orchestration, not mechanics.

It is responsible for session orchestration, scene lifecycle, story pacing, encounter management, initiative flow coordination, NPC activation and scheduling, player intent routing, AI capability requests, context assembly, campaign memory integration, event generation, and consistency checks.

It must not implement game-specific rules, dice math, combat mechanics, provider-specific AI clients, permanent world state ownership, lore encyclopedia ownership, or UI rendering.

## Consequences

- Rules engines execute mechanics and return results through interfaces.
- AI providers are accessed through capability interfaces, not direct Campaign Director dependencies.
- World, lore, and presentation changes are requested through engine contracts and recorded as events.
- Campaign Director MVP implementation must align with this responsibility boundary.

## Related Documents

- [../../ARCHITECTURE.md](../../ARCHITECTURE.md)
- [../ENGINE-CONTRACTS.md](../ENGINE-CONTRACTS.md)
- [../RUNTIME-STATE-MACHINE.md](../RUNTIME-STATE-MACHINE.md)
- [../AI-CAPABILITY-CATALOG.md](../AI-CAPABILITY-CATALOG.md)
