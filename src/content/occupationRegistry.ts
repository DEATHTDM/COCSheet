import {
  occupationDefinitionSchema,
  type EraId,
  type OccupationCategoryId,
  type OccupationDefinition,
  type SkillSelector,
} from "../coc7/types/occupation";
import type { SettingId } from "../coc7/types/setting";
import type { SettingPack } from "../coc7/types/settingPack";
import { stableMachineIdSchema, type SkillRef } from "../coc7/types/skill";
import { getSkillBaseValueRule } from "../coc7/rules/skills";
import { getSettingPackOrThrow } from "./registry";
import { getSkillRegistry, type SkillRegistry } from "./skillRegistry";

export interface OccupationFilters {
  readonly category?: OccupationCategoryId;
  readonly tag?: string;
  readonly era?: EraId;
}

export interface OccupationRegistry {
  readonly definitions: readonly OccupationDefinition[];
  get(id: string): OccupationDefinition | undefined;
  list(filters?: OccupationFilters): readonly OccupationDefinition[];
  search(query: string, filters?: OccupationFilters): readonly OccupationDefinition[];
}

function validateExactRef(ref: SkillRef, skills: SkillRegistry): void {
  const definition = skills.get(ref.definitionId);
  if (!definition) throw new Error(`职业 selector 引用了未知技能：${ref.definitionId}`);
  try {
    getSkillBaseValueRule(definition, ref);
  } catch (error: unknown) {
    throw new Error(error instanceof Error ? error.message : `职业 selector 技能引用无效：${ref.definitionId}`);
  }
}

function validateSelector(selector: SkillSelector, skills: SkillRegistry): void {
  switch (selector.type) {
    case "exact":
      validateExactRef(selector.ref, skills);
      return;
    case "specialization-of": {
      const definition = skills.get(selector.definitionId);
      if (!definition) throw new Error(`职业 selector 引用了未知技能：${selector.definitionId}`);
      if (definition.specialization.type !== "required") {
        throw new Error(`技能 ${selector.definitionId} 不是专业化技能`);
      }
      selector.exclude?.forEach((ref) => validateExactRef(ref, skills));
      return;
    }
    case "named-custom-specialization": {
      const definition = skills.get(selector.definitionId);
      if (!definition) throw new Error(`职业 selector 引用了未知技能：${selector.definitionId}`);
      if (definition.specialization.type !== "required" || !definition.specialization.allowCustom) {
        throw new Error(`技能 ${selector.definitionId} 不允许固定名称的自定义专业化`);
      }
      return;
    }
    case "one-of":
      selector.selectors.forEach((child) => validateSelector(child, skills));
      return;
    case "any-skill":
      selector.exclude?.forEach((child) => validateSelector(child, skills));
      return;
    case "all-of":
      selector.groups.forEach((group) => validateSelector(group.selector, skills));
      return;
  }
}

function normalizeSearchText(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase();
}

function matchesFilters(occupation: OccupationDefinition, filters?: OccupationFilters): boolean {
  if (!filters) return true;
  if (filters.category && occupation.category !== filters.category) return false;
  if (filters.tag && !occupation.tags?.includes(filters.tag)) return false;
  if (filters.era && occupation.era.type === "specific" && !occupation.era.eraIds.includes(filters.era)) {
    return false;
  }
  return true;
}

export function createOccupationRegistry(
  pack: Pick<SettingPack, "eras" | "occupations">,
  skills: SkillRegistry,
): OccupationRegistry {
  const definitions = pack.occupations.map((occupation) => occupationDefinitionSchema.parse(occupation));
  const byId = new Map<string, OccupationDefinition>();
  const eraIds = new Set(pack.eras ?? []);

  for (const occupation of definitions) {
    if (!stableMachineIdSchema.safeParse(occupation.id).success) {
      throw new Error(`SettingPack 职业必须使用 kebab-case ID：${occupation.id}`);
    }
    if (byId.has(occupation.id)) throw new Error(`重复的职业 ID：${occupation.id}`);
    if (occupation.era.type === "specific") {
      for (const eraId of occupation.era.eraIds) {
        if (!eraIds.has(eraId)) throw new Error(`职业 ${occupation.id} 引用了未声明时代：${eraId}`);
      }
    }
    occupation.skillRequirements.forEach((requirement) => validateSelector(requirement.selector, skills));
    byId.set(occupation.id, occupation);
  }

  return {
    definitions,
    get: (id) => byId.get(id),
    list: (filters) => definitions.filter((occupation) => matchesFilters(occupation, filters)),
    search: (query, filters) => {
      const normalized = normalizeSearchText(query);
      return definitions.filter((occupation) => {
        if (!matchesFilters(occupation, filters)) return false;
        if (normalized.length === 0) return true;
        const names = [
          occupation.name.zh,
          occupation.name.en,
          ...(occupation.aliases?.zh ?? []),
          ...(occupation.aliases?.en ?? []),
        ];
        return names.some((name) => normalizeSearchText(name).includes(normalized));
      });
    },
  };
}

const occupationRegistries = new Map<SettingId, OccupationRegistry>();

export function getOccupationRegistry(settingId: SettingId): OccupationRegistry {
  const cached = occupationRegistries.get(settingId);
  if (cached) return cached;
  const pack = getSettingPackOrThrow(settingId);
  const registry = createOccupationRegistry(pack, getSkillRegistry(settingId));
  occupationRegistries.set(settingId, registry);
  return registry;
}
