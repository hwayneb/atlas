import type {
  CampaignEvent,
  ReplayEngine,
  ReplayInput,
  ReplayResult,
  RuntimeDiagnostic
} from "./types.ts";

export class DefaultReplayEngine implements ReplayEngine {
  async replay(input: ReplayInput): Promise<ReplayResult> {
    const validationFailure = validateReplayInput(input);
    if (validationFailure) {
      return validationFailure;
    }

    let latestSequence = input.snapshot?.version ?? 0;
    if (input.snapshot) {
      if (!input.projectionManager.restore) {
        return failure({
          code: "replay.snapshot_restore_unsupported",
          message: "Projection manager does not support snapshot restore.",
          severity: "error",
          source: "ReplayEngine"
        }, latestSequence);
      }

      try {
        await input.projectionManager.restore(input.snapshot.state);
      } catch (error) {
        return failure({
          code: "replay.snapshot_restore_failed",
          message: error instanceof Error ? error.message : "Snapshot restore failed.",
          severity: "error",
          source: "ReplayEngine"
        }, latestSequence);
      }
    } else {
      try {
        await input.projectionManager.reset();
      } catch (error) {
        return failure({
          code: "replay.projection_reset_failed",
          message: error instanceof Error ? error.message : "Projection reset failed.",
          severity: "error",
          source: "ReplayEngine"
        });
      }
    }

    for (const event of input.events) {
      try {
        await input.projectionManager.apply(event);
        latestSequence = event.sequence;
      } catch (error) {
        return failure(
          {
            code: "replay.projection_apply_failed",
            message: error instanceof Error ? error.message : "Projection application failed.",
            severity: "error",
            source: "ReplayEngine",
            sequence: event.sequence,
            eventId: event.id
          },
          latestSequence,
          event
        );
      }
    }

    let projections;
    try {
      projections = input.projectionManager.getCurrent();
    } catch (error) {
      return failure({
        code: "replay.projection_read_failed",
        message: error instanceof Error ? error.message : "Projection read failed.",
        severity: "error",
        source: "ReplayEngine"
      }, latestSequence);
    }

    return {
      ok: true,
      projections,
      latestSequence,
      diagnostics: []
    };
  }
}

function validateReplayInput(input: ReplayInput): ReplayResult | null {
  const seenSequences = new Set<number>();
  const startingSequence = input.snapshot?.version ?? 0;
  let previousSequence = startingSequence;

  for (let index = 0; index < input.events.length; index += 1) {
    const event = input.events[index] as CampaignEvent & { id?: unknown; sequence?: unknown };

    if (typeof event.id !== "string" || !event.id) {
      return failure({
        code: "replay.event_not_persisted",
        message: "Replay input must contain persisted CampaignEvent records with Event Store assigned ids.",
        severity: "error",
        source: "ReplayEngine"
      });
    }

    if (!Number.isInteger(event.sequence)) {
      return failure({
        code: "replay.sequence_missing",
        message: "Replay input event is missing a valid sequence.",
        severity: "error",
        source: "ReplayEngine",
        eventId: event.id
      }, previousSequence, event as CampaignEvent);
    }

    if (event.campaignId !== input.campaignPackage.id) {
      return failure({
        code: "replay.campaign_mismatch",
        message: `Replay event campaign "${event.campaignId}" does not match campaign "${input.campaignPackage.id}".`,
        severity: "error",
        source: "ReplayEngine",
        sequence: event.sequence,
        eventId: event.id
      }, previousSequence, event as CampaignEvent);
    }

    if (seenSequences.has(event.sequence)) {
      return failure({
        code: "replay.duplicate_sequence",
        message: `Replay input contains duplicate sequence ${event.sequence}.`,
        severity: "error",
        source: "ReplayEngine",
        sequence: event.sequence,
        eventId: event.id
      }, previousSequence, event as CampaignEvent);
    }

    if (event.sequence <= previousSequence) {
      return failure({
        code: "replay.out_of_order",
        message: `Replay input is out of order at sequence ${event.sequence}.`,
        severity: "error",
        source: "ReplayEngine",
        sequence: event.sequence,
        eventId: event.id
      }, previousSequence, event as CampaignEvent);
    }

    const expectedSequence = startingSequence + index + 1;
    if (event.sequence !== expectedSequence) {
      return failure({
        code: "replay.sequence_gap",
        message: `Replay expected sequence ${expectedSequence} but found ${event.sequence}.`,
        severity: "error",
        source: "ReplayEngine",
        sequence: event.sequence,
        eventId: event.id
      }, previousSequence, event as CampaignEvent);
    }

    const schemaDiagnostics = input.schemaRegistry?.validate(event as CampaignEvent) ?? [];
    const schemaError = schemaDiagnostics.find((diagnostic) => diagnostic.severity === "error");
    if (schemaError) {
      return failure({
        ...schemaError,
        sequence: event.sequence,
        eventId: event.id
      }, previousSequence, event as CampaignEvent);
    }

    seenSequences.add(event.sequence);
    previousSequence = event.sequence;
  }

  return null;
}

function failure(
  diagnostic: RuntimeDiagnostic,
  latestSequence = 0,
  event?: CampaignEvent
): ReplayResult {
  return {
    ok: false,
    latestSequence,
    diagnostics: [diagnostic],
    failingSequence: event?.sequence ?? diagnostic.sequence,
    failingEventId: event?.id ?? diagnostic.eventId
  };
}
