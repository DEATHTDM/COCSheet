import {
  characteristicIds,
  characteristicValuesSchema,
  type AssignRollResult,
  type CharacteristicId,
  type CharacteristicRoll,
  type CharacteristicValues,
  type PartialCharacteristicValues,
  type StandardRollResult,
} from "../types/attribute";
import { rollD6, rollDice, type RandomSource, systemRandomSource } from "./random";

const threeD6Characteristics = new Set<CharacteristicId>(["STR", "CON", "DEX", "APP", "POW"]);

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function rollCharacteristic(
  characteristic: CharacteristicId,
  source: RandomSource,
): CharacteristicRoll {
  const usesThreeD6 = threeD6Characteristics.has(characteristic);
  const dice = rollDice(usesThreeD6 ? 3 : 2, 6, source);
  const modifier = usesThreeD6 ? 0 : 6;
  const raw = sum(dice) + modifier;
  return { characteristic, dice: [...dice], modifier, raw, value: raw * 5 };
}

export function rollStandardCharacteristics(
  source: RandomSource = systemRandomSource,
): StandardRollResult {
  const rolls = characteristicIds.map((id) => rollCharacteristic(id, source));
  const values = Object.fromEntries(
    rolls.map((roll) => [roll.characteristic, roll.value]),
  ) as unknown as CharacteristicValues;

  return { rolls, values: characteristicValuesSchema.parse(values) };
}

export function getLowRollEligibleCharacteristics(
  result: StandardRollResult,
): readonly CharacteristicId[] {
  return result.rolls.filter((roll) => roll.raw < 10).map((roll) => roll.characteristic);
}

