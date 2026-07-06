import type { CampaignPackage, GameState, JournalEntry, SceneAction } from "../types/index.ts";

export function createInitialGameState(campaign: CampaignPackage): GameState {
  return {
    campaignId: campaign.id,
    activeCharacterId: campaign.characters[0].id,
    currentSceneId: campaign.startingSceneId,
    journal: [
      createJournalEntry(`Started campaign: ${campaign.title}.`)
    ],
    completedActionIds: [],
    updatedAt: new Date().toISOString()
  };
}

export function getCurrentScene(campaign: CampaignPackage, state: GameState) {
  const scene = campaign.scenes.find((candidate) => candidate.id === state.currentSceneId);
  if (!scene) {
    throw new Error(`Current scene "${state.currentSceneId}" was not found in campaign.`);
  }
  return scene;
}

export function getActiveCharacter(campaign: CampaignPackage, state: GameState) {
  const character = campaign.characters.find((candidate) => candidate.id === state.activeCharacterId);
  if (!character) {
    throw new Error(`Active character "${state.activeCharacterId}" was not found in campaign.`);
  }
  return character;
}

export function appendJournal(state: GameState, text: string): GameState {
  return {
    ...state,
    journal: [...state.journal, createJournalEntry(text)],
    updatedAt: new Date().toISOString()
  };
}

export function applyAction(campaign: CampaignPackage, state: GameState, actionId: string): GameState {
  const scene = getCurrentScene(campaign, state);
  const action = scene.actions.find((candidate) => candidate.id === actionId);
  if (!action) {
    throw new Error(`Action "${actionId}" is not available in the current scene.`);
  }

  const nextSceneId = action.nextSceneId ?? state.currentSceneId;
  const nextState: GameState = {
    ...state,
    currentSceneId: nextSceneId,
    completedActionIds: state.completedActionIds.includes(action.id)
      ? state.completedActionIds
      : [...state.completedActionIds, action.id],
    updatedAt: new Date().toISOString()
  };

  return appendJournal(nextState, journalTextForAction(action));
}

function createJournalEntry(text: string): JournalEntry {
  return {
    id: cryptoId(),
    timestamp: new Date().toISOString(),
    text
  };
}

function journalTextForAction(action: SceneAction): string {
  return action.journalEntry ? `${action.label}: ${action.journalEntry}` : action.resultText;
}

function cryptoId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `entry-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
