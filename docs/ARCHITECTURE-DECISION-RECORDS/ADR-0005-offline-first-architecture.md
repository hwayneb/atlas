# ADR-0005: Offline-First Architecture

Status: Accepted

Date: 2026-07-11

## Context

Atlas should support Mac and iPad play without requiring cloud services, hosted accounts, remote AI providers, or a continuous internet connection. The product vision emphasizes user-owned campaigns, portable save files, local-first operation, and durable access to play.

## Decision

Atlas is offline-first.

Core campaign creation, loading, play, event storage, replay, save/load, plugin use, and local campaign ownership must function without network access. Online services may enhance Atlas but must not be required for the core campaign loop.

## Consequences

- Remote AI, sync, marketplace, and hosted collaboration are optional enhancements.
- Save files and campaign packages must remain user-owned and portable.
- Engine contracts must avoid mandatory cloud dependencies.
- Plugin behavior must respect offline operation.
- Local AI providers and local fallbacks should remain first-class design targets.

## Related Documents

- [../../PRODUCT-VISION.md](../../PRODUCT-VISION.md)
- [../../ARCHITECTURAL-PRINCIPLES.md](../../ARCHITECTURAL-PRINCIPLES.md)
- [../PLUGIN-SDK.md](../PLUGIN-SDK.md)
- [../AI-CAPABILITY-CATALOG.md](../AI-CAPABILITY-CATALOG.md)
