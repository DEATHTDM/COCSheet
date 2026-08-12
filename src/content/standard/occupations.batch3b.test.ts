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
import { batch3bOccupationDefinitions } from "./occupations/batch3b";
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
    id: "federal-agent",
    name: { zh: "联邦探员", en: "Federal Agent" },
    aliases: undefined,
    category: "investigation-security",
    creditRating: { min: 20, max: 40 },
    pointFormula: edu4,
    requirements: [
      ["drive-auto", "exact", 1, 1],
      ["brawl", "exact", 1, 1],
      ["firearms", "specialization-of", 1, null],
      ["law", "exact", 1, 1],
      ["persuade", "exact", 1, 1],
      ["stealth", "exact", 1, 1],
      ["spot-hidden", "exact", 1, 1],
      ["personal-or-era-specialty", "any-skill", 1, 1],
    ],
    keeperReviewIds: ["personal-or-era-specialty"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:80"],
  },
  {
    id: "foreign-correspondent",
    name: { zh: "驻外记者", en: "Foreign Correspondent" },
    aliases: undefined,
    category: "media-art",
    creditRating: { min: 10, max: 40 },
    pointFormula: edu4,
    requirements: [
      ["history", "exact", 1, 1],
      ["other-language", "specialization-of", 1, 1],
      ["own-language", "specialization-of", 1, 1],
      ["listen", "exact", 1, 1],
      ["social", "one-of", 2, 2],
      ["psychology", "exact", 1, 1],
      ["personal-or-era-specialty", "any-skill", 1, 1],
    ],
    keeperReviewIds: ["personal-or-era-specialty"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:80"],
  },
  {
    id: "hobo",
    name: { zh: "游民", en: "Hobo" },
    aliases: undefined,
    category: "social-special",
    creditRating: { min: 0, max: 5 },
    pointFormula: edu2Best("APP", "DEX"),
    requirements: [
      ["art-craft", "specialization-of", 1, 1],
      ["climb", "exact", 1, 1],
      ["jump", "exact", 1, 1],
      ["listen", "exact", 1, 1],
      ["locksmith-or-sleight-of-hand", "one-of", 1, 1],
      ["navigate", "exact", 1, 1],
      ["stealth", "exact", 1, 1],
      ["personal-or-era-specialty", "any-skill", 1, 1],
    ],
    keeperReviewIds: ["personal-or-era-specialty"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:81"],
  },
  {
    id: "librarian",
    name: { zh: "图书馆管理员（原作向）", en: "Librarian" },
    aliases: { zh: ["图书馆管理员"] },
    category: "academic",
    creditRating: { min: 9, max: 35 },
    pointFormula: edu4,
    requirements: [
      ["accounting", "exact", 1, 1],
      ["library-use", "exact", 1, 1],
      ["other-language", "specialization-of", 1, 1],
      ["own-language", "specialization-of", 1, 1],
      ["personal-or-professional-reading-specialties", "any-skill", 4, 4],
    ],
    keeperReviewIds: ["personal-or-professional-reading-specialties"],
    sourcePages: ["coc7-keeper-rulebook-40th-zh:41", "coc7-investigator-handbook-zh-1-21:83"],
  },
  {
    id: "mechanic",
    name: { zh: "技师", en: "Mechanic (and Skilled Trades)" },
    aliases: { en: ["Mechanic"] },
    category: "technical-labor",
    creditRating: { min: 9, max: 40 },
    pointFormula: edu4,
    requirements: [
      ["trade-art-craft", "specialization-of", 1, 1],
      ["climb", "exact", 1, 1],
      ["drive-auto", "exact", 1, 1],
      ["electrical-repair", "exact", 1, 1],
      ["mechanical-repair", "exact", 1, 1],
      ["operate-heavy-machinery", "exact", 1, 1],
      ["personal-era-or-technical-specialties", "any-skill", 2, 2],
    ],
    keeperReviewIds: ["trade-art-craft", "personal-era-or-technical-specialties"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:83"],
  },
  {
    id: "occultist",
    name: { zh: "神秘学家", en: "Occultist" },
    aliases: undefined,
    category: "religion-occult",
    creditRating: { min: 9, max: 65 },
    pointFormula: edu4,
    requirements: [
      ["anthropology", "exact", 1, 1],
      ["history", "exact", 1, 1],
      ["library-use", "exact", 1, 1],
      ["social", "one-of", 1, 1],
      ["occult", "exact", 1, 1],
      ["other-language", "specialization-of", 1, 1],
      ["astronomy", "exact", 1, 1],
      ["personal-or-era-specialty", "any-skill", 1, 1],
    ],
    keeperReviewIds: ["personal-or-era-specialty"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:84"],
  },
  {
    id: "parapsychologist",
    name: { zh: "超心理学家", en: "Parapsychologist" },
    aliases: undefined,
    category: "religion-occult",
    creditRating: { min: 9, max: 30 },
    pointFormula: edu4,
    requirements: [
      ["anthropology", "exact", 1, 1],
      ["photography", "exact", 1, 1],
      ["history", "exact", 1, 1],
      ["library-use", "exact", 1, 1],
      ["occult", "exact", 1, 1],
      ["other-language", "specialization-of", 1, 1],
      ["psychology", "exact", 1, 1],
      ["personal-or-era-specialty", "any-skill", 1, 1],
    ],
    keeperReviewIds: ["personal-or-era-specialty"],
    sourcePages: ["coc7-keeper-rulebook-40th-zh:41", "coc7-investigator-handbook-zh-1-21:85"],
  },
  {
    id: "private-investigator",
    name: { zh: "私家侦探", en: "Private Investigator" },
    aliases: undefined,
    category: "investigation-security",
    creditRating: { min: 9, max: 30 },
    pointFormula: edu2Best("DEX", "STR"),
    requirements: [
      ["photography", "exact", 1, 1],
      ["disguise", "exact", 1, 1],
      ["law", "exact", 1, 1],
      ["library-use", "exact", 1, 1],
      ["social", "one-of", 1, 1],
      ["psychology", "exact", 1, 1],
      ["spot-hidden", "exact", 1, 1],
      ["personal-or-era-specialty", "any-skill", 1, 1],
    ],
    keeperReviewIds: ["personal-or-era-specialty"],
    sourcePages: ["coc7-keeper-rulebook-40th-zh:41", "coc7-investigator-handbook-zh-1-21:87"],
  },
  {
    id: "prospector",
    name: { zh: "淘金客", en: "Prospector" },
    aliases: undefined,
    category: "outdoor-adventure",
    creditRating: { min: 0, max: 10 },
    pointFormula: edu2Best("DEX", "STR"),
    requirements: [
      ["climb", "exact", 1, 1],
      ["first-aid", "exact", 1, 1],
      ["history", "exact", 1, 1],
      ["mechanical-repair", "exact", 1, 1],
      ["navigate", "exact", 1, 1],
      ["geology", "exact", 1, 1],
      ["spot-hidden", "exact", 1, 1],
      ["personal-or-era-specialty", "any-skill", 1, 1],
    ],
    keeperReviewIds: ["personal-or-era-specialty"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:88"],
  },
  {
    id: "psychologist-psychoanalyst",
    name: { zh: "心理学家、心理分析学家", en: "Psychologist / Psychoanalyst" },
    aliases: {
      zh: ["心理学家", "心理分析学家", "精神分析学家"],
      en: ["Psychologist", "Psychoanalyst"],
    },
    category: "medical",
    creditRating: { min: 10, max: 40 },
    pointFormula: edu4,
    requirements: [
      ["accounting", "exact", 1, 1],
      ["library-use", "exact", 1, 1],
      ["listen", "exact", 1, 1],
      ["persuade", "exact", 1, 1],
      ["psychoanalysis", "exact", 1, 1],
      ["psychology", "exact", 1, 1],
      ["academic-personal-or-era-specialties", "any-skill", 2, 2],
    ],
    keeperReviewIds: ["academic-personal-or-era-specialties"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:88"],
  },
  {
    id: "researcher",
    name: { zh: "研究员", en: "Researcher" },
    aliases: undefined,
    category: "academic",
    creditRating: { min: 9, max: 30 },
    pointFormula: edu4,
    requirements: [
      ["history", "exact", 1, 1],
      ["library-use", "exact", 1, 1],
      ["social", "one-of", 1, 1],
      ["other-language", "specialization-of", 1, 1],
      ["spot-hidden", "exact", 1, 1],
      ["academic-fields", "any-skill", 3, 3],
    ],
    keeperReviewIds: ["academic-fields"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:89"],
  },
  {
    id: "scientist",
    name: { zh: "科学家", en: "Scientist" },
    aliases: undefined,
    category: "academic",
    creditRating: { min: 9, max: 50 },
    pointFormula: edu4,
    requirements: [
      ["science-specialties", "specialization-of", 3, 3],
      ["computer-or-library", "one-of", 1, 1],
      ["other-language", "specialization-of", 1, 1],
      ["own-language", "specialization-of", 1, 1],
      ["social", "one-of", 1, 1],
      ["spot-hidden", "exact", 1, 1],
    ],
    keeperReviewIds: [],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:89"],
  },
  {
    id: "secretary",
    name: { zh: "秘书", en: "Secretary" },
    aliases: undefined,
    category: "business-professional",
    creditRating: { min: 9, max: 30 },
    pointFormula: edu2Best("APP", "DEX"),
    requirements: [
      ["accounting", "exact", 1, 1],
      ["typing-or-shorthand", "one-of", 1, 1],
      ["social", "one-of", 2, 2],
      ["own-language", "specialization-of", 1, 1],
      ["computer-or-library", "one-of", 1, 1],
      ["psychology", "exact", 1, 1],
      ["personal-or-era-specialty", "any-skill", 1, 1],
    ],
    keeperReviewIds: ["personal-or-era-specialty"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:90"],
  },
  {
    id: "sex-worker",
    name: { zh: "性工作者", en: "Prostitute" },
    aliases: { en: ["Sex Worker"] },
    category: "social-special",
    creditRating: { min: 5, max: 50 },
    pointFormula: edu2Best("APP"),
    requirements: [
      ["art-craft", "specialization-of", 1, 1],
      ["social", "one-of", 2, 2],
      ["dodge", "exact", 1, 1],
      ["psychology", "exact", 1, 1],
      ["sleight-of-hand", "exact", 1, 1],
      ["stealth", "exact", 1, 1],
      ["personal-or-era-specialty", "any-skill", 1, 1],
    ],
    keeperReviewIds: ["personal-or-era-specialty"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:88"],
  },
  {
    id: "waiter",
    name: { zh: "服务生", en: "Waitress / Waiter" },
    aliases: { zh: ["服务员"], en: ["Waitress", "Waiter"] },
    category: "business-professional",
    creditRating: { min: 9, max: 20 },
    pointFormula: edu2Best("APP", "DEX"),
    requirements: [
      ["accounting", "exact", 1, 1],
      ["art-craft", "specialization-of", 1, 1],
      ["dodge", "exact", 1, 1],
      ["listen", "exact", 1, 1],
      ["social", "one-of", 2, 2],
      ["psychology", "exact", 1, 1],
      ["personal-or-era-specialty", "any-skill", 1, 1],
    ],
    keeperReviewIds: ["personal-or-era-specialty"],
    sourcePages: ["coc7-investigator-handbook-zh-1-21:91"],
  },
  {
    id: "zealot",
    name: { zh: "狂热者", en: "Zealot" },
    aliases: undefined,
    category: "religion-occult",
    creditRating: { min: 0, max: 30 },
    pointFormula: edu2Best("APP", "POW"),
    requirements: [
      ["history", "exact", 1, 1],
      ["social", "one-of", 2, 2],
      ["psychology", "exact", 1, 1],
      ["stealth", "exact", 1, 1],
      ["personal-or-era-specialties", "any-skill", 3, 3],
    ],
    keeperReviewIds: ["personal-or-era-specialties"],
    sourcePages: ["coc7-keeper-rulebook-40th-zh:41", "coc7-investigator-handbook-zh-1-21:93"],
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

describe("Phase 5B-2 Batch 3B occupations", () => {
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

  it("本批导入 16 个 canonical definition 并完整实现 16 个 family", () => {
    expect(batch3bOccupationDefinitions).toHaveLength(16);
    expect(new Set(batch3bOccupationDefinitions.map((occupation) => occupation.variantOf ?? occupation.id)).size)
      .toBe(16);
    expect(batch3bOccupationDefinitions.every((occupation) => occupation.variantOf === undefined)).toBe(true);
  });

  it("Foreign Correspondent 分别保留 Language Own 与 Language Other specialization identity", () => {
    const ownLanguage = selectedRequirement("foreign-correspondent", "own-language");
    const otherLanguage = selectedRequirement("foreign-correspondent", "other-language");
    const ownRef: SkillRef = {
      type: "custom",
      definitionId: "language-own",
      specializationId: "00000000-0000-4000-8000-000000000041",
      displayName: "普通话",
    };
    const otherRef: SkillRef = {
      type: "custom",
      definitionId: "language-other",
      specializationId: "00000000-0000-4000-8000-000000000042",
      displayName: "法语",
    };

    expect(validateOccupationRequirementSelection(ownLanguage, [ownRef])).toEqual([]);
    expect(validateOccupationRequirementSelection(otherLanguage, [otherRef])).toEqual([]);
    expect(validateOccupationRequirementSelection(ownLanguage, [otherRef]).map((issue) => issue.code))
      .toContain("selector-mismatch");
  });

  it("Scientist 要求三项不同 Science specialization 并拒绝重复 SkillRef", () => {
    const sciences = selectedRequirement("scientist", "science-specialties");
    const biology = predefined("science", "biology");
    const chemistry = predefined("science", "chemistry");
    const geology = predefined("science", "geology");

    expect(validateOccupationRequirementSelection(sciences, [biology, chemistry, geology])).toEqual([]);
    expect(validateOccupationRequirementSelection(sciences, [biology, biology, geology]).map((issue) => issue.code))
      .toContain("duplicate-skill-selection");
    expect(validateOccupationRequirementSelection(sciences, [biology, chemistry]).map((issue) => issue.code))
      .toContain("requirement-cardinality");
  });

  it("social choose-two 接受两项不同社交技能并拒绝重复与越界技能", () => {
    for (const [occupationId, requirementId] of [
      ["foreign-correspondent", "social"],
      ["sex-worker", "social"],
      ["waiter", "social"],
      ["zealot", "social"],
    ] as const) {
      const social = selectedRequirement(occupationId, requirementId);
      expect(validateOccupationRequirementSelection(social, [standard("charm"), standard("persuade")]))
        .toEqual([]);
      expect(validateOccupationRequirementSelection(social, [standard("charm"), standard("charm")])
        .map((issue) => issue.code)).toContain("duplicate-skill-selection");
      expect(validateOccupationRequirementSelection(social, [standard("charm"), standard("law")])
        .map((issue) => issue.code)).toContain("selector-mismatch");
    }
  });

  it("Federal Agent 的 generic Firearms 保持 1+，固定 Brawl 不接受其他 Fighting 专业", () => {
    const firearms = selectedRequirement("federal-agent", "firearms");
    const fixedBrawl = selectedRequirement("federal-agent", "brawl");
    const handgun = predefined("firearms", "handgun");
    const rifle = predefined("firearms", "rifle-shotgun");

    expect(firearms.cardinality).toEqual({ min: 1 });
    expect(validateOccupationRequirementSelection(firearms, [handgun, rifle])).toEqual([]);
    expect(validateOccupationRequirementSelection(firearms, [handgun, handgun]).map((issue) => issue.code))
      .toContain("duplicate-skill-selection");
    expect(validateOccupationRequirementSelection(fixedBrawl, [predefined("fighting", "brawl")])).toEqual([]);
    expect(validateOccupationRequirementSelection(fixedBrawl, [predefined("fighting", "sword")])
      .map((issue) => issue.code)).toContain("selector-mismatch");
  });

  it("Prospector 只接受 canonical Science (Geology) predefined specialization", () => {
    const geology = selectedRequirement("prospector", "geology");
    expect(validateOccupationRequirementSelection(geology, [predefined("science", "geology")])).toEqual([]);
    expect(validateOccupationRequirementSelection(geology, [predefined("science", "biology")])
      .map((issue) => issue.code)).toContain("selector-mismatch");
  });

  it("Hobo 的 Locksmith / Sleight of Hand one-of 只接受真实二选一", () => {
    const choice = selectedRequirement("hobo", "locksmith-or-sleight-of-hand");
    expect(validateOccupationRequirementSelection(choice, [standard("locksmith")])).toEqual([]);
    expect(validateOccupationRequirementSelection(choice, [standard("sleight-of-hand")])).toEqual([]);
    expect(validateOccupationRequirementSelection(choice, [standard("navigate")]).map((issue) => issue.code))
      .toContain("selector-mismatch");
  });

  it("Secretary 的 Typing / Shorthand 使用固定名称 custom specialization，而非新增 catalog skill", () => {
    const choice = selectedRequirement("secretary", "typing-or-shorthand");
    if (choice.selector.type !== "one-of") throw new Error("Secretary 缺少 Typing / Shorthand one-of");
    const typingSelector = choice.selector.selectors[0];
    const shorthandSelector = choice.selector.selectors[1];
    if (typingSelector?.type !== "named-custom-specialization" ||
      shorthandSelector?.type !== "named-custom-specialization") {
      throw new Error("Secretary 的 Typing / Shorthand 未使用 named custom specialization");
    }
    const typing = instantiateNamedCustomSpecialization(
      typingSelector,
      "00000000-0000-4000-8000-000000000043",
    );
    const shorthand = instantiateNamedCustomSpecialization(
      shorthandSelector,
      "00000000-0000-4000-8000-000000000044",
    );

    expect(validateOccupationRequirementSelection(choice, [typing])).toEqual([]);
    expect(validateOccupationRequirementSelection(choice, [shorthand])).toEqual([]);
    expect(validateOccupationRequirementSelection(choice, [predefined("art-craft", "photography")])
      .map((issue) => issue.code)).toContain("selector-mismatch");
  });

  it("fuzzy personal、academic 与 professional slots 保留 guidance 和 Keeper review", () => {
    const expectations = [
      ["private-investigator", "personal-or-era-specialty", "个人或时代特长"],
      ["librarian", "personal-or-professional-reading-specialties", "个人专长或专业阅读主题"],
      ["researcher", "academic-fields", "其他学术领域"],
      ["mechanic", "trade-art-craft", "与技师职业相关的工艺专业，例如木工、焊接或管道工"],
    ] as const;
    for (const [occupationId, requirementId, guidanceZh] of expectations) {
      const fuzzy = selectedRequirement(occupationId, requirementId);
      expect(fuzzy.keeperReview).toBe(true);
      expect(fuzzy.guidance?.zh).toBe(guidanceZh);
    }

    expect(validateOccupationRequirementSelection(
      selectedRequirement("researcher", "academic-fields"),
      [standard("history"), predefined("science", "biology"), standard("law")],
    )).toEqual([]);
  });

  it("Occultist 的 fuzzy slot 可选择 Cthulhu Mythos，并保留 requirement-level Keeper review", () => {
    const specialty = selectedRequirement("occultist", "personal-or-era-specialty");
    expect(specialty.keeperReview).toBe(true);
    expect(validateOccupationRequirementSelection(specialty, [standard("cthulhu-mythos")])).toEqual([]);
  });

  it.each(["librarian", "parapsychologist", "private-investigator", "zealot"])(
    "%s 重新核验后仍为跨书 canonical definition",
    (occupationId) => {
      const occupation = registry.get(occupationId);
      expect(occupation?.variantOf).toBeUndefined();
      expect(occupation?.sourceRefs.map((source) => source.sourceId)).toEqual([
        "coc7-keeper-rulebook-40th-zh",
        "coc7-investigator-handbook-zh-1-21",
      ]);
    },
  );
});
