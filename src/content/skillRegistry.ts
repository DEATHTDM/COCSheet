import { skillDefinitionSchema, type PredefinedSkillSpecialization, type SkillDefinition } from "../coc7/types/skill";
import type { SettingId } from "../coc7/types/setting";
import { getSettingPack } from "./registry";

export interface SkillRegistry {
  readonly definitions: readonly SkillDefinition[];
  get(definitionId: string): SkillDefinition | undefined;
  resolvePredefined(
    definitionId: string,
    specializationId: string,
  ): PredefinedSkillSpecialization | undefined;
}

export function createSkillRegistry(definitions: readonly SkillDefinition[]): SkillRegistry {
  const parsed = definitions.map((definition) => skillDefinitionSchema.parse(definition));
  const byId = new Map<string, SkillDefinition>();
  for (const definition of parsed) {
    if (byId.has(definition.id)) {
      throw new Error(`重复的技能定义 ID：${definition.id}`);
    }
    byId.set(definition.id, definition);
  }

  return {
    definitions: parsed,
    get: (definitionId) => byId.get(definitionId),
    resolvePredefined: (definitionId, specializationId) => byId
      .get(definitionId)
      ?.predefinedSpecializations.find((specialization) => specialization.id === specializationId),
  };
}

const skillRegistries = new Map<SettingId, SkillRegistry>();

export function getSkillRegistry(settingId: SettingId): SkillRegistry {
  const cached = skillRegistries.get(settingId);
  if (cached) return cached;

  const registry = createSkillRegistry(getSettingPack(settingId)?.skills ?? []);
  skillRegistries.set(settingId, registry);
  return registry;
}

export function getStandardSkillCatalog(): readonly SkillDefinition[] {
  return getSkillRegistry("standard").definitions;
}

export function getSkillDefinition(definitionId: string): SkillDefinition | undefined {
  return getSkillRegistry("standard").get(definitionId);
}

export function resolvePredefinedSpecialization(
  definitionId: string,
  specializationId: string,
): PredefinedSkillSpecialization | undefined {
  return getSkillRegistry("standard").resolvePredefined(definitionId, specializationId);
}
