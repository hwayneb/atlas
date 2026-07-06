# ADR-003: World Engine

## Status

Proposed

## 1. Context

This project is an offline-first solo D&D engine for iPad/PWA play. The app must work with no internet, no cloud APIs, no login, and local-only campaign data.

ADR-001 establishes Offline First as a hard architectural boundary. ADR-002 proposes an Event Engine where the event log is the only authoritative campaign history and projections are rebuildable.

The World Engine is needed for world state that changes independently of the current scene. A solo campaign should feel alive even when the player ignores a quest, waits until nightfall, travels across regions, revisits a town, or lets factions act in the background.

The project architecture follows this processing model:

```text
Player Input
-> Command
-> Validation
-> Rules
-> Event(s)
-> Projection Update
-> UI Refresh
```

## 2. Decision

Create a deterministic World Engine responsible for projecting mutable world state from the campaign package plus the authoritative event log.

The campaign package defines the base world. The event log records what changed during this playthrough. World State is a projection and may be discarded and rebuilt at any time from the event history.

The World Engine must not depend on AI. AI may later summarize, narrate, or explain world changes, but it must not own world state or participate in replay.

The World Engine never mutates state directly. It participates in command processing by validating world-related intent, applying deterministic rules, and producing world events for the Event Engine to append.

## 3. Responsibilities

The World Engine owns projected state and deterministic rules for:

- World clock and calendar
- Day/night cycle
- Weather
- Travel and distance
- Region and location state
- Faction activity
- NPC schedules
- Random encounters
- Merchant inventory changes
- Rumors and world events
- Consequences of ignored quests or delayed actions
- World facts and flags used by Story, Quest, NPC Memory, Relationship, Inventory, and Combat systems

The World Engine answers questions such as:

- What time and date is it in the campaign world?
- Is this location safe, damaged, locked down, abandoned, or transformed?
- Which factions are active in this region?
- Which NPCs are likely present at this time?
- What weather or travel conditions apply?
- What delayed consequences have matured?

## 4. Non-Responsibilities

The World Engine should not:

- Store canonical campaign history
- Store world facts that cannot be derived from campaign package data plus events
- Own the event log
- Append events directly
- Persist commands
- Generate prose narration directly
- Decide story choices for the player
- Own quest state
- Own NPC memories or relationship values
- Own inventory item effects outside world availability and merchant stock
- Call AI services
- Require internet access
- Mutate save files outside the Event Engine

## 5. Command Processing

The World Engine participates in the command pipeline:

```text
Player Input
-> Command
-> Validation
-> Rules
-> Event(s)
-> Projection Update
-> UI Refresh
```

Player actions become commands. Commands express intent, such as travel, wait, rest, enter a location, or check for local conditions. Commands are validated against the current projections and campaign package rules.

Validation and deterministic rules produce one or more events. Those events become the authoritative campaign history only when appended by the Event Engine. World State is then rebuilt or updated as a projection by replaying events.

The World Engine never mutates World State directly. It proposes event outcomes through command processing; the Event Engine records them; projections reflect them.

Example flow:

```text
TravelToLocation
-> TravelStarted
-> ClockAdvanced
-> WeatherChanged
-> RandomEncounterRolled
-> TravelCompleted
-> LocationEntered
-> QuestDeadlineReached
-> MerchantInventoryChanged
-> RumorCreated
```

Random outcomes in this flow, such as weather changes or encounter rolls, must be captured in events and never recomputed during replay.

## 6. Command vs Event

Commands represent requested actions. They are intent, not history.

Examples:

- `AttackTarget`
- `TravelToLocation`
- `TalkToNPC`
- `CastSpell`
- `OpenDoor`
- `LongRest`
- `Wait`

Commands may fail validation. A command that fails validation does not become campaign history unless the product later defines explicit failure events for player-visible failed attempts.

Events represent facts that actually occurred.

Examples:

- `AttackResolved`
- `DamageApplied`
- `TravelCompleted`
- `NPCConversationStarted`
- `SpellCast`
- `DoorOpened`
- `LongRestCompleted`

Events are immutable. Only events become campaign history.

Commands exist only during execution. Commands are never persisted. Replay executes events only.

## 7. Architectural Rule

Only the Event Engine may append events.

Subsystems never mutate projections directly. Subsystems issue or process commands. Commands become events through validation and deterministic rules. Events rebuild projections.

This rule applies consistently across:

- Story Engine
- World Engine
- Combat Engine
- Quest Engine
- Relationship Engine
- NPC Memory
- Inventory
- Journal

Projections, including `GameState`, Journal, NPC Memory, Quest State, Relationship State, Inventory State, Combat State, and World State, are rebuildable views over the event history.

## 8. Interaction with Story Engine

The Story Engine uses World State as context for scene availability, scene text selection, consequences, and action gating.

Examples:

- A scene is only available at night.
- A road encounter changes if the weather is stormy.
- A town scene changes after a faction raid.
- A delayed quest consequence alters the next story beat.

The Story Engine should not directly mutate World State. It should issue commands that produce events, such as time advancing, travel completing, or a location changing.

