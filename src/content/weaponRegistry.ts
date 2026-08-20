import type { SettingId } from "../coc7/types/setting";
import {
  weaponDefinitionSchema,
  type WeaponDefinition,
} from "../coc7/types/weapon";
import { getSettingPackOrThrow } from "./registry";
import { getSkillRegistry, type SkillRegistry } from "./skillRegistry";

export interface WeaponRegistry {
  readonly definitions: readonly WeaponDefinition[];
  get(id: string): WeaponDefinition | undefined;
}

function validateWeaponSkillRef(
  weapon: WeaponDefinition,
  skills: SkillRegistry,
): void {
  const ref = weapon.skillRef;
  const definition = skills.get(ref.definitionId);
  if (!definition) {
    throw new Error(`武器 ${weapon.id} 引用了未知技能：${ref.definitionId}`);
  }

  if (ref.type === "standard") {
    if (definition.specialization.type !== "none") {
      throw new Error(`武器 ${weapon.id} 的 standard ref 必须引用非专业化技能：${ref.definitionId}`);
    }
    return;
  }

  if (!skills.resolvePredefined(ref.definitionId, ref.specializationId)) {
    throw new Error(
      `武器 ${weapon.id} 引用了未知预定义专业化：${ref.definitionId}/${ref.specializationId}`,
    );
  }
}

export function createWeaponRegistry(
  definitions: readonly WeaponDefinition[],
  skills: SkillRegistry,
): WeaponRegistry {
  const parsed = definitions.map((definition) => weaponDefinitionSchema.parse(definition));
  const byId = new Map<string, WeaponDefinition>();

  for (const definition of parsed) {
    if (byId.has(definition.id)) {
      throw new Error(`重复的武器定义 ID：${definition.id}`);
    }
    validateWeaponSkillRef(definition, skills);
    byId.set(definition.id, definition);
  }

  return {
    definitions: parsed,
    get: (id) => byId.get(id),
  };
}

const weaponRegistries = new Map<SettingId, WeaponRegistry>();

export function getWeaponRegistry(settingId: SettingId): WeaponRegistry {
  const cached = weaponRegistries.get(settingId);
  if (cached) return cached;

  const pack = getSettingPackOrThrow(settingId);
  const registry = createWeaponRegistry(pack.weapons ?? [], getSkillRegistry(settingId));
  weaponRegistries.set(settingId, registry);
  return registry;
}
