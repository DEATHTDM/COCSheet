import { getFifthValue, getHalfValue } from "../../coc7/rules/attributes";
import { isSkillAvailableInEra } from "../../coc7/rules/availability";
import {
  calculateMaximumSanity,
  deriveStandardCharacterValues,
  type StandardDerivedCharacterValues,
} from "../../coc7/rules/derived";
import {
  getSkillBaseValueRule,
  getSkillRefKey,
  resolveSkillValue,
} from "../../coc7/rules/skills";
import { deriveStandardInitialWealth, type StandardInitialWealth } from "../../coc7/rules/wealth";
import { backstoryCategoryIds, type Character } from "../../coc7/types/character";
import type {
  CharacterSkill,
  SkillAvailability,
  SkillDefinition,
  SkillImprovementPolicy,
  SkillRef,
} from "../../coc7/types/skill";
import type { SkillRegistry } from "../../content/skillRegistry";
import { backstoryCategoryLabels } from "../../creation/presentation/backstoryPresentation";
import { formatSkillRefForOccupation } from "../../creation/presentation/occupationPresentation";
import { getFinalCreditRating, isStandardWealthEraId } from "../../creation/rules/creationWealth";
import type { CreationStepId } from "../../creation/types/creationSession";

export type CharacterCreationStatus = "complete" | "incomplete" | "missing-session";

export interface FinalSheetSkillPresentation {
  readonly key: string;
  readonly label: string;
  readonly nameZh: string;
  readonly nameEn: string;
  readonly searchText: string;
  readonly ref: SkillRef;
  readonly baseValue: number | undefined;
  readonly currentValue: number;
  readonly halfValue: number;
  readonly fifthValue: number;
  readonly improvementChecked: boolean;
  readonly persisted: boolean;
  readonly availability: SkillAvailability | undefined;
  readonly eraStatus: "compatible" | "incompatible" | "unknown";
  readonly improvementPolicy: SkillImprovementPolicy | undefined;
  readonly orphaned: boolean;
}

