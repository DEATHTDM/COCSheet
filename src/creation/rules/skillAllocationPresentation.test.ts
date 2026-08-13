import { describe, expect, it } from "vitest";

import { getSkillRefKey } from "../../coc7/rules/skills";
import type { OccupationDefinition } from "../../coc7/types/occupation";
import type { SkillCreationState } from "../types/skillCreation";
import { getOccupationRegistry } from "../../content/occupationRegistry";
import {
  areCurrentOccupationRequirementsResolved,
  listOccupationAllocationRefs,
} from "./skillAllocationPresentation";

function state(
  requirementSelections: SkillCreationState["requirementSelections"],
  extra: Partial<SkillCreationState> = {},
): SkillCreationState {
  return { requirementSelections, allocations: [], keeperApprovals: [], ...extra };
}

describe("skill allocation presentation", () => {
  const occupations = getOccupationRegistry("standard");

  it("只收集当前 requirement refs，忽略 stale ID，并始终加入 Credit Rating", () => {
    const accountant = occupations.get("accountant");
    if (!accountant) throw new Error("缺少 Accountant");

    const refs = listOccupationAllocationRefs(accountant, state([
      { requirementId: "law", refs: [{ type: "standard", definitionId: "law" }] },
      { requirementId: "accounting", refs: [{ type: "standard", definitionId: "accounting" }] },
      { requirementId: "old-occupation", refs: [{ type: "standard", definitionId: "history" }] },
    ]));

    expect(refs.map(getSkillRefKey)).toEqual([
      "skill:accounting",
      "skill:credit-rating",
      "skill:law",
    ]);
  });

  it("active replacement 进入 roster，被替换 target 与 stale refs 不进入", () => {
    const deprogrammer = occupations.get("deprogrammer");
    if (!deprogrammer) throw new Error("缺少 Deprogrammer");

    const refs = listOccupationAllocationRefs(deprogrammer, state([
      { requirementId: "psychology", refs: [{ type: "standard", definitionId: "psychology" }] },
      { requirementId: "old-history", refs: [{ type: "standard", definitionId: "history" }] },
    ], {
      occupationSkillReplacement: {
        policyId: "keeper-approved-hypnosis",
        targetRequirementId: "history",
      },
    }));

    expect(refs.map(getSkillRefKey)).toEqual([
      "skill:credit-rating",
      "skill:hypnosis",
      "skill:psychology",
    ]);
    expect(refs.map(getSkillRefKey)).not.toContain("skill:history");
  });

  it("按稳定 SkillRef key 排序并去重", () => {
    const accountant = occupations.get("accountant");
    if (!accountant) throw new Error("缺少 Accountant");
    const duplicate = { type: "standard" as const, definitionId: "accounting" };

    expect(listOccupationAllocationRefs(accountant, state([
      { requirementId: "law", refs: [duplicate] },
      { requirementId: "accounting", refs: [duplicate] },
    ])).map(getSkillRefKey)).toEqual([
      "skill:accounting",
      "skill:credit-rating",
    ]);
  });

  it("只有当前 requirement 全部合法且跨 requirement 不重复时才开放 workspace", () => {
    const definition: OccupationDefinition = {
      version: 1,
      id: "allocation-test",
      name: { zh: "分配测试", en: "Allocation Test" },
      category: "academic",
      sourceRefs: [{ sourceId: "test", title: "Test" }],
      era: { type: "all" },
      creditRating: { min: 0, max: 99 },
      pointFormula: { type: "attribute", attribute: "EDU", multiplier: 4 },
      skillRequirements: [
        {
          id: "accounting",
          selector: { type: "exact", ref: { type: "standard", definitionId: "accounting" } },
          cardinality: { min: 1, max: 1 },
        },
        {
          id: "law",
          selector: { type: "exact", ref: { type: "standard", definitionId: "law" } },
          cardinality: { min: 1, max: 1 },
        },
      ],
    };
    const complete = state([
      { requirementId: "accounting", refs: [{ type: "standard", definitionId: "accounting" }] },
      { requirementId: "law", refs: [{ type: "standard", definitionId: "law" }] },
      { requirementId: "stale", refs: [{ type: "standard", definitionId: "history" }] },
    ]);

    expect(areCurrentOccupationRequirementsResolved(definition, complete)).toBe(true);
    expect(areCurrentOccupationRequirementsResolved(definition, {
      ...complete,
      requirementSelections: complete.requirementSelections.slice(0, 1),
    })).toBe(false);
    expect(areCurrentOccupationRequirementsResolved(definition, {
      ...complete,
      requirementSelections: [
        complete.requirementSelections[0]!,
        { requirementId: "law", refs: [{ type: "standard", definitionId: "accounting" }] },
      ],
    })).toBe(false);
    expect(areCurrentOccupationRequirementsResolved(definition, {
      ...complete,
      occupationSkillReplacement: {
        policyId: "stale-policy",
        targetRequirementId: "accounting",
      },
    })).toBe(false);
  });
});
