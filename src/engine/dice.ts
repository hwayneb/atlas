export type DiceRoll = {
  notation: string;
  rolls: number[];
  modifier: number;
  total: number;
};

const DICE_PATTERN = /^(\d*)d(\d+)([+-]\d+)?$/i;

export function rollDice(notation: string, random: () => number = Math.random): DiceRoll {
  const normalized = notation.replace(/\s+/g, "");
  const match = DICE_PATTERN.exec(normalized);

  if (!match) {
    throw new Error(`Invalid dice notation "${notation}". Use forms like d20, 2d6, or 1d8+2.`);
  }

  const count = match[1] ? Number(match[1]) : 1;
  const sides = Number(match[2]);
  const modifier = match[3] ? Number(match[3]) : 0;

  if (count < 1 || count > 100 || sides < 2 || sides > 1000) {
    throw new Error("Dice notation is outside supported bounds.");
  }

  const rolls = Array.from({ length: count }, () => Math.floor(random() * sides) + 1);
  const total = rolls.reduce((sum, value) => sum + value, 0) + modifier;

  return {
    notation: normalized,
    rolls,
    modifier,
    total
  };
}
