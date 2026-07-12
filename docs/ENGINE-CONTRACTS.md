# Atlas Engine Contracts

Architecture v1.0

This document defines the boundaries between the seven Atlas engines. It is the practical companion to [../ARCHITECTURE.md](../ARCHITECTURE.md): architecture explains the model; contracts define ownership, interfaces, events, dependencies, and extension points.

All engines communicate through approved runtime interfaces and durable events. No engine should bypass the event log, mutate another engine's private state, or assume a specific ruleset, AI provider, storage backend, or presentation surface. Language-independent interface expectations are defined in [INTERFACE-SPECIFICATION.md](INTERFACE-SPECIFICATION.md).

## Runtime Engine

Responsibilities:

- Store campaign events as the source of truth.
- Rebuild projections from events.
- Manage snapshots, replay, save/load, assets, plugins, and synchronization foundations.
- Provide stable APIs for event append, event replay, projection queries, asset lookup, and plugin lifecycle.

Explicit ownership:

- Event store
- Replay engine
- Projection manager
- Snapshot manager
- Save/load format
- Asset registry
- Plugin registry
- Runtime clocks and identifiers

Explicit non-responsibilities:

- Game rules
- Story pacing
- NPC behavior
- World simulation decisions
- UI rendering
- Lore interpretation
- Creator authoring workflows beyond runtime support

Public interfaces:

- `appendEvent(event)`
- `readEvents(scope, cursor)`
- `replay(scope, options)`
- `registerProjection(projection)`
- `queryProjection(name, query)`
- `createSnapshot(scope)`
- `restoreSnapshot(snapshotId)`
- `registerPlugin(pluginManifest)`
- `resolveAsset(assetId)`

Events produced:

- `RuntimeStarted`
- `RuntimeStopped`
- `CampaignCreated`
- `CampaignLoaded`
- `CampaignSaved`
- `SnapshotCreated`
- `SnapshotRestored`
- `ProjectionRebuilt`
- `PluginRegistered`
- `PluginEnabled`
- `PluginDisabled`
- `AssetRegistered`

Events consumed:

- All durable campaign, session, world, rules, lore, presentation, and creator events.

Dependencies:

- Local storage
- Serialization layer
- Event schema registry
- Plugin manifests
- Asset storage

Extension points:

- Storage adapters
- Projection types
- Snapshot strategies
- Asset providers
- Plugin loaders
- Sync adapters

## Campaign Director

Responsibilities:

- Orchestrate active play.
- Manage session, scene, encounter, and turn flow.
- Route player intent to rules, world, lore, AI, and presentation services.
- Activate NPCs and schedule narrative beats.
- Generate durable orchestration events.
- Maintain consistency without owning rules or world simulation internals.

Explicit ownership:

- Session orchestration
- Scene lifecycle
- Encounter pacing
- Initiative coordination
- Player intent routing
- AI capability requests during play
- NPC activation schedule
- Campaign context assembly

Explicit non-responsibilities:

- Game mechanics implementation
- Dice probability or combat math
- Permanent world state ownership
- Lore encyclopedia ownership
- Map rendering
- Provider-specific AI calls
- Plugin packaging

Public interfaces:

- `startSession(campaignId, options)`
- `endSession(sessionId)`
- `openScene(sceneRequest)`
- `closeScene(sceneId, outcome)`
- `routePlayerIntent(intent)`
- `requestNpcAction(npcId, context)`
- `advanceTurn(flowId)`
- `resolveEncounter(encounterId)`
- `requestAiCapability(capability, input)`

Events produced:

- `SessionStarted`
- `SessionEnded`
- `SceneOpened`
- `SceneClosed`
- `PlayerIntentReceived`
- `PlayerIntentRouted`
- `NpcActivated`
- `TurnAdvanced`
- `EncounterStarted`
- `EncounterResolved`
- `AiCapabilityRequested`
- `DirectorContinuityWarningRaised`

Events consumed:

- `CampaignLoaded`
- `CharacterUpdated`
- `NpcUpdated`
- `LocationChanged`
- `RulesCheckResolved`
- `DiceRolled`
- `WorldEventGenerated`
- `LoreEntryCreated`
- `PresentationInteractionReceived`

Dependencies:

- Runtime Engine
- Rules Engine
- World Engine
- Lore Engine
- Presentation Engine
- AI capability registry

Extension points:

