import { sampleCampaign } from "../data/sampleCampaign.ts";
import { rollDice } from "../engine/dice.ts";
import {
  applyAction,
  appendJournal,
  createInitialGameState,
  getActiveCharacter,
  getCurrentScene
} from "../engine/gameEngine.ts";
import { SaveManager } from "../storage/saveManager.ts";

const DEFAULT_DICE_NOTATION = "d20";
const DEFAULT_DICE_RESULT = "Ready.";
const NEW_RUN_CONFIRMATION =
  "Start a new run? This replaces your current campaign progress.";

const appRoot = document.querySelector<HTMLElement>("#app");
if (!appRoot) {
  throw new Error("App root was not found.");
}
const app: HTMLElement = appRoot;
const saveManager = new SaveManager();
const campaign = sampleCampaign;
let state = saveManager.load() ?? createInitialGameState(campaign);
let diceNotation = DEFAULT_DICE_NOTATION;
let diceResultText = DEFAULT_DICE_RESULT;

if (state.campaignId !== campaign.id) {
  state = createInitialGameState(campaign);
}

saveManager.save(state);

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("/public/sw.js");
}

render();

function render(lastResult = ""): void {
  const scene = getCurrentScene(campaign, state);
  const character = getActiveCharacter(campaign, state);

  app.innerHTML = `
    <section class="topline">
      <div>
        <p class="kicker">Offline Campaign</p>
        <h1>${escapeHtml(campaign.title)}</h1>
      </div>
      <button class="secondary" data-command="reset">New Run</button>
    </section>

    <section class="layout">
      <article class="scene-panel">
        <p class="kicker">Current Scene</p>
        <h2>${escapeHtml(scene.title)}</h2>
        <p>${escapeHtml(scene.text)}</p>
        ${lastResult ? `<p class="result">${escapeHtml(lastResult)}</p>` : ""}
        <div class="actions">
          ${scene.actions.map((action) => `
            <button data-action="${escapeHtml(action.id)}">${escapeHtml(action.label)}</button>
          `).join("")}
        </div>
      </article>

      <aside class="side-panel">
        <section>
          <p class="kicker">Character</p>
          <h2>${escapeHtml(character.name)}</h2>
          <dl class="stats">
            <div><dt>Class</dt><dd>${escapeHtml(character.ancestry)} ${escapeHtml(character.className)} ${character.level}</dd></div>
            <div><dt>HP</dt><dd>${character.hitPoints.current}/${character.hitPoints.max}</dd></div>
            <div><dt>AC</dt><dd>${character.armorClass}</dd></div>
          </dl>
        </section>

        <section class="dice-box">
          <p class="kicker">Dice Roller</p>
          <div class="dice-controls">
            <input id="dice-notation" value="${escapeHtml(diceNotation)}" aria-label="Dice notation" />
            <button type="button" data-command="roll">Roll</button>
          </div>
          <p id="dice-result" class="dice-result">${escapeHtml(diceResultText)}</p>
        </section>
      </aside>
    </section>

    <section class="journal-panel">
      <div class="journal-heading">
        <div>
          <p class="kicker">Journal Log</p>
          <h2>Notes</h2>
        </div>
        <form id="journal-form">
          <input name="entry" placeholder="Add a note..." aria-label="Journal note" />
          <button>Add</button>
        </form>
      </div>
      <ol class="journal-list">
        ${state.journal.slice().reverse().map((entry) => `
          <li>
            <time>${new Date(entry.timestamp).toLocaleString()}</time>
            <span>${escapeHtml(entry.text)}</span>
          </li>
        `).join("")}
      </ol>
    </section>
  `;

  bindEvents(lastResult);
}

function bindEvents(lastResult: string): void {
  for (const button of Array.from(app.querySelectorAll<HTMLButtonElement>("[data-action]"))) {
    button.addEventListener("click", () => {
      const actionId = button.getAttribute("data-action");
      if (!actionId) {
        return;
      }
      const scene = getCurrentScene(campaign, state);
      const action = scene.actions.find((candidate) => candidate.id === actionId);
      state = applyAction(campaign, state, actionId);
      saveManager.save(state);
      render(action?.resultText ?? "");
    });
  }

  const rollButton = app.querySelector<HTMLButtonElement>("[data-command='roll']");
  const diceInput = app.querySelector<HTMLInputElement>("#dice-notation");

  rollButton?.addEventListener("click", () => {
    handleRoll(lastResult);
  });

  diceInput?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    handleRoll(lastResult);
  });

  app.querySelector<HTMLButtonElement>("[data-command='reset']")?.addEventListener("click", () => {
    if (!window.confirm(NEW_RUN_CONFIRMATION)) {
      return;
    }
    state = createInitialGameState(campaign);
    diceNotation = DEFAULT_DICE_NOTATION;
    diceResultText = DEFAULT_DICE_RESULT;
    saveManager.save(state);
    render();
  });

  app.querySelector<HTMLFormElement>("#journal-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const text = String(data.get("entry") ?? "").trim();
    if (!text) {
      return;
    }
    state = appendJournal(state, text);
    saveManager.save(state);
    render(lastResult);
  });
}

function handleRoll(lastResult: string): void {
  const input = app.querySelector<HTMLInputElement>("#dice-notation");
  if (!input) {
    return;
  }

  diceNotation = input.value;

  try {
    const roll = rollDice(input.value);
    diceResultText = formatDiceResult(roll);
    state = appendJournal(state, `Rolled ${diceResultText}`);
    saveManager.save(state);
    render(lastResult);
  } catch (error) {
    diceResultText = error instanceof Error ? error.message : "Invalid roll.";
    const output = app.querySelector<HTMLElement>("#dice-result");
    if (output) {
      output.textContent = diceResultText;
    }
  }
}

function formatDiceResult(roll: {
  notation: string;
  rolls: number[];
  modifier: number;
  total: number;
}): string {
  const modifierText = roll.modifier
    ? ` ${roll.modifier > 0 ? "+" : "-"} ${Math.abs(roll.modifier)}`
    : "";
  return `${roll.notation}: ${roll.rolls.join(" + ")}${modifierText} = ${roll.total}`;
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
