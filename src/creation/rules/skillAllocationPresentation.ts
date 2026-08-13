import {
  validateOccupationRequirementSelection,
} from "../../coc7/rules/occupationSkills";
import { getSkillRefKey } from "../../coc7/rules/skills";
import type { OccupationDefinition } from "../../coc7/types/occupation";
import type { SkillRef } from "../../coc7/types/skill";
import type { SkillCreationState } from "../types/skillCreation";
import { getActiveOccupationSkillReplacement } from "./requirementSelection";

const creditRatingRef: SkillRef = {
  type: "standard",
  definitionId: "credit-rating",
};

export function listOccupationAllocationRefs(
  occupationDefinition: OccupationDefinition,
  skillState: SkillCreationState,
): readonly SkillRef[] {
  const currentRequirementIds = new Set(
    occupationDefinition.skillRequirements.map((requirement) => requirement.id),
  );
  const activeReplacement = getActiveOccupationSkillReplacement(
    occupationDefinition,
    skillState,
  );
  const refs = new Map<string, SkillRef>();

  for (const selection of skillState.requirementSelections) {
    if (!currentRequirementIds.has(selection.requirementId) ||
      selection.requirementId === activeReplacement?.targetRequirementId) {
      continue;
    }
    for (const ref of selection.refs) refs.set(getSkillRefKey(ref), ref);
  }
  if (activeReplacement) {
    refs.set(
      getSkillRefKey(activeReplacement.replacementRef),
      activeReplacement.replacementRef,
    );
  }
  refs.set(getSkillRefKey(creditRatingRef), creditRatingRef);

  return [...refs.entries()]
    .sort(([left], [right]) => left.localeCompare(right, "en"))
    .map(([, ref]) => ref);
}

export function areCurrentOccupationRequirementsResolved(
  occupationDefinition: OccupationDefinition,
  skillState: SkillCreationState,
): boolean {
  const activeReplacement = getActiveOccupationSkillReplacement(
    occupationDefinition,
    skillState,
  );
  if (skillState.occupationSkillReplacement && !activeReplacement) return false;
  const selections = new Map(
    skillState.requirementSelections.map((selection) => [selection.requirementId, selection]),
  );
  const usedRefs = new Set<string>();

  for (const requirement of occupationDefinition.skillRequirements) {
    if (requirement.id === activeReplacement?.targetRequirementId) {
      const replacementKey = getSkillRefKey(activeReplacement.replacementRef);
      if (usedRefs.has(replacementKey)) return false;
      usedRefs.add(replacementKey);
      continue;
    }

    const selection = selections.get(requirement.id);
    if (!selection || validateOccupationRequirementSelection(requirement, selection.refs).length > 0) {
      return false;
    }
    for (const ref of selection.refs) {
      const key = getSkillRefKey(ref);
      if (usedRefs.has(key)) return false;
      usedRefs.add(key);
    }
  }
  return true;
}
