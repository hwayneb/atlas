const app = document.querySelector("#app");
const storageKey = "atlas.game-state";
const campaign = {
  id: "ember-road",
  title: "The Ember Road",
  version: "0.1.0",
  startingSceneId: "scene-crossroads",
  characters: [
    {
      id: "hero-lyra",
      name: "Lyra Vale",
      ancestry: "Human",
      className: "Ranger",
      level: 3,
      armorClass: 15,
      hitPoints: { current: 24, max: 28 },
      abilities: {
        strength: 10,
        dexterity: 16,
        constitution: 14,
        intelligence: 12,
        wisdom: 15,
        charisma: 11
      },
      inventory: ["longbow", "shortsword", "traveler's pack", "emberglass compass"],
      notes: "Searching for the source of ash storms along the old trade road."
    }
  ],
  npcs: [
    {
      id: "npc-mara",
      name: "Mara Flint",
      role: "Caravan scout",
      locationId: "loc-crossroads",
      disposition: "wary",
      description: "A soot-streaked scout who knows every broken milestone on the Ember Road."
    }
  ],
  locations: [
    {
      id: "loc-crossroads",
      name: "Ashen Crossroads",
      description: "Four roads meet beneath leaning waystones dusted with warm gray ash.",
      sceneIds: ["scene-crossroads"]
    },
    {
      id: "loc-watchtower",
      name: "Fallow Watchtower",
      description: "A ruined signal tower overlooking the blackened valley.",
      sceneIds: ["scene-watchtower"]
    }
  ],
  encounters: [
    {
      id: "enc-ash-wolves",
      name: "Ash Wolves",
      locationId: "loc-crossroads",
      difficulty: "medium",
      description: "Three hungry wolves with ember-bright eyes stalk the roadside.",
      creatures: ["ash wolf", "ash wolf", "ash wolf"],
      reward: "A charred courier satchel with a sealed map."
    }
  ],
  quests: [
    {
      id: "quest-ember-road",
      title: "Find the Source of the Ash Storms",
      status: "active",
      description: "Track the strange ash falls to whatever is burning beneath the valley.",
      objectives: [
        { id: "obj-scout", text: "Question Mara Flint at the crossroads.", complete: false },
        { id: "obj-tower", text: "Reach the Fallow Watchtower.", complete: false }
      ]
    }
  ],
  scenes: [
    {
      id: "scene-crossroads",
      locationId: "loc-crossroads",
      title: "Warm Ash on the Wind",
      text: "The road ahead vanishes into a low curtain of ash. Mara Flint waits beside a cracked milestone, one hand resting on the hilt of her knife.",
      actions: [
        {
          id: "act-speak-mara",
          label: "Speak with Mara",
          resultText: "Mara points toward the Fallow Watchtower and warns that the ash wolves hunt before dusk.",
          nextSceneId: "scene-watchtower",
          journalEntry: "Mara says the ash grows warmer near the Fallow Watchtower."
        },
        {
          id: "act-search-road",
          label: "Search the road",
          resultText: "You find fresh pawprints burned into the dust.",
          journalEntry: "Ash wolf tracks cross the road. They are fresh."
        }
      ]
    },
    {
      id: "scene-watchtower",
      locationId: "loc-watchtower",
      title: "The Fallow Watchtower",
      text: "The tower rises from the ridge like a broken tooth. Beneath it, something glows through cracks in the stone.",
      actions: [
        {
          id: "act-enter-tower",
          label: "Enter the tower",
          resultText: "A hot draft rolls down the stairs, carrying the smell of iron and old smoke.",
          journalEntry: "The tower hides a heat source below its foundation."
        },
        {
          id: "act-make-camp",
          label: "Make a cautious camp",
          resultText: "You mark a sheltered hollow and settle in for a tense watch.",
          journalEntry: "Made camp near the Fallow Watchtower."
        }
      ]
    }
  ]
};

let state = loadState() ?? createInitialGameState(campaign);

if (state.campaignId !== campaign.id) {
  state = createInitialGameState(campaign);
}

saveState(state);

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("/public/sw.js");
}

render();

function render(lastResult = "") {
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
            <input id="dice-notation" value="d20" aria-label="Dice notation" />
            <button data-command="roll">Roll</button>
          </div>
          <p id="dice-result" class="dice-result">Ready.</p>
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

  bindEvents();
}

