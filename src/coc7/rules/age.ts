import {
  characteristicIds,
  characteristicValuesSchema,
  type CharacteristicId,
  type CharacteristicValues,
  type PartialCharacteristicValues,
} from "../types/attribute";
import { rollD10, rollD100, type RandomSource, systemRandomSource } from "./random";
import type { ValidationResult } from "./attributes";

export interface AgeAdjustmentRule {
  readonly ageRange: string;
  readonly requiresKeeperRuling: boolean;
  readonly eduImprovementCount: number;
  readonly luckRollCount: 1 | 2;
  readonly reduction: {
    readonly characteristics: readonly CharacteristicId[];
    readonly total: number;
  };
  readonly fixed: PartialCharacteristicValues;
}

const keeperRulingRule: AgeAdjustmentRule = {
  ageRange: "KP 裁定",
  requiresKeeperRuling: true,
  eduImprovementCount: 0,
  luckRollCount: 1,
  reduction: { characteristics: [], total: 0 },
  fixed: {},
};

export function getAgeAdjustmentRule(age: number): AgeAdjustmentRule {
  if (!Number.isInteger(age) || age < 15 || age >= 90) return keeperRulingRule;
  if (age <= 19) {
    return {
      ageRange: "15～19",
      requiresKeeperRuling: false,
      eduImprovementCount: 0,
      luckRollCount: 2,
      reduction: { characteristics: ["STR", "SIZ"], total: 5 },
      fixed: { EDU: -5 },
    };
  }
  if (age <= 39) {
    return {
      ageRange: "20～39",
      requiresKeeperRuling: false,
      eduImprovementCount: 1,
      luckRollCount: 1,
      reduction: { characteristics: [], total: 0 },
      fixed: {},
    };
  }

  const band = age <= 49
    ? { range: "40～49", edu: 2, flexible: 5, app: 5 }
    : age <= 59
      ? { range: "50～59", edu: 3, flexible: 10, app: 10 }
      : age <= 69
        ? { range: "60～69", edu: 4, flexible: 20, app: 15 }
        : age <= 79
          ? { range: "70～79", edu: 4, flexible: 40, app: 20 }
          : { range: "80～89", edu: 4, flexible: 80, app: 25 };
  return {
    ageRange: band.range,
    requiresKeeperRuling: false,
    eduImprovementCount: band.edu,
    luckRollCount: 1,
    reduction: { characteristics: ["STR", "CON", "DEX"], total: band.flexible },
    fixed: { APP: -band.app },
  };
}

export function validateReductionAllocation(
  base: CharacteristicValues,
  rule: AgeAdjustmentRule,
  allocation: PartialCharacteristicValues,
): ValidationResult {
  const errors: string[] = [];
  const allowed = new Set(rule.reduction.characteristics);
  let total = 0;
  for (const id of characteristicIds) {
    const amount = allocation[id] ?? 0;
    total += amount;
    if (!Number.isInteger(amount) || amount < 0) errors.push(`${id} 的减值必须为非负整数`);
    if (amount > 0 && !allowed.has(id)) errors.push(`${id} 不属于本年龄段可分配减值的属性`);
    if (base[id] - amount + (rule.fixed[id] ?? 0) < 0) errors.push(`${id} 的最终值不能低于 0`);
  }
  if (total !== rule.reduction.total) {
    errors.push(`必须分配正好 ${rule.reduction.total} 点减值，当前已分配 ${total} 点`);
  }
  for (const id of characteristicIds) {
    if (base[id] + (rule.fixed[id] ?? 0) < 0) errors.push(`${id} 的固定年龄减值会产生非法结果`);
  }
  return { valid: errors.length === 0, errors };
}

export interface EduImprovementResult {
  readonly checkRoll: number;
  readonly eduBefore: number;
  readonly success: boolean;
  readonly improvementRoll?: number | undefined;
  readonly eduAfter: number;
}

export function runEduImprovements(
  startingEdu: number,
  count: number,
  source: RandomSource = systemRandomSource,
): readonly EduImprovementResult[] {
  if (!Number.isInteger(count) || count < 0) throw new Error("EDU 成长次数必须为非负整数");
  const results: EduImprovementResult[] = [];
  let currentEdu = startingEdu;
  for (let index = 0; index < count; index += 1) {
    const checkRoll = rollD100(source);
    const success = checkRoll > currentEdu;
    const improvementRoll = success ? rollD10(source) : undefined;
    const eduAfter = success ? Math.min(99, currentEdu + (improvementRoll ?? 0)) : currentEdu;
    results.push({
      checkRoll,
      eduBefore: currentEdu,
      success,
      ...(improvementRoll === undefined ? {} : { improvementRoll }),
      eduAfter,
    });
    currentEdu = eduAfter;
  }
  return results;
}

export function deriveFinalCharacteristics(
  base: CharacteristicValues,
  rule: AgeAdjustmentRule,
  allocation: PartialCharacteristicValues,
  eduImprovements: readonly EduImprovementResult[],
): CharacteristicValues {
  const reductionValidation = validateReductionAllocation(base, rule, allocation);
  if (!reductionValidation.valid) throw new Error(reductionValidation.errors.join("；"));
  if (eduImprovements.length !== rule.eduImprovementCount) throw new Error("EDU 成长次数尚未完成");

  const values = Object.fromEntries(
    characteristicIds.map((id) => [id, base[id] - (allocation[id] ?? 0) + (rule.fixed[id] ?? 0)]),
  ) as unknown as CharacteristicValues;
  const lastEdu = eduImprovements.at(-1)?.eduAfter;
  if (lastEdu !== undefined) values.EDU = lastEdu;
  return characteristicValuesSchema.parse(values);
}
