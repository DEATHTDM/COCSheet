import { describe, expect, it } from "vitest";

import { getOccupationRegistry } from "../../content/occupationRegistry";
import { getStandardSkillCatalog } from "../../content/skillRegistry";
import type { Character } from "../types/character";
import type { EraId, OccupationDefinition } from "../types/occupation";
import type { SkillRef } from "../types/skill";
import type { OccupationSelection, SkillCreationState } from "../../creation/types/skillCreation";
import { finalizeSkillAllocation } from "./occupationSkills";

const characteristics = {
  STR: 60, CON: 60, SIZ: 60, DEX: 60, APP: 60, INT: 60, POW: 60, EDU: 60,
} as const;

function requireOccupation(id: string): OccupationDefinition {
  const definition = getOccupationRegistry("standard").get(id);
  if (!definition) throw new Error(`缺少测试职业：${id}`);
  return definition;
}

function finalize(
  definition: OccupationDefinition,
  eraId: EraId | undefined,
  requirementId?: string,
  ref?: SkillRef,
  skillDefinitions = getStandardSkillCatalog(),
) {
  const character: Character = {
    version: 1,
    id: crypto.randomUUID(),
    name: "时代校验测试",
    settingId: "standard",
    ...(eraId ? { eraId } : {}),
    characteristics,
  };
  const occupation: OccupationSelection = {
    kind: "catalog",
    selectedOccupationId: definition.id,
    definitionSnapshot: definition,
  };
  const state: SkillCreationState = {
    requirementSelections: requirementId && ref ? [{ requirementId, refs: [ref] }] : [],
    allocations: ref ? [{ ref, occupationPoints: 0, interestPoints: 0 }] : [],
    keeperApprovals: [],
  };
  return finalizeSkillAllocation({
    character,
    occupation,
    state,
    skillDefinitions,
  });
}

function codes(result: ReturnType<typeof finalize>): readonly string[] {
  return result.errors.map((issue) => issue.code);
}

describe("结构化技能结算时代守卫", () => {
  const clerk = requireOccupation("white-collar-worker-clerk-executive");

  it("职员/主管在古典选择 Library Use 不产生时代错误", () => {
    const result = finalize(
      clerk,
      "classic-1920s",
      "library-or-computer",
      { type: "standard", definitionId: "library-use" },
    );
    expect(codes(result)).not.toContain("skill-era-incompatible");
    expect(codes(result)).not.toContain("occupation-era-incompatible");
  });

  it("职员/主管在古典选择 Computer Use 报 skill-era-incompatible，现代不报", () => {
    const computerUse = { type: "standard", definitionId: "computer-use" } as const;
    const classic = finalize(clerk, "classic-1920s", "library-or-computer", computerUse);
    expect(codes(classic)).toContain("skill-era-incompatible");
    expect(classic.errors.filter((issue) => issue.code === "skill-era-incompatible")).toHaveLength(1);
    expect(classic.errors.find((issue) => issue.code === "skill-era-incompatible")?.message)
      .toBe("技能【计算机使用】不适用于古典（1920年代）");
    expect(codes(finalize(clerk, "modern", "library-or-computer", computerUse)))
      .not.toContain("skill-era-incompatible");
  });

  it("custom SkillRef 按父 SkillDefinition 判断时代，并按稳定 key 去重", () => {
    const customScience: SkillRef = {
      type: "custom",
      definitionId: "science",
      specializationId: crypto.randomUUID(),
      displayName: "未来学",
    };
    const definitions = getStandardSkillCatalog().map((definition) =>
      definition.id === "science"
        ? { ...definition, availability: { ...definition.availability, era: "modern-only" as const } }
        : definition,
    );
    const result = finalize(clerk, "classic-1920s", "personal-or-era", customScience, definitions);
    expect(result.errors.filter((issue) => issue.code === "skill-era-incompatible")).toEqual([
      expect.objectContaining({ refKey: `skill:science:custom:${customScience.specializationId}` }),
    ]);
  });

  it("特技飞行员仅兼容古典", () => {
    const stuntPilot = requireOccupation("pilot-stunt");
    expect(codes(finalize(stuntPilot, "classic-1920s"))).not.toContain("occupation-era-incompatible");
    expect(codes(finalize(stuntPilot, "modern"))).toContain("occupation-era-incompatible");
  });

  it("真实现代职业除魅师仅兼容现代", () => {
    const deprogrammer = requireOccupation("deprogrammer");
    expect(codes(finalize(deprogrammer, "modern"))).not.toContain("occupation-era-incompatible");
    expect(codes(finalize(deprogrammer, "classic-1920s"))).toContain("occupation-era-incompatible");
  });

  it("pure finalizer 对缺少时代的 legacy Character 保持兼容", () => {
    const result = finalize(
      clerk,
      undefined,
      "library-or-computer",
      { type: "standard", definitionId: "computer-use" },
    );
    expect(codes(result)).not.toContain("skill-era-incompatible");
    expect(codes(result)).not.toContain("occupation-era-incompatible");
  });
});
