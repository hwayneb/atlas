import type { GameState } from "../types/index.ts";

export type KeyValueStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export class SaveManager {
  private readonly storageKey: string;
  private readonly storage: KeyValueStorage;

  constructor(storage: KeyValueStorage = window.localStorage, storageKey = "hybrid-dnd.game-state") {
    this.storage = storage;
    this.storageKey = storageKey;
  }

  save(state: GameState): void {
    this.storage.setItem(this.storageKey, JSON.stringify(state));
  }

  load(): GameState | null {
    const raw = this.storage.getItem(this.storageKey);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as GameState;
  }

  clear(): void {
    this.storage.removeItem(this.storageKey);
  }
}
