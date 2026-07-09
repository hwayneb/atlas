# Atlas Project Blueprint

Atlas is an offline-first solo D&D campaign engine designed for iPad/PWA play.

The project goal is to create a local-first campaign runtime where the player owns campaign packages, save files, and event history. Cloud AI may become an optional enhancement later, but it must never be required for core play, save restoration, replay, rules, or campaign progression.

## Product Principles

- Offline-first
- Local ownership of game state
- Event-sourced campaign history
- Deterministic replay
- Campaign portability
- Save anywhere
- Moddable campaigns
- Optional AI enhancement layer

## Current Shape

Atlas currently includes:

- A static local-first web/PWA shell
- A sample campaign package
- Campaign, character, NPC, location, encounter, quest, and game state types
- Command Processor runtime slice
- Append-only Event Store runtime slice
- Design reviews and ADRs for the runtime foundation

## TODO

- Confirm final end-user product naming for campaign packages and save file extensions.
- Define the first playable vertical slice that uses the runtime event log end to end.
