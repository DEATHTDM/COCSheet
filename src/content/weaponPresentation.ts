import type { CharacterWeaponInstance } from "../coc7/types/character";
import type {
  WeaponCategoryId,
  WeaponDefinition,
  WeaponEraAvailability,
} from "../coc7/types/weapon";
import type { SkillRegistry } from "./skillRegistry";
import type { WeaponRegistry } from "./weaponRegistry";

export type WeaponEraId = "classic-1920s" | "modern";

export const weaponCategoryLabels: Readonly<Record<WeaponCategoryId, string>> = {
  "melee-other": "近战与其他",
  handgun: "手枪",
  rifle: "步枪",
  shotgun: "霰弹枪",
  "assault-rifle": "突击步枪",
  "submachine-gun": "冲锋枪",
  "machine-gun": "机枪",
  "explosive-heavy-other": "爆炸物、重武器与其他",
};

export const weaponAvailabilityLabels: Readonly<Record<WeaponEraAvailability, string>> = {
  available: "可用",
  rare: "稀有",
  unavailable: "当前时代不可用",
};

export interface CharacterWeaponPresentation {
  readonly instance: CharacterWeaponInstance;
  readonly definition?: WeaponDefinition;
  readonly name: string;
  readonly skillLabel?: string;
  readonly eraAvailability?: WeaponEraAvailability;
  readonly orphaned: boolean;
}

export function formatWeaponSkillRef(
  weapon: WeaponDefinition,
  skills: SkillRegistry,
): string {
  const ref = weapon.skillRef;
  const definition = skills.get(ref.definitionId);
  if (!definition) throw new Error(`找不到武器技能定义：${ref.definitionId}`);
  if (ref.type === "standard") return definition.name.zh;

  const specialization = skills.resolvePredefined(ref.definitionId, ref.specializationId);
  if (!specialization) {
    throw new Error(`找不到武器技能专业化：${ref.definitionId}/${ref.specializationId}`);
  }
  return `${definition.name.zh}（${specialization.name.zh}）`;
}

export function isWeaponAvailableInEra(
  weapon: WeaponDefinition,
  characterEra: WeaponEraId,
): WeaponEraAvailability {
  return characterEra === "classic-1920s"
    ? weapon.availability.classic1920s
    : weapon.availability.modern;
}

export function isWeaponEraId(eraId: string | undefined): eraId is WeaponEraId {
  return eraId === "classic-1920s" || eraId === "modern";
}

export function formatWeaponReferencePrice(
  weapon: WeaponDefinition,
  eraId?: string,
): string {
  if (eraId === "classic-1920s") return weapon.price?.classic1920s ?? "—";
  if (eraId === "modern") return weapon.price?.modern ?? "—";
  if (!weapon.price) return "—";
  return [
    weapon.price.classic1920s ? `1920s：${weapon.price.classic1920s}` : undefined,
    weapon.price.modern ? `现代：${weapon.price.modern}` : undefined,
  ].filter((value): value is string => value !== undefined).join("；");
}

export function filterWeaponDefinitions(
  definitions: readonly WeaponDefinition[],
  skills: SkillRegistry,
  query: string,
  category?: WeaponCategoryId,
): readonly WeaponDefinition[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return [...definitions]
    .filter((definition) => category === undefined || definition.category === category)
    .filter((definition) => !normalizedQuery || [
      definition.name.zh,
      definition.name.en,
      definition.id,
      formatWeaponSkillRef(definition, skills),
    ].some((value) => value?.toLocaleLowerCase().includes(normalizedQuery)))
    .sort((left, right) => left.name.zh.localeCompare(right.name.zh, "zh-CN"));
}

export function presentCharacterWeapon(
  instance: CharacterWeaponInstance,
  weapons: WeaponRegistry,
  skills: SkillRegistry,
  eraId?: string,
): CharacterWeaponPresentation {
  const definition = weapons.get(instance.definitionId);
  if (!definition) {
    return {
      instance,
      name: `未知武器（${instance.definitionId}）`,
      orphaned: true,
    };
  }
  return {
    instance,
    definition,
    name: definition.name.zh,
    skillLabel: formatWeaponSkillRef(definition, skills),
    ...(isWeaponEraId(eraId)
      ? { eraAvailability: isWeaponAvailableInEra(definition, eraId) }
      : {}),
    orphaned: false,
  };
}
