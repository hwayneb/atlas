# ADR-0001: Repository as Authoritative Source

Status: Accepted

Date: 2026-07-11

## Context

Atlas design work spans ChatGPT conversations, Codex implementation threads, local devices, and the shared repository. Conversation sync and local app context can be inconsistent across devices. Long-lived product memory must be durable, reviewable, and available to Wayne, Christian, Codex, and future contributors.

## Decision

The Atlas repository is the authoritative source for product vision, architecture, roadmap, decision history, feature status, and implementation guidance.

Important decisions must be captured in version-controlled documents instead of living only in chat history. Chat and Codex conversations may be used for exploration, design review, implementation, and review, but durable project knowledge belongs in the repository.

## Consequences

- Architecture and product documents must be updated when major decisions are made.
- Contributors should consult repository docs before relying on conversation memory.
- Device or app sync issues should not block project continuity.
- The decision log acts as an index into ADRs and a concise chronological summary.

## Related Documents

- [../../PRODUCT-VISION.md](../../PRODUCT-VISION.md)
- [../../ARCHITECTURE.md](../../ARCHITECTURE.md)
- [../../ARCHITECTURAL-PRINCIPLES.md](../../ARCHITECTURAL-PRINCIPLES.md)
- [../../DECISION-LOG.md](../../DECISION-LOG.md)
