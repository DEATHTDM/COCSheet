import type { DiceRoll } from "../types/attribute";
import { rollDice, type RandomSource, systemRandomSource } from "./random";

function makeLuckRoll(source: RandomSource): DiceRoll {
  const dice = rollDice(3, 6, source);
  return { dice: [...dice], modifier: 0, total: dice.reduce((sum, value) => sum + value, 0) * 5 };
}

export function rollLuck(
  rollCount: 1 | 2,
  source: RandomSource = systemRandomSource,
): { readonly rolls: readonly DiceRoll[]; readonly value: number } {
  const rolls = Array.from({ length: rollCount }, () => makeLuckRoll(source));
  return { rolls, value: Math.max(...rolls.map((roll) => roll.total)) };
}
