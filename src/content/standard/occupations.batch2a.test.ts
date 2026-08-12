import { describe, expect, it } from "vitest";

import { validateOccupationRequirementSelection } from "../../coc7/rules/occupationSkills";
import type { OccupationPointFormula } from "../../coc7/types/occupation";
import type { SkillRef } from "../../coc7/types/skill";
import { createOccupationRegistry } from "../occupationRegistry";
import { createSkillRegistry } from "../skillRegistry";
import { standardSettingPack } from ".";
import { batch2aOccupationDefinitions } from "./occupations/batch2a";
import { standardSkillDefinitions } from "./skills";

const skills = createSkillRegistry(standardSkillDefinitions);
const registry = createOccupationRegistry(standardSettingPack, skills);

const edu4: OccupationPointFormula = {
  type: "attribute",
  attribute: "EDU",
  multiplier: 4,
};

const edu2Best = (...attributes: ("STR" | "DEX" | "APP")[]): OccupationPointFormula => ({
  type: "sum",
  terms: [
    { type: "attribute", attribute: "EDU", multiplier: 2 },
    { type: "best-of", attributes, multiplier: 2 },
  ],
});

const expectedDefinitions = [
  {
    id: "agency-detective",
    name: { zh: "事务所侦探", en: "Agency Detective" },
    aliases: undefined,
    creditRating: { min: 20, max: 45 },
    pointFormula: edu2Best("DEX", "STR"),
    requirements: [
      ["social", "one-of", 1, 1],
      ["brawl", "exact", 1, 1],
      ["firearms", "specialization-of", 1, null],
      ["law", "exact", 1, 1],
      ["library-use", "exact", 1, 1],
      ["psychology", "exact", 1, 1],
      ["stealth", "exact", 1, 1],
      ["track", "exact", 1, 1],
    ],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:71"],
    era: { type: "all" },
    variantOf: undefined,
  },
  {
    id: "alienist",
    name: { zh: "精神病医生（古典）", en: "Alienist" },
    aliases: { zh: ["精神病医生"] },
    creditRating: { min: 10, max: 60 },
    pointFormula: edu4,
    requirements: [
      ["law", "exact", 1, 1],
      ["listen", "exact", 1, 1],
      ["medicine", "exact", 1, 1],
      ["other-language", "specialization-of", 1, 1],
      ["psychoanalysis", "exact", 1, 1],
      ["psychology", "exact", 1, 1],
      ["biology", "exact", 1, 1],
      ["chemistry", "exact", 1, 1],
    ],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:71"],
    era: { type: "specific", eraIds: ["classic-1920s"] },
    variantOf: undefined,
  },
  {
    id: "antique-dealer",
    name: { zh: "古董商", en: "Antique Dealer" },
    aliases: undefined,
    creditRating: { min: 30, max: 50 },
    pointFormula: edu4,
    requirements: [
      ["accounting", "exact", 1, 1],
      ["appraise", "exact", 1, 1],
      ["drive-auto", "exact", 1, 1],
      ["social", "one-of", 2, 2],
      ["history", "exact", 1, 1],
      ["library-use", "exact", 1, 1],
      ["navigate", "exact", 1, 1],
    ],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:71"],
    era: { type: "all" },
    variantOf: undefined,
  },
  {
    id: "archaeologist",
    name: { zh: "考古学家（原作向）", en: "Archaeologist" },
    aliases: { zh: ["考古学家"] },
    creditRating: { min: 10, max: 40 },
    pointFormula: edu4,
    requirements: [
      ["appraise", "exact", 1, 1],
      ["archaeology", "exact", 1, 1],
      ["history", "exact", 1, 1],
      ["other-language", "specialization-of", 1, 1],
      ["library-use", "exact", 1, 1],
      ["spot-hidden", "exact", 1, 1],
      ["mechanical-repair", "exact", 1, 1],
      ["navigate-or-science", "one-of", 1, 1],
    ],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:72"],
    era: { type: "all" },
    variantOf: undefined,
  },
  {
    id: "architect",
    name: { zh: "建筑师", en: "Architect" },
    aliases: undefined,
    creditRating: { min: 30, max: 70 },
    pointFormula: edu4,
    requirements: [
      ["accounting", "exact", 1, 1],
      ["technical-drawing", "named-custom-specialization", 1, 1],
      ["law", "exact", 1, 1],
      ["own-language", "specialization-of", 1, 1],
      ["computer-or-library", "one-of", 1, 1],
      ["persuade", "exact", 1, 1],
      ["psychology", "exact", 1, 1],
      ["mathematics", "exact", 1, 1],
    ],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:72"],
    era: { type: "all" },
    variantOf: undefined,
  },
  {
    id: "asylum-attendant",
    name: { zh: "精神病院看护", en: "Asylum Attendant" },
    aliases: undefined,
    creditRating: { min: 8, max: 20 },
    pointFormula: edu2Best("DEX", "STR"),
    requirements: [
      ["dodge", "exact", 1, 1],
      ["brawl", "exact", 1, 1],
      ["first-aid", "exact", 1, 1],
      ["social", "one-of", 2, 2],
      ["listen", "exact", 1, 1],
      ["psychology", "exact", 1, 1],
      ["stealth", "exact", 1, 1],
    ],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:72"],
    era: { type: "all" },
    variantOf: undefined,
  },
  {
    id: "big-game-hunter",
    name: { zh: "猎人", en: "Big Game Hunter" },
    aliases: undefined,
    creditRating: { min: 20, max: 50 },
    pointFormula: edu2Best("DEX", "STR"),
    requirements: [
      ["firearms", "specialization-of", 1, null],
      ["listen-or-spot-hidden", "one-of", 1, 1],
      ["natural-world", "exact", 1, 1],
      ["navigate", "exact", 1, 1],
      ["language-or-survival", "one-of", 1, 1],
      ["biology-or-botany", "one-of", 1, 1],
      ["stealth", "exact", 1, 1],
      ["track", "exact", 1, 1],
    ],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:73"],
    era: { type: "all" },
    variantOf: undefined,
  },
  {
    id: "book-dealer",
    name: { zh: "书商", en: "Book Dealer" },
    aliases: undefined,
    creditRating: { min: 20, max: 40 },
    pointFormula: edu4,
    requirements: [
      ["accounting", "exact", 1, 1],
      ["appraise", "exact", 1, 1],
      ["drive-auto", "exact", 1, 1],
      ["history", "exact", 1, 1],
      ["library-use", "exact", 1, 1],
      ["own-language", "specialization-of", 1, 1],
      ["other-language", "specialization-of", 1, 1],
      ["social", "one-of", 1, 1],
    ],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:73"],
    era: { type: "all" },
    variantOf: undefined,
  },
  {
    id: "bounty-hunter",
    name: { zh: "赏金猎人", en: "Bounty Hunter" },
    aliases: undefined,
    creditRating: { min: 9, max: 30 },
    pointFormula: edu2Best("DEX", "STR"),
    requirements: [
      ["drive-auto", "exact", 1, 1],
      ["electronics-or-electrical-repair", "one-of", 1, 1],
      ["fighting-or-firearms", "one-of", 1, 1],
      ["social", "one-of", 1, 1],
      ["law", "exact", 1, 1],
      ["psychology", "exact", 1, 1],
      ["track", "exact", 1, 1],
      ["stealth", "exact", 1, 1],
    ],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:73"],
    era: { type: "all" },
    variantOf: undefined,
  },
  {
    id: "cowboy",
    name: { zh: "牛仔", en: "Cowboy / Cowgirl" },
    aliases: { zh: ["女牛仔"], en: ["Cowboy", "Cowgirl"] },
    creditRating: { min: 9, max: 20 },
    pointFormula: edu2Best("DEX", "STR"),
    requirements: [
      ["dodge", "exact", 1, 1],
      ["fighting-or-firearms", "one-of", 1, 1],
      ["first-aid-or-natural-world", "one-of", 1, 1],
      ["jump", "exact", 1, 1],
      ["ride", "exact", 1, 1],
      ["survival", "specialization-of", 1, 1],
      ["throw", "exact", 1, 1],
      ["track", "exact", 1, 1],
    ],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:74"],
    era: { type: "all" },
    variantOf: undefined,
  },
  {
    id: "explorer",
    name: { zh: "探险家（古典）", en: "Explorer" },
    aliases: { zh: ["探险家"] },
    creditRating: { min: 55, max: 80 },
    pointFormula: edu2Best("APP", "DEX", "STR"),
    requirements: [
      ["climb-or-swim", "one-of", 1, 1],
      ["firearms", "specialization-of", 1, null],
      ["history", "exact", 1, 1],
      ["jump", "exact", 1, 1],
      ["natural-world", "exact", 1, 1],
      ["navigate", "exact", 1, 1],
      ["other-language", "specialization-of", 1, 1],
      ["survival", "specialization-of", 1, 1],
    ],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:80"],
    era: { type: "specific", eraIds: ["classic-1920s"] },
    variantOf: undefined,
  },
  {
    id: "firefighter",
    name: { zh: "消防员", en: "Firefighter" },
    aliases: undefined,
    creditRating: { min: 9, max: 30 },
    pointFormula: edu2Best("DEX", "STR"),
    requirements: [
      ["climb", "exact", 1, 1],
      ["dodge", "exact", 1, 1],
      ["drive-auto", "exact", 1, 1],
      ["first-aid", "exact", 1, 1],
      ["jump", "exact", 1, 1],
      ["mechanical-repair", "exact", 1, 1],
      ["operate-heavy-machinery", "exact", 1, 1],
      ["throw", "exact", 1, 1],
    ],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:80"],
    era: { type: "all" },
    variantOf: undefined,
  },
  {
    id: "forensic-surgeon",
    name: { zh: "法医", en: "Forensic Surgeon" },
    aliases: undefined,
    creditRating: { min: 40, max: 60 },
    pointFormula: edu4,
    requirements: [
      ["latin", "named-custom-specialization", 1, 1],
      ["library-use", "exact", 1, 1],
      ["medicine", "exact", 1, 1],
      ["persuade", "exact", 1, 1],
      ["biology", "exact", 1, 1],
      ["forensics", "exact", 1, 1],
      ["pharmacy", "exact", 1, 1],
      ["spot-hidden", "exact", 1, 1],
    ],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:80"],
    era: { type: "all" },
    variantOf: undefined,
  },
  {
    id: "lawyer",
    name: { zh: "律师", en: "Lawyer" },
    aliases: undefined,
    creditRating: { min: 30, max: 80 },
    pointFormula: edu4,
    requirements: [
      ["accounting", "exact", 1, 1],
      ["law", "exact", 1, 1],
      ["library-use", "exact", 1, 1],
      ["social", "one-of", 2, 2],
      ["psychology", "exact", 1, 1],
      ["other-skills", "any-skill", 2, 2],
    ],
    sourcePages: ["coc7-keeper-rulebook-40th-zh:41", "coc7-investigator-handbook-zh-1-21:83"],
    era: { type: "all" },
    variantOf: undefined,
  },
  {
    id: "nurse",
    name: { zh: "护士", en: "Nurse" },
    aliases: undefined,
    creditRating: { min: 9, max: 30 },
    pointFormula: edu4,
    requirements: [
      ["first-aid", "exact", 1, 1],
      ["listen", "exact", 1, 1],
      ["medicine", "exact", 1, 1],
      ["social", "one-of", 1, 1],
      ["psychology", "exact", 1, 1],
      ["biology", "exact", 1, 1],
      ["chemistry", "exact", 1, 1],
      ["spot-hidden", "exact", 1, 1],
    ],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:84"],
    era: { type: "all" },
    variantOf: undefined,
  },
  {
    id: "police-officer",
    name: { zh: "警察", en: "Police Officer" },
    aliases: {
      zh: ["警官", "警方(原作向)-巡警"],
      en: ["Uniformed Police Officer"],
    },
    creditRating: { min: 9, max: 30 },
    pointFormula: edu2Best("DEX", "STR"),
    requirements: [
      ["brawl", "exact", 1, 1],
      ["firearms", "specialization-of", 1, null],
      ["first-aid", "exact", 1, 1],
      ["social", "one-of", 1, 1],
      ["law", "exact", 1, 1],
      ["psychology", "exact", 1, 1],
      ["spot-hidden", "exact", 1, 1],
      ["drive-auto-or-ride", "one-of", 1, 1],
    ],
    sourcePages: ["coc7-keeper-rulebook-40th-zh:41", "coc7-investigator-handbook-zh-1-21:87"],
    era: { type: "all" },
    variantOf: "police",
  },
] as const;

