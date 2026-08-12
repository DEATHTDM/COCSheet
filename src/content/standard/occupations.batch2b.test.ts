import { describe, expect, it } from "vitest";

import { validateOccupationRequirementSelection } from "../../coc7/rules/occupationSkills";
import type { OccupationPointFormula } from "../../coc7/types/occupation";
import type { SkillRef } from "../../coc7/types/skill";
import { createOccupationRegistry } from "../occupationRegistry";
import { createSkillRegistry } from "../skillRegistry";
import { standardSettingPack } from ".";
import { batch2bOccupationDefinitions } from "./occupations/batch2b";
import { standardSkillDefinitions } from "./skills";

const registry = createOccupationRegistry(
  standardSettingPack,
  createSkillRegistry(standardSkillDefinitions),
);

const edu4: OccupationPointFormula = {
  type: "attribute",
  attribute: "EDU",
  multiplier: 4,
};

const edu2Attribute = (attribute: "STR" | "APP"): OccupationPointFormula => ({
  type: "sum",
  terms: [
    { type: "attribute", attribute: "EDU", multiplier: 2 },
    { type: "attribute", attribute, multiplier: 2 },
  ],
});

const edu2Best = (
  ...attributes: ("DEX" | "APP" | "POW" | "STR")[]
): OccupationPointFormula => ({
  type: "sum",
  terms: [
    { type: "attribute", attribute: "EDU", multiplier: 2 },
    { type: "best-of", attributes, multiplier: 2 },
  ],
});

