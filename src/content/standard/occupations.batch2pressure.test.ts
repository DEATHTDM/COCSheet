import { describe, expect, it } from "vitest";

import { validateOccupationRequirementSelection } from "../../coc7/rules/occupationSkills";
import type { OccupationPointFormula, OneBranchSkillSelector } from "../../coc7/types/occupation";
import type { SkillRef } from "../../coc7/types/skill";
import { createOccupationRegistry } from "../occupationRegistry";
import { createSkillRegistry } from "../skillRegistry";
import { standardSettingPack } from ".";
import { batch2PressureOccupationDefinitions } from "./occupations/batch2-pressure";
import { standardSkillDefinitions } from "./skills";

const registry = createOccupationRegistry(
  standardSettingPack,
  createSkillRegistry(standardSkillDefinitions),
);

const eduDexOrStr: OccupationPointFormula = {
  type: "sum",
  terms: [
    { type: "attribute", attribute: "EDU", multiplier: 2 },
    { type: "best-of", attributes: ["DEX", "STR"], multiplier: 2 },
  ],
};

const expectedDefinitions = [
  {
    id: "bounty-hunter",
    name: { zh: "赏金猎人", en: "Bounty Hunter" },
    aliases: undefined,
    creditRating: { min: 9, max: 30 },
    requirementIds: [
      "drive-auto",
      "electronics-or-electrical-repair",
      "fighting-or-firearms",
      "social",
      "law",
      "psychology",
      "track",
      "stealth",
    ],
    selectorTypes: ["exact", "one-of", "one-branch", "one-of", "exact", "exact", "exact", "exact"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:73"],
  },
  {
    id: "cowboy",
    name: { zh: "牛仔", en: "Cowboy / Cowgirl" },
    aliases: { en: ["Cowboy", "Cowgirl"] },
    creditRating: { min: 9, max: 20 },
    requirementIds: [
      "dodge",
      "fighting-or-firearms",
      "first-aid-or-natural-world",
      "jump",
      "ride",
      "survival",
      "throw",
      "track",
    ],
    selectorTypes: ["exact", "one-branch", "one-of", "exact", "exact", "specialization-of", "exact", "exact"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:74"],
  },
  {
    id: "tribe-member",
    name: { zh: "部落成员", en: "Tribe Member" },
    aliases: undefined,
    creditRating: { min: 0, max: 15 },
    requirementIds: [
      "natural-world",
      "fighting-or-throw",
      "listen",
      "climb",
      "occult",
      "survival",
      "swim",
      "spot-hidden",
    ],
    selectorTypes: ["exact", "one-branch", "exact", "exact", "exact", "specialization-of", "exact", "exact"],
    sourcePages: [
      "coc7-keeper-rulebook-40th-zh:41",
      "coc7-investigator-handbook-zh-1-21:91",
    ],
  },
] as const;

const brawl: SkillRef = { type: "predefined", definitionId: "fighting", specializationId: "brawl" };
const sword: SkillRef = { type: "predefined", definitionId: "fighting", specializationId: "sword" };
const handgun: SkillRef = { type: "predefined", definitionId: "firearms", specializationId: "handgun" };
const rifleShotgun: SkillRef = {
  type: "predefined",
  definitionId: "firearms",
  specializationId: "rifle-shotgun",
};
const throwRef: SkillRef = { type: "standard", definitionId: "throw" };

function getOneBranch(occupationId: string, requirementId: string): OneBranchSkillSelector {
  const requirement = registry.get(occupationId)?.skillRequirements.find((item) => item.id === requirementId);
  if (!requirement || requirement.selector.type !== "one-branch") {
    throw new Error(`缺少 ${occupationId}:${requirementId} one-branch`);
  }
  return requirement.selector;
}

describe("Phase 5B-2 Batch 2 Engine pressure occupations", () => {
  it("模块只包含三个 pressure cleanup definition", () => {
    expect(batch2PressureOccupationDefinitions.map((occupation) => occupation.id)).toEqual([
      "bounty-hunter",
      "cowboy",
      "tribe-member",
    ]);
  });

  it.each(expectedDefinitions)("锁定 $id 的完整生产机械与来源", (expected) => {
    const occupation = registry.get(expected.id);
    expect(occupation?.name).toEqual(expected.name);
    expect(occupation?.aliases).toEqual(expected.aliases);
    expect(occupation?.creditRating).toEqual(expected.creditRating);
    expect(occupation?.pointFormula).toEqual(eduDexOrStr);
    expect(occupation?.skillRequirements.map((requirement) => requirement.id)).toEqual(expected.requirementIds);
    expect(occupation?.skillRequirements.map((requirement) => requirement.selector.type)).toEqual(expected.selectorTypes);
    expect(occupation?.sourceRefs.map((source) => `${source.sourceId}:${source.page}`)).toEqual(expected.sourcePages);
    expect(occupation?.era).toEqual({ type: "all" });
    expect(occupation?.variantOf).toBeUndefined();
    expect(occupation?.skillRequirements.some((requirement) => requirement.keeperReview)).toBe(false);
  });

  it("Bounty Hunter 与 Cowboy 使用 Fighting 1+ / Firearms 1+ 独占 branch", () => {
    for (const occupationId of ["bounty-hunter", "cowboy"]) {
      const requirement = registry.get(occupationId)?.skillRequirements.find(
        (item) => item.id === "fighting-or-firearms",
      );
      if (!requirement) throw new Error(`缺少 ${occupationId} fighting-or-firearms`);
      expect(requirement.cardinality).toEqual({ min: 1 });
      expect(getOneBranch(occupationId, "fighting-or-firearms").branches).toEqual([
        {
          selector: { type: "specialization-of", definitionId: "fighting" },
          cardinality: { min: 1 },
        },
        {
          selector: { type: "specialization-of", definitionId: "firearms" },
          cardinality: { min: 1 },
        },
      ]);
    }
  });

  it("Tribe Member 使用 Fighting 1+ / Throw exactly one 独占 branch", () => {
    const requirement = registry.get("tribe-member")?.skillRequirements.find(
      (item) => item.id === "fighting-or-throw",
    );
    if (!requirement) throw new Error("缺少 tribe-member fighting-or-throw");
    expect(requirement.cardinality).toEqual({ min: 1 });
    expect(getOneBranch("tribe-member", "fighting-or-throw").branches).toEqual([
      {
        selector: { type: "specialization-of", definitionId: "fighting" },
        cardinality: { min: 1 },
      },
      {
        selector: { type: "exact", ref: { type: "standard", definitionId: "throw" } },
        cardinality: { min: 1, max: 1 },
      },
    ]);
  });

  it("真实 Bounty Hunter requirement 接受 branch 内多选并拒绝混选", () => {
    const requirement = registry.get("bounty-hunter")?.skillRequirements.find(
      (item) => item.id === "fighting-or-firearms",
    );
    if (!requirement) throw new Error("缺少 bounty-hunter fighting-or-firearms");
    expect(validateOccupationRequirementSelection(requirement, [brawl, sword])).toEqual([]);
    expect(validateOccupationRequirementSelection(requirement, [handgun, rifleShotgun])).toEqual([]);
    expect(validateOccupationRequirementSelection(requirement, [brawl, handgun]).map((issue) => issue.code))
      .toContain("selector-mismatch");
  });

  it("真实 Cowboy requirement 接受 Fighting 多选并拒绝混选", () => {
    const requirement = registry.get("cowboy")?.skillRequirements.find(
      (item) => item.id === "fighting-or-firearms",
    );
    if (!requirement) throw new Error("缺少 cowboy fighting-or-firearms");
    expect(validateOccupationRequirementSelection(requirement, [brawl, sword])).toEqual([]);
    expect(validateOccupationRequirementSelection(requirement, [brawl, handgun]).map((issue) => issue.code))
      .toContain("selector-mismatch");
  });

  it("真实 Tribe Member requirement 接受 Throw 或 Fighting 多选并拒绝混选与重复", () => {
    const requirement = registry.get("tribe-member")?.skillRequirements.find(
      (item) => item.id === "fighting-or-throw",
    );
    if (!requirement) throw new Error("缺少 tribe-member fighting-or-throw");
    expect(validateOccupationRequirementSelection(requirement, [throwRef])).toEqual([]);
    expect(validateOccupationRequirementSelection(requirement, [brawl, sword])).toEqual([]);
    expect(validateOccupationRequirementSelection(requirement, [brawl, throwRef]).map((issue) => issue.code))
      .toContain("selector-mismatch");
    expect(validateOccupationRequirementSelection(requirement, [throwRef, throwRef]).map((issue) => issue.code))
      .toEqual(expect.arrayContaining(["duplicate-skill-selection", "selector-mismatch"]));
  });
});
