# Architecture Vision

## Project Vision

Create the best single-player D&D experience that can run completely offline on an iPad.

Cloud AI is an enhancement, not a dependency.

## Architecture Principles

1. Offline first
2. Local ownership of game state
3. Deterministic game engine
4. AI enhancement layer
5. Campaign portability
6. Save anywhere
7. Moddable campaigns

## Boundaries

- The core engine must never require network access.
- Campaign packages must be portable local data.
- Save files must be owned by the player and restorable without an account.
- The event log is the only authoritative campaign history.
- `GameState`, Journal, NPC Memory, Quest State, Relationship State, and World State are projections that may be rebuilt at any time from the event history.
- Optional AI features must sit behind adapters and degrade cleanly to local deterministic play.
- UI code may present game state, but durable rules and campaign transitions belong in engine modules.

## Long-Term Modules

| Module | Responsibility |
| --- | --- |
| Engine | Coordinates deterministic state transitions. |
| Story Engine | Advances scenes, choices, clocks, and narrative consequences. |
| Combat Engine | Runs initiative, turns, conditions, damage, and encounter outcomes. |
| NPC Memory | Stores local facts, impressions, and events known by NPCs. |
| Relationship Engine | Tracks affinity, trust, fear, reputation, and faction standing. |
| Inventory | Tracks items, currency, equipment, carrying limits, and item effects. |
| Quest Engine | Tracks quest states, objectives, dependencies, and rewards. |
| Journal | Records player-visible events and player-authored notes. |
| Campaign Loader | Validates and imports portable campaign packages. |
| Asset Manager | Resolves local images, maps, handouts, audio, and other campaign assets. |
| AI Adapter | Optional enhancement boundary for local or cloud-assisted narration. |

## MVP-001 Placement

MVP-001 implements the first local slice:

- Campaign package types
- Character, NPC, location, encounter, quest, scene, and state types
- Deterministic scene action application
- Dice rolling
- Journal updates
- Local save and restore through browser storage
- Sample campaign package
- Static PWA shell

The AI adapter is intentionally absent from MVP-001. When added later, it should consume local game context and return suggestions, never become required for saves, rules, or campaign progression.
