export type AbilityScores = {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
};

export type HitPoints = {
  current: number;
  max: number;
};

export type Character = {
  id: string;
  name: string;
  ancestry: string;
  className: string;
  level: number;
  armorClass: number;
  hitPoints: HitPoints;
  abilities: AbilityScores;
  inventory: string[];
  notes?: string;
};

export type NPC = {
  id: string;
  name: string;
  role: string;
  locationId: string;
  disposition: "friendly" | "neutral" | "wary" | "hostile";
  description: string;
};

export type Location = {
  id: string;
  name: string;
  description: string;
  sceneIds: string[];
};

export type Encounter = {
  id: string;
  name: string;
  locationId: string;
  difficulty: "easy" | "medium" | "hard" | "deadly";
  description: string;
  creatures: string[];
  reward?: string;
};

export type QuestObjective = {
  id: string;
  text: string;
  complete: boolean;
};

export type Quest = {
  id: string;
  title: string;
  status: "inactive" | "active" | "complete" | "failed";
  description: string;
  objectives: QuestObjective[];
};

export type SceneAction = {
  id: string;
  label: string;
  resultText: string;
  nextSceneId?: string;
  journalEntry?: string;
};

export type Scene = {
  id: string;
  locationId: string;
  title: string;
  text: string;
  actions: SceneAction[];
};

export type CampaignPackage = {
  id: string;
  title: string;
  version: string;
  startingSceneId: string;
  characters: Character[];
  npcs: NPC[];
  locations: Location[];
  encounters: Encounter[];
  quests: Quest[];
  scenes: Scene[];
};

export type JournalEntry = {
  id: string;
  timestamp: string;
  text: string;
};

export type GameState = {
  campaignId: string;
  activeCharacterId: string;
  currentSceneId: string;
  journal: JournalEntry[];
  completedActionIds: string[];
  updatedAt: string;
};
