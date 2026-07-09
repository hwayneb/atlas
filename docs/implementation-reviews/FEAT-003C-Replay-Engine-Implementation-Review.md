# FEAT-003C - Replay Engine Implementation Review

## Summary

The FEAT-003C implementation adds the first Replay Engine runtime slice. `DefaultReplayEngine` performs full replay from a provided array of persisted `CampaignEvent` records, validates campaign and sequence integrity, applies events through a projection manager boundary, stops on the first unrecoverable failure, and returns structured diagnostics with failing sequence and event id when available.

Snapshot-aware replay remains explicitly deferred for this slice.

## Pass/Fail Status

Pass.

No blocking findings were found for the FEAT-003C first-slice scope.

## Findings

### Replay Correctness

Pass.

Replay accepts persisted campaign events, resets projections for full replay, applies events in sequence order, reports the latest successfully applied sequence, and returns rebuilt projections.

### Event Boundary

Pass.

Replay consumes `CampaignEvent` records only. Inputs without Event Store assigned ids or valid sequences fail before projection reset or application.

### Sequence Integrity

Pass.

Replay fails on missing sequence, duplicate sequence, sequence gaps, out-of-order input, and campaign id mismatch. Event sequence determines order; timestamps do not affect replay behavior.

### Projection Boundary

Pass.

Replay delegates projection updates through the replay projection manager boundary. It does not own gameplay projection logic.

### Failure Handling

Pass.

Projection reset, application, and projection read failures are returned as structured replay failures instead of uncaught errors. Projection application failure stops replay immediately and reports `replay.projection_apply_failed`, latest successfully applied sequence, failing event sequence, and failing event id.

### Schema Validation

Pass.

When an event schema registry is provided, replay validates event type, payload schema version, metadata version, and payload rules before projection reset or application.

### Snapshot Handling

Pass.

Snapshot input is rejected with `replay.snapshot_deferred`. Snapshot Manager integration is intentionally not implemented.

### Offline-First Compliance

Pass.

The implementation introduces no backend, runtime networking, cloud APIs, login, authentication, AI calls, or external services.

### Architectural Violations

None found.

Replay does not execute commands, append events, mutate the Event Store, assign ids, assign sequences, execute domain engines, generate randomness, call AI, or use wall-clock time to affect output.

### Test Coverage

Pass.

Tests cover empty replay, single-event replay, ordered replay, sequence-based projection application, timestamp ordering ignored, missing sequence, duplicate sequence, sequence gap, unsupported event type with schema registry, projection reset/application/read failure, failing sequence/id diagnostics, persisted-event-only input, no event mutation, no command execution, no random generation, deterministic identical-input output, and explicit snapshot deferral.

## Required Fixes

None.

## Recommended Fixes

1. Promote the replay projection boundary into the canonical runtime contract when the Projection Manager implementation begins.
2. Add migration-aware unknown event handling only after an approved event migration design exists.
3. Add snapshot restore and replay-from-snapshot tests when Snapshot Manager is implemented.
4. Add integration tests that replay events read directly from the Event Store once Projection Manager has concrete reducers.

## Test Results

Command run:

```text
/Users/wayne/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test --experimental-strip-types tests/*.test.ts
```

Result:

```text
tests 54
pass 54
fail 0
cancelled 0
skipped 0
todo 0
```

## Offline/Network Scan Results

Command run:

```text
rg -n "fetch\(|XMLHttpRequest|WebSocket|navigator\.sendBeacon|https?://|cloud|auth|login" src tests package.json public
```

Result:

```text
src/runtime/eventStore.ts:280:      message: "Event candidates must not include authoritative event ids.",
src/runtime/eventStore.ts:289:      message: "Event candidates must not include authoritative sequence values.",
```

The matches are diagnostic strings using the word `authoritative`, not networking, cloud, login, or authentication dependencies.

## Final Recommendation

Approve FEAT-003C first slice.

The implementation satisfies the approved Replay Engine design for full deterministic replay from provided event arrays. Snapshot-aware replay, concrete projection reducers, save/restore integration, and migrations should remain future slices.
