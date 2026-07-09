# Atlas Feature Status

| Area | Status | Notes |
| --- | --- | --- |
| Local-first PWA shell | Implemented | Static browser app with local campaign sample. |
| Campaign data types | Implemented | Character, NPC, location, encounter, quest, scene, and state types exist. |
| Command Processor | Implemented | FEAT-003A complete and reviewed. |
| Event Store | Implemented | FEAT-003B complete and reviewed. |
| Replay Engine | Implemented | FEAT-003C first slice complete: full replay from provided event arrays, sequence validation, projection boundary application, and explicit snapshot deferral. |
| Projection Manager | Draft | Contract exists; implementation pending. |
| Snapshot Manager | Draft | Contract exists; implementation pending. |
| Save Manager | Early MVP | Current localStorage save manager predates runtime event sourcing. |
| Domain engines | Not started | Story, World, Combat, Quest, Inventory, NPC Memory, and Relationship engines are future work. |
| AI Adapter | Not started | Optional enhancement only; not required for core play. |

## TODO

- Reconcile the early localStorage save manager with the event-sourced runtime Save Manager design.
