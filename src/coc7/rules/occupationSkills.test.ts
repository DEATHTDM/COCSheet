import { describe, expect, it } from "vitest";

import type { Character } from "../types/character";
import type { OccupationDefinition, OccupationRequirement } from "../types/occupation";
import type { SkillRef } from "../types/skill";
import { phase5aOccupationFixtures } from "../testing/occupationFixtures";
import { getStandardSkillCatalog } from "../../content/skillRegistry";
import type { CreationPreset } from "../../creation/types/creationPreset";
import type { OccupationSelection, SkillCreationState } from "../../creation/types/skillCreation";
import {
  calculateInterestSkillBudget,
  detectStructuredAllocationConflict,
  finalizeSkillAllocation,
  instantiateNamedCustomSpecialization,
  matchesSkillSelector,
  validateCustomOccupationDefinition,
  validateOccupationRequirementSelection,
} from "./occupationSkills";
import { getSkillRefKey } from "./skills";

const characteristics = {
  STR: 60, CON: 60, SIZ: 60, DEX: 60, APP: 60, INT: 60, POW: 60, EDU: 60,
} as const;

const medicine: SkillRef = { type: "standard", definitionId: "medicine" };
const libraryUse: SkillRef = { type: "standard", definitionId: "library-use" };
const creditRating: SkillRef = { type: "standard", definitionId: "credit-rating" };

const simpleOccupation: OccupationDefinition = {
  version: 1,
  id: "test-researcher",
  name: { zh: "测试研究员", en: "Test Researcher" },
  category: "academic",
  sourceRefs: [{ sourceId: "test", title: "Test", page: 1 }],
  era: { type: "all" },
  creditRating: { min: 10, max: 60 },
  pointFormula: { type: "attribute", attribute: "EDU", multiplier: 4 },
  skillRequirements: [
    {
      id: "medicine",
      selector: { type: "exact", ref: medicine },
      cardinality: { min: 1, max: 1 },
    },
    {
      id: "flexible",
      selector: {
        type: "any-skill",
        exclude: [{ type: "exact", ref: medicine }],
      },
      cardinality: { min: 1, max: 1 },
    },
  ],
};

const occupation: OccupationSelection = {
  kind: "catalog",
  selectedOccupationId: simpleOccupation.id,
  definitionSnapshot: simpleOccupation,
};

function makeCharacter(skills?: Character["skills"]): Character {
  return {
    version: 1,
    id: crypto.randomUUID(),
    name: "测试调查员",
    settingId: "standard",
    characteristics,
    ...(skills ? { skills } : {}),
  };
}

function makeState(): SkillCreationState {
  return {
    requirementSelections: [
      { requirementId: "medicine", refs: [medicine] },
      { requirementId: "flexible", refs: [libraryUse] },
    ],
    allocations: [
      { ref: medicine, occupationPoints: 100, interestPoints: 20 },
      { ref: libraryUse, occupationPoints: 130, interestPoints: 100 },
      { ref: creditRating, occupationPoints: 10, interestPoints: 0 },
    ],
    keeperApprovals: [],
  };
}

function finalize(
  state = makeState(),
  character = makeCharacter(),
  preset?: CreationPreset,
) {
  return finalizeSkillAllocation({
    character,
    occupation,
    state,
    skillDefinitions: getStandardSkillCatalog(),
    ...(preset ? { preset } : {}),
  });
}

