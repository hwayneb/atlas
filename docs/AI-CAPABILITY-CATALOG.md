# Atlas AI Capability Catalog

Atlas is AI-agnostic. The platform should request capabilities rather than bind product behavior to one provider, model, cloud service, or prompt format.

This catalog defines provider-independent AI capabilities. Local models, OpenAI, Anthropic, Google, and future providers should be interchangeable behind these interfaces when they satisfy the capability contract.

## Capability Contract

Every AI capability should define:

- Capability name
- Purpose
- Input schema
- Output schema
- Required context
- Optional context
- Safety and agency constraints
- Offline availability
- Determinism expectations where relevant
- Events produced when the output is accepted

AI outputs are proposals until an engine accepts them through an approved interface and records the result as an event.

## Player Agency Rule

Player agency always overrides AI convenience. AI may propose, narrate, react, remember, summarize, and warn. AI must not choose for a player, override a player decision, or hide meaningful choices.

## Core Capabilities

### InterpretPlayerIntent

Purpose: Translate player text, voice, or UI input into structured intent candidates.

Used by: Campaign Director

Typical outputs:

- Intent type
- Target entities
- Confidence
- Ambiguities
- Suggested follow-up questions

Agency constraint: Ambiguous or high-impact decisions should be clarified with the player.

### GenerateDialogue

Purpose: Generate NPC dialogue consistent with character, memory, scene, and tone.

Used by: Campaign Director, World Engine

Typical outputs:

- Dialogue text
- Emotional tone
- Intent
- Memory references used
- Continuity notes

Agency constraint: Dialogue must not force player actions or outcomes.

### GenerateNarration

Purpose: Produce scene narration, descriptions, transitions, and sensory details.

Used by: Campaign Director, Presentation Engine

Typical outputs:

- Narration text
- Mood
- Suggested ambience
- Entity references

Agency constraint: Narration describes and frames; it does not decide player choices.

### GenerateEncounter

Purpose: Propose an encounter appropriate to scene, ruleset, pacing, party state, and world context.

Used by: Campaign Director, Rules Engine, World Engine

Typical outputs:

- Encounter premise
- Participants
- Objectives
- Environmental factors
- Balance notes
- Rules requirements

Agency constraint: Generated encounters should preserve player options for avoidance, negotiation, or creative resolution where the ruleset allows.

### MaintainNPCMemory

Purpose: Extract and update NPC memories from events and conversations.

Used by: World Engine, Lore Engine

Typical outputs:

- Memory entries
- Confidence
- Source events
- Relationship implications
- Future behavior hooks

Agency constraint: Memories should reflect recorded events, not invent canonical history.

### GenerateLoreEntry

Purpose: Convert events into encyclopedia, journal, timeline, relationship, or location entries.

Used by: Lore Engine

Typical outputs:

- Entry title
- Entry type
- Summary
- Related entities
- Source events
- Visibility level

Agency constraint: Lore must distinguish known facts from rumors, guesses, or AI interpretation.

### SummarizeSession

Purpose: Summarize a play session for players, GMs, lore, and future AI context.

Used by: Lore Engine, Campaign Director

Typical outputs:

- Session summary
- Key decisions
- Consequences
- Open threads
- Important quotes or facts
- Source event range

Agency constraint: Summaries should preserve player decisions accurately.

### SummarizeHistory

Purpose: Compress long campaign history into context that fits a model or UI budget.

Used by: Campaign Director, Lore Engine

Typical outputs:

- Condensed history
- Key entities
- Open conflicts
- Recent changes
- Omitted context notes

Agency constraint: Compression must not erase important player choices when they are relevant.

### EvaluateContinuity

Purpose: Detect contradictions, unresolved conflicts, missing context, or likely lore errors.

Used by: Campaign Director, Lore Engine, Director Mode

Typical outputs:

- Warning type
- Severity
- Affected entities
- Source evidence
- Suggested fix or clarification

Agency constraint: Continuity warnings inform the GM or Director; they do not silently rewrite campaign state.

### ProposeStoryPacing

Purpose: Suggest pacing adjustments based on tension, scene length, player engagement, unresolved goals, and genre.

Used by: Campaign Director, Director Mode

Typical outputs:

- Current pacing assessment
- Suggested next beat
- Risks
- Alternatives

Agency constraint: Pacing suggestions should be optional and transparent to the GM or Director.

### GenerateAmbientDescription

Purpose: Provide short environmental details for locations, travel, weather, and mood.

Used by: Campaign Director, Presentation Engine, World Engine

Typical outputs:

- Description
- Suggested audio or visual mood
- Location references

Agency constraint: Descriptions should not introduce major facts without event-backed acceptance.

### VoiceNarration

Purpose: Convert approved narration or dialogue into voice output.

Used by: Presentation Engine

Typical outputs:

- Audio stream or asset reference
- Voice metadata
- Timing markers

Agency constraint: Voice output speaks approved content; it does not create canonical story state.

### GenerateQuestUpdate

Purpose: Propose quest journal changes from events.

Used by: Lore Engine, Campaign Director

Typical outputs:

- Quest status
- Objective changes
- Related entities
- Summary text
- Source events

Agency constraint: Quest updates must be traceable to player actions, world events, or GM decisions.

### SuggestEncounterAdjustment

Purpose: Recommend adjustments for encounter balance, stakes, pacing, or clarity.

Used by: Rules Engine, Campaign Director, Director Mode

Typical outputs:

- Balance assessment
- Suggested adjustments
- Rules implications
- Narrative implications

Agency constraint: Suggestions must not secretly change difficulty or outcomes.

### GenerateNPCObjective

Purpose: Propose short-term and long-term NPC objectives based on memory, faction, personality, and world state.

Used by: World Engine, Campaign Director

Typical outputs:

- Objective
- Motivation
- Time horizon
- Trigger conditions
- Risks

Agency constraint: NPC objectives may influence NPC behavior but must not negate established player consequences.

## Provider Requirements

AI providers should declare:

- Supported capabilities
- Offline availability
- Context window limits
- Structured output support
- Streaming support
- Voice support
- Data retention behavior
- Cost or resource profile
- Safety limitations

Atlas should choose providers by capability fit, user preference, offline requirements, and campaign policy.
