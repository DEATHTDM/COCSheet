import type { EraId, OccupationDefinition } from "../types/occupation";
import type { SkillDefinition } from "../types/skill";

export function isOccupationAvailableInEra(
  occupation: OccupationDefinition,
  eraId: EraId,
): boolean {
  return occupation.era.type === "all" || occupation.era.eraIds.includes(eraId);
}

export function isSkillAvailableInEra(
  skillDefinition: SkillDefinition,
  eraId: EraId,
): boolean {
  return skillDefinition.availability.era === "all" || eraId === "modern";
}