describe("SkillSelector 与 requirement selection", () => {
  it("固定名称开放专业生成 custom UUID，并可在恢复 Session 时再次匹配", () => {
    const doctor = phase5aOccupationFixtures.find((fixture) => fixture.id === "doctor");
    const selector = doctor?.skillRequirements.find((requirement) => requirement.id === "latin")?.selector;
    if (!selector || selector.type !== "named-custom-specialization") throw new Error("缺少 Latin selector");
    const first = instantiateNamedCustomSpecialization(selector, crypto.randomUUID());
    const second = instantiateNamedCustomSpecialization(selector, crypto.randomUUID(), "拉丁文");
    expect(matchesSkillSelector(first, selector)).toBe(true);
    expect(matchesSkillSelector(second, selector)).toBe(true);
    expect(getSkillRefKey(first)).not.toBe(getSkillRefKey(second));

    const technicalDrawingSelector = {
      type: "named-custom-specialization" as const,
      definitionId: "art-craft",
      name: { zh: "技术制图", en: "Technical Drawing" },
    };
    const technicalDrawing = instantiateNamedCustomSpecialization(
      technicalDrawingSelector,
      crypto.randomUUID(),
    );
    expect(matchesSkillSelector(technicalDrawing, technicalDrawingSelector)).toBe(true);
  });

  it("实验室助理要求 Chemistry + 另外两个不同 Science", () => {
    const lab = phase5aOccupationFixtures.find((fixture) => fixture.id === "laboratory-assistant");
    const requirement = lab?.skillRequirements.find((item) => item.id === "science-set");
    if (!requirement) throw new Error("缺少 science-set fixture");
    const chemistry: SkillRef = { type: "predefined", definitionId: "science", specializationId: "chemistry" };
    const biology: SkillRef = { type: "predefined", definitionId: "science", specializationId: "biology" };
    const pharmacy: SkillRef = { type: "predefined", definitionId: "science", specializationId: "pharmacy" };
    expect(validateOccupationRequirementSelection(requirement, [chemistry, biology, pharmacy])).toEqual([]);
    expect(validateOccupationRequirementSelection(requirement, [chemistry, chemistry, biology]).length).toBeGreaterThan(0);
  });

  it("士兵 Fighting / Firearms 泛专业允许至少一项且可多选", () => {
    const soldier = phase5aOccupationFixtures.find((fixture) => fixture.id === "soldier");
    const fighting = soldier?.skillRequirements.find((item) => item.id === "fighting");
    const firearms = soldier?.skillRequirements.find((item) => item.id === "firearms");
    if (!fighting || !firearms) throw new Error("缺少 soldier fixture");
    expect(validateOccupationRequirementSelection(fighting, [
      { type: "predefined", definitionId: "fighting", specializationId: "brawl" },
      { type: "predefined", definitionId: "fighting", specializationId: "sword" },
    ])).toEqual([]);
    expect(validateOccupationRequirementSelection(firearms, [
      { type: "predefined", definitionId: "firearms", specializationId: "handgun" },
      { type: "predefined", definitionId: "firearms", specializationId: "rifle-shotgun" },
    ])).toEqual([]);
  });
});

