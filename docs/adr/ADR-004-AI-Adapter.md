# ADR-004: AI Adapter

## Status

Proposed

## Context

The project vision states that cloud AI is an enhancement, not a dependency. The core engine must run completely offline on an iPad with no internet access.

The long-term architecture includes an AI Adapter, but MVP-001 intentionally excludes online AI. Future AI features may help with narration, summaries, NPC dialogue suggestions, encounter flavor, or campaign authoring.

## Decision

AI will be isolated behind an optional adapter boundary.

The AI Adapter may consume local campaign context and propose outputs, but it must not be required for:

- Campaign loading
- Save loading
- Event replay
- Rules resolution
- Story progression
- NPC memory persistence
- Relationship changes
- World state updates

Any AI output that changes the campaign must be accepted through deterministic engine commands that emit normal events.

## Adapter Modes

Supported future modes may include:

- `disabled`: no AI available
- `local`: local model or local rule-based helper
- `cloud`: optional remote provider, only when explicitly configured

The default mode must be `disabled` or `local`, never required cloud.

## Data Boundary

The adapter should receive minimal context:

- Current scene
- Relevant journal excerpts
- Known NPC memory
- Relationship summaries
- World facts
- Player command or prompt

The adapter should return suggestions, not authoritative state mutations.

## Consequences

Positive:

- The engine remains offline-first and deterministic.
- AI can enhance play without owning core game state.
- Cloud features can be added later without architectural lock-in.
- Local-only users retain the full campaign experience.

Tradeoffs:

- AI responses require review or deterministic acceptance steps.
- Cloud convenience features cannot be assumed.
- Prompt/context construction must avoid leaking unnecessary local data.

## Requirements

- No AI adapter may run during core replay.
- No save file may require AI output to restore correctly.
- Cloud AI must be opt-in.
- AI results that affect state must become explicit events after user or engine acceptance.
- The app must remain fully playable when the adapter is disabled.
