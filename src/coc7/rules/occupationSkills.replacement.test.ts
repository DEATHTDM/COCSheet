import { describe, expect, it } from "vitest";

import { getStandardSkillCatalog } from "../../content/skillRegistry";
import { batch3fDeprogrammerOccupationDefinitions } from "../../content/standard/occupations/batch3f-deprogrammer";
import type { OccupationSelection, SkillCreationState } from "../../creation/types/skillCreation";
import type { Character } from "../types/character";
import type { SkillRef } from "../types/skill";
import {
  finalizeSkillAllocation,
  occupationSkillReplacementApprovalSubject,
} from "./occupationSkills";

const definition = batch3fDeprogrammerOccupationDefinitions[0]!;

const occupation: OccupationSelection = {
  kind: "catalog",
  selectedOccupationId: definition.id,
  definitionSnapshot: definition,
};
const character: Character = {
  version: 1,
  id: "00000000-0000-4000-8000-000000000001",
  name: "除魅师测试",
  settingId: "standard",
  characteristics: {
    STR: 60,
    CON: 60,
    SIZ: 60,
    DEX: 60,
    APP: 60,
    INT: 60,
    POW: 60,
    EDU: 60,
  },
};

const standard = (definitionId: string): SkillRef => ({ type: "standard", definitionId });
const predefined = (definitionId: string, specializationId: string): SkillRef => ({
  type: "predefined",
  definitionId,
  specializationId,
});
const selections = {
  "social-1": [standard("charm")],
  "social-2": [standard("fast-talk")],
  "drive-auto": [standard("drive-auto")],
  "brawl-or-firearms": [predefined("fighting", "brawl")],
  history: [standard("history")],
  occult: [standard("occult")],
  psychology: [standard("psychology")],
  stealth: [standard("stealth")],
} satisfies Record<string, SkillRef[]>;

function stateFor(
  targetRequirementId?: string,
  options: {
    readonly policyId?: string;
    readonly keepTargetSelection?: boolean;
    readonly approvalTarget?: string;
    readonly hypnosisOccupationPoints?: number;
  } = {},
): SkillCreationState {
  const requirementSelections = Object.entries(selections)
    .filter(([requirementId]) => !targetRequirementId || options.keepTargetSelection || requirementId !== targetRequirementId)
    .map(([requirementId, refs]) => ({ requirementId, refs }));
  const approvalTarget = options.approvalTarget;
  const approvalSubject = approvalTarget
    ? occupationSkillReplacementApprovalSubject(
      definition.id,
      "keeper-approved-hypnosis",
      approvalTarget,
    )
    : undefined;
  return {
    requirementSelections,
    allocations: [
      { ref: standard("credit-rating"), occupationPoints: 20, interestPoints: 0 },
      ...(options.hypnosisOccupationPoints === undefined
        ? []
        : [{
          ref: standard("hypnosis"),
          occupationPoints: options.hypnosisOccupationPoints,
          interestPoints: 0,
        }]),
    ],
    ...(targetRequirementId ? {
      occupationSkillReplacement: {
        policyId: options.policyId ?? "keeper-approved-hypnosis",
        targetRequirementId,
      },
    } : {}),
    keeperApprovals: approvalSubject ? [{
      reason: "occupation-skill-replacement",
      subjectId: approvalSubject,
      approved: true,
    }] : [],
  };
}

function finalize(state: SkillCreationState, selectedOccupation = occupation) {
  return finalizeSkillAllocation({
    character,
    occupation: selectedOccupation,
    state,
    skillDefinitions: getStandardSkillCatalog(),
  });
}

describe("occupation skill replacement finalization", () => {
  it("没有启用 replacement 时按正常八槽完成，两个 social 必须不同", () => {
    expect(finalize(stateFor()).valid).toBe(true);
    const duplicateSocial = stateFor();
    duplicateSocial.requirementSelections[1] = {
      requirementId: "social-2",
      refs: [standard("charm")],
    };
    expect(finalize(duplicateSocial).errors.map(({ code }) => code))
      .toContain("duplicate-skill-selection");
  });

  it.each(["drive-auto", "social-2", "brawl-or-firearms", "history"])(
    "替换 %s 时跳过原 selection、令 Hypnosis 成为职业技能并在批准后有效",
    (target) => {
      const result = finalize(stateFor(target, {
        approvalTarget: target,
        hypnosisOccupationPoints: 10,
      }));
      expect(result.valid).toBe(true);
      expect(result.errors.map(({ code }) => code)).not.toContain("missing-requirement-selection");
      expect(result.errors.map(({ code }) => code)).not.toContain("occupation-skill-not-eligible");
      expect(result.skills.find((skill) => skill.ref.definitionId === "hypnosis")?.currentValue)
        .toBe(11);
    },
  );

  it("未批准时只产生 target-scoped replacement approval，不误报 missing 或 eligibility", () => {
    const result = finalize(stateFor("drive-auto", { hypnosisOccupationPoints: 10 }));
    expect(result.valid).toBe(false);
    expect(result.approvals).toContainEqual({
      reason: "occupation-skill-replacement",
      subjectId: "occupation:deprogrammer:replacement:keeper-approved-hypnosis:target:drive-auto",
      message: expect.any(String),
    });
    expect(result.errors.map(({ code }) => code)).not.toContain("missing-requirement-selection");
    expect(result.errors.map(({ code }) => code)).not.toContain("occupation-skill-not-eligible");
  });

  it("拒绝 target selection 共存、错误 policy 与 policy 外 target", () => {
    expect(finalize(stateFor("history", {
      keepTargetSelection: true,
      approvalTarget: "history",
    })).errors.map(({ code }) => code)).toContain("invalid-occupation-skill-replacement");
    expect(finalize(stateFor("history", {
      policyId: "old-invalid-policy",
    })).errors.map(({ code }) => code)).toContain("invalid-occupation-skill-replacement");
    expect(finalize(stateFor("credit-rating")).errors.map(({ code }) => code))
      .toContain("invalid-occupation-skill-replacement");
  });

  it("职业切换保留的 replacement draft 在无 policy definition 下明确 stale/invalid", () => {
    const otherDefinition = {
      ...definition,
      id: "other-occupation",
      skillReplacement: undefined,
    };
    const result = finalize(stateFor("history"), {
      kind: "catalog",
      selectedOccupationId: otherDefinition.id,
      definitionSnapshot: otherDefinition,
    });
    expect(result.errors.map(({ code }) => code)).toContain("invalid-occupation-skill-replacement");
  });

  it("approval subject 绑定 target，History 批准不能复用到 Occult", () => {
    const result = finalize(stateFor("occult", {
      approvalTarget: "history",
      hypnosisOccupationPoints: 10,
    }));
    expect(result.valid).toBe(false);
    expect(result.approvals.map(({ subjectId }) => subjectId)).toContain(
      "occupation:deprogrammer:replacement:keeper-approved-hypnosis:target:occult",
    );
  });

  it("未启用 replacement 时 Hypnosis 不能获得 occupation points，但仍可用 interest points", () => {
    const occupationPoints = finalize(stateFor(undefined, { hypnosisOccupationPoints: 10 }));
    expect(occupationPoints.errors.map(({ code }) => code)).toContain("occupation-skill-not-eligible");
    const interestState = stateFor();
    interestState.allocations.push({
      ref: standard("hypnosis"),
      occupationPoints: 0,
      interestPoints: 10,
    });
    expect(finalize(interestState).errors.map(({ code }) => code))
      .not.toContain("occupation-skill-not-eligible");
  });
});
