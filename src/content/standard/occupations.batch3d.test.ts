import { describe, expect, it } from "vitest";

import {
  finalizeSkillAllocation,
  occupationRequirementApprovalSubject,
  validateOccupationRequirementSelection,
} from "../../coc7/rules/occupationSkills";
import type { OccupationPointFormula } from "../../coc7/types/occupation";
import type { SkillRef } from "../../coc7/types/skill";
import { createOccupationRegistry } from "../occupationRegistry";
import { createSkillRegistry } from "../skillRegistry";
import { standardSettingPack } from ".";
import { batch3dOccupationDefinitions } from "./occupations/batch3d";
import { standardSkillDefinitions } from "./skills";

const skills = createSkillRegistry(standardSkillDefinitions);
const registry = createOccupationRegistry(standardSettingPack, skills);

const edu4: OccupationPointFormula = {
  type: "attribute",
  attribute: "EDU",
  multiplier: 4,
};

const edu2Plus = (...attributes: ("STR" | "DEX")[]): OccupationPointFormula => ({
  type: "sum",
  terms: [
    { type: "attribute", attribute: "EDU", multiplier: 2 },
    attributes.length === 1
      ? { type: "attribute", attribute: attributes[0] ?? "STR", multiplier: 2 }
      : { type: "best-of", attributes, multiplier: 2 },
  ],
});