export interface ResolveFinalSheetSkillOptions {
  readonly includeUncommon?: boolean;
  readonly includePredefinedSpecializations?: boolean;
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

function getCatalogRefs(
  definition: SkillDefinition,
  options: ResolveFinalSheetSkillOptions,
): readonly SkillRef[] {
  if (definition.specialization.type === "none") {
    return [{ type: "standard", definitionId: definition.id }];
  }
  if (!options.includePredefinedSpecializations) return [];
  return definition.predefinedSpecializations.map((specialization) => ({
    type: "predefined" as const,
    definitionId: definition.id,
    specializationId: specialization.id,
  }));
}

function getSkillNames(
  definition: SkillDefinition,
  ref: SkillRef,
): { readonly nameZh: string; readonly nameEn: string; readonly aliases: readonly string[] } {
  const specialization = ref.type === "predefined"
    ? definition.predefinedSpecializations.find((item) => item.id === ref.specializationId)
    : undefined;
  const specializationZh = ref.type === "custom" ? ref.displayName : specialization?.name.zh;
  const specializationEn = ref.type === "custom" ? ref.displayName : specialization?.name.en;
  return {
    nameZh: specializationZh ? `${definition.name.zh}（${specializationZh}）` : definition.name.zh,
    nameEn: specializationEn ? `${definition.name.en} (${specializationEn})` : definition.name.en,
    aliases: [
      ...(definition.aliases?.zh ?? []),
      ...(definition.aliases?.en ?? []),
      ...(specialization?.aliases?.zh ?? []),
      ...(specialization?.aliases?.en ?? []),
      ...(ref.type === "custom" ? [ref.displayName] : []),
    ],
  };
}

function getEraStatus(
  character: Pick<Character, "eraId">,
  definition: SkillDefinition,
): FinalSheetSkillPresentation["eraStatus"] {
  if (definition.availability.era === "all") return "compatible";
  if (!character.eraId) return "unknown";
  return isSkillAvailableInEra(definition, character.eraId) ? "compatible" : "incompatible";
}

function resolveCatalogSkill(
  character: Pick<Character, "characteristics" | "eraId">,
  registry: SkillRegistry,
  definition: SkillDefinition,
  ref: SkillRef,
  persisted: CharacterSkill | undefined,
): FinalSheetSkillPresentation | undefined {
  if (!character.characteristics && !persisted) return undefined;
  const key = getSkillRefKey(ref);
  try {
    getSkillBaseValueRule(definition, ref);
    const names = getSkillNames(definition, ref);
    const resolved = character.characteristics
      ? resolveSkillValue(definition, ref, character.characteristics, persisted)
      : undefined;
    const currentValue = persisted?.currentValue ?? resolved?.currentValue;
    if (currentValue === undefined) return undefined;
    return {
      key,
      label: formatSkillRefForOccupation(ref, registry),
      ...names,
      searchText: [names.nameZh, names.nameEn, ...names.aliases].join(" ").toLocaleLowerCase(),
      ref,
      baseValue: resolved?.baseValue,
      currentValue,
      halfValue: getHalfValue(currentValue),
      fifthValue: getFifthValue(currentValue),
      improvementChecked: persisted?.improvementChecked ?? false,
      persisted: persisted !== undefined,
      availability: definition.availability,
      eraStatus: getEraStatus(character, definition),
      improvementPolicy: definition.improvementPolicy,
      orphaned: false,
    };
  } catch {
    return undefined;
  }
}

function presentOrphanedSkill(skill: CharacterSkill): FinalSheetSkillPresentation {
  const key = getSkillRefKey(skill.ref);
  const customName = skill.ref.type === "custom" ? skill.ref.displayName : undefined;
  const label = customName ? `未知技能（${customName} · ${key}）` : `未知技能（${key}）`;
  return {
    key,
    label,
    nameZh: label,
    nameEn: key,
    searchText: `${label} ${key} ${customName ?? ""}`.toLocaleLowerCase(),
    ref: skill.ref,
    baseValue: undefined,
    currentValue: skill.currentValue,
    halfValue: getHalfValue(skill.currentValue),
    fifthValue: getFifthValue(skill.currentValue),
    improvementChecked: skill.improvementChecked,
    persisted: true,
    availability: undefined,
    eraStatus: "unknown",
    improvementPolicy: undefined,
    orphaned: true,
  };
}

export function resolveFinalSheetSkillRows(
  character: Pick<Character, "characteristics" | "eraId" | "skills">,
  registry: SkillRegistry,
  options: ResolveFinalSheetSkillOptions = {},
): readonly FinalSheetSkillPresentation[] {
  const persistedByKey = new Map(
    (character.skills ?? []).map((skill) => [getSkillRefKey(skill.ref), skill]),
  );
  const rows = new Map<string, FinalSheetSkillPresentation>();

  for (const definition of registry.definitions) {
    if (definition.availability.sheet === "uncommon" && !options.includeUncommon) continue;
    for (const ref of getCatalogRefs(definition, options)) {
      const key = getSkillRefKey(ref);
      const resolved = resolveCatalogSkill(
        character,
        registry,
        definition,
        ref,
        persistedByKey.get(key),
      );
      if (resolved) rows.set(key, resolved);
    }
  }

  for (const skill of character.skills ?? []) {
    const key = getSkillRefKey(skill.ref);
    if (rows.has(key)) continue;
    const definition = registry.get(skill.ref.definitionId);
    const resolved = definition
      ? resolveCatalogSkill(character, registry, definition, skill.ref, skill)
      : undefined;
    rows.set(key, resolved ?? presentOrphanedSkill(skill));
  }

  return [...rows.values()].sort((left, right) =>
    left.label.localeCompare(right.label, "zh-CN") || left.key.localeCompare(right.key, "en"),
  );
}

export function filterFinalSheetSkillRows(
  rows: readonly FinalSheetSkillPresentation[],
  query: string,
): readonly FinalSheetSkillPresentation[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return normalizedQuery
    ? rows.filter((row) => row.searchText.includes(normalizedQuery))
    : rows;
}

/** @deprecated Prefer resolveFinalSheetSkillRows for explicit sparse-state semantics. */
export function presentFinalSheetSkills(
  character: Pick<Character, "characteristics" | "eraId" | "skills">,
  registry: SkillRegistry,
): readonly FinalSheetSkillPresentation[] {
  return resolveFinalSheetSkillRows(character, registry);
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
