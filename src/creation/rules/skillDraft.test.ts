import { describe, expect, it } from "vitest";

import type { OccupationDefinition } from "../../coc7/types/occupation";
import type { CreationSession } from "../types/creationSession";
import type { OccupationSelection, SkillCreationState } from "../types/skillCreation";
import { replaceOccupationSelection, resetOccupationAllocation } from "./skillDraft";

function definition(id: string): OccupationDefinition {
  return {
    version: 1,
    id,
    name: { zh: id, en: id },
    category: "academic",
    sourceRefs: [{ sourceId: "test", title: "Test" }],
    era: { type: "all" },
    creditRating: { min: 0, max: 10 },
    pointFormula: { type: "attribute", attribute: "EDU", multiplier: 4 },
    skillRequirements: [],
  };
}

describe("occupation skill draft actions", () => {
  it("切换职业保留 requirement/custom UUID/occupation 与 interest allocations", () => {
    const customId = crypto.randomUUID();
    const state: SkillCreationState = {
      requirementSelections: [{
        requirementId: "old-slot",
        refs: [{
          type: "custom",
          definitionId: "language-other",
          specializationId: customId,
          displayName: "Latin",
        }],
      }],
      allocations: [{
        ref: {
          type: "custom",
          definitionId: "language-other",
          specializationId: customId,
          displayName: "Latin",
        },
        occupationPoints: 20,
        interestPoints: 5,
      }],
      keeperApprovals: [],
    };
    const session: CreationSession = {
      version: 1,
      characterId: crypto.randomUUID(),
      settingId: "standard",
      currentStep: "occupation",
      occupation: {
        kind: "catalog",
        selectedOccupationId: "old-occupation",
        definitionSnapshot: definition("old-occupation"),
      },
      skills: state,
    };
    const replacement: OccupationSelection = {
      kind: "catalog",
      selectedOccupationId: "new-occupation",
      definitionSnapshot: definition("new-occupation"),
    };
    const changed = replaceOccupationSelection(session, replacement);
    expect(changed.occupation).toEqual(replacement);
    expect(changed.skills).toEqual(state);
    expect(changed.skills?.allocations[0]?.ref).toMatchObject({ specializationId: customId });
  });

  it("显式 reset 只重置职业选择/职业点，保留兴趣点与必要 approval", () => {
    const state: SkillCreationState = {
      requirementSelections: [{
        requirementId: "old-slot",
        refs: [{ type: "standard", definitionId: "medicine" }],
      }],
      allocations: [
        { ref: { type: "standard", definitionId: "medicine" }, occupationPoints: 20, interestPoints: 5 },
        { ref: { type: "standard", definitionId: "law" }, occupationPoints: 10, interestPoints: 0 },
      ],
      creditRatingOverride: { occupationId: "old-occupation", approved: true },
      keeperApprovals: [
        { reason: "fuzzy-requirement", subjectId: "old-slot", approved: true },
        { reason: "cthulhu-mythos-allocation", subjectId: "skill:cthulhu-mythos", approved: true },
      ],
    };
    const reset = resetOccupationAllocation(state);
    expect(reset.requirementSelections).toEqual([]);
    expect(reset.allocations).toEqual([{
      ref: { type: "standard", definitionId: "medicine" },
      occupationPoints: 0,
      interestPoints: 5,
    }]);
    expect(reset.creditRatingOverride).toBeUndefined();
    expect(reset.keeperApprovals).toEqual([{
      reason: "cthulhu-mythos-allocation",
      subjectId: "skill:cthulhu-mythos",
      approved: true,
    }]);
  });
});
