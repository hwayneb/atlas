# ADR-0004: Event-Sourced Runtime

Status: Accepted

Date: 2026-07-11

## Context

Atlas needs replay, save/load, undo foundations, synchronization readiness, AI memory, lore generation, continuity checks, and long-term campaign history. These capabilities require a trustworthy history of what happened, not only mutable current state.

## Decision

The event log is the source of truth for campaign history.

Important gameplay, rules, AI, world, lore, presentation, and creator changes should be recorded as durable events. Projections and snapshots may optimize reads and resume performance, but they are derived from the event stream.

## Consequences

- Engine state changes must be represented as events when they affect campaign history.
- Projections are rebuildable and should not become the authoritative record.
- Snapshots accelerate loading but do not replace the event log.
- Replay, synchronization, lore generation, and campaign memory should derive from events.
- Event schemas and compatibility become core architecture concerns.

## Related Documents

- [../../ARCHITECTURAL-PRINCIPLES.md](../../ARCHITECTURAL-PRINCIPLES.md)
- [../ENGINE-CONTRACTS.md](../ENGINE-CONTRACTS.md)
- [../DATA-MODEL.md](../DATA-MODEL.md)
- [../RUNTIME-STATE-MACHINE.md](../RUNTIME-STATE-MACHINE.md)
- [../INTERFACE-SPECIFICATION.md](../INTERFACE-SPECIFICATION.md)
