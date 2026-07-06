import { sampleCampaign } from "../data/sampleCampaign.ts";
import type { CampaignPackage } from "../types/index.ts";

export function validateCampaignPackage(campaign: CampaignPackage): CampaignPackage {
  if (!campaign.id || !campaign.title || !campaign.startingSceneId) {
    throw new Error("Campaign package is missing required metadata.");
  }

  if (!campaign.characters.length) {
    throw new Error("Campaign package must include at least one character.");
  }

  const sceneIds = new Set(campaign.scenes.map((scene) => scene.id));
  if (!sceneIds.has(campaign.startingSceneId)) {
    throw new Error(`Starting scene "${campaign.startingSceneId}" does not exist.`);
  }

  for (const scene of campaign.scenes) {
    for (const action of scene.actions) {
      if (action.nextSceneId && !sceneIds.has(action.nextSceneId)) {
        throw new Error(`Action "${action.id}" points to missing scene "${action.nextSceneId}".`);
      }
    }
  }

  return campaign;
}

export function loadBundledCampaign(): CampaignPackage {
  return validateCampaignPackage(sampleCampaign);
}
