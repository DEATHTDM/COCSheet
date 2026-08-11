import { describe, expect, it } from "vitest";

import { validateOccupationRequirementSelection } from "../../coc7/rules/occupationSkills";
import { occupationDefinitionSchema, type SkillSelector } from "../../coc7/types/occupation";
import type { SkillRef } from "../../coc7/types/skill";
import { createOccupationRegistry } from "../occupationRegistry";
import { createSkillRegistry } from "../skillRegistry";
import { standardSettingPack } from ".";
import { standardOccupationDefinitions } from "./occupations";
import { standardSkillDefinitions } from "./skills";

const skills = createSkillRegistry(standardSkillDefinitions);
const registry = createOccupationRegistry(standardSettingPack, skills);

const expectedMechanics = [
  {
    id: "accountant",
    creditRating: { min: 30, max: 70 },
    pointFormula: { type: "attribute", attribute: "EDU", multiplier: 4 },
    requirementIds: ["accounting", "law", "library-use", "listen", "persuade", "spot-hidden", "personal-or-era-specialties"],
    selectorTypes: ["exact", "exact", "exact", "exact", "exact", "exact", "any-skill"],
    keeperReviewIds: ["personal-or-era-specialties"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:70"],
  },
  {
    id: "antiquarian",
    creditRating: { min: 30, max: 70 },
    pointFormula: { type: "attribute", attribute: "EDU", multiplier: 4 },
    requirementIds: ["appraise", "art-craft", "history", "library-use", "other-language", "social", "spot-hidden", "personal-or-era-specialty"],
    selectorTypes: ["exact", "specialization-of", "exact", "exact", "specialization-of", "one-of", "exact", "any-skill"],
    keeperReviewIds: ["personal-or-era-specialty"],
    sourcePages: ["coc7-keeper-rulebook-40th-zh:40", "coc7-investigator-handbook-zh-1-21:71"],
  },
  {
    id: "artist",
    creditRating: { min: 9, max: 50 },
    pointFormula: {
      type: "sum",
      terms: [
        { type: "attribute", attribute: "EDU", multiplier: 2 },
        { type: "best-of", attributes: ["DEX", "POW"], multiplier: 2 },
      ],
    },
    requirementIds: ["art-craft", "history-or-natural-world", "social", "other-language", "psychology", "spot-hidden", "personal-or-era-specialties"],
    selectorTypes: ["specialization-of", "one-of", "one-of", "specialization-of", "exact", "exact", "any-skill"],
    keeperReviewIds: ["personal-or-era-specialties"],
    sourcePages: ["coc7-keeper-rulebook-40th-zh:40", "coc7-investigator-handbook-zh-1-21:71"],
  },
  {
    id: "author",
    creditRating: { min: 9, max: 30 },
    pointFormula: { type: "attribute", attribute: "EDU", multiplier: 4 },
    requirementIds: ["literature", "history", "library-use", "natural-world-or-occult", "other-language", "own-language", "psychology", "personal-or-era-specialty"],
    selectorTypes: ["named-custom-specialization", "exact", "exact", "one-of", "specialization-of", "specialization-of", "exact", "any-skill"],
    keeperReviewIds: ["personal-or-era-specialty"],
    sourcePages: ["coc7-keeper-rulebook-40th-zh:40", "coc7-investigator-handbook-zh-1-21:72"],
  },
  {
    id: "doctor-of-medicine",
    creditRating: { min: 30, max: 80 },
    pointFormula: { type: "attribute", attribute: "EDU", multiplier: 4 },
    requirementIds: ["first-aid", "medicine", "latin", "psychology", "biology", "pharmacy", "academic-or-personal-specialties"],
    selectorTypes: ["exact", "exact", "named-custom-specialization", "exact", "exact", "exact", "any-skill"],
    keeperReviewIds: ["academic-or-personal-specialties"],
    sourcePages: ["coc7-keeper-rulebook-40th-zh:40", "coc7-investigator-handbook-zh-1-21:78"],
  },
  {
    id: "journalist-keeper-rulebook",
    creditRating: { min: 9, max: 30 },
    pointFormula: { type: "attribute", attribute: "EDU", multiplier: 4 },
    requirementIds: ["photography", "social", "history", "library-use", "own-language", "psychology", "other-skills"],
    selectorTypes: ["exact", "one-of", "exact", "exact", "specialization-of", "exact", "any-skill"],
    keeperReviewIds: [],
    sourcePages: ["coc7-keeper-rulebook-40th-zh:41"],
  },
  {
    id: "journalist-investigative-handbook",
    creditRating: { min: 9, max: 30 },
    pointFormula: { type: "attribute", attribute: "EDU", multiplier: 4 },
    requirementIds: ["art-or-photography", "social", "history", "library-use", "own-language", "psychology", "personal-or-era-specialties"],
    selectorTypes: ["one-of", "one-of", "exact", "exact", "specialization-of", "exact", "any-skill"],
    keeperReviewIds: ["personal-or-era-specialties"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:81"],
  },
  {
    id: "journalist-reporter-handbook",
    creditRating: { min: 9, max: 30 },
    pointFormula: { type: "attribute", attribute: "EDU", multiplier: 4 },
    requirementIds: ["acting", "history", "listen", "own-language", "social", "psychology", "stealth", "spot-hidden"],
    selectorTypes: ["exact", "exact", "exact", "specialization-of", "one-of", "exact", "exact", "exact"],
    keeperReviewIds: [],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:81"],
  },
  {
    id: "laboratory-assistant",
    creditRating: { min: 10, max: 30 },
    pointFormula: { type: "attribute", attribute: "EDU", multiplier: 4 },
    requirementIds: ["computer-or-library", "electrical-repair", "other-language", "science-set", "spot-hidden", "personal-specialty"],
    selectorTypes: ["one-of", "exact", "specialization-of", "all-of", "exact", "any-skill"],
    keeperReviewIds: ["personal-specialty"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:82"],
  },
  {
    id: "police-detective",
    creditRating: { min: 20, max: 50 },
    pointFormula: {
      type: "sum",
      terms: [
        { type: "attribute", attribute: "EDU", multiplier: 2 },
        { type: "best-of", attributes: ["DEX", "STR"], multiplier: 2 },
      ],
    },
    requirementIds: ["acting-or-disguise", "firearms", "law", "listen", "social", "psychology", "spot-hidden", "other-skill"],
    selectorTypes: ["one-of", "specialization-of", "exact", "exact", "one-of", "exact", "exact", "any-skill"],
    keeperReviewIds: [],
    sourcePages: ["coc7-keeper-rulebook-40th-zh:41", "coc7-investigator-handbook-zh-1-21:87"],
  },
  {
    id: "professor",
    creditRating: { min: 20, max: 70 },
    pointFormula: { type: "attribute", attribute: "EDU", multiplier: 4 },
    requirementIds: ["library-use", "other-language", "own-language", "psychology", "academic-era-personal-specialties"],
    selectorTypes: ["exact", "specialization-of", "specialization-of", "exact", "any-skill"],
    keeperReviewIds: ["academic-era-personal-specialties"],
    sourcePages: ["coc7-keeper-rulebook-40th-zh:41", "coc7-investigator-handbook-zh-1-21:87"],
  },
  {
    id: "soldier-marine",
    creditRating: { min: 9, max: 30 },
    pointFormula: {
      type: "sum",
      terms: [
        { type: "attribute", attribute: "EDU", multiplier: 2 },
        { type: "best-of", attributes: ["DEX", "STR"], multiplier: 2 },
      ],
    },
    requirementIds: ["climb-or-swim", "dodge", "fighting", "firearms", "stealth", "survival", "support-skills"],
    selectorTypes: ["one-of", "exact", "specialization-of", "specialization-of", "exact", "specialization-of", "one-of"],
    keeperReviewIds: [],
    sourcePages: ["coc7-keeper-rulebook-40th-zh:41", "coc7-investigator-handbook-zh-1-21:89"],
  },
  {
    id: "student-intern",
    creditRating: { min: 5, max: 10 },
    pointFormula: { type: "attribute", attribute: "EDU", multiplier: 4 },
    requirementIds: ["language", "library-use", "listen", "study-related-specialties", "personal-or-era-specialties"],
    selectorTypes: ["one-of", "exact", "exact", "any-skill", "any-skill"],
    keeperReviewIds: ["study-related-specialties", "personal-or-era-specialties"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:90"],
  },
  {
    id: "missionary-keeper-rulebook",
    creditRating: { min: 0, max: 30 },
    pointFormula: { type: "attribute", attribute: "EDU", multiplier: 4 },
    requirementIds: ["art-craft", "first-aid", "mechanical-repair", "medicine", "natural-world", "social", "other-skills"],
    selectorTypes: ["specialization-of", "exact", "exact", "exact", "exact", "one-of", "any-skill"],
    keeperReviewIds: [],
    sourcePages: ["coc7-keeper-rulebook-40th-zh:41"],
  },
  {
    id: "missionary-investigator-handbook",
    creditRating: { min: 0, max: 30 },
    pointFormula: {
      type: "sum",
      terms: [
        { type: "attribute", attribute: "EDU", multiplier: 2 },
        { type: "attribute", attribute: "APP", multiplier: 2 },
      ],
    },
    requirementIds: ["art-craft", "first-aid", "mechanical-repair", "medicine", "natural-world", "social", "personal-or-era-specialties"],
    selectorTypes: ["specialization-of", "exact", "exact", "exact", "exact", "one-of", "any-skill"],
    keeperReviewIds: ["personal-or-era-specialties"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:83"],
  },
] as const;

function visitSelector(selector: SkillSelector, visit: (selector: SkillSelector) => void): void {
  visit(selector);
  switch (selector.type) {
    case "one-of":
      selector.selectors.forEach((child) => visitSelector(child, visit));
      return;
    case "any-skill":
      selector.exclude?.forEach((child) => visitSelector(child, visit));
      return;
    case "all-of":
      selector.groups.forEach((group) => visitSelector(group.selector, visit));
      return;
    case "exact":
    case "specialization-of":
    case "named-custom-specialization":
      return;
  }
}

describe("Standard production occupation catalog", () => {
  it("将 12 个 canonical family 的 15 个生产 definition 接入 Standard SettingPack", () => {
    expect(standardSettingPack.occupations).toEqual(standardOccupationDefinitions);
    expect(standardSettingPack.occupations).toHaveLength(15);
    const families = new Set(standardSettingPack.occupations.map((occupation) => occupation.variantOf ?? occupation.id));
    expect(families.size).toBe(12);
  });

  it("所有 definition 通过 schema 与完整 Standard OccupationRegistry 注册", () => {
    standardSettingPack.occupations.forEach((occupation) => {
      expect(occupationDefinitionSchema.parse(occupation)).toEqual(occupation);
    });
    expect(registry.definitions).toHaveLength(15);
  });

  it("ID 与职业内 requirement ID 唯一，并保留无空壳的 source variant identity", () => {
    const ids = standardSettingPack.occupations.map((occupation) => occupation.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const occupation of standardSettingPack.occupations) {
      const requirementIds = occupation.skillRequirements.map((requirement) => requirement.id);
      expect(new Set(requirementIds).size).toBe(requirementIds.length);
    }
    expect(registry.get("journalist")).toBeUndefined();
    expect(registry.get("missionary")).toBeUndefined();
    expect(registry.definitions.filter((occupation) => occupation.variantOf === "journalist")).toHaveLength(3);
    expect(registry.definitions.filter((occupation) => occupation.variantOf === "missionary")).toHaveLength(2);
  });

  it("所有 exact、predefined、specialization 与 named custom selector 都可由 Standard skill catalog 解析", () => {
    for (const occupation of standardSettingPack.occupations) {
      for (const requirement of occupation.skillRequirements) {
        visitSelector(requirement.selector, (selector) => {
          if (selector.type === "exact") {
            const definition = skills.get(selector.ref.definitionId);
            expect(definition, `${occupation.id}:${requirement.id}`).toBeDefined();
            if (selector.ref.type === "predefined") {
              expect(
                skills.resolvePredefined(selector.ref.definitionId, selector.ref.specializationId),
                `${occupation.id}:${requirement.id}`,
              ).toBeDefined();
            }
          }
          if (selector.type === "specialization-of" || selector.type === "named-custom-specialization") {
            const definition = skills.get(selector.definitionId);
            expect(definition, `${occupation.id}:${requirement.id}`).toBeDefined();
            expect(definition?.specialization.type).toBe("required");
            if (selector.type === "named-custom-specialization" && definition?.specialization.type === "required") {
              expect(definition.specialization.allowCustom).toBe(true);
            }
          }
        });
      }
    }
  });

  it("所有 occupation 都有合法 era、非空 sourceRefs 与印刷页", () => {
    for (const occupation of standardSettingPack.occupations) {
      expect(occupation.era).toEqual({ type: "all" });
      expect(occupation.sourceRefs.length).toBeGreaterThan(0);
      occupation.sourceRefs.forEach((source) => expect(source.page).toBeGreaterThan(0));
    }
  });

  it("搜索与 category/era filter 覆盖中文、英文与 alias", () => {
    expect(registry.search("会计师").map((occupation) => occupation.id)).toContain("accountant");
    expect(registry.search("Physician").map((occupation) => occupation.id)).toContain("doctor-of-medicine");
    expect(registry.search("记者")).toHaveLength(3);
    expect(registry.list({ category: "medical" }).map((occupation) => occupation.id)).toEqual(["doctor-of-medicine"]);
    expect(registry.list({ era: "classic-1920s" })).toHaveLength(15);
    expect(registry.list({ era: "modern" })).toHaveLength(15);
  });

  it("实验室助理的固定 Chemistry + 另两项 Science 组合接受合法选择并拒绝缺少 Chemistry 的选择", () => {
    const requirement = registry.get("laboratory-assistant")?.skillRequirements.find(
      (candidate) => candidate.id === "science-set",
    );
    if (!requirement) throw new Error("缺少 laboratory-assistant science-set requirement");
    const legal: readonly SkillRef[] = [
      { type: "predefined", definitionId: "science", specializationId: "chemistry" },
      { type: "predefined", definitionId: "science", specializationId: "biology" },
      { type: "predefined", definitionId: "science", specializationId: "physics" },
    ];
    const illegal: readonly SkillRef[] = [
      { type: "predefined", definitionId: "science", specializationId: "biology" },
      { type: "predefined", definitionId: "science", specializationId: "physics" },
      { type: "predefined", definitionId: "science", specializationId: "geology" },
    ];
    expect(validateOccupationRequirementSelection(requirement, legal)).toEqual([]);
    expect(validateOccupationRequirementSelection(requirement, illegal).map((issue) => issue.code)).toContain("selector-mismatch");
  });

  it.each(expectedMechanics)("锁定 $id 的机械字段", (expected) => {
    const occupation = registry.get(expected.id);
    expect(occupation?.creditRating).toEqual(expected.creditRating);
    expect(occupation?.pointFormula).toEqual(expected.pointFormula);
    expect(occupation?.skillRequirements.map((requirement) => requirement.id)).toEqual(expected.requirementIds);
    expect(occupation?.skillRequirements.map((requirement) => requirement.selector.type)).toEqual(expected.selectorTypes);
    expect(occupation?.skillRequirements.filter((requirement) => requirement.keeperReview).map((requirement) => requirement.id))
      .toEqual(expected.keeperReviewIds);
    expect(occupation?.sourceRefs.map((source) => `${source.sourceId}:${source.page}`)).toEqual(expected.sourcePages);
  });
});
