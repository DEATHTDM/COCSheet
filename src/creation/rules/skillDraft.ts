import type { CreationSession } from "../types/creationSession";
import type { OccupationSelection, SkillCreationState } from "../types/skillCreation";

export function replaceOccupationSelection(
  session: CreationSession,
  occupation: OccupationSelection,
): CreationSession {
  return {
    ...session,
    occupation,
    // 切换职业时保留原技能草稿，后续 validator 会暴露 stale/unmatched selections。
    ...(session.skills ? { skills: session.skills } : {}),
  };
}

export function resetOccupationAllocation(state: SkillCreationState): SkillCreationState {
  return {
    ...state,
    requirementSelections: [],
    allocations: state.allocations
      .map((allocation) => ({ ...allocation, occupationPoints: 0 }))
      .filter((allocation) => allocation.interestPoints > 0),
    occupationSkillReplacement: undefined,
    creditRatingOverride: undefined,
    keeperApprovals: state.keeperApprovals.filter(
      (approval) => approval.reason === "cthulhu-mythos-allocation" ||
        approval.reason === "skill-creation-point-policy",
    ),
  };
}
