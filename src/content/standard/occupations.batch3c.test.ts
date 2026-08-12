import { describe, expect, it } from "vitest";

import { validateOccupationRequirementSelection } from "../../coc7/rules/occupationSkills";
import type { OccupationPointFormula } from "../../coc7/types/occupation";
import type { SkillRef } from "../../coc7/types/skill";
import { createOccupationRegistry } from "../occupationRegistry";
import { createSkillRegistry } from "../skillRegistry";
import { standardSettingPack } from ".";
import { batch3cOccupationDefinitions } from "./occupations/batch3c";
import { standardSkillDefinitions } from "./skills";

const skills = createSkillRegistry(standardSkillDefinitions);
const registry = createOccupationRegistry(standardSettingPack, skills);

const edu4: OccupationPointFormula = {
  type: "attribute",
  attribute: "EDU",
  multiplier: 4,
};

const edu2Plus = (...attributes: ("STR" | "DEX" | "APP")[]): OccupationPointFormula => ({
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
    id: "actor-stage",
    name: { zh: "戏剧演员", en: "Stage Actor" },
    aliases: undefined,
    variantOf: "actor",
    category: "media-art",
    era: { type: "all" },
    creditRating: { min: 9, max: 40 },
    pointFormula: edu2Plus("APP"),
    requirements: [
      ["acting", "exact", 1, 1],
      ["disguise", "exact", 1, 1],
      ["fighting", "specialization-of", 1, null],
      ["history", "exact", 1, 1],
      ["social", "one-of", 2, 2],
      ["psychology", "exact", 1, 1],
      ["personal-or-era-specialty", "any-skill", 1, 1],
    ],
    keeperReviewIds: ["personal-or-era-specialty"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:71"],
  },
  {
    id: "actor-film-star",
    name: { zh: "电影演员", en: "Film Star" },
    aliases: undefined,
    variantOf: "actor",
    category: "media-art",
    era: { type: "all" },
    creditRating: { min: 20, max: 90 },
    pointFormula: edu2Plus("APP"),
    requirements: [
      ["acting", "exact", 1, 1],
      ["disguise", "exact", 1, 1],
      ["drive-auto", "exact", 1, 1],
      ["social", "one-of", 2, 2],
      ["psychology", "exact", 1, 1],
      ["personal-or-era-specialties", "any-skill", 2, 2],
    ],
    keeperReviewIds: ["personal-or-era-specialties"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:71"],
  },
  {
    id: "computer-professional-programmer-technician",
    name: { zh: "计算机程序员、工程师", en: "Computer Programmer / Technician" },
    aliases: {
      zh: ["计算机程序员", "计算机工程师"],
      en: ["Computer Programmer", "Computer Technician"],
    },
    variantOf: "computer-professional",
    category: "technical-labor",
    era: { type: "specific", eraIds: ["modern"] },
    creditRating: { min: 10, max: 70 },
    pointFormula: edu4,
    requirements: [
      ["computer-use", "exact", 1, 1],
      ["electrical-repair", "exact", 1, 1],
      ["electronics", "exact", 1, 1],
      ["library-use", "exact", 1, 1],
      ["mathematics", "exact", 1, 1],
      ["spot-hidden", "exact", 1, 1],
      ["personal-or-era-specialties", "any-skill", 2, 2],
    ],
    keeperReviewIds: ["personal-or-era-specialties"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:74"],
  },
  {
    id: "computer-professional-hacker",
    name: { zh: "黑客", en: "Hacker" },
    aliases: { zh: ["黑客（现代）"] },
    variantOf: "computer-professional",
    category: "technical-labor",
    era: { type: "specific", eraIds: ["modern"] },
    creditRating: { min: 10, max: 70 },
    pointFormula: edu4,
    requirements: [
      ["computer-use", "exact", 1, 1],
      ["electrical-repair", "exact", 1, 1],
      ["electronics", "exact", 1, 1],
      ["library-use", "exact", 1, 1],
      ["spot-hidden", "exact", 1, 1],
      ["social", "one-of", 1, 1],
      ["other-skills", "any-skill", 2, 2],
    ],
    keeperReviewIds: [],
    sourcePages: [
      "coc7-keeper-rulebook-40th-zh:41",
      "coc7-investigator-handbook-zh-1-21:74",
    ],
  },
  {
    id: "driver-chauffeur",
    name: { zh: "私人司机", en: "Chauffeur" },
    aliases: undefined,
    variantOf: "driver",
    category: "technical-labor",
    era: { type: "all" },
    creditRating: { min: 10, max: 40 },
    pointFormula: edu2Plus("DEX"),
    requirements: [
      ["drive-auto", "exact", 1, 1],
      ["social", "one-of", 2, 2],
      ["listen", "exact", 1, 1],
      ["mechanical-repair", "exact", 1, 1],
      ["navigate", "exact", 1, 1],
      ["spot-hidden", "exact", 1, 1],
      ["personal-or-era-specialty", "any-skill", 1, 1],
    ],
    keeperReviewIds: ["personal-or-era-specialty"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:79"],
  },
  {
    id: "driver-general",
    name: { zh: "司机", en: "Driver" },
    aliases: undefined,
    variantOf: "driver",
    category: "technical-labor",
    era: { type: "all" },
    creditRating: { min: 9, max: 20 },
    pointFormula: edu2Plus("DEX", "STR"),
    requirements: [
      ["accounting", "exact", 1, 1],
      ["drive-auto", "exact", 1, 1],
      ["listen", "exact", 1, 1],
      ["social", "one-of", 1, 1],
      ["mechanical-repair", "exact", 1, 1],
      ["navigate", "exact", 1, 1],
      ["psychology", "exact", 1, 1],
      ["personal-or-era-specialty", "any-skill", 1, 1],
    ],
    keeperReviewIds: ["personal-or-era-specialty"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:79"],
  },
  {
    id: "driver-taxi",
    name: { zh: "出租车司机", en: "Taxi Driver" },
    aliases: undefined,
    variantOf: "driver",
    category: "technical-labor",
    era: { type: "all" },
    creditRating: { min: 9, max: 30 },
    pointFormula: edu2Plus("DEX"),
    requirements: [
      ["accounting", "exact", 1, 1],
      ["drive-auto", "exact", 1, 1],
      ["electrical-repair", "exact", 1, 1],
      ["fast-talk", "exact", 1, 1],
      ["mechanical-repair", "exact", 1, 1],
      ["navigate", "exact", 1, 1],
      ["spot-hidden", "exact", 1, 1],
      ["personal-or-era-specialty", "any-skill", 1, 1],
    ],
    keeperReviewIds: ["personal-or-era-specialty"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:79"],
  },
  {
    id: "gangster-boss",
    name: { zh: "黑帮老大", en: "Gangster Boss" },
    aliases: undefined,
    variantOf: "gangster",
    category: "criminal-underworld",
    era: { type: "all" },
    creditRating: { min: 60, max: 95 },
    pointFormula: edu2Plus("APP"),
    requirements: [
      ["fighting", "specialization-of", 1, null],
      ["firearms", "specialization-of", 1, null],
      ["law", "exact", 1, 1],
      ["listen", "exact", 1, 1],
      ["social", "one-of", 2, 2],
      ["psychology", "exact", 1, 1],
      ["spot-hidden", "exact", 1, 1],
    ],
    keeperReviewIds: [],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:81"],
  },
  {
    id: "gangster-underling",
    name: { zh: "马仔", en: "Gangster Underling" },
    aliases: { zh: ["黑帮马仔"] },
    variantOf: "gangster",
    category: "criminal-underworld",
    era: { type: "all" },
    creditRating: { min: 9, max: 20 },
    pointFormula: edu2Plus("DEX", "STR"),
    requirements: [
      ["drive-auto", "exact", 1, 1],
      ["fighting", "specialization-of", 1, null],
      ["firearms", "specialization-of", 1, null],
      ["social", "one-of", 2, 2],
      ["psychology", "exact", 1, 1],
      ["personal-or-era-specialties", "any-skill", 2, 2],
    ],
    keeperReviewIds: ["personal-or-era-specialties"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:81"],
  },
  {
    id: "military-officer-keeper-rulebook",
    name: { zh: "军官（核心规则书）", en: "Military Officer (Keeper Rulebook)" },
    aliases: { zh: ["军官"], en: ["Military Officer"] },
    variantOf: "military-officer",
    category: "military-government-law",
    era: { type: "all" },
    creditRating: { min: 20, max: 70 },
    pointFormula: edu2Plus("DEX", "STR"),
    requirements: [
      ["accounting", "exact", 1, 1],
      ["firearms", "specialization-of", 1, null],
      ["navigate", "exact", 1, 1],
      ["survival", "specialization-of", 1, 1],
      ["social", "one-of", 2, 2],
      ["psychology", "exact", 1, 1],
      ["other-skill", "any-skill", 1, 1],
    ],
    keeperReviewIds: [],
    sourcePages: ["coc7-keeper-rulebook-40th-zh:41"],
  },
  {
    id: "military-officer-investigator-handbook",
    name: { zh: "军官（调查员手册）", en: "Military Officer (Investigator Handbook)" },
    aliases: { zh: ["军官"], en: ["Military Officer"] },
    variantOf: "military-officer",
    category: "military-government-law",
    era: { type: "all" },
    creditRating: { min: 20, max: 70 },
    pointFormula: edu2Plus("DEX", "STR"),
    requirements: [
      ["accounting", "exact", 1, 1],
      ["firearms", "specialization-of", 1, null],
      ["navigate", "exact", 1, 1],
      ["first-aid", "exact", 1, 1],
      ["social", "one-of", 2, 2],
      ["psychology", "exact", 1, 1],
      ["personal-or-era-specialty", "any-skill", 1, 1],
    ],
    keeperReviewIds: ["personal-or-era-specialty"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:83"],
  },
] as const;

function selectedRequirement(occupationId: string, requirementId: string) {
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

describe("Phase 5B-2 Batch 3C occupations", () => {
  it.each(expectedDefinitions)("锁定 $id 的名称、variant、era、来源与完整机械", (expected) => {
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

  it("导入 11 个 source variant definition 并完整实现 5 个 family，且不建立空壳", () => {
    expect(batch3cOccupationDefinitions).toHaveLength(11);
    const expectedFamilyCounts = new Map([
      ["actor", 2],
      ["computer-professional", 2],
      ["driver", 3],
      ["gangster", 2],
      ["military-officer", 2],
    ]);
    for (const [family, count] of expectedFamilyCounts) {
      expect(registry.get(family)).toBeUndefined();
      expect(registry.definitions.filter((occupation) => occupation.variantOf === family))
        .toHaveLength(count);
    }
  });

  it("Stage Actor 固定 Acting，并让 generic Fighting 接受多个不同专业且拒绝重复", () => {
    const acting = selectedRequirement("actor-stage", "acting");
    const fighting = selectedRequirement("actor-stage", "fighting");
    const brawl = predefined("fighting", "brawl");
    const sword = predefined("fighting", "sword");

    expect(validateOccupationRequirementSelection(acting, [predefined("art-craft", "acting")]))
      .toEqual([]);
    expect(validateOccupationRequirementSelection(acting, [predefined("art-craft", "photography")])
      .map((issue) => issue.code)).toContain("selector-mismatch");
    expect(fighting.cardinality).toEqual({ min: 1 });
    expect(validateOccupationRequirementSelection(fighting, [brawl])).toEqual([]);
    expect(validateOccupationRequirementSelection(fighting, [brawl, sword])).toEqual([]);
    expect(validateOccupationRequirementSelection(fighting, [brawl, brawl]).map((issue) => issue.code))
      .toContain("duplicate-skill-selection");
  });

  it("Film Star 固定 Drive Auto，并拥有两个而非一个 personal/era slot", () => {
    expect(selectedRequirement("actor-film-star", "drive-auto").selector)
      .toEqual({ type: "exact", ref: standard("drive-auto") });
    expect(registry.get("actor-stage")?.skillRequirements.some((candidate) => candidate.id === "drive-auto"))
      .toBe(false);
    expect(selectedRequirement("actor-film-star", "personal-or-era-specialties").cardinality)
      .toEqual({ min: 2, max: 2 });
    expect(selectedRequirement("actor-stage", "personal-or-era-specialty").cardinality)
      .toEqual({ min: 1, max: 1 });
  });

  it("Computer Professional 两 variant 都是 modern-only，并区分 Mathematics、social 与自由槽语义", () => {
    expect(registry.list({ era: "classic-1920s" }).map((occupation) => occupation.id))
      .not.toContain("computer-professional-hacker");
    expect(registry.list({ era: "modern" }).map((occupation) => occupation.id))
      .toContain("computer-professional-hacker");
    expect(validateOccupationRequirementSelection(
      selectedRequirement("computer-professional-programmer-technician", "mathematics"),
      [predefined("science", "mathematics")],
    )).toEqual([]);
    expect(validateOccupationRequirementSelection(
      selectedRequirement("computer-professional-hacker", "social"),
      [standard("fast-talk")],
    )).toEqual([]);
    expect(selectedRequirement(
      "computer-professional-programmer-technician",
      "personal-or-era-specialties",
    ).keeperReview).toBe(true);
    expect(selectedRequirement("computer-professional-hacker", "other-skills").keeperReview)
      .toBeUndefined();
  });

  it("Core 与 Handbook Hacker 继续共享一个 mechanics variant 和两个准确 sourceRefs", () => {
    const hacker = registry.get("computer-professional-hacker");
    expect(hacker?.sourceRefs.map((source) => source.sourceId)).toEqual([
      "coc7-keeper-rulebook-40th-zh",
      "coc7-investigator-handbook-zh-1-21",
    ]);
    expect(registry.definitions.filter((occupation) =>
      occupation.variantOf === "computer-professional" && occupation.name.en === "Hacker"))
      .toHaveLength(1);
    expect(registry.get("computer-professional-programmer-technician")?.sourceRefs)
      .toHaveLength(1);
  });

  it("三个 Driver subtype 锁定不同 CR、社交 cardinality 与固定技能", () => {
    expect(selectedRequirement("driver-chauffeur", "social").cardinality).toEqual({ min: 2, max: 2 });
    expect(selectedRequirement("driver-general", "social").cardinality).toEqual({ min: 1, max: 1 });
    expect(registry.get("driver-taxi")?.skillRequirements.map((candidate) => candidate.id))
      .toContain("electrical-repair");
    expect(registry.get("driver-taxi")?.skillRequirements.map((candidate) => candidate.id))
      .toContain("fast-talk");
    expect(registry.get("driver-chauffeur")?.skillRequirements.map((candidate) => candidate.id))
      .not.toContain("accounting");
  });

  it("Gangster 同时要求 generic Fighting 与 Firearms，各自接受 1+ 并拒绝重复", () => {
    const brawl = predefined("fighting", "brawl");
    const sword = predefined("fighting", "sword");
    const handgun = predefined("firearms", "handgun");
    const rifle = predefined("firearms", "rifle-shotgun");
    for (const occupationId of ["gangster-boss", "gangster-underling"] as const) {
      const fighting = selectedRequirement(occupationId, "fighting");
      const firearms = selectedRequirement(occupationId, "firearms");
      expect(fighting.selector.type).toBe("specialization-of");
      expect(firearms.selector.type).toBe("specialization-of");
      expect(fighting.cardinality).toEqual({ min: 1 });
      expect(firearms.cardinality).toEqual({ min: 1 });
      expect(validateOccupationRequirementSelection(fighting, [brawl, sword])).toEqual([]);
      expect(validateOccupationRequirementSelection(firearms, [handgun, rifle])).toEqual([]);
      expect(validateOccupationRequirementSelection(fighting, [brawl, brawl]).map((issue) => issue.code))
        .toContain("duplicate-skill-selection");
      expect(validateOccupationRequirementSelection(firearms, [handgun, handgun]).map((issue) => issue.code))
        .toContain("duplicate-skill-selection");
    }
  });

  it("Gangster Boss 与 Underling 锁定 CR、公式、Drive Auto 与 free-slot 差异", () => {
    expect(registry.get("gangster-boss")?.skillRequirements.map((candidate) => candidate.id))
      .toContain("law");
    expect(registry.get("gangster-underling")?.skillRequirements.map((candidate) => candidate.id))
      .toContain("drive-auto");
    expect(selectedRequirement("gangster-underling", "personal-or-era-specialties").cardinality)
      .toEqual({ min: 2, max: 2 });
    expect(registry.get("gangster-boss")?.skillRequirements.some((candidate) =>
      candidate.selector.type === "any-skill")).toBe(false);
  });

  it("Military Officer 保留 Survival / First Aid source variant，不制造二选一 requirement", () => {
    const keeper = registry.get("military-officer-keeper-rulebook");
    const handbook = registry.get("military-officer-investigator-handbook");
    const survival = selectedRequirement("military-officer-keeper-rulebook", "survival");
    const firstAid = selectedRequirement("military-officer-investigator-handbook", "first-aid");

    expect(validateOccupationRequirementSelection(
      survival,
      [predefined("survival", "wilderness")],
    )).toEqual([]);
    expect(validateOccupationRequirementSelection(firstAid, [standard("first-aid")])).toEqual([]);
    expect(keeper?.skillRequirements.some((candidate) => candidate.id === "first-aid")).toBe(false);
    expect(handbook?.skillRequirements.some((candidate) => candidate.id === "survival")).toBe(false);
    expect([...keeper?.skillRequirements ?? [], ...handbook?.skillRequirements ?? []]
      .some((candidate) => candidate.selector.type === "one-of" &&
        ["first-aid", "survival"].includes(candidate.id))).toBe(false);
    expect(selectedRequirement("military-officer-keeper-rulebook", "other-skill").keeperReview)
      .toBeUndefined();
    expect(selectedRequirement("military-officer-investigator-handbook", "personal-or-era-specialty").keeperReview)
      .toBe(true);
  });
});
