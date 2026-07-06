import assert from "node:assert/strict";
import test from "node:test";
import { validateCampaignPackage } from "../src/engine/campaignLoader.ts";
import { rollDice } from "../src/engine/dice.ts";
import { applyAction, appendJournal, createInitialGameState } from "../src/engine/gameEngine.ts";
import { sampleCampaign } from "../src/data/sampleCampaign.ts";
import { SaveManager } from "../src/storage/saveManager.ts";
import { MemoryStorage } from "./memoryStorage.ts";

test("loading a campaign validates required campaign structure", () => {
  const campaign = validateCampaignPackage(sampleCampaign);

  assert.equal(campaign.id, "ember-road");
  assert.equal(campaign.scenes.some((scene) => scene.id === campaign.startingSceneId), true);
});

test("saving state writes serialized game state", () => {
  const storage = new MemoryStorage();
  const manager = new SaveManager(storage, "test-save");
  const state = createInitialGameState(sampleCampaign);

  manager.save(state);

  assert.match(storage.getItem("test-save") ?? "", /"campaignId":"ember-road"/);
});

test("restoring state returns a saved game state", () => {
  const storage = new MemoryStorage();
  const manager = new SaveManager(storage, "test-save");
  const state = createInitialGameState(sampleCampaign);

  manager.save(state);
  const restored = manager.load();

  assert.deepEqual(restored, state);
});

test("updating journal appends entries without mutating prior state", () => {
  const state = createInitialGameState(sampleCampaign);
  const updated = appendJournal(state, "Found a clue.");

  assert.equal(state.journal.length, 1);
  assert.equal(updated.journal.length, 2);
  assert.equal(updated.journal.at(-1)?.text, "Found a clue.");
});

test("applying an action updates journal and advances scenes", () => {
  const state = createInitialGameState(sampleCampaign);
  const updated = applyAction(sampleCampaign, state, "act-speak-mara");

  assert.equal(updated.currentSceneId, "scene-watchtower");
  assert.equal(updated.completedActionIds.includes("act-speak-mara"), true);
  assert.match(updated.journal.at(-1)?.text ?? "", /Mara says/);
});

test("rolling dice supports deterministic rolls", () => {
  const roll = rollDice("2d6+3", () => 0.5);

  assert.deepEqual(roll.rolls, [4, 4]);
  assert.equal(roll.modifier, 3);
  assert.equal(roll.total, 11);
});