function requirement(occupationId: string, requirementId: string) {
  const selected = registry.get(occupationId)?.skillRequirements.find(
    (candidate) => candidate.id === requirementId,
  );
  if (!selected) throw new Error(`缺少 ${occupationId}:${requirementId}`);
  return selected;
}

describe("Phase 5B-2 Batch 2A occupations", () => {
  it.each(expectedDefinitions)("锁定 $id 的名称、来源与完整机械", (expected) => {
    const occupation = registry.get(expected.id);
    expect(occupation?.name).toEqual(expected.name);
    expect(occupation?.aliases).toEqual(expected.aliases);
    expect(occupation?.creditRating).toEqual(expected.creditRating);
    expect(occupation?.pointFormula).toEqual(expected.pointFormula);
    expect(occupation?.skillRequirements.map((candidate) => [
      candidate.id,
      candidate.selector.type,
      candidate.cardinality.min,
      candidate.cardinality.max ?? null,
    ])).toEqual(expected.requirements);
    expect(occupation?.skillRequirements.filter((candidate) => candidate.keeperReview).map((candidate) => candidate.id))
      .toEqual([]);
    expect(occupation?.sourceRefs.map((source) => `${source.sourceId}:${source.page}`))
      .toEqual(expected.sourcePages);
    expect(occupation?.era).toEqual(expected.era);
    expect(occupation?.variantOf).toBe(expected.variantOf);
  });

  it("本批恰好导入 16 个 definition，并保持 police-detective 不变", () => {
    expect(batch2aOccupationDefinitions).toHaveLength(16);
    expect(registry.get("police-detective")).toMatchObject({
      id: "police-detective",
      name: { zh: "警探", en: "Police Detective" },
      aliases: { zh: ["警探（原作向）"] },
      creditRating: { min: 20, max: 50 },
    });
    expect(registry.get("police-detective")?.variantOf).toBeUndefined();
  });

  it("choose-two social 接受两项不同技能并拒绝错误 cardinality、selector 与重复 SkillRef", () => {
    const social = requirement("antique-dealer", "social");
    const charm: SkillRef = { type: "standard", definitionId: "charm" };
    const persuade: SkillRef = { type: "standard", definitionId: "persuade" };
    const law: SkillRef = { type: "standard", definitionId: "law" };

    expect(validateOccupationRequirementSelection(social, [charm, persuade])).toEqual([]);
    expect(validateOccupationRequirementSelection(social, [charm]).map((issue) => issue.code))
      .toContain("requirement-cardinality");
    expect(validateOccupationRequirementSelection(social, [charm, law]).map((issue) => issue.code))
      .toContain("selector-mismatch");
    expect(validateOccupationRequirementSelection(social, [charm, charm]).map((issue) => issue.code))
      .toContain("duplicate-skill-selection");
  });

  it("Fighting or Firearms 接受任一开放专业类别并拒绝同时消费两类或错误技能", () => {
    const combat = requirement("bounty-hunter", "fighting-or-firearms");
    const brawl: SkillRef = { type: "predefined", definitionId: "fighting", specializationId: "brawl" };
    const handgun: SkillRef = { type: "predefined", definitionId: "firearms", specializationId: "handgun" };
    const law: SkillRef = { type: "standard", definitionId: "law" };

    expect(validateOccupationRequirementSelection(combat, [brawl])).toEqual([]);
    expect(validateOccupationRequirementSelection(combat, [handgun])).toEqual([]);
    expect(validateOccupationRequirementSelection(combat, [brawl, handgun]).map((issue) => issue.code))
      .toContain("requirement-cardinality");
    expect(validateOccupationRequirementSelection(combat, [law]).map((issue) => issue.code))
      .toContain("selector-mismatch");
  });

  it("generic Firearms 接受多个不同专业并拒绝错误 selector 与重复 SkillRef", () => {
    const firearms = requirement("agency-detective", "firearms");
    const handgun: SkillRef = { type: "predefined", definitionId: "firearms", specializationId: "handgun" };
    const rifle: SkillRef = { type: "predefined", definitionId: "firearms", specializationId: "rifle-shotgun" };
    const brawl: SkillRef = { type: "predefined", definitionId: "fighting", specializationId: "brawl" };

    expect(validateOccupationRequirementSelection(firearms, [handgun, rifle])).toEqual([]);
    expect(validateOccupationRequirementSelection(firearms, [brawl]).map((issue) => issue.code))
      .toContain("selector-mismatch");
    expect(validateOccupationRequirementSelection(firearms, [handgun, handgun]).map((issue) => issue.code))
      .toContain("duplicate-skill-selection");
  });

  it("固定 Fighting (Brawl) 只接受 canonical Brawl specialization", () => {
    const brawlRequirement = requirement("police-officer", "brawl");
    const brawl: SkillRef = { type: "predefined", definitionId: "fighting", specializationId: "brawl" };
    const sword: SkillRef = { type: "predefined", definitionId: "fighting", specializationId: "sword" };

    expect(validateOccupationRequirementSelection(brawlRequirement, [brawl])).toEqual([]);
    expect(validateOccupationRequirementSelection(brawlRequirement, [sword]).map((issue) => issue.code))
      .toContain("selector-mismatch");
  });

  it("one-of 中的 specialization-of 接受 Navigation 或任一 Science，并拒绝错误与超量选择", () => {
    const choice = requirement("archaeologist", "navigate-or-science");
    const navigate: SkillRef = { type: "standard", definitionId: "navigate" };
    const geology: SkillRef = { type: "predefined", definitionId: "science", specializationId: "geology" };
    const language: SkillRef = {
      type: "custom",
      definitionId: "language-other",
      specializationId: "00000000-0000-4000-8000-000000000001",
      displayName: "Latin",
    };

    expect(validateOccupationRequirementSelection(choice, [navigate])).toEqual([]);
    expect(validateOccupationRequirementSelection(choice, [geology])).toEqual([]);
    expect(validateOccupationRequirementSelection(choice, [language]).map((issue) => issue.code))
      .toContain("selector-mismatch");
    expect(validateOccupationRequirementSelection(choice, [navigate, geology]).map((issue) => issue.code))
      .toContain("requirement-cardinality");
  });

  it("Language (Own) 保留 custom specialization identity 并拒绝 Language (Other)", () => {
    const ownLanguage = requirement("architect", "own-language");
    const own: SkillRef = {
      type: "custom",
      definitionId: "language-own",
      specializationId: "00000000-0000-4000-8000-000000000002",
      displayName: "粤语",
    };
    const other: SkillRef = {
      type: "custom",
      definitionId: "language-other",
      specializationId: "00000000-0000-4000-8000-000000000003",
      displayName: "Latin",
    };

    expect(validateOccupationRequirementSelection(ownLanguage, [own])).toEqual([]);
    expect(validateOccupationRequirementSelection(ownLanguage, [other]).map((issue) => issue.code))
      .toContain("selector-mismatch");
  });
});
