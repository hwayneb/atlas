# Hybrid D&D Solo Engine MVP

Offline-first solo D&D campaign engine designed for local iPad/PWA play.

Cloud AI is an enhancement, not a dependency.

## Hard Boundaries

- No runtime network calls
- No cloud APIs
- No login or authentication
- All campaign data is local
- Campaign state persists locally
- Usable as a local-first web app/PWA

## Architecture

The long-term module map and project principles live in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

Architecture decisions are tracked in `docs/adr/`:

- [ADR-001: Offline First](docs/adr/ADR-001-Offline-First.md)
- [ADR-002: Event Engine](docs/adr/ADR-002-Event-Engine.md)
- [ADR-003: World Engine](docs/adr/ADR-003-World-Engine.md)
- [ADR-004: AI Adapter](docs/adr/ADR-004-AI-Adapter.md)

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
