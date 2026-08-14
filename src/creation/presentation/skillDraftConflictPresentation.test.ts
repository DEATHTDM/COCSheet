import { describe, expect, it } from "vitest";

import type { SkillAllocationIssue } from "../../coc7/rules/occupationSkills";
import { getStaleOccupationDraftErrors } from "./skillDraftConflictPresentation";

describe("skill draft conflict presentation", () => {
  it("只提取属于旧职业草稿的既有 Engine errors，并保留原始 message", () => {
    const errors: readonly SkillAllocationIssue[] = [
      { code: "stale-requirement-selection", message: "stale selection" },
      { code: "invalid-occupation-skill-replacement", message: "stale replacement" },
      { code: "occupation-skill-not-eligible", message: "stale occupation points" },
      { code: "missing-requirement-selection", message: "missing current selection" },
      { code: "selector-mismatch", message: "selector mismatch" },
      { code: "occupation-era-incompatible", message: "era mismatch" },
      { code: "occupation-budget-exceeded", message: "budget" },
      { code: "occupation-skill-final-limit", message: "skill limit" },
    ];

    expect(getStaleOccupationDraftErrors(errors)).toEqual(errors.slice(0, 3));
  });
});
