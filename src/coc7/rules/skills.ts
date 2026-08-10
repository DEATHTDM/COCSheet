import { getFifthValue, getHalfValue } from "./attributes";
import type { CharacteristicValues } from "../types/attribute";
import {
  characterSkillSchema,
  type CharacterSkill,
  type PredefinedSkillSpecialization,
  type SkillBaseValueRule,
  type SkillDefinition,
  type SkillRef,
} from "../types/skill";

export interface ResolvedSkillValue {
  readonly baseValue: number;
  readonly currentValue: number;
  readonly halfValue: number;
  readonly fifthValue: number;
}

export interface SkillValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export function calculateSkillBaseValue(
  rule: SkillBaseValueRule,
  characteristics: CharacteristicValues,
): number {
  if (rule.type === "fixed") return rule.value;

  const value = characteristics[rule.characteristic];
  switch (rule.fraction) {
    case "full":
      return value;
    case "half":
      return getHalfValue(value);
    case "fifth":
      return getFifthValue(value);
  }
}

export function getSkillRefKey(ref: SkillRef): string {
  switch (ref.type) {
    case "standard":
      return `skill:${ref.definitionId}`;
    case "predefined":
      return `skill:${ref.definitionId}:predefined:${ref.specializationId}`;
    case "custom":
      return `skill:${ref.definitionId}:custom:${ref.specializationId}`;
  }
}

export function getPredefinedSpecialization(
  definition: SkillDefinition,
  specializationId: string,
): PredefinedSkillSpecialization | undefined {
  return definition.predefinedSpecializations.find(
    (specialization) => specialization.id === specializationId,
  );
}

export function getSkillBaseValueRule(
  definition: SkillDefinition,
  ref: SkillRef,
): SkillBaseValueRule {
  if (definition.id !== ref.definitionId) {
    throw new Error(`技能引用 ${ref.definitionId} 与定义 ${definition.id} 不匹配`);
  }

  if (ref.type === "standard") {
    if (definition.specialization.type !== "none") {
      throw new Error(`技能 ${definition.id} 必须指定专业化`);
    }
    return definition.baseValueRule;
  }

  if (definition.specialization.type === "none") {
    throw new Error(`技能 ${definition.id} 不允许专业化`);
  }

  if (ref.type === "custom") {
    if (!definition.specialization.allowCustom) {
      throw new Error(`技能 ${definition.id} 不允许自定义专业化`);
    }
    return definition.baseValueRule;
  }

  const specialization = getPredefinedSpecialization(definition, ref.specializationId);
  if (!specialization) {
    throw new Error(`技能 ${definition.id} 不存在专业化 ${ref.specializationId}`);
  }
  return specialization.baseValueRule ?? definition.baseValueRule;
}

export function resolveSkillValue(
  definition: SkillDefinition,
  ref: SkillRef,
  characteristics: CharacteristicValues,
  persisted?: CharacterSkill,
): ResolvedSkillValue {
  if (persisted && getSkillRefKey(persisted.ref) !== getSkillRefKey(ref)) {
    throw new Error("持久化技能与待解析技能引用不一致");
  }
  const baseValue = calculateSkillBaseValue(
    getSkillBaseValueRule(definition, ref),
    characteristics,
  );
  const currentValue = persisted?.currentValue ?? baseValue;
  return {
    baseValue,
    currentValue,
    halfValue: getHalfValue(currentValue),
    fifthValue: getFifthValue(currentValue),
  };
}

export function validateCharacterSkill(
  skill: CharacterSkill,
  definition: SkillDefinition | undefined,
): SkillValidationResult {
  const errors: string[] = [];
  const parsed = characterSkillSchema.safeParse(skill);
  if (!parsed.success) {
    errors.push(...parsed.error.issues.map((issue) => issue.message));
    return { valid: false, errors };
  }
  if (!definition) {
    errors.push(`找不到技能定义：${skill.ref.definitionId}`);
    return { valid: false, errors };
  }

  try {
    getSkillBaseValueRule(definition, skill.ref);
  } catch (error: unknown) {
    errors.push(error instanceof Error ? error.message : "技能引用无效");
  }
  if (skill.improvementChecked && definition.improvementPolicy === "not-eligible") {
    errors.push(`技能 ${definition.id} 不允许成长标记`);
  }
  return { valid: errors.length === 0, errors };
}

export function validateCharacterSkills(
  skills: readonly CharacterSkill[],
  definitions: readonly SkillDefinition[],
): SkillValidationResult {
  const definitionsById = new Map(definitions.map((definition) => [definition.id, definition]));
  const errors: string[] = [];
  const keys = new Set<string>();

  for (const skill of skills) {
    const key = getSkillRefKey(skill.ref);
    if (keys.has(key)) errors.push(`重复的技能实例：${key}`);
    keys.add(key);
    errors.push(...validateCharacterSkill(skill, definitionsById.get(skill.ref.definitionId)).errors);
  }

  for (const definition of definitions) {
    if (definition.specialization.type !== "required" || definition.specialization.allowMultiple) {
      continue;
    }
    const count = skills.filter((skill) => skill.ref.definitionId === definition.id).length;
    if (count > 1) errors.push(`技能 ${definition.id} 只允许一个专业化实例`);
  }

  return { valid: errors.length === 0, errors };
}
