import type { SkillAllocationIssue } from "../../coc7/rules/occupationSkills";

function isStaleOccupationDraftErrorCode(code: SkillAllocationIssue["code"]): boolean {
  return code === "stale-requirement-selection" ||
    code === "invalid-occupation-skill-replacement" ||
    code === "occupation-skill-not-eligible";
}

export function getStaleOccupationDraftErrors(
  errors: readonly SkillAllocationIssue[],
): readonly SkillAllocationIssue[] {
  return errors.filter((error) => isStaleOccupationDraftErrorCode(error.code));
}
