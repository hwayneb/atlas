# Atlas Architecture

## Project Vision

Create the best single-player D&D experience that can run completely offline on an iPad.

Cloud AI is an enhancement, not a dependency.

## Architecture Principles

1. Offline first
2. Local ownership of game state
3. Deterministic game engine
4. Event-sourced campaign history
5. AI enhancement layer
6. Campaign portability
7. Save anywhere
8. Moddable campaigns

## Boundaries

- The core engine must never require network access.
- Campaign packages must be portable local data.
- Save files must be owned by the player and restorable without an account.
- The event log is the only authoritative campaign history.
- `GameState`, Journal, NPC Memory, Quest State, Relationship State, and World State are projections that may be rebuilt at any time from the event history.
- Commands express intent and are never persisted.
- Events express facts and are authoritative after append.
- Optional AI features must sit behind adapters and degrade cleanly to local deterministic play.
- UI code may present game state, but durable rules and campaign transitions belong in engine modules.

## Long-Term Modules

| Module | Responsibility |
| --- | --- |
| Campaign Runtime | Coordinates command processing, event append, replay, projections, snapshots, and saves. |
| Story Engine | Advances scenes, choices, clocks, and narrative consequences. |
| World Engine | Tracks world clock, travel, weather, locations, factions, schedules, rumors, and delayed consequences. |
| Combat Engine | Runs initiative, turns, conditions, damage, and encounter outcomes. |
| NPC Memory | Stores local facts, impressions, and events known by NPCs. |
| Relationship Engine | Tracks affinity, trust, fear, reputation, and faction standing. |
| Inventory | Tracks items, currency, equipment, carrying limits, and item effects. |
| Quest Engine | Tracks quest states, objectives, dependencies, and rewards. |
| Journal | Records player-visible events and player-authored notes. |
| Campaign Loader | Validates and imports portable campaign packages. |
| Asset Manager | Resolves local images, maps, handouts, audio, and other campaign assets. |
| AI Adapter | Optional enhancement boundary for local or cloud-assisted narration. |

## Runtime Foundation

The Campaign Runtime follows this flow:

```text
Player Input
-> Command
-> Validation
-> Rule Execution
-> Event(s)
-> Event Store
-> Projection Manager
-> Updated Projections
-> UI
```

Canonical runtime API contracts live in `docs/contracts/runtime-api.md`.

## TODO

- Decide when to promote Replay Engine, Projection Manager, Snapshot Manager, and Save Manager interfaces from Draft to Stable.
- Define the first domain plugin that exercises the runtime foundation in a playable loop.