const expectedDefinitions = [
  {
    id: "laborer-unskilled",
    name: { zh: "非熟练工人", en: "Laborer, Unskilled" },
    aliases: undefined,
    variantOf: "laborer",
    category: "technical-labor",
    era: { type: "all" },
    creditRating: { min: 9, max: 30 },
    pointFormula: edu2Plus("DEX", "STR"),
    requirements: [
      ["drive-auto", "exact", 1, 1],
      ["electrical-repair", "exact", 1, 1],
      ["fighting", "specialization-of", 1, null],
      ["first-aid", "exact", 1, 1],
      ["mechanical-repair", "exact", 1, 1],
      ["operate-heavy-machinery", "exact", 1, 1],
      ["throw", "exact", 1, 1],
      ["personal-or-era-specialty", "any-skill", 1, 1],
    ],
    keeperReviewIds: ["personal-or-era-specialty"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:82"],
  },
  {
    id: "laborer-lumberjack",
    name: { zh: "伐木工", en: "Lumberjack" },
    aliases: undefined,
    variantOf: "laborer",
    category: "technical-labor",
    era: { type: "all" },
    creditRating: { min: 9, max: 30 },
    pointFormula: edu2Plus("DEX", "STR"),
    requirements: [
      ["climb", "exact", 1, 1],
      ["dodge", "exact", 1, 1],
      ["chainsaw", "exact", 1, 1],
      ["first-aid", "exact", 1, 1],
      ["jump", "exact", 1, 1],
      ["mechanical-repair", "exact", 1, 1],
      ["natural-world-or-biology-or-botany", "one-of", 1, 1],
      ["throw", "exact", 1, 1],
    ],
    keeperReviewIds: [],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:82"],
  },
  {
    id: "laborer-miner",
    name: { zh: "矿工", en: "Miner" },
    aliases: undefined,
    variantOf: "laborer",
    category: "technical-labor",
    era: { type: "all" },
    creditRating: { min: 9, max: 30 },
    pointFormula: edu2Plus("DEX", "STR"),
    requirements: [
      ["climb", "exact", 1, 1],
      ["geology", "exact", 1, 1],
      ["jump", "exact", 1, 1],
      ["mechanical-repair", "exact", 1, 1],
      ["operate-heavy-machinery", "exact", 1, 1],
      ["stealth", "exact", 1, 1],
      ["spot-hidden", "exact", 1, 1],
      ["personal-or-era-specialty", "any-skill", 1, 1],
    ],
    keeperReviewIds: ["personal-or-era-specialty"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:83"],
  },
  {
    id: "photographer-general",
    name: { zh: "摄影师", en: "Photographer" },
    aliases: undefined,
    variantOf: "photographer",
    category: "media-art",
    era: { type: "all" },
    creditRating: { min: 9, max: 30 },
    pointFormula: edu4,
    requirements: [
      ["photography", "exact", 1, 1],
      ["social", "one-of", 1, 1],
      ["psychology", "exact", 1, 1],
      ["chemistry", "exact", 1, 1],
      ["stealth", "exact", 1, 1],
      ["spot-hidden", "exact", 1, 1],
      ["personal-or-era-specialties", "any-skill", 2, 2],
    ],
    keeperReviewIds: ["personal-or-era-specialties"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:86"],
  },
  {
    id: "photographer-photojournalist",
    name: { zh: "摄影记者", en: "Photojournalist" },
    aliases: undefined,
    variantOf: "photographer",
    category: "media-art",
    era: { type: "all" },
    creditRating: { min: 10, max: 30 },
    pointFormula: edu4,
    requirements: [
      ["photography", "exact", 1, 1],
      ["climb", "exact", 1, 1],
      ["social", "one-of", 1, 1],
      ["other-language", "specialization-of", 1, 1],
      ["psychology", "exact", 1, 1],
      ["chemistry", "exact", 1, 1],
      ["personal-or-era-specialties", "any-skill", 2, 2],
    ],
    keeperReviewIds: ["personal-or-era-specialties"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:86"],
  },
  {
    id: "pilot-general",
    name: { zh: "飞行员", en: "Pilot" },
    aliases: undefined,
    variantOf: "pilot",
    category: "technical-labor",
    era: { type: "all" },
    creditRating: { min: 20, max: 70 },
    pointFormula: edu2Plus("DEX"),
    requirements: [
      ["electrical-repair", "exact", 1, 1],
      ["mechanical-repair", "exact", 1, 1],
      ["navigate", "exact", 1, 1],
      ["operate-heavy-machinery", "exact", 1, 1],
      ["aircraft", "exact", 1, 1],
      ["astronomy", "exact", 1, 1],
      ["personal-or-era-specialties", "any-skill", 2, 2],
    ],
    keeperReviewIds: ["personal-or-era-specialties"],
    sourcePages: [
      "coc7-keeper-rulebook-40th-zh:41",
      "coc7-investigator-handbook-zh-1-21:87",
    ],
  },
  {
    id: "pilot-stunt",
    name: { zh: "特技飞行员", en: "Aviator / Stunt Pilot" },
    aliases: { zh: ["特技飞行员（古典）"], en: ["Stunt Pilot", "Aviator"] },
    variantOf: "pilot",
    category: "technical-labor",
    era: { type: "specific", eraIds: ["classic-1920s"] },
    creditRating: { min: 30, max: 60 },
    pointFormula: edu4,
    requirements: [
      ["accounting", "exact", 1, 1],
      ["electrical-repair", "exact", 1, 1],
      ["listen", "exact", 1, 1],
      ["mechanical-repair", "exact", 1, 1],
      ["navigate", "exact", 1, 1],
      ["aircraft", "exact", 1, 1],
      ["spot-hidden", "exact", 1, 1],
      ["personal-or-era-specialty", "any-skill", 1, 1],
    ],
    keeperReviewIds: ["personal-or-era-specialty"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:87"],
  },
  {
    id: "sailor-naval",
    name: { zh: "军舰海员", en: "Sailor, Naval" },
    aliases: undefined,
    variantOf: "sailor",
    category: "technical-labor",
    era: { type: "all" },
    creditRating: { min: 9, max: 30 },
    pointFormula: edu2Plus("DEX", "STR"),
    requirements: [
      ["electrical-or-mechanical-repair", "one-of", 1, 1],
      ["fighting", "specialization-of", 1, null],
      ["firearms", "specialization-of", 1, null],
      ["first-aid", "exact", 1, 1],
      ["navigate", "exact", 1, 1],
      ["boat", "exact", 1, 1],
      ["survival-sea", "exact", 1, 1],
      ["swim", "exact", 1, 1],
    ],
    keeperReviewIds: [],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:89"],
  },
  {
    id: "sailor-commercial",
    name: { zh: "民用船海员", en: "Sailor, Commercial" },
    aliases: undefined,
    variantOf: "sailor",
    category: "technical-labor",
    era: { type: "all" },
    creditRating: { min: 20, max: 40 },
    pointFormula: edu2Plus("DEX", "STR"),
    requirements: [
      ["first-aid", "exact", 1, 1],
      ["mechanical-repair", "exact", 1, 1],
      ["natural-world", "exact", 1, 1],
      ["navigate", "exact", 1, 1],
      ["social", "one-of", 1, 1],
      ["boat", "exact", 1, 1],
      ["spot-hidden", "exact", 1, 1],
      ["swim", "exact", 1, 1],
    ],
    keeperReviewIds: [],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:89"],
  },
  {
    id: "white-collar-worker-clerk-executive",
    name: { zh: "职员/主管", en: "Clerk / Executive" },
    aliases: undefined,
    variantOf: "white-collar-worker",
    category: "business-professional",
    era: { type: "all" },
    creditRating: { min: 9, max: 20 },
    pointFormula: edu4,
    requirements: [
      ["accounting", "exact", 1, 1],
      ["language", "one-of", 1, 1],
      ["law", "exact", 1, 1],
      ["library-or-computer", "one-of", 1, 1],
      ["listen", "exact", 1, 1],
      ["social", "one-of", 1, 1],
      ["personal-or-era", "any-skill", 2, 2],
    ],
    keeperReviewIds: ["personal-or-era"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:91"],
  },
  {
    id: "white-collar-worker-middle-senior-manager",
    name: { zh: "中层、高层管理人员", en: "Middle / Senior Manager" },
    aliases: {
      zh: ["中层管理人员", "高层管理人员"],
      en: ["Middle Manager", "Senior Manager"],
    },
    variantOf: "white-collar-worker",
    category: "business-professional",
    era: { type: "all" },
    creditRating: { min: 20, max: 80 },
    pointFormula: edu4,
    requirements: [
      ["accounting", "exact", 1, 1],
      ["other-language", "specialization-of", 1, 1],
      ["law", "exact", 1, 1],
      ["social", "one-of", 2, 2],
      ["psychology", "exact", 1, 1],
      ["personal-or-era-specialties", "any-skill", 2, 2],
    ],
    keeperReviewIds: ["personal-or-era-specialties"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:93"],
  },
] as const;

const standard = (definitionId: string): SkillRef => ({ type: "standard", definitionId });
const predefined = (definitionId: string, specializationId: string): SkillRef => ({
  type: "predefined",
  definitionId,
  specializationId,
});
const custom = (definitionId: string, displayName: string): SkillRef => ({
  type: "custom",
  definitionId,
  specializationId: crypto.randomUUID(),
  displayName,
});

function selectedRequirement(occupationId: string, requirementId: string) {
  const selected = registry.get(occupationId)?.skillRequirements.find(
    (candidate) => candidate.id === requirementId,
  );
  if (!selected) throw new Error(`缺少 ${occupationId}:${requirementId}`);
  return selected;
}

function issueCodes(occupationId: string, requirementId: string, refs: readonly SkillRef[]) {
  return validateOccupationRequirementSelection(selectedRequirement(occupationId, requirementId), refs)
    .map((issue) => issue.code);
}

describe("Phase 5B-2 Batch 3D occupations", () => {
  it.each(expectedDefinitions)("锁定 $id 的名称、variant、category、era、来源与完整机械", (expected) => {
    const occupation = registry.get(expected.id);
    expect(occupation?.name).toEqual(expected.name);
    expect(occupation?.aliases).toEqual(expected.aliases);
    expect(occupation?.variantOf).toBe(expected.variantOf);
    expect(occupation?.category).toBe(expected.category);
    expect(occupation?.era).toEqual(expected.era);
    expect(occupation?.creditRating).toEqual(expected.creditRating);
    expect(occupation?.pointFormula).toEqual(expected.pointFormula);
    expect(occupation?.skillRequirements.map((candidate) => [
      candidate.id,
      candidate.selector.type,
      candidate.cardinality.min,
      candidate.cardinality.max ?? null,
    ])).toEqual(expected.requirements);
    expect(occupation?.skillRequirements.filter((candidate) => candidate.keeperReview).map(
      (candidate) => candidate.id,
    )).toEqual(expected.keeperReviewIds);
    expect(occupation?.sourceRefs.map((source) => `${source.sourceId}:${source.page}`))
      .toEqual(expected.sourcePages);
  });

  it("导入 11 个 definition，并以两个真实 variant 完成 White-collar family", () => {
    expect(batch3dOccupationDefinitions).toHaveLength(11);
    const expectedFamilyCounts = new Map([
      ["laborer", 3],
      ["photographer", 2],
      ["pilot", 2],
      ["sailor", 2],
      ["white-collar-worker", 2],
    ]);
    for (const [family, count] of expectedFamilyCounts) {
      expect(registry.get(family)).toBeUndefined();
      expect(registry.definitions.filter((occupation) => occupation.variantOf === family))
        .toHaveLength(count);
    }
    expect(registry.get("white-collar-worker-clerk-executive")).toBeDefined();
    expect(registry.get("white-collar-worker")).toBeUndefined();
  });

  it("Unskilled generic Fighting 接受多个不同专业并拒绝重复", () => {
    const brawl = predefined("fighting", "brawl");
    const sword = predefined("fighting", "sword");
    expect(issueCodes("laborer-unskilled", "fighting", [brawl])).toEqual([]);
    expect(issueCodes("laborer-unskilled", "fighting", [brawl, sword])).toEqual([]);
    expect(issueCodes("laborer-unskilled", "fighting", [brawl, brawl]))
      .toContain("duplicate-skill-selection");
  });

  it("Lumberjack 固定 Chainsaw，并将 Natural World / Biology / Botany 限定为三选一", () => {
    expect(issueCodes("laborer-lumberjack", "chainsaw", [predefined("fighting", "chainsaw")]))
      .toEqual([]);
    expect(issueCodes("laborer-lumberjack", "chainsaw", [predefined("fighting", "brawl")]))
      .toContain("selector-mismatch");
    for (const ref of [
      standard("natural-world"),
      predefined("science", "biology"),
      predefined("science", "botany"),
    ]) {
      expect(issueCodes("laborer-lumberjack", "natural-world-or-biology-or-botany", [ref]))
        .toEqual([]);
    }
    expect(issueCodes(
      "laborer-lumberjack",
      "natural-world-or-biology-or-botany",
      [predefined("science", "chemistry")],
    )).toContain("selector-mismatch");
  });

  it("Miner 只接受 predefined Science (Geology)", () => {
    expect(issueCodes("laborer-miner", "geology", [predefined("science", "geology")]))
      .toEqual([]);
    expect(issueCodes("laborer-miner", "geology", [predefined("science", "chemistry")]))
      .toContain("selector-mismatch");
  });

  it("Photographer variants 固定 Photography / Chemistry，并锁定确定性技能差异", () => {
    for (const id of ["photographer-general", "photographer-photojournalist"] as const) {
      expect(issueCodes(id, "photography", [predefined("art-craft", "photography")])).toEqual([]);
      expect(issueCodes(id, "chemistry", [predefined("science", "chemistry")])).toEqual([]);
    }
    const generalIds = registry.get("photographer-general")?.skillRequirements.map(({ id }) => id);
    const journalistIds = registry.get("photographer-photojournalist")?.skillRequirements.map(({ id }) => id);
    expect(generalIds).toEqual(expect.arrayContaining(["stealth", "spot-hidden"]));
    expect(generalIds).not.toEqual(expect.arrayContaining(["climb", "other-language"]));
    expect(journalistIds).toEqual(expect.arrayContaining(["climb", "other-language"]));
    expect(journalistIds).not.toEqual(expect.arrayContaining(["stealth", "spot-hidden"]));
  });

  it("两书 general Pilot 继续共享一个 variant；Stunt 只引用 Handbook 且为 classic-only", () => {
    expect(registry.get("pilot-general")?.sourceRefs.map(({ sourceId }) => sourceId)).toEqual([
      "coc7-keeper-rulebook-40th-zh",
      "coc7-investigator-handbook-zh-1-21",
    ]);
    expect(registry.get("pilot-stunt")?.sourceRefs.map(({ sourceId }) => sourceId))
      .toEqual(["coc7-investigator-handbook-zh-1-21"]);
    expect(registry.definitions.filter((occupation) =>
      occupation.variantOf === "pilot" && occupation.name.en === "Pilot"))
      .toHaveLength(1);
    expect(registry.list({ era: "modern" }).map(({ id }) => id)).not.toContain("pilot-stunt");
    expect(registry.list({ era: "classic-1920s" }).map(({ id }) => id)).toContain("pilot-stunt");
    expect(registry.get("pilot-general")?.skillRequirements.map(({ id }) => id))
      .toEqual(expect.arrayContaining(["operate-heavy-machinery", "astronomy"]));
    expect(registry.get("pilot-stunt")?.skillRequirements.map(({ id }) => id))
      .toEqual(expect.arrayContaining(["accounting", "listen", "spot-hidden"]));
  });

  it("Naval Sailor 将 repair 二选一与 generic Fighting / Firearms 分开验证", () => {
    expect(issueCodes("sailor-naval", "electrical-or-mechanical-repair", [standard("electrical-repair")]))
      .toEqual([]);
    expect(issueCodes("sailor-naval", "electrical-or-mechanical-repair", [standard("mechanical-repair")]))
      .toEqual([]);
    expect(issueCodes("sailor-naval", "electrical-or-mechanical-repair", [
      standard("electrical-repair"),
      standard("mechanical-repair"),
    ])).toContain("requirement-cardinality");
    expect(issueCodes("sailor-naval", "fighting", [
      predefined("fighting", "brawl"),
      predefined("fighting", "sword"),
    ])).toEqual([]);
    expect(issueCodes("sailor-naval", "firearms", [
      predefined("firearms", "handgun"),
      predefined("firearms", "rifle-shotgun"),
    ])).toEqual([]);
    expect(issueCodes("sailor-naval", "firearms", [
      predefined("firearms", "handgun"),
      predefined("firearms", "handgun"),
    ])).toContain("duplicate-skill-selection");
  });

  it("Naval 固定 Boat 与 Survival (Sea)，Commercial 不继承战斗或生存需求", () => {
    expect(issueCodes("sailor-naval", "boat", [predefined("pilot", "boat")])).toEqual([]);
    expect(issueCodes("sailor-naval", "survival-sea", [predefined("survival", "sea")])).toEqual([]);
    expect(issueCodes("sailor-naval", "survival-sea", [predefined("survival", "wilderness")]))
      .toContain("selector-mismatch");
    const commercialIds = registry.get("sailor-commercial")?.skillRequirements.map(({ id }) => id);
    expect(commercialIds).toEqual(expect.arrayContaining(["natural-world", "social", "spot-hidden"]));
    expect(commercialIds).not.toEqual(expect.arrayContaining(["fighting", "firearms", "survival-sea"]));
  });

  it("Manager 锁定 Other Language、两项 social、Psychology 与两项 personal/era", () => {
    expect(selectedRequirement("white-collar-worker-middle-senior-manager", "other-language").selector)
      .toEqual({ type: "specialization-of", definitionId: "language-other" });
    expect(selectedRequirement("white-collar-worker-middle-senior-manager", "social").cardinality)
      .toEqual({ min: 2, max: 2 });
    expect(selectedRequirement("white-collar-worker-middle-senior-manager", "personal-or-era-specialties"))
      .toMatchObject({ cardinality: { min: 2, max: 2 }, keeperReview: true });
    expect(registry.get("white-collar-worker-middle-senior-manager")?.skillRequirements.map(({ id }) => id))
      .toContain("psychology");
  });

  it("Clerk Language exactly-one 接受 Own 或 Other，并拒绝混选、两项 Other 与无关专业", () => {
    const ownLanguage = custom("language-own", "Chinese");
    const otherLanguage = custom("language-other", "English");
    const secondOtherLanguage = custom("language-other", "Spanish");
    const chemistry = predefined("science", "chemistry");

    expect(selectedRequirement("white-collar-worker-clerk-executive", "language").selector)
      .toEqual({
        type: "one-of",
        selectors: [
          { type: "specialization-of", definitionId: "language-own" },
          { type: "specialization-of", definitionId: "language-other" },
        ],
      });
    expect(issueCodes("white-collar-worker-clerk-executive", "language", [ownLanguage]))
      .toEqual([]);
    expect(issueCodes("white-collar-worker-clerk-executive", "language", [otherLanguage]))
      .toEqual([]);
    expect(issueCodes(
      "white-collar-worker-clerk-executive",
      "language",
      [ownLanguage, otherLanguage],
    )).toContain("requirement-cardinality");
    expect(issueCodes(
      "white-collar-worker-clerk-executive",
      "language",
      [otherLanguage, secondOtherLanguage],
    )).toContain("requirement-cardinality");
    expect(issueCodes("white-collar-worker-clerk-executive", "language", [chemistry]))
      .toContain("selector-mismatch");
    expect(issueCodes("white-collar-worker-clerk-executive", "language", [standard("language-own")]))
      .toContain("selector-mismatch");
  });

  it("Clerk Library / Computer exactly-one 接受任一项并拒绝同时选择", () => {
    const libraryUse = standard("library-use");
    const computerUse = standard("computer-use");

    expect(selectedRequirement("white-collar-worker-clerk-executive", "library-or-computer").selector)
      .toEqual({
        type: "one-of",
        selectors: [
          { type: "exact", ref: libraryUse },
          { type: "exact", ref: computerUse },
        ],
      });
    expect(issueCodes("white-collar-worker-clerk-executive", "library-or-computer", [libraryUse]))
      .toEqual([]);
    expect(issueCodes("white-collar-worker-clerk-executive", "library-or-computer", [computerUse]))
      .toEqual([]);
    expect(issueCodes(
      "white-collar-worker-clerk-executive",
      "library-or-computer",
      [libraryUse, computerUse],
    )).toContain("requirement-cardinality");
  });

  it("Clerk personal/era 要求恰好两项，并在未批准时产生 occupation-scoped fuzzy approval", () => {
    const one = [standard("history")];
    const two = [standard("history"), standard("natural-world")];
    const three = [...two, standard("occult")];

    expect(issueCodes("white-collar-worker-clerk-executive", "personal-or-era", one))
      .toContain("requirement-cardinality");
    expect(issueCodes("white-collar-worker-clerk-executive", "personal-or-era", two))
      .toEqual([]);
    expect(issueCodes("white-collar-worker-clerk-executive", "personal-or-era", three))
      .toContain("requirement-cardinality");

    const occupation = registry.get("white-collar-worker-clerk-executive");
    if (!occupation) throw new Error("缺少 Clerk / Executive production definition");
    const result = finalizeSkillAllocation({
      character: {
        version: 1,
        id: crypto.randomUUID(),
        name: "测试调查员",
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
      },
      occupation: {
        kind: "catalog",
        selectedOccupationId: occupation.id,
        definitionSnapshot: occupation,
      },
      state: {
        requirementSelections: [{ requirementId: "personal-or-era", refs: two }],
        allocations: [],
        keeperApprovals: [],
      },
      skillDefinitions: standardSkillDefinitions,
    });
    expect(result.approvals).toContainEqual(expect.objectContaining({
      reason: "fuzzy-requirement",
      subjectId: occupationRequirementApprovalSubject(occupation.id, "personal-or-era"),
    }));
  });
});
