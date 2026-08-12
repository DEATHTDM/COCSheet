import { describe, expect, it } from "vitest";

import {
  instantiateNamedCustomSpecialization,
  validateOccupationRequirementSelection,
} from "../../coc7/rules/occupationSkills";
import type { OccupationPointFormula } from "../../coc7/types/occupation";
import type { SkillRef } from "../../coc7/types/skill";
import { createOccupationRegistry } from "../occupationRegistry";
import { createSkillRegistry } from "../skillRegistry";
import { standardSettingPack } from ".";
import { batch3aOccupationDefinitions } from "./occupations/batch3a";
import { standardSkillDefinitions } from "./skills";

const skills = createSkillRegistry(standardSkillDefinitions);
const registry = createOccupationRegistry(standardSettingPack, skills);

const edu4: OccupationPointFormula = {
  type: "attribute",
  attribute: "EDU",
  multiplier: 4,
};

const edu2Best = (...attributes: ("STR" | "DEX" | "APP" | "POW")[]): OccupationPointFormula => ({
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
    id: "acrobat",
    name: { zh: "杂技演员", en: "Acrobat" },
    aliases: undefined,
    category: "media-art",
    creditRating: { min: 9, max: 20 },
    pointFormula: edu2Best("DEX"),
    requirements: [
      ["climb", "exact", 1, 1],
      ["dodge", "exact", 1, 1],
      ["jump", "exact", 1, 1],
      ["throw", "exact", 1, 1],
      ["spot-hidden", "exact", 1, 1],
      ["swim", "exact", 1, 1],
      ["personal-or-era-specialties", "any-skill", 2, 2],
    ],
    keeperReviewIds: ["personal-or-era-specialties"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:70"],
  },
  {
    id: "animal-trainer",
    name: { zh: "动物训练师", en: "Animal Trainer" },
    aliases: undefined,
    category: "technical-labor",
    creditRating: { min: 10, max: 40 },
    pointFormula: edu2Best("APP", "POW"),
    requirements: [
      ["jump", "exact", 1, 1],
      ["listen", "exact", 1, 1],
      ["natural-world", "exact", 1, 1],
      ["animal-handling", "exact", 1, 1],
      ["zoology", "exact", 1, 1],
      ["stealth", "exact", 1, 1],
      ["track", "exact", 1, 1],
      ["personal-or-era-specialty", "any-skill", 1, 1],
    ],
    keeperReviewIds: ["personal-or-era-specialty"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:71"],
  },
  {
    id: "athlete",
    name: { zh: "运动员", en: "Athlete" },
    aliases: undefined,
    category: "media-art",
    creditRating: { min: 9, max: 70 },
    pointFormula: edu2Best("DEX", "STR"),
    requirements: [
      ["climb", "exact", 1, 1],
      ["jump", "exact", 1, 1],
      ["brawl", "exact", 1, 1],
      ["ride", "exact", 1, 1],
      ["social", "one-of", 1, 1],
      ["swim", "exact", 1, 1],
      ["throw", "exact", 1, 1],
      ["personal-or-era-specialty", "any-skill", 1, 1],
    ],
    keeperReviewIds: ["personal-or-era-specialty"],
    sourcePages: ["coc7-keeper-rulebook-40th-zh:40", "coc7-investigator-handbook-zh-1-21:72"],
  },
  {
    id: "bartender",
    name: { zh: "酒保", en: "Bartender" },
    aliases: undefined,
    category: "business-professional",
    creditRating: { min: 8, max: 25 },
    pointFormula: edu2Best("APP"),
    requirements: [
      ["accounting", "exact", 1, 1],
      ["social", "one-of", 2, 2],
      ["brawl", "exact", 1, 1],
      ["listen", "exact", 1, 1],
      ["psychology", "exact", 1, 1],
      ["spot-hidden", "exact", 1, 1],
      ["personal-or-era-specialty", "any-skill", 1, 1],
    ],
    keeperReviewIds: ["personal-or-era-specialty"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:73"],
  },
  {
    id: "boxer-wrestler",
    name: { zh: "拳击手、摔跤手", en: "Boxer / Wrestler" },
    aliases: { zh: ["拳击手", "摔跤手"], en: ["Boxer", "Wrestler"] },
    category: "media-art",
    creditRating: { min: 9, max: 60 },
    pointFormula: edu2Best("STR"),
    requirements: [
      ["dodge", "exact", 1, 1],
      ["brawl", "exact", 1, 1],
      ["intimidate", "exact", 1, 1],
      ["jump", "exact", 1, 1],
      ["psychology", "exact", 1, 1],
      ["spot-hidden", "exact", 1, 1],
      ["personal-or-era-specialties", "any-skill", 2, 2],
    ],
    keeperReviewIds: ["personal-or-era-specialties"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:73"],
  },
  {
    id: "butler-valet-maid",
    name: { zh: "管家、男仆、女仆", en: "Butler / Valet / Maid" },
    aliases: { zh: ["管家", "男仆", "女仆"], en: ["Butler", "Valet", "Maid"] },
    category: "social-special",
    creditRating: { min: 9, max: 40 },
    pointFormula: edu4,
    requirements: [
      ["accounting-or-appraise", "one-of", 1, 1],
      ["art-craft", "specialization-of", 1, 1],
      ["first-aid", "exact", 1, 1],
      ["listen", "exact", 1, 1],
      ["psychology", "exact", 1, 1],
      ["spot-hidden", "exact", 1, 1],
      ["personal-or-era-specialties", "any-skill", 2, 2],
    ],
    keeperReviewIds: ["personal-or-era-specialties"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:74"],
  },
  {
    id: "craftsperson",
    name: { zh: "工匠", en: "Craftsperson" },
    aliases: undefined,
    category: "technical-labor",
    creditRating: { min: 10, max: 40 },
    pointFormula: edu2Best("DEX"),
    requirements: [
      ["accounting", "exact", 1, 1],
      ["art-craft-specialties", "specialization-of", 2, 2],
      ["mechanical-repair", "exact", 1, 1],
      ["natural-world", "exact", 1, 1],
      ["spot-hidden", "exact", 1, 1],
      ["personal-or-era-specialties", "any-skill", 2, 2],
    ],
    keeperReviewIds: ["personal-or-era-specialties"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:74"],
  },
  {
    id: "cult-leader",
    name: { zh: "教团首领", en: "Cult Leader" },
    aliases: undefined,
    category: "religion-occult",
    creditRating: { min: 30, max: 60 },
    pointFormula: edu4,
    requirements: [
      ["accounting", "exact", 1, 1],
      ["social", "one-of", 2, 2],
      ["occult", "exact", 1, 1],
      ["psychology", "exact", 1, 1],
      ["spot-hidden", "exact", 1, 1],
      ["personal-specialties", "any-skill", 2, 2],
    ],
    keeperReviewIds: ["personal-specialties"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:77"],
  },
  {
    id: "designer",
    name: { zh: "设计师", en: "Designer" },
    aliases: undefined,
    category: "media-art",
    creditRating: { min: 20, max: 60 },
    pointFormula: edu4,
    requirements: [
      ["accounting", "exact", 1, 1],
      ["photography", "exact", 1, 1],
      ["art-craft", "specialization-of", 1, 1],
      ["computer-or-library", "one-of", 1, 1],
      ["mechanical-repair", "exact", 1, 1],
      ["psychology", "exact", 1, 1],
      ["spot-hidden", "exact", 1, 1],
      ["personal-specialty", "any-skill", 1, 1],
    ],
    keeperReviewIds: ["personal-specialty"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:78"],
  },
  {
    id: "dilettante",
    name: { zh: "业余艺术爱好者（原作向）", en: "Dilettante" },
    aliases: { zh: ["业余艺术爱好者"] },
    category: "social-special",
    creditRating: { min: 50, max: 99 },
    pointFormula: edu2Best("APP"),
    requirements: [
      ["art-craft", "specialization-of", 1, 1],
      ["firearms", "specialization-of", 1, null],
      ["other-language", "specialization-of", 1, 1],
      ["ride", "exact", 1, 1],
      ["social", "one-of", 1, 1],
      ["personal-or-era-specialties", "any-skill", 3, 3],
    ],
    keeperReviewIds: ["personal-or-era-specialties"],
    sourcePages: ["coc7-keeper-rulebook-40th-zh:40", "coc7-investigator-handbook-zh-1-21:78"],
  },
  {
    id: "diver",
    name: { zh: "潜水员", en: "Diver" },
    aliases: undefined,
    category: "outdoor-adventure",
    creditRating: { min: 9, max: 30 },
    pointFormula: edu2Best("DEX"),
    requirements: [
      ["diving", "exact", 1, 1],
      ["first-aid", "exact", 1, 1],
      ["mechanical-repair", "exact", 1, 1],
      ["pilot-boat", "exact", 1, 1],
      ["biology", "exact", 1, 1],
      ["spot-hidden", "exact", 1, 1],
      ["swim", "exact", 1, 1],
      ["personal-or-era-specialty", "any-skill", 1, 1],
    ],
    keeperReviewIds: ["personal-or-era-specialty"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:78"],
  },
  {
    id: "drifter",
    name: { zh: "流浪者", en: "Drifter" },
    aliases: undefined,
    category: "social-special",
    creditRating: { min: 0, max: 5 },
    pointFormula: edu2Best("APP", "DEX", "STR"),
    requirements: [
      ["climb", "exact", 1, 1],
      ["jump", "exact", 1, 1],
      ["listen", "exact", 1, 1],
      ["navigate", "exact", 1, 1],
      ["social", "one-of", 1, 1],
      ["stealth", "exact", 1, 1],
      ["personal-or-era-specialties", "any-skill", 2, 2],
    ],
    keeperReviewIds: ["personal-or-era-specialties"],
    sourcePages: ["coc7-keeper-rulebook-40th-zh:40", "coc7-investigator-handbook-zh-1-21:78"],
  },
  {
    id: "editor",
    name: { zh: "编辑", en: "Editor" },
    aliases: undefined,
    category: "media-art",
    creditRating: { min: 10, max: 30 },
    pointFormula: edu4,
    requirements: [
      ["accounting", "exact", 1, 1],
      ["history", "exact", 1, 1],
      ["own-language", "specialization-of", 1, 1],
      ["social", "one-of", 2, 2],
      ["psychology", "exact", 1, 1],
      ["spot-hidden", "exact", 1, 1],
      ["personal-or-era-specialty", "any-skill", 1, 1],
    ],
    keeperReviewIds: ["personal-or-era-specialty"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:79"],
  },
  {
    id: "engineer",
    name: { zh: "工程师", en: "Engineer" },
    aliases: undefined,
    category: "technical-labor",
    creditRating: { min: 30, max: 60 },
    pointFormula: edu4,
    requirements: [
      ["technical-drawing", "named-custom-specialization", 1, 1],
      ["electrical-repair", "exact", 1, 1],
      ["library-use", "exact", 1, 1],
      ["mechanical-repair", "exact", 1, 1],
      ["operate-heavy-machinery", "exact", 1, 1],
      ["engineering", "exact", 1, 1],
      ["physics", "exact", 1, 1],
      ["personal-or-era-specialty", "any-skill", 1, 1],
    ],
    keeperReviewIds: ["personal-or-era-specialty"],
    sourcePages: ["coc7-keeper-rulebook-40th-zh:40", "coc7-investigator-handbook-zh-1-21:79"],
  },
  {
    id: "entertainer",
    name: { zh: "艺人", en: "Entertainer" },
    aliases: undefined,
    category: "media-art",
    creditRating: { min: 9, max: 70 },
    pointFormula: edu2Best("APP"),
    requirements: [
      ["performing-art-craft", "specialization-of", 1, 1],
      ["disguise", "exact", 1, 1],
      ["social", "one-of", 2, 2],
      ["listen", "exact", 1, 1],
      ["psychology", "exact", 1, 1],
      ["personal-or-era-specialties", "any-skill", 2, 2],
    ],
    keeperReviewIds: ["performing-art-craft", "personal-or-era-specialties"],
    sourcePages: ["coc7-keeper-rulebook-40th-zh:40", "coc7-investigator-handbook-zh-1-21:79"],
  },
  {
    id: "farmer",
    name: { zh: "农民", en: "Farmer" },
    aliases: undefined,
    category: "technical-labor",
    creditRating: { min: 9, max: 30 },
    pointFormula: edu2Best("DEX", "STR"),
    requirements: [
      ["farming", "named-custom-specialization", 1, 1],
      ["drive-auto", "exact", 1, 1],
      ["social", "one-of", 1, 1],
      ["mechanical-repair", "exact", 1, 1],
      ["natural-world", "exact", 1, 1],
      ["operate-heavy-machinery", "exact", 1, 1],
      ["track", "exact", 1, 1],
      ["personal-or-era-specialty", "any-skill", 1, 1],
    ],
    keeperReviewIds: ["personal-or-era-specialty"],
    sourcePages: ["coc7-keeper-rulebook-40th-zh:40", "coc7-investigator-handbook-zh-1-21:80"],
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

describe("Phase 5B-2 Batch 3A occupations", () => {
  it.each(expectedDefinitions)("锁定 $id 的名称、来源与完整机械", (expected) => {
    const occupation = registry.get(expected.id);
    expect(occupation?.name).toEqual(expected.name);
    expect(occupation?.aliases).toEqual(expected.aliases);
    expect(occupation?.category).toBe(expected.category);
    expect(occupation?.era).toEqual({ type: "all" });
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
    expect(occupation?.variantOf).toBeUndefined();
  });

  it("本批恰好导入 16 个 canonical definition", () => {
    expect(batch3aOccupationDefinitions).toHaveLength(16);
    expect(batch3aOccupationDefinitions.every((occupation) => occupation.variantOf === undefined)).toBe(true);
  });

  it("Craftsperson 的 Art / Craft choose-two 接受不同专业并拒绝重复 SkillRef", () => {
    const artCraft = requirement("craftsperson", "art-craft-specialties");
    const fineArt = predefined("art-craft", "fine-art");
    const photography = predefined("art-craft", "photography");
    const custom: SkillRef = {
      type: "custom",
      definitionId: "art-craft",
      specializationId: "00000000-0000-4000-8000-000000000031",
      displayName: "木工",
    };

    expect(validateOccupationRequirementSelection(artCraft, [fineArt, photography])).toEqual([]);
    expect(validateOccupationRequirementSelection(artCraft, [fineArt, custom])).toEqual([]);
    expect(validateOccupationRequirementSelection(artCraft, [fineArt, fineArt]).map((issue) => issue.code))
      .toContain("duplicate-skill-selection");
  });

  it("social choose-two 接受两项不同社交技能并拒绝重复与越界技能", () => {
    const social = requirement("bartender", "social");
    const charm = standard("charm");
    const persuade = standard("persuade");

    expect(validateOccupationRequirementSelection(social, [charm, persuade])).toEqual([]);
    expect(validateOccupationRequirementSelection(social, [charm, charm]).map((issue) => issue.code))
      .toContain("duplicate-skill-selection");
    expect(validateOccupationRequirementSelection(social, [charm, standard("law")]).map((issue) => issue.code))
      .toContain("selector-mismatch");
  });

  it("Dilettante 的 generic Firearms 保持 1+，接受多个专业并拒绝重复", () => {
    const firearms = requirement("dilettante", "firearms");
    const handgun = predefined("firearms", "handgun");
    const rifle = predefined("firearms", "rifle-shotgun");

    expect(firearms.cardinality).toEqual({ min: 1 });
    expect(validateOccupationRequirementSelection(firearms, [handgun, rifle])).toEqual([]);
    expect(validateOccupationRequirementSelection(firearms, [handgun, handgun]).map((issue) => issue.code))
      .toContain("duplicate-skill-selection");
  });

  it("Athlete 与 Boxer / Wrestler 的固定 Brawl 不接受其他 Fighting 专业", () => {
    const brawl = predefined("fighting", "brawl");
    const sword = predefined("fighting", "sword");
    for (const occupationId of ["athlete", "boxer-wrestler"] as const) {
      const fixedBrawl = requirement(occupationId, "brawl");
      expect(validateOccupationRequirementSelection(fixedBrawl, [brawl])).toEqual([]);
      expect(validateOccupationRequirementSelection(fixedBrawl, [sword]).map((issue) => issue.code))
        .toContain("selector-mismatch");
    }
  });

  it("Engineer 的 Technical Drawing 生成固定名称 custom specialization", () => {
    const technicalDrawing = requirement("engineer", "technical-drawing");
    if (technicalDrawing.selector.type !== "named-custom-specialization") {
      throw new Error("Engineer 缺少 Technical Drawing selector");
    }
    const instantiated = instantiateNamedCustomSpecialization(
      technicalDrawing.selector,
      "00000000-0000-4000-8000-000000000032",
    );
    expect(instantiated).toEqual({
      type: "custom",
      definitionId: "art-craft",
      specializationId: "00000000-0000-4000-8000-000000000032",
      displayName: "Technical Drawing",
    });
    expect(validateOccupationRequirementSelection(technicalDrawing, [instantiated])).toEqual([]);
  });

  it("fuzzy any-skill 接受任意 SkillRef，并保留 guidance 与 Keeper review", () => {
    const fuzzy = requirement("drifter", "personal-or-era-specialties");
    expect(fuzzy.selector.type).toBe("any-skill");
    expect(fuzzy.keeperReview).toBe(true);
    expect(fuzzy.guidance).toEqual({
      zh: "个人或时代特长",
      en: "personal or era specialty",
    });
    expect(validateOccupationRequirementSelection(fuzzy, [standard("law"), predefined("science", "biology")]))
      .toEqual([]);
  });

  it("Entertainer 的表演类 Art / Craft 是 fuzzy parent selector，而不是固定 Acting", () => {
    const performance = requirement("entertainer", "performing-art-craft");
    expect(performance.keeperReview).toBe(true);
    expect(validateOccupationRequirementSelection(performance, [predefined("art-craft", "acting")])).toEqual([]);
    expect(validateOccupationRequirementSelection(performance, [{
      type: "custom",
      definitionId: "art-craft",
      specializationId: "00000000-0000-4000-8000-000000000033",
      displayName: "声乐",
    }])).toEqual([]);
    expect(validateOccupationRequirementSelection(performance, [standard("disguise")]).map((issue) => issue.code))
      .toContain("selector-mismatch");
  });

  it("one-of 只接受列明分支；Animal Trainer 固定使用 Animal Handling", () => {
    const accountingOrAppraise = requirement("butler-valet-maid", "accounting-or-appraise");
    expect(validateOccupationRequirementSelection(accountingOrAppraise, [standard("accounting")])).toEqual([]);
    expect(validateOccupationRequirementSelection(accountingOrAppraise, [standard("appraise")])).toEqual([]);
    expect(validateOccupationRequirementSelection(accountingOrAppraise, [standard("psychology")]).map(
      (issue) => issue.code,
    )).toContain("selector-mismatch");

    const animalHandling = requirement("animal-trainer", "animal-handling");
    expect(validateOccupationRequirementSelection(animalHandling, [standard("animal-handling")])).toEqual([]);
    expect(validateOccupationRequirementSelection(animalHandling, [standard("psychology")]).map(
      (issue) => issue.code,
    )).toContain("selector-mismatch");
  });

  it("Farmer 将 Wagon Driving 保留为时代适配的 Drive Auto identity", () => {
    const drive = requirement("farmer", "drive-auto");
    expect(validateOccupationRequirementSelection(drive, [standard("drive-auto")])).toEqual([]);
    expect(validateOccupationRequirementSelection(drive, [standard("ride")]).map((issue) => issue.code))
      .toContain("selector-mismatch");
    expect(registry.get("farmer")?.sourceRefs.map((source) => source.note))
      .toEqual(expect.arrayContaining([expect.stringContaining("Wagon Driving")]));
  });
});