describe("技能预算与 finalize plan", () => {
  it("职业预算按公式、兴趣预算按 INT×2，并允许同一 SkillRef 接受两种点数", () => {
    expect(calculateInterestSkillBudget(characteristics)).toBe(120);
    const result = finalize();
    expect(result.valid).toBe(true);
    expect(result.occupationBudget).toBe(240);
    expect(result.interestBudget).toBe(120);
    expect(result.remainingOccupationPoints).toBe(0);
    expect(result.remainingInterestPoints).toBe(0);
    expect(result.skills.find((skill) => getSkillRefKey(skill.ref) === getSkillRefKey(medicine))?.currentValue).toBe(121);
  });

  it("finalize 从实时 resolved base 重建，不在 Phase 4 currentValue 上叠加", () => {
    const state: SkillCreationState = {
      ...makeState(),
      existingSkillResolution: { action: "rebuild-structured", confirmed: true },
    };
    const character = makeCharacter([{ ref: medicine, currentValue: 80, improvementChecked: true }]);
    const result = finalize(state, character);
    expect(result.valid).toBe(true);
    expect(result.skills.find((skill) => getSkillRefKey(skill.ref) === getSkillRefKey(medicine))).toEqual({
      ref: medicine,
      currentValue: 121,
      improvementChecked: false,
    });
  });

  it("检测已有手动 final skill state，并要求显式 adoption/reset", () => {
    const character = makeCharacter([{ ref: medicine, currentValue: 80, improvementChecked: false }]);
    expect(detectStructuredAllocationConflict(character)).toMatchObject({
      hasConflict: true,
      needsExplicitAdoptionOrReset: true,
    });
    expect(finalize(makeState(), character).errors.map((issue) => issue.code)).toContain("existing-manual-skills");
  });

  it("同一个 SkillRef 默认不能满足两个 requirement", () => {
    const state = makeState();
    state.requirementSelections[1] = { requirementId: "flexible", refs: [medicine] };
    const result = finalize(state);
    expect(result.errors.map((issue) => issue.code)).toContain("selector-mismatch");
    expect(result.errors.map((issue) => issue.code)).toContain("duplicate-skill-selection");
  });

  it("职业点仅进入 requirement refs + Credit Rating，兴趣点可进入其他正常技能", () => {
    const spotHidden: SkillRef = { type: "standard", definitionId: "spot-hidden" };
    const state = makeState();
    state.allocations = [
      ...state.allocations,
      { ref: spotHidden, occupationPoints: 1, interestPoints: 0 },
    ];
    expect(finalize(state).errors.map((issue) => issue.code)).toContain("occupation-skill-not-eligible");
    state.allocations[state.allocations.length - 1] = { ref: spotHidden, occupationPoints: 0, interestPoints: 1 };
    state.allocations[1] = { ref: libraryUse, occupationPoints: 130, interestPoints: 99 };
    expect(finalize(state).errors.map((issue) => issue.code)).not.toContain("occupation-skill-not-eligible");
  });

  it("Cthulhu Mythos 没有 approval 时阻塞，有强类型 approval 后允许", () => {
    const mythos: SkillRef = { type: "standard", definitionId: "cthulhu-mythos" };
    const state = makeState();
    state.allocations[1] = { ref: libraryUse, occupationPoints: 130, interestPoints: 99 };
    state.allocations.push({ ref: mythos, occupationPoints: 0, interestPoints: 1 });
    let result = finalize(state);
    expect(result.approvals.map((approval) => approval.reason)).toContain("cthulhu-mythos-allocation");
    state.keeperApprovals.push({
      reason: "cthulhu-mythos-allocation",
      subjectId: getSkillRefKey(mythos),
      approved: true,
    });
    result = finalize(state);
    expect(result.valid).toBe(true);
  });

  it("模糊 requirement 与 Preset 职业政策返回分离的 approval reasons", () => {
    const professor = phase5aOccupationFixtures.find((fixture) => fixture.id === "professor");
    if (!professor) throw new Error("缺少 professor fixture");
    const professorResult = finalizeSkillAllocation({
      character: makeCharacter(),
      occupation: {
        kind: "catalog",
        selectedOccupationId: professor.id,
        definitionSnapshot: professor,
      },
      state: {
        requirementSelections: [{
          requirementId: "academic-era-personal",
          refs: [
            { type: "standard", definitionId: "history" },
            { type: "standard", definitionId: "anthropology" },
            { type: "standard", definitionId: "archaeology" },
            { type: "standard", definitionId: "natural-world" },
          ],
        }],
        allocations: [],
        keeperApprovals: [],
      },
      skillDefinitions: getStandardSkillCatalog(),
    });
    expect(professorResult.approvals.map((approval) => approval.reason)).toContain("fuzzy-requirement");

    const preset: CreationPreset = {
      version: 1,
      id: crypto.randomUUID(),
      name: "Approval preset",
      settingId: "standard",
      attributeGeneration: { allowedMethods: ["manual"] },
      occupationPolicy: { approvalRequiredOccupationIds: [simpleOccupation.id] },
      allowCustomOccupation: "keeper-approval",
    };
    let state = makeState();
    let result = finalize(state, makeCharacter(), preset);
    expect(result.approvals.map((approval) => approval.reason)).toContain("preset-occupation-policy");
    state = {
      ...state,
      keeperApprovals: [{
        reason: "preset-occupation-policy",
        subjectId: simpleOccupation.id,
        approved: true,
      }],
    };
    result = finalize(state, makeCharacter(), preset);
    expect(result.valid).toBe(true);
  });

  it("Credit Rating 最终值越界需要 override，且兴趣点也可投入", () => {
    const state = makeState();
    state.allocations[1] = { ref: libraryUse, occupationPoints: 140, interestPoints: 90 };
    state.allocations[2] = { ref: creditRating, occupationPoints: 0, interestPoints: 30 };
    let result = finalize(state);
    expect(result.approvals.map((approval) => approval.reason)).toEqual([]);
    expect(result.skills.find((skill) => getSkillRefKey(skill.ref) === getSkillRefKey(creditRating))?.currentValue).toBe(30);
    state.allocations[2] = { ref: creditRating, occupationPoints: 0, interestPoints: 0 };
    result = finalize(state);
    expect(result.approvals.map((approval) => approval.reason)).toContain("credit-rating-override");
    state.creditRatingOverride = { approved: true, reason: "Keeper approved low status" };
    expect(finalize(state).approvals.map((approval) => approval.reason)).not.toContain("credit-rating-override");
  });

  it("未花完点数只返回 warning，不作为 hard invalid", () => {
    const state = makeState();
    state.allocations = [];
    state.creditRatingOverride = { approved: true };
    const result = finalize(state);
    expect(result.valid).toBe(true);
    expect(result.warnings.map((warning) => warning.code)).toEqual([
      "unused-occupation-points",
      "unused-interest-points",
    ]);
  });

  it("新 skillLimits 明确限制最终值；legacy skillCaps 不影响 validator", () => {
    const legacyPreset: CreationPreset = {
      version: 1,
      id: crypto.randomUUID(),
      name: "Legacy caps",
      settingId: "standard",
      attributeGeneration: { allowedMethods: ["manual"] },
      skillCaps: { occupation: 1, interest: 1, overall: 1 },
      allowCustomOccupation: true,
    };
    expect(finalize(makeState(), makeCharacter(), legacyPreset).valid).toBe(true);
    const state = makeState();
    state.allocations[1] = { ref: libraryUse, occupationPoints: 130, interestPoints: 99 };
    state.allocations.push({
      ref: { type: "standard", definitionId: "spot-hidden" },
      occupationPoints: 0,
      interestPoints: 1,
    });
    const explicitLimits: CreationPreset = {
      ...legacyPreset,
      skillLimits: {
        maxOccupationSkillFinalValue: 120,
        maxInterestOnlySkillFinalValue: 25,
        maxSkillFinalValue: 120,
      },
    };
    const codes = finalize(state, makeCharacter(), explicitLimits).errors.map((issue) => issue.code);
    expect(codes).toContain("occupation-skill-final-limit");
    expect(codes).toContain("interest-only-skill-final-limit");
    expect(codes).toContain("global-skill-final-limit");
  });

  it("职业切换后保留的旧 selection 作为 stale 数据暴露", () => {
    const state = makeState();
    state.requirementSelections.push({ requirementId: "old-occupation-slot", refs: [libraryUse] });
    expect(finalize(state).errors.map((issue) => issue.code)).toContain("stale-requirement-selection");
  });
});

describe("Custom occupation foundation", () => {
  it("最多八个 requirement slots；单一 Fighting slot 可选择多个 SkillRef", () => {
    const baseRequirement: OccupationRequirement = {
      id: "slot",
      selector: { type: "specialization-of", definitionId: "fighting" },
      cardinality: { min: 1 },
    };
    const custom: OccupationDefinition = {
      ...simpleOccupation,
      id: crypto.randomUUID(),
      skillRequirements: Array.from({ length: 9 }, (_, index) => ({
        ...baseRequirement,
        id: `slot-${index + 1}`,
      })),
    };
    expect(validateCustomOccupationDefinition(custom)).toContain("自定义职业最多允许八个 requirement slots");
  });
});