function bindEvents() {
  for (const button of app.querySelectorAll("[data-action]")) {
    button.addEventListener("click", () => {
      const actionId = button.getAttribute("data-action");
      const scene = getCurrentScene(campaign, state);
      const action = scene.actions.find((candidate) => candidate.id === actionId);
      state = applyAction(campaign, state, actionId);
      saveState(state);
      render(action?.resultText ?? "");
    });
  }

  app.querySelector("[data-command='roll']").addEventListener("click", () => {
    const input = app.querySelector("#dice-notation");
    const output = app.querySelector("#dice-result");
    try {
      const roll = rollDice(input.value);
      output.textContent = `${roll.notation}: ${roll.rolls.join(" + ")}${roll.modifier ? ` ${roll.modifier > 0 ? "+" : "-"} ${Math.abs(roll.modifier)}` : ""} = ${roll.total}`;
      state = appendJournal(state, `Rolled ${output.textContent}`);
      saveState(state);
      render();
    } catch (error) {
      output.textContent = error instanceof Error ? error.message : "Invalid roll.";
    }
  });

  app.querySelector("[data-command='reset']").addEventListener("click", () => {
    state = createInitialGameState(campaign);
    saveState(state);
    render();
  });

  app.querySelector("#journal-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const text = String(data.get("entry") ?? "").trim();
    if (!text) {
      return;
    }
    state = appendJournal(state, text);
    saveState(state);
    render();
  });
}

function createInitialGameState(campaignPackage) {
  return {
    campaignId: campaignPackage.id,
    activeCharacterId: campaignPackage.characters[0].id,
    currentSceneId: campaignPackage.startingSceneId,
    journal: [createJournalEntry(`Started campaign: ${campaignPackage.title}.`)],
    completedActionIds: [],
    updatedAt: new Date().toISOString()
  };
}

function getCurrentScene(campaignPackage, gameState) {
  const scene = campaignPackage.scenes.find((candidate) => candidate.id === gameState.currentSceneId);
  if (!scene) {
    throw new Error(`Current scene "${gameState.currentSceneId}" was not found in campaign.`);
  }
  return scene;
}

function getActiveCharacter(campaignPackage, gameState) {
  const character = campaignPackage.characters.find((candidate) => candidate.id === gameState.activeCharacterId);
  if (!character) {
    throw new Error(`Active character "${gameState.activeCharacterId}" was not found in campaign.`);
  }
  return character;
}

function appendJournal(gameState, text) {
  return {
    ...gameState,
    journal: [...gameState.journal, createJournalEntry(text)],
    updatedAt: new Date().toISOString()
  };
}

function applyAction(campaignPackage, gameState, actionId) {
  const scene = getCurrentScene(campaignPackage, gameState);
  const action = scene.actions.find((candidate) => candidate.id === actionId);
  if (!action) {
    throw new Error(`Action "${actionId}" is not available in the current scene.`);
  }

  const nextState = {
    ...gameState,
    currentSceneId: action.nextSceneId ?? gameState.currentSceneId,
    completedActionIds: gameState.completedActionIds.includes(action.id)
      ? gameState.completedActionIds
      : [...gameState.completedActionIds, action.id],
    updatedAt: new Date().toISOString()
  };

  return appendJournal(nextState, action.journalEntry ? `${action.label}: ${action.journalEntry}` : action.resultText);
}

function rollDice(notation) {
  const normalized = notation.replace(/\s+/g, "");
  const match = /^(\d*)d(\d+)([+-]\d+)?$/i.exec(normalized);
  if (!match) {
    throw new Error(`Invalid dice notation "${notation}". Use forms like d20, 2d6, or 1d8+2.`);
  }

  const count = match[1] ? Number(match[1]) : 1;
  const sides = Number(match[2]);
  const modifier = match[3] ? Number(match[3]) : 0;

  if (count < 1 || count > 100 || sides < 2 || sides > 1000) {
    throw new Error("Dice notation is outside supported bounds.");
  }

  const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
  return {
    notation: normalized,
    rolls,
    modifier,
    total: rolls.reduce((sum, value) => sum + value, 0) + modifier
  };
}

function createJournalEntry(text) {
  return {
    id: crypto?.randomUUID ? crypto.randomUUID() : `entry-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    timestamp: new Date().toISOString(),
    text
  };
}

function saveState(gameState) {
  localStorage.setItem(storageKey, JSON.stringify(gameState));
}

function loadState() {
  const raw = localStorage.getItem(storageKey);
  return raw ? JSON.parse(raw) : null;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