- Director personalities
- Pacing policies
- Encounter policies
- NPC scheduling strategies
- Player intent interpreters
- Safety and continuity policies

## Rules Engine

Responsibilities:

- Execute game mechanics for one or more tabletop systems.
- Resolve dice, checks, combat, conditions, inventory, character changes, and rules validations.
- Expose rules capabilities through stable interfaces.

Explicit ownership:

- Ruleset definitions
- Dice mechanics
- Character mechanics
- Combat rules
- Inventory and equipment rules
- Conditions and status effects
- Rules validation

Explicit non-responsibilities:

- Story direction
- Scene pacing
- AI narration
- Persistent world simulation
- UI layout
- Event storage implementation
- Campaign lore interpretation

Public interfaces:

- `registerRuleset(rulesetManifest)`
- `rollDice(expression, context)`
- `resolveCheck(checkRequest)`
- `resolveCombatAction(actionRequest)`
- `applyCondition(targetId, condition)`
- `updateInventory(targetId, change)`
- `validateCharacter(character)`
- `describeRulesCapability(capabilityId)`

Events produced:

- `RulesetRegistered`
- `DiceRolled`
- `CheckResolved`
- `CombatActionResolved`
- `DamageApplied`
- `HealingApplied`
- `ConditionApplied`
- `ConditionRemoved`
- `InventoryChanged`
- `CharacterValidated`

Events consumed:

- `PlayerIntentRouted`
- `NpcActivated`
- `EncounterStarted`
- `TurnAdvanced`
- `ItemUsed`
- `CharacterCreated`
- `CharacterUpdated`

Dependencies:

- Runtime Engine
- Plugin SDK
- Ruleset manifests
- Character and item schemas

Extension points:

- Ruleset plugins
- Dice adapters
- Character sheet schemas
- Combat modules
- Inventory modules
- Condition libraries

## World Engine

Responsibilities:

- Maintain persistent world state and simulation.
- Track NPC memory, factions, reputation, time, travel, economy, weather, and environmental change.
- Generate world events that can influence active and future play.

Explicit ownership:

- World clock
- Locations
- Factions
- NPC memory state
- Reputation state
- Economy state
- Weather state
- Travel state
- Long-running simulation policies

Explicit non-responsibilities:

- Rules math
- Scene narration
- UI rendering
- Lore article formatting
- Plugin lifecycle
- AI provider implementation

Public interfaces:

- `advanceWorldTime(duration, context)`
- `queryWorldState(query)`
- `updateNpcMemory(npcId, memory)`
- `updateFactionState(factionId, change)`
- `updateReputation(subjectId, change)`
- `generateWorldEvent(context)`
- `resolveTravel(travelRequest)`
- `setLocationState(locationId, change)`

Events produced:

- `WorldTimeAdvanced`
- `NpcMemoryUpdated`
- `FactionStateChanged`
- `ReputationChanged`
- `WeatherChanged`
- `EconomyChanged`
- `TravelResolved`
- `LocationStateChanged`
- `WorldEventGenerated`

Events consumed:

- `SessionEnded`
- `SceneClosed`
- `PlayerIntentRouted`
- `NpcActivated`
- `QuestUpdated`
- `ItemTransferred`
- `CombatActionResolved`
- `LoreEntryCreated`

Dependencies:

- Runtime Engine
- Campaign data model
- AI capabilities for summarization or simulation where available
- Rules Engine when simulation requires mechanics

Extension points:

- Simulation policies
- Faction models
- Economy models
- Weather models
- Travel systems
- NPC memory strategies
- Setting-specific world modules

## Presentation Engine

Responsibilities:

- Render player, GM, and creator experiences.
- Handle maps, tokens, portraits, journals, fog of war, animation, music, ambience, voice, and input surfaces.
- Translate user interactions into intents and presentation events.

Explicit ownership:

- Visual layout
- Map display
- Token display
- Fog of war display
- Audio playback
- Voice playback
- Interaction capture
- Mode-specific UI behavior

Explicit non-responsibilities:

- Event store implementation
- Rules resolution
- World simulation
- AI decision-making
- Permanent campaign truth outside projections
- Plugin security policy

Public interfaces:

- `renderMode(mode, context)`
- `renderScene(sceneProjection)`
- `renderMap(mapState)`
- `renderCharacterSheet(characterId)`
- `showHandout(handoutId)`
- `playAudio(audioRequest)`
- `speakVoice(voiceRequest)`
- `captureInteraction(interaction)`

