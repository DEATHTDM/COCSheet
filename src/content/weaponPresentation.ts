import type { WeaponDefinition, WeaponEraAvailability } from "../coc7/types/weapon";
import type { SkillRegistry } from "./skillRegistry";

export type WeaponEraId = "classic-1920s" | "modern";

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
