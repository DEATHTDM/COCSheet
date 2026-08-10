import type { DiceRoll } from "../types/attribute";
import type { ValidationResult } from "./attributes";
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

export function validateRolledLuck(
  expectedRollCount: 1 | 2,
  rolls: readonly DiceRoll[],
  value: number,
): ValidationResult {
  const errors: string[] = [];
  if (rolls.length !== expectedRollCount) {
    errors.push(`当前年龄的 Luck 必须保存 ${expectedRollCount} 次掷骰`);
  }
  for (const [index, roll] of rolls.entries()) {
    const diceValid = roll.dice.length === 3 && roll.dice.every(
      (die) => Number.isInteger(die) && die >= 1 && die <= 6,
    );
    if (!diceValid || roll.modifier !== 0) {
      errors.push(`第 ${index + 1} 次 Luck 必须为 3D6`);
      continue;
    }
    const expectedTotal = roll.dice.reduce((total, die) => total + die, 0) * 5;
    if (roll.total !== expectedTotal) errors.push(`第 ${index + 1} 次 Luck 结果与骰值不一致`);
  }
  if (rolls.length > 0 && value !== Math.max(...rolls.map((roll) => roll.total))) {
    errors.push("Luck 最终值必须等于实际掷骰中的最高值");
  }
  return { valid: errors.length === 0, errors };
}
