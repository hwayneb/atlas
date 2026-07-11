# Atlas Data Model

Atlas campaigns are data. The event log is the source of truth, while projections, snapshots, indexes, and views are derived from events.

This document defines core domain entities and ownership boundaries. It should be read with [ENGINE-CONTRACTS.md](ENGINE-CONTRACTS.md), [PLUGIN-SDK.md](PLUGIN-SDK.md), and [../ARCHITECTURE.md](../ARCHITECTURE.md).

## Modeling Rules

- Every durable state change should be represented by an event.
- Projections are rebuildable from events.
- Snapshots accelerate loading but do not replace the event log.
- Campaign packages should remain portable and user-owned.
- Plugin-owned data must be namespaced and versioned.
- AI outputs become durable only when accepted into the campaign through approved events.

## Campaign

A Campaign is the top-level playable world or adventure.

Owned by: Runtime Engine

Contains or references:

- Sessions
- Scenes
- Characters
- NPCs
- Factions
- Locations
- Quests
- Items
- Assets
- Plugins
- Event log
- Projections
- Snapshots

Relationships:

- A Campaign has many Sessions.
- A Campaign has many Locations, Characters, NPCs, Factions, Items, and Quests.
- A Campaign declares plugin dependencies.

## Session

A Session is a period of active play.

Owned by: Campaign Director

Contains or references:

- Session start and end events
- Active participants
- Active scenes
- Session summary
- Events produced during play

Relationships:

- A Campaign has many Sessions.
- A Session has many Scenes.
- A Session may produce Lore entries and World updates.

## Scene

A Scene is a bounded unit of play such as exploration, conversation, travel, or combat.

Owned by: Campaign Director

Contains or references:

- Location
- Participants
- Scene goal
- Current mode
- Encounter or initiative flow when active
- Presentation state

Relationships:

- A Session has many Scenes.
- A Scene may involve Characters, NPCs, Items, Locations, Rules checks, and Lore entries.

## Character

A Character is a player-controlled or party-controlled actor.

Owned by: Rules Engine for mechanics; Campaign Director for active participation

Contains or references:

- Identity
- Player ownership
- Ruleset-specific sheet data
- Inventory
- Conditions
- Progression
- Current location

Relationships:

- A Character belongs to a Campaign.
- A Character participates in Sessions and Scenes.
- A Character can own Items and affect Quests, Factions, Locations, and NPC relationships.

## NPC

An NPC is a non-player actor.

Owned by: World Engine for persistent state; Campaign Director for activation during play

Contains or references:

- Identity
- Role
- Location
- Goals
- Memory
- Relationships
- Faction membership
- Ruleset-specific stat block where needed

Relationships:

- An NPC belongs to a Campaign.
- An NPC may belong to Factions.
- An NPC may participate in Scenes and Quests.
- An NPC may produce or consume Lore through remembered events.

## Faction

A Faction is an organization, political body, family, guild, religion, army, or other group actor.

Owned by: World Engine

Contains or references:

- Identity
- Goals
- Members
- Resources
- Reputation
- Relationships with other factions
- Controlled locations

Relationships:

- A Faction has many NPCs.
- A Faction may control Locations and influence Quests.
- A Faction may generate World events.

## Item

An Item is a durable object in the campaign.

Owned by: Rules Engine for mechanical effects; World Engine for world placement

Contains or references:

- Identity
- Description
- Owner or location
- Quantity
- Ruleset-specific mechanics
- Asset references

Relationships:

- An Item may belong to a Character, NPC, Location, or campaign inventory.
- An Item may affect Rules events, Quests, and Lore.

## Quest

A Quest is a tracked goal, obligation, mystery, promise, or story thread.

Owned by: Campaign Director for active flow; Lore Engine for journal representation

Contains or references:

- Title
- Status
- Objectives
- Related entities
- Timeline entries
- Outcomes

Relationships:

- A Quest may involve Characters, NPCs, Factions, Locations, and Items.
- A Quest produces Lore updates and may influence World state.

## Location

A Location is a place in the campaign world.

Owned by: World Engine

Contains or references:

- Identity
- Geography
- Description
- Contained NPCs and Items
- Connected locations
- Map assets
- Environmental state
- Discovery status

Relationships:

- A Location belongs to a Campaign.
- A Location may contain Scenes.
- A Location may be controlled by Factions and referenced by Quests.

## Event

An Event is an immutable record of something meaningful that happened.

Owned by: Runtime Engine

Contains:

- Event identifier
- Event type
- Timestamp or logical clock
- Campaign scope
- Actor
- Payload
- Schema version
- Causation and correlation identifiers

Relationships:

- Events rebuild Projections.
- Events may be summarized into Lore.
- Events may be compacted into Snapshots.

## Projection

A Projection is a queryable view derived from events.

Owned by: Runtime Engine; domain meaning supplied by the relevant engine

Examples:

- Current character sheet
- Active scene state
- World clock
- Quest journal
- Lore timeline
- Map state

Relationships:

- A Projection is rebuilt from Events.
- A Projection may be cached or indexed.
- A Projection is not the source of truth.

## Snapshot

A Snapshot is a serialized state checkpoint used to speed loading and replay.

Owned by: Runtime Engine

Contains or references:

- Campaign scope
- Event cursor
- Projection state
- Schema versions
- Plugin versions

Relationships:

- A Snapshot summarizes Events up to a cursor.
- A Snapshot must be invalidated or migrated when schemas change.

## Asset

An Asset is media or structured content used by Atlas.

Owned by: Runtime Engine asset registry; Presentation and Creator engines consume assets

Examples:

- Maps
- Tokens
- Portraits
- Handouts
- Music
- Ambience
- Voice packs
- Rules documents
- Campaign art

Relationships:

- Assets may be referenced by Campaigns, Locations, Items, NPCs, Presentation state, and Plugins.
- Assets should include metadata for portability and licensing.

## Plugin

A Plugin is an extension package that adds capabilities, content, rules, assets, providers, personalities, or tools.

Owned by: Runtime Engine registry; Creator Engine supports authoring

Contains or references:

- Manifest
- Version
- Capabilities
- Permissions
- Events produced and consumed
- Data schemas
- Assets
- Migrations

Relationships:

- Campaigns declare Plugin dependencies.
- Plugins may own namespaced data.
- Plugins must interact with core state through approved interfaces.

## Ownership Summary

- Runtime Engine owns durable event infrastructure, projections, snapshots, assets, campaigns, and plugins.
- Campaign Director owns active play orchestration for sessions and scenes.
- Rules Engine owns mechanics, character rules, dice, inventory, combat, and conditions.
- World Engine owns persistent simulation state for locations, NPC memory, factions, reputation, time, economy, weather, and travel.
- Presentation Engine owns rendered views, audio, voice playback, and user interaction capture.
- Lore Engine owns derived knowledge, journals, timelines, relationships, search, and summaries.
- Creator Engine owns authoring, validation, packaging, and Studio Mode workflows.
