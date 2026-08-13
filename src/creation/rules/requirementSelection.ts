import { isSkillAvailableInEra } from "../../coc7/rules/availability";
import { matchesSkillSelector } from "../../coc7/rules/occupationSkills";
import type {
  EraId,
  OccupationDefinition,
  OccupationRequirement,
  OccupationSkillReplacementPolicy,
} from "../../coc7/types/occupation";
import type {
  LocalizedSkillName,
  SkillDefinition,
  SkillDefinitionId,
  SkillRef,
} from "../../coc7/types/skill";
import type { SkillCreationState } from "../types/skillCreation";

export type RequirementCustomOption =
  | {
    readonly kind: "open";
    readonly definitionId: SkillDefinitionId;
  }
  | {
    readonly kind: "named";
    readonly definitionId: SkillDefinitionId;
    readonly name: LocalizedSkillName;
  };

export interface ActiveOccupationSkillReplacement {
  readonly policy: OccupationSkillReplacementPolicy;
  readonly targetRequirementId: string;
  readonly replacementRef: SkillRef;
}

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

export function listRequirementCustomOptions(
  requirement: OccupationRequirement,
  skillDefinitions: readonly SkillDefinition[],
  eraId: EraId,
): readonly RequirementCustomOption[] {
  const definitions = new Map(skillDefinitions.map((definition) => [definition.id, definition]));
  const options: RequirementCustomOption[] = [];
  const optionKeys = new Set<string>();

  function canCreateCustom(definitionId: SkillDefinitionId): boolean {
    const definition = definitions.get(definitionId);
    return definition !== undefined &&
      isSkillAvailableInEra(definition, eraId) &&
      definition.specialization.type === "required" &&
      definition.specialization.allowCustom;
  }

  function addOption(option: RequirementCustomOption): void {
    if (!canCreateCustom(option.definitionId)) return;
    const sampleRef: SkillRef = {
      type: "custom",
      definitionId: option.definitionId,
      specializationId: "00000000-0000-4000-8000-000000000000",
      displayName: option.kind === "named" ? option.name.zh : "Custom specialization",
    };
    if (!matchesSkillSelector(sampleRef, requirement.selector)) return;
    const key = option.kind === "open"
      ? `open:${option.definitionId}`
      : `named:${option.definitionId}:${option.name.zh.normalize("NFKC")}:${option.name.en.normalize("NFKC")}`;
    if (optionKeys.has(key)) return;
    optionKeys.add(key);
    options.push(option);
  }

  function visit(selector: OccupationRequirement["selector"]): void {
    switch (selector.type) {
      case "exact":
        return;
      case "specialization-of":
        addOption({ kind: "open", definitionId: selector.definitionId });
        return;
      case "named-custom-specialization":
        addOption({ kind: "named", definitionId: selector.definitionId, name: selector.name });
        return;
      case "one-of":
        selector.selectors.forEach(visit);
        return;
      case "all-of":
        selector.groups.forEach((group) => visit(group.selector));
        return;
      case "one-branch":
      case "choice-pool":
        selector.branches.forEach((branch) => visit(branch.selector));
        return;
      case "any-skill":
        skillDefinitions.forEach((definition) => {
          addOption({ kind: "open", definitionId: definition.id });
        });
    }
  }

  visit(requirement.selector);
  return options;
}

export function getActiveOccupationSkillReplacement(
  definition: OccupationDefinition,
  state: SkillCreationState,
): ActiveOccupationSkillReplacement | undefined {
  const draft = state.occupationSkillReplacement;
  const policy = definition.skillReplacement;
  if (!draft || !policy || draft.policyId !== policy.id) return undefined;
  if (!policy.targetRequirementIds.includes(draft.targetRequirementId)) return undefined;
  if (!definition.skillRequirements.some((requirement) => requirement.id === draft.targetRequirementId)) {
    return undefined;
  }
  if (state.requirementSelections.some(
    (selection) => selection.requirementId === draft.targetRequirementId,
  )) {
    return undefined;
  }
  return {
    policy,
    targetRequirementId: draft.targetRequirementId,
    replacementRef: policy.replacement.ref,
  };
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