const expectedDefinitions = [
  {
    id: "gambler",
    name: { zh: "赌徒", en: "Gambler" },
    aliases: undefined,
    creditRating: { min: 8, max: 50 },
    pointFormula: edu2Best("APP", "DEX"),
    requirements: [
      ["accounting", "exact", 1, 1],
      ["acting", "exact", 1, 1],
      ["social", "one-of", 2, 2],
      ["listen", "exact", 1, 1],
      ["psychology", "exact", 1, 1],
      ["sleight-of-hand", "exact", 1, 1],
      ["spot-hidden", "exact", 1, 1],
    ],
    keeperReviewIds: [],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:81"],
  },
  {
    id: "gentleman-lady",
    name: { zh: "绅士、淑女", en: "Gentleman / Lady" },
    aliases: undefined,
    creditRating: { min: 40, max: 90 },
    pointFormula: edu2Attribute("APP"),
    requirements: [
      ["art-craft", "specialization-of", 1, 1],
      ["social", "one-of", 2, 2],
      ["rifle-shotgun", "exact", 1, 1],
      ["history", "exact", 1, 1],
      ["other-language", "specialization-of", 1, 1],
      ["navigate", "exact", 1, 1],
      ["ride", "exact", 1, 1],
    ],
    keeperReviewIds: [],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:81"],
  },
  {
    id: "hospital-orderly",
    name: { zh: "勤杂护工", en: "Hospital Orderly" },
    aliases: undefined,
    creditRating: { min: 6, max: 15 },
    pointFormula: edu2Attribute("STR"),
    requirements: [
      ["electrical-repair", "exact", 1, 1],
      ["social", "one-of", 1, 1],
      ["brawl", "exact", 1, 1],
      ["first-aid", "exact", 1, 1],
      ["listen", "exact", 1, 1],
      ["mechanical-repair", "exact", 1, 1],
      ["psychology", "exact", 1, 1],
      ["stealth", "exact", 1, 1],
    ],
    keeperReviewIds: [],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:82"],
  },
  {
    id: "mountain-climber",
    name: { zh: "登山家", en: "Mountain Climber" },
    aliases: undefined,
    creditRating: { min: 30, max: 60 },
    pointFormula: edu2Best("DEX", "STR"),
    requirements: [
      ["climb", "exact", 1, 1],
      ["first-aid", "exact", 1, 1],
      ["jump", "exact", 1, 1],
      ["listen", "exact", 1, 1],
      ["navigate", "exact", 1, 1],
      ["other-language", "specialization-of", 1, 1],
      ["alpine-or-similar-survival", "specialization-of", 1, 1],
      ["track", "exact", 1, 1],
    ],
    keeperReviewIds: ["alpine-or-similar-survival"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:84"],
  },
  {
    id: "musician",
    name: { zh: "音乐家", en: "Musician" },
    aliases: undefined,
    creditRating: { min: 9, max: 30 },
    pointFormula: edu2Best("DEX", "POW"),
    requirements: [
      ["musical-instrument", "specialization-of", 1, 1],
      ["social", "one-of", 1, 1],
      ["listen", "exact", 1, 1],
      ["psychology", "exact", 1, 1],
      ["other-skills", "any-skill", 4, 4],
    ],
    keeperReviewIds: ["musical-instrument"],
    sourcePages: [
      "coc7-keeper-rulebook-40th-zh:41",
      "coc7-investigator-handbook-zh-1-21:84",
    ],
  },
  {
    id: "outdoorsperson",
    name: { zh: "旅行家", en: "Outdoorsman / Outdoorswoman" },
    aliases: { en: ["Outdoorsperson"] },
    creditRating: { min: 5, max: 20 },
    pointFormula: edu2Best("DEX", "STR"),
    requirements: [
      ["firearms", "specialization-of", 1, null],
      ["first-aid", "exact", 1, 1],
      ["listen", "exact", 1, 1],
      ["natural-world", "exact", 1, 1],
      ["navigate", "exact", 1, 1],
      ["spot-hidden", "exact", 1, 1],
      ["survival", "specialization-of", 1, 1],
      ["track", "exact", 1, 1],
    ],
    keeperReviewIds: [],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:85"],
  },
  {
    id: "pharmacist",
    name: { zh: "药剂师", en: "Pharmacist" },
    aliases: undefined,
    creditRating: { min: 35, max: 75 },
    pointFormula: edu4,
    requirements: [
      ["accounting", "exact", 1, 1],
      ["first-aid", "exact", 1, 1],
      ["latin", "named-custom-specialization", 1, 1],
      ["library-use", "exact", 1, 1],
      ["social", "one-of", 1, 1],
      ["psychology", "exact", 1, 1],
      ["pharmacy", "exact", 1, 1],
      ["chemistry", "exact", 1, 1],
    ],
    keeperReviewIds: [],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:86"],
  },
  {
    id: "psychiatrist",
    name: { zh: "精神病学家", en: "Psychiatrist" },
    aliases: undefined,
    creditRating: { min: 30, max: 80 },
    pointFormula: edu4,
    requirements: [
      ["other-language", "specialization-of", 1, 1],
      ["listen", "exact", 1, 1],
      ["medicine", "exact", 1, 1],
      ["persuade", "exact", 1, 1],
      ["psychoanalysis", "exact", 1, 1],
      ["psychology", "exact", 1, 1],
      ["biology", "exact", 1, 1],
      ["chemistry", "exact", 1, 1],
    ],
    keeperReviewIds: [],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:88"],
  },
  {
    id: "salesperson",
    name: { zh: "推销员", en: "Salesperson" },
    aliases: undefined,
    creditRating: { min: 9, max: 40 },
    pointFormula: edu2Attribute("APP"),
    requirements: [
      ["accounting", "exact", 1, 1],
      ["social", "one-of", 2, 2],
      ["drive-auto", "exact", 1, 1],
      ["listen", "exact", 1, 1],
      ["psychology", "exact", 1, 1],
      ["stealth-or-sleight-of-hand", "one-of", 1, 1],
      ["other-skill", "any-skill", 1, 1],
    ],
    keeperReviewIds: [],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:89"],
  },
  {
    id: "shopkeeper",
    name: { zh: "店老板", en: "Shopkeeper" },
    aliases: undefined,
    creditRating: { min: 20, max: 40 },
    pointFormula: edu2Best("APP", "DEX"),
    requirements: [
      ["accounting", "exact", 1, 1],
      ["social", "one-of", 2, 2],
      ["electrical-repair", "exact", 1, 1],
      ["listen", "exact", 1, 1],
      ["mechanical-repair", "exact", 1, 1],
      ["psychology", "exact", 1, 1],
      ["spot-hidden", "exact", 1, 1],
    ],
    keeperReviewIds: [],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:90"],
  },
  {
    id: "spy",
    name: { zh: "间谍", en: "Spy" },
    aliases: undefined,
    creditRating: { min: 20, max: 60 },
    pointFormula: edu2Best("APP", "DEX"),
    requirements: [
      ["acting-or-disguise", "one-of", 1, 1],
      ["firearms", "specialization-of", 1, null],
      ["listen", "exact", 1, 1],
      ["other-language", "specialization-of", 1, 1],
      ["social", "one-of", 1, 1],
      ["psychology", "exact", 1, 1],
      ["sleight-of-hand", "exact", 1, 1],
      ["stealth", "exact", 1, 1],
    ],
    keeperReviewIds: [],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:90"],
  },
  {
    id: "stunt-performer",
    name: { zh: "替身演员", en: "Stuntman" },
    aliases: { en: ["Stunt Performer"] },
    creditRating: { min: 10, max: 50 },
    pointFormula: edu2Best("DEX", "STR"),
    requirements: [
      ["climb", "exact", 1, 1],
      ["dodge", "exact", 1, 1],
      ["electrical-or-mechanical-repair", "one-of", 1, 1],
      ["fighting", "specialization-of", 1, null],
      ["first-aid", "exact", 1, 1],
      ["jump", "exact", 1, 1],
      ["swim", "exact", 1, 1],
      ["stunt-specialty", "one-of", 1, 1],
    ],
    keeperReviewIds: [],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:90"],
  },
  {
    id: "undertaker",
    name: { zh: "殡葬师", en: "Undertaker" },
    aliases: undefined,
    creditRating: { min: 20, max: 40 },
    pointFormula: edu4,
    requirements: [
      ["accounting", "exact", 1, 1],
      ["drive-auto", "exact", 1, 1],
      ["social", "one-of", 1, 1],
      ["history", "exact", 1, 1],
      ["occult", "exact", 1, 1],
      ["psychology", "exact", 1, 1],
      ["biology", "exact", 1, 1],
      ["chemistry", "exact", 1, 1],
    ],
    keeperReviewIds: [],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:91"],
  },
  {
    id: "union-activist",
    name: { zh: "工会活动家", en: "Union Activist" },
    aliases: undefined,
    creditRating: { min: 5, max: 50 },
    pointFormula: edu4,
    requirements: [
      ["accounting", "exact", 1, 1],
      ["social", "one-of", 2, 2],
      ["brawl", "exact", 1, 1],
      ["law", "exact", 1, 1],
      ["listen", "exact", 1, 1],
      ["operate-heavy-machinery", "exact", 1, 1],
      ["psychology", "exact", 1, 1],
    ],
    keeperReviewIds: [],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:91"],
  },
  {
    id: "zookeeper",
    name: { zh: "饲养员", en: "Zookeeper" },
    aliases: undefined,
    creditRating: { min: 9, max: 40 },
    pointFormula: edu4,
    requirements: [
      ["animal-handling", "exact", 1, 1],
      ["accounting", "exact", 1, 1],
      ["dodge", "exact", 1, 1],
      ["first-aid", "exact", 1, 1],
      ["natural-world", "exact", 1, 1],
      ["medicine", "exact", 1, 1],
      ["pharmacy", "exact", 1, 1],
      ["zoology", "exact", 1, 1],
    ],
    keeperReviewIds: [],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:93"],
  },
] as const;

function requirement(occupationId: string, requirementId: string) {
  const selected = registry.get(occupationId)?.skillRequirements.find(
    (candidate) => candidate.id === requirementId,
  );
  if (!selected) throw new Error(`缺少 ${occupationId}:${requirementId}`);
  return selected;
}

const standard = (definitionId: string): SkillRef => ({ type: "standard", definitionId });
const predefined = (definitionId: string, specializationId: string): SkillRef => ({
  type: "predefined",
  definitionId,
  specializationId,
});

describe("Phase 5B-2 Batch 2B occupations", () => {
  it.each(expectedDefinitions)("锁定 $id 的名称、来源、cardinality 与完整机械", (expected) => {
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
      .toEqual(expected.keeperReviewIds);
    expect(occupation?.sourceRefs.map((source) => `${source.sourceId}:${source.page}`))
      .toEqual(expected.sourcePages);
    expect(occupation?.era).toEqual({ type: "all" });
    expect(occupation?.variantOf).toBeUndefined();
  });

  it("Batch 2B 历史模块仍只包含 15 个无损 definition，不回填 Tribe Member", () => {
    expect(batch2bOccupationDefinitions).toHaveLength(15);
    expect(batch2bOccupationDefinitions.some((occupation) => occupation.id === "tribe-member")).toBe(false);
    expect(registry.get("tribe-member")?.skillRequirements.find(
      (candidate) => candidate.id === "fighting-or-throw",
    )?.selector.type).toBe("one-branch");
  });

  it("choose-two social 接受不同技能，并拒绝错误 cardinality、selector 与重复 SkillRef", () => {
    const social = requirement("gambler", "social");
    const charm = standard("charm");
    const persuade = standard("persuade");

    expect(validateOccupationRequirementSelection(social, [charm, persuade])).toEqual([]);
    expect(validateOccupationRequirementSelection(social, [charm]).map((issue) => issue.code))
      .toContain("requirement-cardinality");
    expect(validateOccupationRequirementSelection(social, [charm, standard("law")]).map((issue) => issue.code))
      .toContain("selector-mismatch");
    expect(validateOccupationRequirementSelection(social, [charm, charm]).map((issue) => issue.code))
      .toContain("duplicate-skill-selection");
  });

  it("Musician choose-four any-skill 接受四项不同技能并拒绝错误 cardinality 与重复 SkillRef", () => {
    const otherSkills = requirement("musician", "other-skills");
    const refs = [standard("history"), standard("listen"), standard("psychology"), standard("spot-hidden")];

    expect(validateOccupationRequirementSelection(otherSkills, refs)).toEqual([]);
    expect(validateOccupationRequirementSelection(otherSkills, refs.slice(0, 3)).map((issue) => issue.code))
      .toContain("requirement-cardinality");
    expect(validateOccupationRequirementSelection(otherSkills, [...refs.slice(0, 3), refs[0]!]).map((issue) => issue.code))
      .toContain("duplicate-skill-selection");
  });

  it("specific Rifle/Shotgun 与 Fighting (Brawl) 只接受各自 canonical specialization", () => {
    const rifleShotgun = requirement("gentleman-lady", "rifle-shotgun");
    const brawl = requirement("hospital-orderly", "brawl");

    expect(validateOccupationRequirementSelection(rifleShotgun, [predefined("firearms", "rifle-shotgun")]))
      .toEqual([]);
    expect(validateOccupationRequirementSelection(rifleShotgun, [predefined("firearms", "handgun")]).map((issue) => issue.code))
      .toContain("selector-mismatch");
    expect(validateOccupationRequirementSelection(brawl, [predefined("fighting", "brawl")])).toEqual([]);
    expect(validateOccupationRequirementSelection(brawl, [predefined("fighting", "sword")]).map((issue) => issue.code))
      .toContain("selector-mismatch");
  });

  it("generic Firearms 与 Fighting 接受多个不同专业，并拒绝错误 selector 与重复 SkillRef", () => {
    const firearms = requirement("outdoorsperson", "firearms");
    const fighting = requirement("stunt-performer", "fighting");
    const handgun = predefined("firearms", "handgun");
    const rifleShotgun = predefined("firearms", "rifle-shotgun");
    const brawl = predefined("fighting", "brawl");
    const sword = predefined("fighting", "sword");

    expect(validateOccupationRequirementSelection(firearms, [handgun, rifleShotgun])).toEqual([]);
    expect(validateOccupationRequirementSelection(fighting, [brawl, sword])).toEqual([]);
    expect(validateOccupationRequirementSelection(firearms, [brawl]).map((issue) => issue.code))
      .toContain("selector-mismatch");
    expect(validateOccupationRequirementSelection(fighting, [brawl, brawl]).map((issue) => issue.code))
      .toContain("duplicate-skill-selection");
  });

  it("Language custom specialization、one-of 与 fuzzy review requirement 保留真实行为", () => {
    const latin = requirement("pharmacist", "latin");
    const otherLanguage = requirement("psychiatrist", "other-language");
    const spyCover = requirement("spy", "acting-or-disguise");
    const musicianInstrument = requirement("musician", "musical-instrument");
    const alpineSurvival = requirement("mountain-climber", "alpine-or-similar-survival");
    const latinRef: SkillRef = {
      type: "custom",
      definitionId: "language-other",
      specializationId: "00000000-0000-4000-8000-000000000001",
      displayName: "Latin",
    };
    const frenchRef: SkillRef = {
      type: "custom",
      definitionId: "language-other",
      specializationId: "00000000-0000-4000-8000-000000000002",
      displayName: "法语",
    };
    const violinRef: SkillRef = {
      type: "custom",
      definitionId: "art-craft",
      specializationId: "00000000-0000-4000-8000-000000000003",
      displayName: "小提琴",
    };
    const alpineRef: SkillRef = {
      type: "custom",
      definitionId: "survival",
      specializationId: "00000000-0000-4000-8000-000000000004",
      displayName: "阿尔卑斯",
    };

    expect(validateOccupationRequirementSelection(latin, [latinRef])).toEqual([]);
    expect(validateOccupationRequirementSelection(latin, [frenchRef]).map((issue) => issue.code))
      .toContain("selector-mismatch");
    expect(validateOccupationRequirementSelection(otherLanguage, [frenchRef])).toEqual([]);
    expect(validateOccupationRequirementSelection(spyCover, [predefined("art-craft", "acting")])).toEqual([]);
    expect(validateOccupationRequirementSelection(spyCover, [standard("disguise")])).toEqual([]);
    expect(validateOccupationRequirementSelection(spyCover, [standard("stealth")]).map((issue) => issue.code))
      .toContain("selector-mismatch");
    expect(musicianInstrument.keeperReview).toBe(true);
    expect(alpineSurvival.keeperReview).toBe(true);
    expect(validateOccupationRequirementSelection(musicianInstrument, [violinRef])).toEqual([]);
    expect(validateOccupationRequirementSelection(alpineSurvival, [alpineRef])).toEqual([]);
  });

  it("unrestricted other skill 接受任意 SkillRef，同时仍拒绝错误 cardinality 与重复", () => {
    const otherSkill = requirement("salesperson", "other-skill");
    const law = standard("law");

    expect(validateOccupationRequirementSelection(otherSkill, [law])).toEqual([]);
    expect(validateOccupationRequirementSelection(otherSkill, []).map((issue) => issue.code))
      .toContain("requirement-cardinality");
    expect(validateOccupationRequirementSelection(otherSkill, [law, law]).map((issue) => issue.code))
      .toEqual(expect.arrayContaining(["requirement-cardinality", "duplicate-skill-selection"]));
  });
});
