export type ArchitecturePrinciple =
  | "offline-first"
  | "local-state-ownership"
  | "deterministic-engine"
  | "ai-enhancement-layer"
  | "campaign-portability"
  | "save-anywhere"
  | "moddable-campaigns";

export type EngineModule =
  | "engine"
  | "story-engine"
  | "combat-engine"
  | "npc-memory"
  | "relationship-engine"
  | "inventory"
  | "quest-engine"
  | "journal"
  | "campaign-loader"
  | "asset-manager"
  | "ai-adapter";

export type ProjectVision = {
  goal: string;
  aiDependency: "optional-enhancement";
  principles: ArchitecturePrinciple[];
  modules: EngineModule[];
};

export const projectVision: ProjectVision = {
  goal: "Create the best single-player D&D experience that can run completely offline on an iPad.",
  aiDependency: "optional-enhancement",
  principles: [
    "offline-first",
    "local-state-ownership",
    "deterministic-engine",
    "ai-enhancement-layer",
    "campaign-portability",
    "save-anywhere",
    "moddable-campaigns"
  ],
  modules: [
    "engine",
    "story-engine",
    "combat-engine",
    "npc-memory",
    "relationship-engine",
    "inventory",
    "quest-engine",
    "journal",
    "campaign-loader",
    "asset-manager",
    "ai-adapter"
  ]
};
