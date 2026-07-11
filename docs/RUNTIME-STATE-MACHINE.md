# Atlas Runtime State Machine

This document describes the campaign, session, scene, turn, encounter, save, replay, and resume lifecycle. It defines how Atlas moves from durable campaign data into active play and back again.

## Lifecycle Overview

```text
Campaign Created or Loaded
        |
        v
Session Prepared
        |
        v
Session Active
        |
        v
Scene Opened
        |
        v
Player Intent Received
        |
        v
Intent Routed
        |
        +--> Rules Resolution
        +--> World Update
        +--> AI Capability Request
        +--> Presentation Update
        +--> Lore Update
        |
        v
Scene Continues or Resolves
        |
        +--> Next Scene
        +--> Encounter Flow
        +--> Session End
        |
        v
Campaign Saved
        |
        v
Replay or Resume
```

## Campaign States

### NotLoaded

No campaign is active.

Allowed transitions:

- `CreateCampaign` to `CampaignLoaded`
- `LoadCampaign` to `CampaignLoaded`

### CampaignLoaded

Campaign metadata, plugin dependencies, projections, and recent event cursor are available.

Allowed transitions:

- `PrepareSession` to `SessionPrepared`
- `ReplayCampaign` to `Replaying`
- `SaveCampaign` to `CampaignSaved`
- `CloseCampaign` to `NotLoaded`

### CampaignSaved

Campaign events, snapshots, projections, and metadata have been persisted locally.

Allowed transitions:

- `ResumeCampaign` to `CampaignLoaded`
- `CloseCampaign` to `NotLoaded`

## Session States

### SessionPrepared

The Campaign Director has assembled participants, active plugins, context, and initial presentation requirements.

Allowed transitions:

- `StartSession` to `SessionActive`
- `CancelSession` to `CampaignLoaded`

### SessionActive

Active play is underway.

Allowed transitions:

- `OpenScene` to `SceneActive`
- `PauseSession` to `SessionPaused`
- `EndSession` to `SessionEnding`

### SessionPaused

The session is temporarily paused without closing the campaign.

Allowed transitions:

- `ResumeSession` to `SessionActive`
- `EndSession` to `SessionEnding`

### SessionEnding

Atlas records final events, summarizes the session, updates lore, updates world state, and prepares save data.

Allowed transitions:

- `CompleteSessionEnd` to `CampaignLoaded`
- `SaveCampaign` to `CampaignSaved`

## Scene States

### SceneActive

A scene is open. It may be exploration, dialogue, travel, downtime, combat, or another ruleset-defined scene type.

Allowed transitions:

- `ReceivePlayerIntent` to `IntentPending`
- `StartEncounter` to `EncounterActive`
- `CloseScene` to `SceneResolved`
- `PauseSession` to `SessionPaused`

### IntentPending

Player input has been captured and is awaiting interpretation or routing.

Allowed transitions:

- `InterpretIntent` to `IntentRouted`
- `AskClarifyingQuestion` to `SceneActive`

### IntentRouted

The Campaign Director has routed intent to one or more engines.

Allowed transitions:

- `ResolveRules` to `RulesResolving`
- `UpdateWorld` to `WorldUpdating`
- `RequestAI` to `AIResolving`
- `UpdatePresentation` to `PresentationUpdating`
- `UpdateLore` to `LoreUpdating`
- `CompleteIntent` to `SceneActive`

### SceneResolved

The scene outcome has been recorded.

Allowed transitions:

- `OpenNextScene` to `SceneActive`
- `EndSession` to `SessionEnding`

## Encounter And Turn States

### EncounterActive

An encounter is active. It may be combat, negotiation, chase, hazard, or another structured conflict.

Allowed transitions:

- `StartInitiative` to `TurnFlowActive`
- `ResolveEncounter` to `EncounterResolved`
- `CloseScene` to `SceneResolved`

### TurnFlowActive

Atlas is coordinating actor turns. Rules determine mechanics; the Campaign Director coordinates flow.

Allowed transitions:

- `BeginPlayerTurn` to `PlayerTurn`
- `BeginNPCTurn` to `NPCTurn`
- `AdvanceTurn` to `TurnFlowActive`
- `EndInitiative` to `EncounterActive`

### PlayerTurn

A player-controlled actor can choose an action.

Allowed transitions:

- `ReceivePlayerIntent` to `IntentPending`
- `EndTurn` to `TurnFlowActive`

### NPCTurn

An NPC is activated. The Campaign Director may request world state, rules capabilities, and AI dialogue or action suggestions.

Allowed transitions:

- `RequestNPCAction` to `AIResolving`
- `ResolveNPCAction` to `RulesResolving`
- `EndTurn` to `TurnFlowActive`

### EncounterResolved

The encounter outcome has been recorded.

Allowed transitions:

- `ReturnToScene` to `SceneActive`
- `CloseScene` to `SceneResolved`

## Resolution States

### RulesResolving

The Rules Engine resolves mechanics.

Allowed transitions:

- `RulesResolved` to `IntentRouted`
- `RulesResolutionFailed` to `SceneActive`

### WorldUpdating

The World Engine updates persistent world state.

Allowed transitions:

- `WorldUpdated` to `IntentRouted`
- `WorldUpdateDeferred` to `SceneActive`

### AIResolving

Atlas requests a provider-agnostic AI capability.

Allowed transitions:

- `AICapabilityResolved` to `IntentRouted`
- `AIClarificationRequired` to `SceneActive`
- `AIFailed` to `SceneActive`

### PresentationUpdating

The Presentation Engine updates visible or audible state.

Allowed transitions:

- `PresentationUpdated` to `IntentRouted`

### LoreUpdating

The Lore Engine creates or updates derived campaign knowledge.

Allowed transitions:

- `LoreUpdated` to `IntentRouted`
- `LoreUpdateDeferred` to `SceneActive`

## Save, Replay, And Resume

### Saving

The Runtime Engine persists events, plugin metadata, projections, snapshots, assets, and campaign package metadata.

Required checks:

- Event cursor is known.
- Plugin versions are recorded.
- Snapshot schema versions are recorded.
- Pending migrations are resolved or recorded.

### Replaying

The Runtime Engine replays events from a cursor or from the beginning.

Allowed transitions:

- `ReplayCompleted` to `CampaignLoaded`
- `ReplayFailed` to `CampaignLoaded` with diagnostics

### Resuming

Atlas loads the campaign, validates plugin dependencies, restores snapshots where valid, rebuilds projections where needed, and returns to `CampaignLoaded` or `SessionPrepared`.

## Required Invariants

- Every accepted state transition produces a durable event when it changes campaign truth.
- Projections must be rebuildable from events.
- Snapshots must record the event cursor they summarize.
- AI output is not campaign truth until accepted by an engine and recorded.
- Rules resolution belongs to the Rules Engine.
- Scene and session orchestration belong to the Campaign Director.
- Player choice cannot be replaced by AI automation.
