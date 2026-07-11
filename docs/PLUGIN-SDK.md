# Atlas Plugin SDK

Atlas is plugin-first. Rules, settings, art, audio, voices, AI personalities, authoring tools, and future extensions should be replaceable without modifying the core runtime.

This document defines the expected plugin model. It should be read with [ENGINE-CONTRACTS.md](ENGINE-CONTRACTS.md), [DATA-MODEL.md](DATA-MODEL.md), and [../ARCHITECTURAL-PRINCIPLES.md](../ARCHITECTURAL-PRINCIPLES.md).

## Plugin Types

Initial plugin categories:

- Ruleset plugins
- Dice plugins
- Character sheet plugins
- Campaign setting plugins
- Map and asset pack plugins
- Audio and voice plugins
- AI personality plugins
- AI provider adapter plugins
- Presentation surface plugins
- Creator tool plugins
- Importer and exporter plugins

## Lifecycle

Plugins move through a predictable lifecycle:

1. Discovered: Atlas finds the plugin manifest.
2. Validated: Atlas checks schema, compatibility, permissions, and signatures where available.
3. Registered: Atlas adds the plugin to the local registry.
4. Enabled: The plugin becomes available to campaigns or authoring tools.
5. Initialized: The plugin receives runtime context through approved interfaces.
6. Active: The plugin can respond to events and expose capabilities.
7. Suspended: The plugin is temporarily unavailable without removing its data.
8. Disabled: The plugin is no longer active for new operations.
9. Migrated: The plugin updates saved data through declared migration steps.
10. Removed: The plugin is uninstalled while preserving campaign portability rules.

Plugins must tolerate being disabled, upgraded, or unavailable. Campaigns should record enough metadata to explain missing plugin dependencies.

## Registration And Discovery

Each plugin must provide a manifest with:

- Plugin identifier
- Display name
- Version
- Plugin type
- Author or publisher
- Supported Atlas API version range
- Required permissions
- Capabilities exposed
- Events consumed
- Events produced
- Data schemas owned
- Assets included
- Migration scripts or declarations
- Offline support status

Discovery sources may include:

- Local plugin folders
- Campaign package dependencies
- User-installed content packs
- Development workspace plugins
- Future marketplace packages

Registration must not execute arbitrary plugin behavior until the manifest has been validated.

## Versioning

Plugins should use semantic versioning:

- Patch versions preserve behavior and data compatibility.
- Minor versions add compatible capabilities.
- Major versions may require migration or user confirmation.

Atlas should store plugin version metadata in campaign packages and save files. If a campaign is opened without a required plugin version, Atlas should clearly identify the missing or incompatible dependency.

## Compatibility

Compatibility checks should include:

- Atlas runtime API version
- Engine contract version
- Event schema version
- Data model schema version
- Required plugin dependencies
- Required AI capabilities
- Required presentation capabilities
- Offline support requirements

Core campaign play must remain offline-first. A plugin that requires network access may be allowed only as an optional enhancement and must declare that requirement.

## Permissions And Security Boundaries

Plugins must request permissions explicitly. Examples:

- Read campaign metadata
- Read campaign events
- Append approved event types
- Read or write plugin-owned data
- Access local assets
- Access microphone
- Access speakers
- Use network
- Use local AI models
- Use external AI providers
- Export campaign data

Plugins must not:

- Directly mutate core state.
- Bypass the event store.
- Access files outside approved package or campaign scopes.
- Call network services without declared permission.
- Hide provider lock-in behind generic capabilities.
- Override player decisions.
- Execute migrations without a recorded migration event.

## Sandboxing Expectations

The Runtime Engine should treat plugins as untrusted until validated. Sandboxing expectations:

- Plugins operate through explicit interfaces.
- File access is scoped.
- Network access is denied by default.
- Event append permissions are limited by plugin type.
- Plugin-owned data is namespaced.
- Long-running plugin work is cancellable.
- Failures are isolated from core campaign state.
- Plugins cannot depend on live cloud services for core offline play.

The exact sandbox implementation may evolve, but the security boundary is architectural from v1.0.

## Packaging

A plugin package should include:

- Manifest
- Runtime code or data files
- Schema definitions
- Assets
- Documentation
- Test fixtures where practical
- Migration declarations
- License metadata
- Integrity metadata where available

Campaign packages may reference plugins by dependency metadata or embed approved content packs when licensing allows.

## Best Practices

Plugin authors should:

- Prefer data-driven configuration over hard-coded assumptions.
- Emit durable events for meaningful state changes.
- Keep rules logic out of the Campaign Director.
- Keep provider-specific behavior behind capability interfaces.
- Design for missing, disabled, or upgraded dependencies.
- Provide migrations for saved data changes.
- Make offline behavior explicit.
- Keep plugin-owned data portable.
- Avoid UI assumptions outside declared presentation surfaces.
- Add validation fixtures for rules, data, and event behavior.

## Minimum Viable Plugin SDK

For the first playable slice, the SDK should support:

- Local discovery
- Manifest validation
- Ruleset registration
- Dice capability registration
- Character schema registration
- Asset pack registration
- AI personality registration
- Basic compatibility checks
- Plugin-enabled campaign metadata

Marketplace, signing, remote distribution, and advanced sandboxing can follow after the local-first plugin model is proven.