Events produced:

- `PresentationModeChanged`
- `MapRendered`
- `TokenMovedByUser`
- `HandoutViewed`
- `JournalViewed`
- `AudioStarted`
- `AudioStopped`
- `VoicePlaybackCompleted`
- `PresentationInteractionReceived`

Events consumed:

- `SceneOpened`
- `SceneClosed`
- `CharacterUpdated`
- `InventoryChanged`
- `ConditionApplied`
- `LocationStateChanged`
- `LoreEntryCreated`
- `AssetRegistered`

Dependencies:

- Runtime Engine projections
- Asset registry
- Mode definitions
- Accessibility settings
- Voice and audio capability adapters

Extension points:

- UI surfaces
- Map renderers
- Token systems
- Theme packs
- Audio providers
- Voice providers
- Accessibility adapters

## Lore Engine

Responsibilities:

- Turn event history into coherent campaign knowledge.
- Maintain encyclopedia entries, quest journal, timelines, relationship graphs, organizations, discovered locations, and summaries.
- Support search and retrieval for players, GMs, the Campaign Director, and AI context assembly.

Explicit ownership:

- Lore entries
- Quest journal
- Timeline projections
- Relationship graph
- Organization records
- Discovered location records
- Search indexes
- Lore summaries

Explicit non-responsibilities:

- Creating canonical events that did not happen
- Resolving rules
- Directing scenes
- World simulation authority
- UI layout
- Plugin lifecycle

Public interfaces:

- `createLoreEntry(entryRequest)`
- `updateLoreEntry(entryId, change)`
- `summarizeSession(sessionId)`
- `buildTimeline(scope)`
- `queryLore(query)`
- `linkEntities(sourceId, targetId, relationship)`
- `generateQuestSummary(questId)`
- `provideContext(scope, budget)`

Events produced:

- `LoreEntryCreated`
- `LoreEntryUpdated`
- `SessionSummarized`
- `TimelineUpdated`
- `RelationshipLinked`
- `QuestSummaryUpdated`
- `LoreIndexRebuilt`

Events consumed:

- `SessionEnded`
- `SceneClosed`
- `PlayerIntentRouted`
- `NpcMemoryUpdated`
- `WorldEventGenerated`
- `QuestUpdated`
- `LocationStateChanged`
- `FactionStateChanged`

Dependencies:

- Runtime Engine
- AI capability registry
- Data model entities
- Search index storage

Extension points:

- Lore classifiers
- Summarizers
- Search providers
- Relationship extractors
- Timeline builders
- Setting-specific encyclopedia templates

## Creator Engine

Responsibilities:

- Support Studio Mode authoring and extension workflows.
- Provide tools for campaigns, rulesets, maps, assets, AI personalities, voice packs, plugins, test scenarios, packaging, and publishing.
- Validate created content against runtime and plugin contracts.

Explicit ownership:

- Campaign authoring workflows
- Ruleset authoring workflows
- Asset import workflows
- AI personality authoring
- Plugin project scaffolding
- Package validation
- Publishing preparation
- Test scenario authoring

Explicit non-responsibilities:

- Running active play
- Resolving mechanics at runtime
- Owning campaign event truth
- Owning provider-specific AI implementations
- Replacing source control

Public interfaces:

- `createCampaignTemplate(templateRequest)`
- `validateCampaignPackage(packageId)`
- `createRulesetProject(request)`
- `importAsset(assetRequest)`
- `createAiPersonality(request)`
- `scaffoldPlugin(pluginRequest)`
- `runTestScenario(scenarioId)`
- `buildPublishPackage(packageRequest)`

Events produced:

- `CampaignTemplateCreated`
- `CampaignPackageValidated`
- `RulesetProjectCreated`
- `AssetImported`
- `AiPersonalityCreated`
- `PluginProjectScaffolded`
- `TestScenarioRun`
- `PublishPackageBuilt`

Events consumed:

- `PluginRegistered`
- `AssetRegistered`
- `RulesetRegistered`
- `CampaignLoaded`
- `LoreEntryCreated`
- `ValidationIssueRaised`

Dependencies:

- Runtime Engine
- Plugin SDK
- Asset registry
- Data model schemas
- Validation tools

Extension points:

- Authoring tool plugins
- Importers
- Validators
- Package builders
- Marketplace adapters
- Test harnesses
