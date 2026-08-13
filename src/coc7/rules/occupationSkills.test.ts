import { describe, expect, it } from "vitest";

import type { Character } from "../types/character";
import type { OccupationDefinition, OccupationRequirement } from "../types/occupation";
import type { SkillRef } from "../types/skill";
import { phase5aOccupationFixtures } from "../testing/occupationFixtures";
import { getStandardSkillCatalog } from "../../content/skillRegistry";
import type { CreationPreset } from "../../creation/types/creationPreset";
import type { OccupationSelection, SkillCreationState } from "../../creation/types/skillCreation";
import {
  calculateCustomOccupationSkillCapacity,
  calculateInterestSkillBudget,
  detectStructuredAllocationConflict,
  finalizeSkillAllocation,
  instantiateNamedCustomSpecialization,
  matchesSkillSelector,
  occupationRequirementApprovalSubject,
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

  it("one-of 每个子 selector 最多满足一个选择，并通过回溯处理重叠", () => {
    const soldier = phase5aOccupationFixtures.find((fixture) => fixture.id === "soldier");
    const support = soldier?.skillRequirements.find((item) => item.id === "support-skills");
    if (!support) throw new Error("缺少 soldier support-skills fixture");
    const firstAid: SkillRef = { type: "standard", definitionId: "first-aid" };
    const mechanicalRepair: SkillRef = { type: "standard", definitionId: "mechanical-repair" };
    const spanish: SkillRef = {
      type: "custom",
      definitionId: "language-other",
      specializationId: crypto.randomUUID(),
      displayName: "Spanish",
    };
    const french: SkillRef = {
      type: "custom",
      definitionId: "language-other",
      specializationId: crypto.randomUUID(),
      displayName: "French",
    };
    expect(validateOccupationRequirementSelection(support, [firstAid, spanish])).toEqual([]);
    expect(validateOccupationRequirementSelection(support, [firstAid, mechanicalRepair])).toEqual([]);
    expect(validateOccupationRequirementSelection(support, [spanish, french]).map((issue) => issue.code))
      .toContain("selector-mismatch");

    const overlap: OccupationRequirement = {
      id: "overlap",
      selector: {
        type: "one-of",
        selectors: [
          { type: "any-skill" },
          { type: "exact", ref: firstAid },
        ],
      },
      cardinality: { min: 2, max: 2 },
    };
    expect(validateOccupationRequirementSelection(overlap, [firstAid, mechanicalRepair])).toEqual([]);
  });

  it("one-of 社交 choose-two 继续消费两个不同 child，不能重复消费同一 child", () => {
    const social: OccupationRequirement = {
      id: "social",
      selector: {
        type: "one-of",
        selectors: [
          { type: "exact", ref: { type: "standard", definitionId: "charm" } },
          { type: "exact", ref: { type: "standard", definitionId: "fast-talk" } },
          { type: "exact", ref: { type: "standard", definitionId: "intimidate" } },
          { type: "exact", ref: { type: "standard", definitionId: "persuade" } },
        ],
      },
      cardinality: { min: 2, max: 2 },
    };
    const charm: SkillRef = { type: "standard", definitionId: "charm" };
    const persuade: SkillRef = { type: "standard", definitionId: "persuade" };
    expect(validateOccupationRequirementSelection(social, [charm, persuade])).toEqual([]);
    expect(validateOccupationRequirementSelection(social, [charm, charm]).map((issue) => issue.code))
      .toEqual(expect.arrayContaining(["duplicate-skill-selection", "selector-mismatch"]));
  });

  it("one-branch 允许 Fighting 或 Firearms branch 内多选，但拒绝跨 branch 混选", () => {
    const requirement: OccupationRequirement = {
      id: "fighting-or-firearms",
      selector: {
        type: "one-branch",
        branches: [
          {
            selector: { type: "specialization-of", definitionId: "fighting" },
            cardinality: { min: 1 },
          },
          {
            selector: { type: "specialization-of", definitionId: "firearms" },
            cardinality: { min: 1 },
          },
        ],
      },
      cardinality: { min: 1 },
    };
    const brawl: SkillRef = { type: "predefined", definitionId: "fighting", specializationId: "brawl" };
    const sword: SkillRef = { type: "predefined", definitionId: "fighting", specializationId: "sword" };
    const handgun: SkillRef = { type: "predefined", definitionId: "firearms", specializationId: "handgun" };
    const rifle: SkillRef = {
      type: "predefined",
      definitionId: "firearms",
      specializationId: "rifle-shotgun",
    };

    expect(matchesSkillSelector(brawl, requirement.selector)).toBe(true);
    expect(matchesSkillSelector(handgun, requirement.selector)).toBe(true);
    expect(matchesSkillSelector(medicine, requirement.selector)).toBe(false);
    for (const refs of [[brawl], [brawl, sword], [handgun], [handgun, rifle]]) {
      expect(validateOccupationRequirementSelection(requirement, refs)).toEqual([]);
    }
    for (const refs of [[brawl, handgun], [brawl, sword, handgun]]) {
      expect(validateOccupationRequirementSelection(requirement, refs).map((issue) => issue.code))
        .toContain("selector-mismatch");
    }
    expect(validateOccupationRequirementSelection(requirement, [brawl, brawl]).map((issue) => issue.code))
      .toContain("duplicate-skill-selection");
    expect(validateOccupationRequirementSelection(requirement, []).map((issue) => issue.code))
      .toEqual(expect.arrayContaining(["requirement-cardinality", "selector-mismatch"]));
  });

  it("one-branch 允许 Fighting 1+ 或 Throw exactly one", () => {
    const requirement: OccupationRequirement = {
      id: "fighting-or-throw",
      selector: {
        type: "one-branch",
        branches: [
          {
            selector: { type: "specialization-of", definitionId: "fighting" },
            cardinality: { min: 1 },
          },
          {
            selector: { type: "exact", ref: { type: "standard", definitionId: "throw" } },
            cardinality: { min: 1, max: 1 },
          },
        ],
      },
      cardinality: { min: 1 },
    };
    const brawl: SkillRef = { type: "predefined", definitionId: "fighting", specializationId: "brawl" };
    const sword: SkillRef = { type: "predefined", definitionId: "fighting", specializationId: "sword" };
    const throwRef: SkillRef = { type: "standard", definitionId: "throw" };

    for (const refs of [[throwRef], [brawl], [brawl, sword]]) {
      expect(validateOccupationRequirementSelection(requirement, refs)).toEqual([]);
    }
    for (const refs of [[brawl, throwRef], [sword, throwRef]]) {
      expect(validateOccupationRequirementSelection(requirement, refs).map((issue) => issue.code))
        .toContain("selector-mismatch");
    }
    expect(validateOccupationRequirementSelection(requirement, [throwRef, throwRef]).map((issue) => issue.code))
      .toEqual(expect.arrayContaining(["duplicate-skill-selection", "selector-mismatch"]));
  });

  it("choice-pool 按 active branch 而不是 SkillRef 数量验证 exact choose-two", () => {
    const ref = (definitionId: string): Extract<SkillRef, { type: "standard" }> => ({
      type: "standard",
      definitionId,
    });
    const requirement: OccupationRequirement = {
      id: "exact-choice-pool",
      selector: {
        type: "choice-pool",
        branches: ["appraise", "disguise", "locksmith"].map((definitionId) => ({
          selector: { type: "exact", ref: ref(definitionId) },
          cardinality: { min: 1, max: 1 },
        })),
        selectedBranches: { min: 2, max: 2 },
      },
      cardinality: { min: 2, max: 3 },
    };
    expect(validateOccupationRequirementSelection(requirement, [ref("appraise"), ref("disguise")])).toEqual([]);
    expect(validateOccupationRequirementSelection(requirement, [ref("appraise")]).map((issue) => issue.code))
      .toEqual(expect.arrayContaining(["requirement-cardinality", "selector-mismatch"]));
    expect(validateOccupationRequirementSelection(
      requirement,
      [ref("appraise"), ref("disguise"), ref("locksmith")],
    ).map((issue) => issue.code)).toContain("selector-mismatch");
  });

  it("choice-pool 允许 repeatable specialization branch 内多项只计一个 active branch", () => {
    const requirement: OccupationRequirement = {
      id: "repeatable-choice-pool",
      selector: {
        type: "choice-pool",
        branches: [
          {
            selector: { type: "specialization-of", definitionId: "fighting" },
            cardinality: { min: 1 },
          },
          {
            selector: { type: "exact", ref: { type: "standard", definitionId: "appraise" } },
            cardinality: { min: 1, max: 1 },
          },
          {
            selector: { type: "exact", ref: { type: "standard", definitionId: "locksmith" } },
            cardinality: { min: 1, max: 1 },
          },
        ],
        selectedBranches: { min: 2, max: 2 },
      },
      cardinality: { min: 2 },
    };
    const brawl: SkillRef = { type: "predefined", definitionId: "fighting", specializationId: "brawl" };
    const sword: SkillRef = { type: "predefined", definitionId: "fighting", specializationId: "sword" };
    const appraise: SkillRef = { type: "standard", definitionId: "appraise" };
    expect(validateOccupationRequirementSelection(requirement, [brawl, sword, appraise])).toEqual([]);
    expect(validateOccupationRequirementSelection(requirement, [brawl, sword]).map((issue) => issue.code))
      .toContain("selector-mismatch");
    expect(validateOccupationRequirementSelection(requirement, [brawl, brawl, appraise]).map((issue) => issue.code))
      .toContain("duplicate-skill-selection");
  });

  it("choice-pool 通过 backtracking 重新分配重叠 atomic branches", () => {
    const brawl: SkillRef = { type: "predefined", definitionId: "fighting", specializationId: "brawl" };
    const sword: SkillRef = { type: "predefined", definitionId: "fighting", specializationId: "sword" };
    const requirement: OccupationRequirement = {
      id: "overlap-choice-pool",
      selector: {
        type: "choice-pool",
        branches: [
          {
            selector: { type: "specialization-of", definitionId: "fighting" },
            cardinality: { min: 1, max: 1 },
          },
          { selector: { type: "exact", ref: brawl }, cardinality: { min: 1, max: 1 } },
        ],
        selectedBranches: { min: 2, max: 2 },
      },
      cardinality: { min: 2, max: 2 },
    };
    expect(validateOccupationRequirementSelection(requirement, [brawl, sword])).toEqual([]);
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

  it("模糊 requirement approval 同时绑定职业身份与 requirement ID", () => {
    const makeReviewedOccupation = (id: string): OccupationDefinition => ({
      ...simpleOccupation,
      id,
      creditRating: { min: 0, max: 99 },
      skillRequirements: [{
        id: "personal-or-era",
        selector: { type: "any-skill" },
        cardinality: { min: 1, max: 1 },
        keeperReview: true,
      }],
    });
    const occupationA = makeReviewedOccupation("reviewed-a");
    const occupationB = makeReviewedOccupation("reviewed-b");
    const state: SkillCreationState = {
      requirementSelections: [{ requirementId: "personal-or-era", refs: [libraryUse] }],
      allocations: [],
      keeperApprovals: [{
        reason: "fuzzy-requirement",
        subjectId: occupationRequirementApprovalSubject(occupationA.id, "personal-or-era"),
        approved: true,
      }],
    };
    const finalizeReviewed = (definition: OccupationDefinition) => finalizeSkillAllocation({
      character: makeCharacter(),
      occupation: {
        kind: "catalog",
        selectedOccupationId: definition.id,
        definitionSnapshot: definition,
      },
      state,
      skillDefinitions: getStandardSkillCatalog(),
    });
    expect(finalizeReviewed(occupationA).approvals).toEqual([]);
    expect(finalizeReviewed(occupationB).approvals).toContainEqual(expect.objectContaining({
      reason: "fuzzy-requirement",
      subjectId: occupationRequirementApprovalSubject(occupationB.id, "personal-or-era"),
    }));
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
    state.creditRatingOverride = {
      occupationId: simpleOccupation.id,
      approved: true,
      reason: "Keeper approved low status",
    };
    expect(finalize(state).approvals.map((approval) => approval.reason)).not.toContain("credit-rating-override");

    state.creditRatingOverride = { occupationId: "other-occupation", approved: true };
    expect(finalize(state).approvals.map((approval) => approval.reason)).toContain("credit-rating-override");
  });

  it("未花完点数只返回 warning，不作为 hard invalid", () => {
    const state = makeState();
    state.allocations = [];
    state.creditRatingOverride = { occupationId: simpleOccupation.id, approved: true };
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

  it("final Character.skills 复用领域校验，拒绝两个 Language Own 实例", () => {
    const ownA: SkillRef = {
      type: "custom",
      definitionId: "language-own",
      specializationId: crypto.randomUUID(),
      displayName: "Mandarin",
    };
    const ownB: SkillRef = {
      type: "custom",
      definitionId: "language-own",
      specializationId: crypto.randomUUID(),
      displayName: "Cantonese",
    };
    const definition: OccupationDefinition = {
      ...simpleOccupation,
      id: "language-validation",
      creditRating: { min: 0, max: 99 },
      skillRequirements: [
        { id: "own-a", selector: { type: "specialization-of", definitionId: "language-own" }, cardinality: { min: 1, max: 1 } },
        { id: "own-b", selector: { type: "specialization-of", definitionId: "language-own" }, cardinality: { min: 1, max: 1 } },
      ],
    };
    const result = finalizeSkillAllocation({
      character: makeCharacter(),
      occupation: { kind: "catalog", selectedOccupationId: definition.id, definitionSnapshot: definition },
      state: {
        requirementSelections: [
          { requirementId: "own-a", refs: [ownA] },
          { requirementId: "own-b", refs: [ownB] },
        ],
        allocations: [],
        keeperApprovals: [],
      },
      skillDefinitions: getStandardSkillCatalog(),
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({
      code: "character-skill-validation",
      message: expect.stringContaining("language-own 只允许一个专业化实例"),
    }));
  });

  it("一个 Language Own 与多个 Language Other 通过 final Character.skills 校验", () => {
    const customRef = (definitionId: "language-own" | "language-other", displayName: string): SkillRef => ({
      type: "custom",
      definitionId,
      specializationId: crypto.randomUUID(),
      displayName,
    });
    const own = customRef("language-own", "Mandarin");
    const spanish = customRef("language-other", "Spanish");
    const french = customRef("language-other", "French");
    const definition: OccupationDefinition = {
      ...simpleOccupation,
      id: "valid-languages",
      creditRating: { min: 0, max: 99 },
      skillRequirements: [
        { id: "own", selector: { type: "specialization-of", definitionId: "language-own" }, cardinality: { min: 1, max: 1 } },
        { id: "other-a", selector: { type: "specialization-of", definitionId: "language-other" }, cardinality: { min: 1, max: 1 } },
        { id: "other-b", selector: { type: "specialization-of", definitionId: "language-other" }, cardinality: { min: 1, max: 1 } },
      ],
    };
    const result = finalizeSkillAllocation({
      character: makeCharacter(),
      occupation: { kind: "catalog", selectedOccupationId: definition.id, definitionSnapshot: definition },
      state: {
        requirementSelections: [
          { requirementId: "own", refs: [own] },
          { requirementId: "other-a", refs: [spanish] },
          { requirementId: "other-b", refs: [french] },
        ],
        allocations: [],
        keeperApprovals: [],
      },
      skillDefinitions: getStandardSkillCatalog(),
    });
    expect(result.valid).toBe(true);
    expect(result.errors.map((issue) => issue.code)).not.toContain("character-skill-validation");
  });
});

describe("Custom occupation foundation", () => {
  const customWith = (skillRequirements: OccupationDefinition["skillRequirements"]): OccupationDefinition => ({
    ...simpleOccupation,
    id: crypto.randomUUID(),
    skillRequirements,
  });

  it("按需求可产生的职业技能项数限制八项", () => {
    const baseRequirement: OccupationRequirement = {
      id: "slot",
      selector: { type: "specialization-of", definitionId: "fighting" },
      cardinality: { min: 1 },
    };
    const genericFighting = customWith(Array.from({ length: 8 }, (_, index) => ({
      ...baseRequirement,
      id: `slot-${index + 1}`,
    })));
    expect(calculateCustomOccupationSkillCapacity(genericFighting)).toMatchObject({
      valid: true,
      maximumSkills: 8,
    });

    const anyEight = customWith([{
      id: "any-eight",
      selector: { type: "any-skill" },
      cardinality: { min: 8, max: 8 },
    }]);
    expect(calculateCustomOccupationSkillCapacity(anyEight)).toMatchObject({ valid: true, maximumSkills: 8 });

    const nine = customWith([
      ...anyEight.skillRequirements,
      { id: "fixed", selector: { type: "exact", ref: medicine }, cardinality: { min: 1, max: 1 } },
    ]);
    expect(validateCustomOccupationDefinition(nine).join("；")).toContain("最多可产生 9 项");

    const sixteen = customWith(Array.from({ length: 8 }, (_, index) => ({
      id: `double-${index + 1}`,
      selector: { type: "any-skill" as const },
      cardinality: { min: 1, max: 2 },
    })));
    expect(validateCustomOccupationDefinition(sixteen).join("；")).toContain("最多可产生 16 项");
    const overCapacityResult = finalizeSkillAllocation({
      character: makeCharacter(),
      occupation: {
        kind: "custom",
        selectedOccupationId: sixteen.id,
        definitionSnapshot: sixteen,
      },
      state: { requirementSelections: [], allocations: [], keeperApprovals: [] },
      skillDefinitions: getStandardSkillCatalog(),
    });
    expect(overCapacityResult.errors.map((issue) => issue.code))
      .toContain("custom-occupation-skill-capacity");

    const allOfThree = customWith([{
      id: "all-of-three",
      selector: {
        type: "all-of",
        groups: [
          { selector: { type: "exact", ref: medicine }, cardinality: { min: 1, max: 1 } },
          { selector: { type: "exact", ref: libraryUse }, cardinality: { min: 2, max: 2 } },
        ],
      },
      cardinality: { min: 3, max: 3 },
    }]);
    expect(calculateCustomOccupationSkillCapacity(allOfThree)).toMatchObject({
      valid: true,
      maximumSkills: 3,
    });

    const unboundedAny = customWith([{
      id: "unbounded",
      selector: { type: "any-skill" },
      cardinality: { min: 1 },
    }]);
    expect(validateCustomOccupationDefinition(unboundedAny).join("；")).toContain("无法证明职业技能不超过八项");

    const exclusiveCombatBranch = customWith([{
      id: "exclusive-combat",
      selector: {
        type: "one-branch",
        branches: [
          {
            selector: { type: "specialization-of", definitionId: "fighting" },
            cardinality: { min: 1 },
          },
          {
            selector: { type: "specialization-of", definitionId: "firearms" },
            cardinality: { min: 1 },
          },
        ],
      },
      cardinality: { min: 1 },
    }]);
    expect(calculateCustomOccupationSkillCapacity(exclusiveCombatBranch)).toMatchObject({
      valid: true,
      maximumSkills: 1,
    });

    const fightingOrThrowBranch = customWith([{
      id: "fighting-or-throw",
      selector: {
        type: "one-branch",
        branches: [
          {
            selector: { type: "specialization-of", definitionId: "fighting" },
            cardinality: { min: 1 },
          },
          {
            selector: { type: "exact", ref: { type: "standard", definitionId: "throw" } },
            cardinality: { min: 1, max: 1 },
          },
        ],
      },
      cardinality: { min: 1 },
    }]);
    expect(calculateCustomOccupationSkillCapacity(fightingOrThrowBranch)).toMatchObject({
      valid: true,
      maximumSkills: 1,
    });

    const unboundedNamedBranch = customWith([{
      id: "unbounded-named-branch",
      selector: {
        type: "one-branch",
        branches: [
          {
            selector: {
              type: "named-custom-specialization",
              definitionId: "art-craft",
              name: { zh: "乐器", en: "Instrument" },
            },
            cardinality: { min: 1 },
          },
          {
            selector: { type: "exact", ref: medicine },
            cardinality: { min: 1, max: 1 },
          },
        ],
      },
      cardinality: { min: 1 },
    }]);
    expect(calculateCustomOccupationSkillCapacity(unboundedNamedBranch).valid).toBe(false);
    expect(calculateCustomOccupationSkillCapacity(unboundedNamedBranch).errors.join("；"))
      .toContain("one-branch 无法证明有限容量");

    const keeperChoicePool = {
      type: "choice-pool" as const,
      branches: [
        {
          selector: { type: "specialization-of" as const, definitionId: "fighting" },
          cardinality: { min: 1 },
        },
        {
          selector: { type: "specialization-of" as const, definitionId: "firearms" },
          cardinality: { min: 1 },
        },
        ...["appraise", "mechanical-repair", "sleight-of-hand", "disguise", "locksmith"].map(
          (definitionId) => ({
            selector: {
              type: "exact" as const,
              ref: { type: "standard" as const, definitionId },
            },
            cardinality: { min: 1, max: 1 },
          }),
        ),
      ],
      selectedBranches: { min: 4, max: 4 },
    };
    const choiceRequirement: OccupationRequirement = {
      id: "criminal-specialties",
      selector: keeperChoicePool,
      cardinality: { min: 4 },
    };
    const fixed = ["stealth", "psychology", "spot-hidden", "charm"].map((definitionId, index) => ({
      id: `fixed-${index + 1}`,
      selector: { type: "exact" as const, ref: { type: "standard" as const, definitionId } },
      cardinality: { min: 1, max: 1 },
    }));
    const choicePoolEight = customWith([...fixed, choiceRequirement]);
    expect(calculateCustomOccupationSkillCapacity(choicePoolEight)).toMatchObject({
      valid: true,
      maximumSkills: 8,
    });

    const replacementPolicyEight: OccupationDefinition = {
      ...customWith(Array.from({ length: 8 }, (_, index) => ({
        id: `exact-${index + 1}`,
        selector: { type: "exact" as const, ref: { type: "standard" as const, definitionId: "history" } },
        cardinality: { min: 1, max: 1 },
      }))),
      skillReplacement: {
        id: "keeper-approved-hypnosis",
        replacement: { type: "exact", ref: { type: "standard", definitionId: "hypnosis" } },
        targetRequirementIds: ["exact-1"],
        approval: "keeper-required",
      },
    };
    expect(calculateCustomOccupationSkillCapacity(replacementPolicyEight)).toMatchObject({
      valid: true,
      maximumSkills: 8,
    });

    const choicePoolNine = customWith([
      ...fixed,
      {
        id: "fixed-five",
        selector: { type: "exact", ref: { type: "standard", definitionId: "listen" } },
        cardinality: { min: 1, max: 1 },
      },
      choiceRequirement,
    ]);
    expect(calculateCustomOccupationSkillCapacity(choicePoolNine)).toMatchObject({
      valid: false,
      maximumSkills: 9,
    });
    expect(calculateCustomOccupationSkillCapacity(choicePoolNine).errors.join("；"))
      .toContain("最多可产生 9 项");

    const unboundedChoicePool = customWith([{
      id: "unbounded-choice-pool",
      selector: {
        type: "choice-pool",
        branches: [
          {
            selector: { type: "specialization-of", definitionId: "art-craft" },
            cardinality: { min: 1 },
          },
          {
            selector: { type: "exact", ref: medicine },
            cardinality: { min: 1, max: 1 },
          },
        ],
        selectedBranches: { min: 1, max: 2 },
      },
      cardinality: { min: 1 },
    }]);
    expect(calculateCustomOccupationSkillCapacity(unboundedChoicePool).valid).toBe(false);
    expect(calculateCustomOccupationSkillCapacity(unboundedChoicePool).errors.join("；"))
      .toContain("choice-pool 无法证明有限容量");
  });
});