## 9. Interaction with Quest Engine

The Quest Engine owns quest state. The World Engine owns time, geography, and world consequences that may affect quests.

Examples:

- A rescue quest fails if three in-world days pass.
- A merchant leaves town at dawn.
- A faction strengthens if the player ignores a threat.
- A harvest festival begins on a calendar date.

Quest outcomes should be represented by Quest Engine events. World conditions that trigger or influence those outcomes should be represented by World Engine events.

## 10. Interaction with NPC Memory and Relationship Engine

NPC Memory consumes world events to determine what NPCs could know or remember.

Examples:

- An NPC was present during a faction attack.
- A merchant remembers the player arriving after curfew.
- A village elder learns that a nearby shrine was abandoned.

The Relationship Engine consumes relevant world events when they should affect trust, fear, reputation, faction standing, or affinity.

Examples:

- Delaying a rescue reduces trust with a family.
- Protecting a caravan improves standing with a merchant guild.
- Traveling with a faction escort changes local reputation.

The World Engine should not own memories or relationship scores. It provides the world facts and events those systems can project from.

## 11. Determinism Requirements

The World Engine must be deterministic.

Requirements:

- Replay must produce the same World State from the same campaign package and event log.
- Event sequence, not timestamp, determines ordering.
- Wall-clock time must not advance the world automatically while the app is closed.
- Random outcomes must be recorded as events and never rerolled during replay.
- Time advancement must come from explicit events, such as rest, travel, wait, combat rounds, or story actions.
- Campaign package tables and rules must be versioned so old saves remain explainable.
- Commands are never persisted.
- Only events are stored.
- Replay executes events only.
- Commands exist only during execution.
- AI must not participate in deterministic world state calculation.

The player must be able to close the iPad and resume exactly where they left off.

## 12. Local Storage and Save/Replay Implications

The event log is the durable save. World State is a rebuildable projection.

For active play, the app may cache World State for performance. For portability, the save package should remain local-file based and contain the authoritative event log plus metadata needed to replay against the campaign package.

Snapshots may be used for long campaigns, but snapshots are performance artifacts only. They must never contain world facts that cannot be derived from the event log.

On load:

1. Load the campaign package.
2. Load the local event log.
3. Validate package id, package version, and event schema versions.
4. Restore the latest compatible snapshot if available.
5. Replay remaining events in sequence.
6. Rebuild World State and other projections.

Commands are not part of save/load. Saves contain events, projection snapshots, and replay metadata, not pending command objects.

## 13. Example World Events

Example event types:

- `world.clock_advanced`
- `world.calendar_day_started`
- `world.day_night_changed`
- `world.weather_changed`
- `world.travel_started`
- `world.travel_completed`
- `world.random_encounter_rolled`
- `world.random_encounter_triggered`
- `world.location_discovered`
- `world.location_state_changed`
- `world.region_state_changed`
- `world.faction_activity_advanced`
- `world.npc_schedule_changed`
- `world.merchant_inventory_changed`
- `world.rumor_created`
- `world.rumor_expired`
- `world.delayed_consequence_triggered`
- `world.quest_deadline_reached`

Event payloads should include enough information to replay without recalculation. For example, `world.random_encounter_rolled` should include the table id, roll result, modifiers, selected encounter id, and source command.

## 14. Tradeoffs

Positive tradeoffs:

- The world can feel alive while remaining offline and deterministic.
- Campaign history stays explainable.
- Long-running campaigns can be rebuilt, migrated, and debugged.
- Story, Quest, NPC Memory, and Relationship systems get a shared world context.
- Command validation gives subsystems a consistent way to reject impossible actions.
- Optional AI can summarize world changes without owning state.

Costs:

- More event types and projection rules are required.
- Command validation boundaries must be designed carefully.
- Time and random encounter rules need careful schema design.
- Long campaigns need snapshots and indexes for iPad performance.
- Campaign package migrations must handle changed world entity ids.
- Designers must be disciplined about which subsystem owns each kind of state.

## 15. Open Questions

- What calendar model should MVP campaigns use: simple day count, named months, or campaign-defined calendars?
- Should weather use campaign-defined tables, deterministic seasonal rules, or both?
- How granular should travel be: route-level, hex-level, region-level, or scene-level?
- How should NPC schedules degrade when a campaign package omits detailed schedule data?
- What snapshot interval is appropriate for iPad-scale long campaigns?
- How should merchant inventory restock rules be represented in portable campaign packages?
- How should invalid commands be surfaced in the UI without becoming campaign history?
- How should old saves behave if a modded campaign removes a location, faction, route, or encounter table referenced by prior events?

## 16. Consequences

The World Engine becomes the deterministic subsystem for changing world conditions outside the current scene.

World State remains local, portable, cloud-independent, and rebuildable from the event log plus campaign package. The player can save anywhere, close the iPad, and resume exactly where they left off because the world only advances through recorded events.

The command processing model gives the World Engine a clear boundary: commands express intent, validation and rules produce events, the Event Engine appends those events, and projections rebuild state for the UI.

This decision supports the long-term architecture without introducing AI dependency, backend services, authentication, or network calls.
