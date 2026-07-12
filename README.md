# Atlas

Atlas is an AI-native tabletop RPG platform for cinematic, persistent, offline-first roleplaying. The long-term architecture treats Atlas as a tabletop operating system: campaigns are local, portable, event-sourced worlds, and rules systems, AI providers, content, presentation layers, and creator tools are replaceable through stable engine boundaries.

Core play must remain offline-first. Cloud AI and online services may enhance Atlas, but they must never be required for core play, save restoration, replay, rules, campaign progression, or local ownership of campaign data.

## Hard Boundaries

- No required runtime network calls for core play
- No required cloud APIs
- No required login or authentication
- All campaign data is user-owned and portable
- Campaign state persists locally
- Usable as a local-first web app/PWA
- AI providers are replaceable and optional
- Rules engines are independent from the Campaign Director

## Architecture

Start here:

- [Product Vision](PRODUCT-VISION.md)
- [Atlas Manifesto](ATLAS-MANIFESTO.md)
- [Project Blueprint](PROJECT-BLUEPRINT.md)
- [Architecture](ARCHITECTURE.md)
- [Architectural Principles](ARCHITECTURAL-PRINCIPLES.md)
- [Roadmap](ROADMAP.md)
- [Feature Status](FEATURE-STATUS.md)
- [Decision Log](DECISION-LOG.md)

Architecture v1.0 decisions are tracked in `docs/ARCHITECTURE-DECISION-RECORDS/` and indexed from [DECISION-LOG.md](DECISION-LOG.md).

Legacy runtime ADRs from the early offline-first D&D engine phase remain in `docs/adr/` for historical context and implementation traceability. They should not be treated as the current Architecture v1.0 decision index.

Detailed architecture references:

- [Engine Contracts](docs/ENGINE-CONTRACTS.md)
- [Interface Specification](docs/INTERFACE-SPECIFICATION.md)
- [Data Model](docs/DATA-MODEL.md)
- [Plugin SDK](docs/PLUGIN-SDK.md)
- [AI Capability Catalog](docs/AI-CAPABILITY-CATALOG.md)
- [Runtime State Machine](docs/RUNTIME-STATE-MACHINE.md)

## Run Locally

Open `index.html` directly, or serve the folder with any static file server:

```sh
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

The browser app uses the embedded local sample campaign from `src/data/sampleCampaign.ts`. The portable JSON copy lives at `public/sample-campaign/campaign.json` for future import/export flows.

## Tests

The tests use Node's built-in test runner and do not require network access:

```sh
node --test --experimental-strip-types tests/*.test.ts
```

If Node is available on your path, `npm test` runs the same command.