export function rollLowRollBoost(
  result: StandardRollResult,
  source: RandomSource = systemRandomSource,
): number | undefined {
  return getLowRollEligibleCharacteristics(result).length >= 3 ? rollD6(source) : undefined;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export function applyLowRollBoost(
  result: StandardRollResult,
  bonus: number | undefined,
  allocation: PartialCharacteristicValues,
): { readonly validation: ValidationResult; readonly values?: CharacteristicValues } {
  const eligible = new Set(getLowRollEligibleCharacteristics(result));
  const errors: string[] = [];
  const required = bonus ?? 0;
  let allocated = 0;

  for (const id of characteristicIds) {
    const value = allocation[id] ?? 0;
    allocated += value;
    if (value < 0 || !Number.isInteger(value)) {
      errors.push(`${id} 的加值必须为非负整数`);
    }
    if (value > 0 && !eligible.has(id)) {
      errors.push(`${id} 的原始值不低于 10，不能获得加值`);
    }
  }
  if (allocated !== required) {
    errors.push(`必须分配正好 ${required} 点，当前已分配 ${allocated} 点`);
  }
  if (errors.length > 0) {
    return { validation: { valid: false, errors } };
  }

  const values = Object.fromEntries(
    result.rolls.map((roll) => [roll.characteristic, (roll.raw + (allocation[roll.characteristic] ?? 0)) * 5]),
  ) as unknown as CharacteristicValues;
  return { validation: { valid: true, errors: [] }, values: characteristicValuesSchema.parse(values) };
}

export function rollAssignResults(
  source: RandomSource = systemRandomSource,
): readonly AssignRollResult[] {
  return Array.from({ length: 8 }, (_, index) => {
    const isThreeD6 = index < 5;
    const dice = rollDice(isThreeD6 ? 3 : 2, 6, source);
    const modifier = isThreeD6 ? 0 : 6;
    const raw = sum(dice) + modifier;
    return {
      id: `roll-${index + 1}`,
      formula: isThreeD6 ? "3d6" : "2d6+6",
      dice: [...dice],
      modifier,
      raw,
      value: raw * 5,
    };
  });
}

export type Assignments = Readonly<{ [K in CharacteristicId]?: string | undefined }>;

export function validateAssignRoll(
  rolls: readonly AssignRollResult[],
  assignments: Assignments,
  intMin = 40,
  sizMin = 40,
): { readonly validation: ValidationResult; readonly values?: CharacteristicValues } {
  const errors: string[] = [];
  const byId = new Map(rolls.map((roll) => [roll.id, roll]));
  const selectedIds = characteristicIds.map((id) => assignments[id]).filter((id): id is string => id !== undefined);

  if (rolls.length !== 8 || byId.size !== 8) {
    errors.push("必须生成八个且不重复的骰值");
  }
  if (selectedIds.length !== 8) {
    errors.push("每项属性都必须分配一个骰值");
  }
  if (new Set(selectedIds).size !== selectedIds.length) {
    errors.push("每个骰值只能使用一次");
  }
  if (selectedIds.some((id) => !byId.has(id))) {
    errors.push("分配中包含不存在的骰值");
  }
  if (errors.length > 0) {
    return { validation: { valid: false, errors } };
  }

  const values = Object.fromEntries(
    characteristicIds.map((id) => [id, byId.get(assignments[id] as string)?.value]),
  ) as unknown as CharacteristicValues;
  const parsed = characteristicValuesSchema.parse(values);
  if (parsed.INT < intMin) errors.push(`INT 不得低于 ${intMin}`);
  if (parsed.SIZ < sizMin) errors.push(`SIZ 不得低于 ${sizMin}`);
  return errors.length > 0
    ? { validation: { valid: false, errors } }
    : { validation: { valid: true, errors: [] }, values: parsed };
}

export function rollMultipleCharacteristics(
  count: number,
  source: RandomSource = systemRandomSource,
): readonly StandardRollResult[] {
  if (!Number.isInteger(count) || count < 2 || count > 10) {
    throw new Error("多组生成数量必须在 2 到 10 之间");
  }
  return Array.from({ length: count }, () => rollStandardCharacteristics(source));
}

export interface PointBuyConfig {
  readonly total: number;
  readonly min: number;
  readonly max: number;
  readonly intMin: number;
  readonly sizMin: number;
}

export const defaultPointBuyConfig: PointBuyConfig = {
  total: 460,
  min: 15,
  max: 90,
  intMin: 40,
  sizMin: 40,
};

export function getMinimumPointBuyValues(config: PointBuyConfig): CharacteristicValues {
  return characteristicValuesSchema.parse({
    STR: config.min,
    CON: config.min,
    SIZ: Math.max(config.min, config.sizMin),
    DEX: config.min,
    APP: config.min,
    INT: Math.max(config.min, config.intMin),
    POW: config.min,
    EDU: config.min,
  });
}

export function getPointBuyAllocationSummary(
  values: CharacteristicValues,
  config: PointBuyConfig = defaultPointBuyConfig,
): { readonly total: number; readonly allocated: number; readonly remaining: number } {
  const allocated = characteristicIds.reduce((current, id) => current + values[id], 0);
  return { total: config.total, allocated, remaining: config.total - allocated };
}

export function validatePointBuy(
  values: CharacteristicValues,
  config: PointBuyConfig = defaultPointBuyConfig,
): ValidationResult {
  const errors: string[] = [];
  const total = getPointBuyAllocationSummary(values, config).allocated;
  if (total !== config.total) errors.push(`属性总和必须为 ${config.total}，当前为 ${total}`);
  for (const id of characteristicIds) {
    if (!Number.isInteger(values[id]) || values[id] < config.min || values[id] > config.max) {
      errors.push(`${id} 必须在 ${config.min} 到 ${config.max} 之间`);
    }
  }
  if (values.INT < config.intMin) errors.push(`INT 不得低于 ${config.intMin}`);
  if (values.SIZ < config.sizMin) errors.push(`SIZ 不得低于 ${config.sizMin}`);
  return { valid: errors.length === 0, errors };
}

export function getHalfValue(value: number): number {
  return Math.floor(value / 2);
}

export function getFifthValue(value: number): number {
  return Math.floor(value / 5);
}
