import { isSkillAvailableInEra } from "../../coc7/rules/availability";
import { matchesSkillSelector } from "../../coc7/rules/occupationSkills";
import type { EraId, OccupationRequirement } from "../../coc7/types/occupation";
import type { SkillDefinition, SkillRef } from "../../coc7/types/skill";

export function listConcreteSkillRefs(
  skillDefinitions: readonly SkillDefinition[],
  eraId: EraId,
): readonly SkillRef[] {
  return skillDefinitions
    .filter((definition) => isSkillAvailableInEra(definition, eraId))
    .flatMap((definition): readonly SkillRef[] => {
      if (definition.specialization.type === "none") {
        return [{ type: "standard", definitionId: definition.id }];
      }
      return definition.predefinedSpecializations.map((specialization) => ({
        type: "predefined" as const,
        definitionId: definition.id,
        specializationId: specialization.id,
      }));
    });
}

export function listRequirementCandidates(
  requirement: OccupationRequirement,
  skillDefinitions: readonly SkillDefinition[],
  eraId: EraId,
): readonly SkillRef[] {
  return listConcreteSkillRefs(skillDefinitions, eraId)
    .filter((ref) => matchesSkillSelector(ref, requirement.selector));
}

export function getDeterministicRequirementSelection(
  requirement: OccupationRequirement,
): SkillRef | undefined {
  return requirement.selector.type === "exact" &&
    requirement.cardinality.min === 1 &&
    requirement.cardinality.max === 1
    ? requirement.selector.ref
    : undefined;
}

export function requirementHasCustomSpecializationPath(
  requirement: OccupationRequirement,
  skillDefinitions: readonly SkillDefinition[],
): boolean {
  const definitions = new Map(skillDefinitions.map((definition) => [definition.id, definition]));

  function hasCustomPath(selector: OccupationRequirement["selector"]): boolean {
    switch (selector.type) {
      case "exact":
        return false;
      case "named-custom-specialization":
        return true;
      case "specialization-of": {
        const specialization = definitions.get(selector.definitionId)?.specialization;
        return specialization?.type === "required" && specialization.allowCustom;
      }
      case "one-of":
        return selector.selectors.some(hasCustomPath);
      case "all-of":
        return selector.groups.some((group) => hasCustomPath(group.selector));
      case "one-branch":
      case "choice-pool":
        return selector.branches.some((branch) => hasCustomPath(branch.selector));
      case "any-skill":
        return false;
    }
  }

  return hasCustomPath(requirement.selector);
}
