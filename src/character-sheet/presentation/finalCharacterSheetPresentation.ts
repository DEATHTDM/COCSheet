import { getFifthValue, getHalfValue } from "../../coc7/rules/attributes";
import {
  calculateMaximumSanity,
  deriveStandardCharacterValues,
  type StandardDerivedCharacterValues,
} from "../../coc7/rules/derived";
import { getSkillRefKey } from "../../coc7/rules/skills";
import { deriveStandardInitialWealth, type StandardInitialWealth } from "../../coc7/rules/wealth";
import { backstoryCategoryIds, type Character } from "../../coc7/types/character";
import type { CharacterSkill } from "../../coc7/types/skill";
import type { SkillRegistry } from "../../content/skillRegistry";
import { backstoryCategoryLabels } from "../../creation/presentation/backstoryPresentation";
import { formatSkillRefForOccupation } from "../../creation/presentation/occupationPresentation";
import { getFinalCreditRating, isStandardWealthEraId } from "../../creation/rules/creationWealth";
import type { CreationStepId } from "../../creation/types/creationSession";

export type CharacterCreationStatus = "complete" | "incomplete" | "missing-session";

export interface FinalSheetSkillPresentation {
  readonly key: string;
  readonly label: string;
  readonly currentValue: number;
  readonly halfValue: number;
  readonly fifthValue: number;
  readonly improvementChecked: boolean;
  readonly orphaned: boolean;
}

export interface FinalSheetBackstoryGroup {
  readonly category: (typeof backstoryCategoryIds)[number];
  readonly label: string;
  readonly entries: NonNullable<Character["backstory"]>["entries"];
}

export function getCharacterCreationStatus(
  currentStep: CreationStepId | undefined,
): CharacterCreationStatus {
  if (currentStep === undefined) return "missing-session";
  return currentStep === "review" ? "complete" : "incomplete";
}

export function presentFinalSheetSkill(
  skill: CharacterSkill,
  registry: SkillRegistry,
): FinalSheetSkillPresentation {
  const key = getSkillRefKey(skill.ref);
  try {
    return {
      key,
      label: formatSkillRefForOccupation(skill.ref, registry),
      currentValue: skill.currentValue,
      halfValue: getHalfValue(skill.currentValue),
      fifthValue: getFifthValue(skill.currentValue),
      improvementChecked: skill.improvementChecked,
      orphaned: false,
    };
  } catch {
    return {
      key,
      label: `未知技能（${key}）`,
      currentValue: skill.currentValue,
      halfValue: getHalfValue(skill.currentValue),
      fifthValue: getFifthValue(skill.currentValue),
      improvementChecked: skill.improvementChecked,
      orphaned: true,
    };
  }
}

export function presentFinalSheetSkills(
  character: Pick<Character, "skills">,
  registry: SkillRegistry,
): readonly FinalSheetSkillPresentation[] {
  return (character.skills ?? [])
    .map((skill) => presentFinalSheetSkill(skill, registry))
    .sort((left, right) =>
      left.label.localeCompare(right.label, "zh-CN") || left.key.localeCompare(right.key, "en"),
    );
}

export function getFinalSheetCthulhuMythos(
  character: Pick<Character, "skills">,
): number {
  return character.skills?.find(
    (skill) => skill.ref.type === "standard" && skill.ref.definitionId === "cthulhu-mythos",
  )?.currentValue ?? 0;
}

export function getFinalSheetMaximumSanity(
  character: Pick<Character, "skills">,
): number {
  return calculateMaximumSanity(getFinalSheetCthulhuMythos(character));
}

export function deriveFinalSheetStandardValues(
  character: Pick<Character, "settingId" | "age" | "characteristics">,
): StandardDerivedCharacterValues | undefined {
  if (character.settingId !== "standard" || character.age === undefined || !character.characteristics) {
    return undefined;
  }
  return deriveStandardCharacterValues(character.age, character.characteristics);
}

export function deriveFinalSheetStandardWealth(
  character: Pick<Character, "settingId" | "eraId" | "skills">,
): StandardInitialWealth | undefined {
  const creditRating = getFinalCreditRating(character);
  if (character.settingId !== "standard" ||
    !isStandardWealthEraId(character.eraId) ||
    creditRating === undefined) {
    return undefined;
  }
  try {
    return deriveStandardInitialWealth(character.eraId, creditRating);
  } catch {
    return undefined;
  }
}

export function presentFinalSheetBackstory(
  character: Pick<Character, "backstory">,
): readonly FinalSheetBackstoryGroup[] {
  return backstoryCategoryIds
    .map((category) => ({
      category,
      label: backstoryCategoryLabels[category],
      entries: character.backstory?.entries.filter((entry) => entry.category === category) ?? [],
    }))
    .filter((group) => group.entries.length > 0);
}
