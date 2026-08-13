import { describe, expect, it } from "vitest";

import { validateOccupationRequirementSelection } from "../../coc7/rules/occupationSkills";
import type { OccupationPointFormula } from "../../coc7/types/occupation";
import type { SkillRef } from "../../coc7/types/skill";
import { createOccupationRegistry } from "../occupationRegistry";
import { createSkillRegistry } from "../skillRegistry";
import { standardSettingPack } from ".";
import { batch3eCriminalOccupationDefinitions } from "./occupations/batch3e-criminal";
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
    id: "criminal-assassin",
    name: { zh: "刺客", en: "Assassin" },
    aliases: undefined,
    era: { type: "all" },
    creditRating: { min: 30, max: 60 },
    pointFormula: edu2Plus("DEX", "STR"),
    requirements: [
      ["disguise", "exact", 1, 1],
      ["electrical-repair", "exact", 1, 1],
      ["fighting", "specialization-of", 1, null],
      ["firearms", "specialization-of", 1, null],
      ["locksmith", "exact", 1, 1],
      ["mechanical-repair", "exact", 1, 1],
      ["stealth", "exact", 1, 1],
      ["psychology", "exact", 1, 1],
    ],
    keeperReviewIds: [],
    sourcePage: 75,
  },
  {
    id: "criminal-bank-robber",
    name: { zh: "银行劫匪", en: "Bank Robber" },
    aliases: undefined,
    era: { type: "all" },
    creditRating: { min: 5, max: 75 },
    pointFormula: edu2Plus("DEX", "STR"),
    requirements: [
      ["drive-auto", "exact", 1, 1],
      ["electrical-or-mechanical-repair", "one-of", 1, 1],
      ["fighting", "specialization-of", 1, null],
      ["firearms", "specialization-of", 1, null],
      ["intimidate", "exact", 1, 1],
      ["locksmith", "exact", 1, 1],
      ["operate-heavy-machinery", "exact", 1, 1],
      ["personal-or-era-specialty", "any-skill", 1, 1],
    ],
    keeperReviewIds: ["personal-or-era-specialty"],
    sourcePage: 75,
  },
  {
    id: "criminal-bootlegger-thug",
    name: { zh: "打手、暴徒", en: "Bootlegger / Thug" },
    aliases: undefined,
    era: { type: "all" },
    creditRating: { min: 5, max: 30 },
    pointFormula: edu2Plus("STR"),
    requirements: [
      ["drive-auto", "exact", 1, 1],
      ["fighting", "specialization-of", 1, null],
      ["firearms", "specialization-of", 1, null],
      ["social", "one-of", 2, 2],
      ["psychology", "exact", 1, 1],
      ["stealth", "exact", 1, 1],
      ["spot-hidden", "exact", 1, 1],
    ],
    keeperReviewIds: [],
    sourcePage: 75,
  },
  {
    id: "criminal-burglar",
    name: { zh: "窃贼", en: "Burglar" },
    aliases: undefined,
    era: { type: "all" },
    creditRating: { min: 5, max: 40 },
    pointFormula: edu2Plus("DEX"),
    requirements: [
      ["appraise", "exact", 1, 1],
      ["climb", "exact", 1, 1],
      ["electrical-or-mechanical-repair", "one-of", 1, 1],
      ["listen", "exact", 1, 1],
      ["locksmith", "exact", 1, 1],
      ["sleight-of-hand", "exact", 1, 1],
      ["stealth", "exact", 1, 1],
      ["spot-hidden", "exact", 1, 1],
    ],
    keeperReviewIds: [],
    sourcePage: 75,
  },
  {
    id: "criminal-conman",
    name: { zh: "欺诈师", en: "Conman" },
    aliases: undefined,
    era: { type: "all" },
    creditRating: { min: 10, max: 65 },
    pointFormula: edu2Plus("APP"),
    requirements: [
      ["appraise", "exact", 1, 1],
      ["acting", "exact", 1, 1],
      ["law-or-other-language", "one-of", 1, 1],
      ["listen", "exact", 1, 1],
      ["social", "one-of", 2, 2],
      ["psychology", "exact", 1, 1],
      ["sleight-of-hand", "exact", 1, 1],
    ],
    keeperReviewIds: [],
    sourcePage: 75,
  },
  {
    id: "criminal-freelance-solo",
    name: { zh: "独行罪犯", en: "Criminal (Freelance / Solo)" },
    aliases: undefined,
    era: { type: "all" },
    creditRating: { min: 5, max: 65 },
    pointFormula: edu2Plus("APP", "DEX"),
    requirements: [
      ["acting-or-disguise", "one-of", 1, 1],
      ["appraise", "exact", 1, 1],
      ["social", "one-of", 1, 1],
      ["fighting-or-firearms", "one-branch", 1, null],
      ["locksmith-or-mechanical-repair", "one-of", 1, 1],
      ["stealth", "exact", 1, 1],
      ["psychology", "exact", 1, 1],
      ["spot-hidden", "exact", 1, 1],
    ],
    keeperReviewIds: [],
    sourcePage: 75,
  },
  {
    id: "criminal-gun-moll",
    name: { zh: "女飞贼（古典）", en: "Gun Moll" },
    aliases: undefined,
    era: { type: "specific", eraIds: ["classic-1920s"] },
    creditRating: { min: 10, max: 80 },
    pointFormula: edu2Plus("APP"),
    requirements: [
      ["art-craft", "specialization-of", 1, 1],
      ["social", "one-of", 2, 2],
      ["brawl-or-handgun", "one-of", 1, 1],
      ["drive-auto", "exact", 1, 1],
      ["listen", "exact", 1, 1],
      ["stealth", "exact", 1, 1],
      ["personal-or-era-specialty", "any-skill", 1, 1],
    ],
    keeperReviewIds: ["personal-or-era-specialty"],
    sourcePage: 76,
  },
  {
    id: "criminal-fence",
    name: { zh: "赃物贩子", en: "Fence" },
    aliases: undefined,
    era: { type: "all" },
    creditRating: { min: 20, max: 40 },
    pointFormula: edu2Plus("APP"),
    requirements: [
      ["accounting", "exact", 1, 1],
      ["appraise", "exact", 1, 1],
      ["forgery", "exact", 1, 1],
      ["history", "exact", 1, 1],
      ["social", "one-of", 1, 1],
      ["library-use", "exact", 1, 1],
      ["spot-hidden", "exact", 1, 1],
      ["other-skill", "any-skill", 1, 1],
    ],
    keeperReviewIds: [],
    sourcePage: 76,
  },
  {
    id: "criminal-forger-counterfeiter",
    name: { zh: "赝造者、伪造者", en: "Forger / Counterfeiter" },
    aliases: undefined,
    era: { type: "all" },
    creditRating: { min: 20, max: 60 },
    pointFormula: edu4,
    requirements: [
      ["accounting", "exact", 1, 1],
      ["appraise", "exact", 1, 1],
      ["forgery", "exact", 1, 1],
      ["history", "exact", 1, 1],
      ["library-use", "exact", 1, 1],
      ["spot-hidden", "exact", 1, 1],
      ["sleight-of-hand", "exact", 1, 1],
      ["personal-or-era-specialty", "any-skill", 1, 1],
    ],
    keeperReviewIds: ["personal-or-era-specialty"],
    sourcePage: 76,
  },
  {
    id: "criminal-smuggler",
    name: { zh: "走私者", en: "Smuggler" },
    aliases: undefined,
    era: { type: "all" },
    creditRating: { min: 20, max: 60 },
    pointFormula: edu2Plus("APP", "DEX"),
    requirements: [
      ["firearms", "specialization-of", 1, null],
      ["listen", "exact", 1, 1],
      ["navigate", "exact", 1, 1],
      ["social", "one-of", 1, 1],
      ["transport", "one-of", 1, 1],
      ["psychology", "exact", 1, 1],
      ["sleight-of-hand", "exact", 1, 1],
      ["spot-hidden", "exact", 1, 1],
    ],
    keeperReviewIds: [],
    sourcePage: 76,
  },
  {
    id: "criminal-street-punk",
    name: { zh: "混混", en: "Street Punk" },
    aliases: undefined,
    era: { type: "all" },
    creditRating: { min: 3, max: 10 },
    pointFormula: edu2Plus("DEX", "STR"),
    requirements: [
      ["climb", "exact", 1, 1],
      ["social", "one-of", 1, 1],
      ["fighting", "specialization-of", 1, null],
      ["firearms", "specialization-of", 1, null],
      ["jump", "exact", 1, 1],
      ["sleight-of-hand", "exact", 1, 1],
      ["stealth", "exact", 1, 1],
      ["throw", "exact", 1, 1],
    ],
    keeperReviewIds: [],
    sourcePage: 76,
  },
] as const;

const standard = (definitionId: string): SkillRef => ({ type: "standard", definitionId });
const predefined = (definitionId: string, specializationId: string): SkillRef => ({
  type: "predefined",
  definitionId,
  specializationId,
});
const custom = (definitionId: string, specializationId: string, displayName: string): SkillRef => ({
  type: "custom",
  definitionId,
  specializationId,
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

describe("Phase 5B-2 Batch 3E Criminal occupations", () => {
  it.each(expectedDefinitions)("锁定 $id 的名称、variant、category、era、来源与完整机械", (expected) => {
    const occupation = registry.get(expected.id);
    expect(occupation?.name).toEqual(expected.name);
    expect(occupation?.aliases).toEqual(expected.aliases);
    expect(occupation?.variantOf).toBe("criminal");
    expect(occupation?.category).toBe("criminal-underworld");
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
      .toEqual([`coc7-investigator-handbook-zh-1-21:${expected.sourcePage}`]);
  });

  it("只导入 11 个 Handbook variants，不建立 Keeper Criminal 或 family 空壳", () => {
    expect(batch3eCriminalOccupationDefinitions).toHaveLength(11);
    expect(registry.get("criminal")).toBeUndefined();
    expect(registry.get("criminal-keeper-rulebook")).toBeUndefined();
    expect(registry.definitions.filter((occupation) => occupation.variantOf === "criminal"))
      .toHaveLength(11);
  });

  it("Assassin、Bank Robber、Bootlegger / Thug 与 Street Punk 的 generic combat requirements 独立支持 1+", () => {
    const brawl = predefined("fighting", "brawl");
    const sword = predefined("fighting", "sword");
    const handgun = predefined("firearms", "handgun");
    const rifle = predefined("firearms", "rifle-shotgun");
    for (const occupationId of [
      "criminal-assassin",
      "criminal-bank-robber",
      "criminal-bootlegger-thug",
      "criminal-street-punk",
    ]) {
      expect(issueCodes(occupationId, "fighting", [brawl])).toEqual([]);
      expect(issueCodes(occupationId, "fighting", [brawl, sword])).toEqual([]);
      expect(issueCodes(occupationId, "fighting", [brawl, brawl]))
        .toContain("duplicate-skill-selection");
      expect(issueCodes(occupationId, "firearms", [handgun])).toEqual([]);
      expect(issueCodes(occupationId, "firearms", [handgun, rifle])).toEqual([]);
      expect(issueCodes(occupationId, "firearms", [handgun, handgun]))
        .toContain("duplicate-skill-selection");
    }
  });

  it("Freelance / Solo 的 one-branch 接受单一 combat category 的 1+，拒绝混选", () => {
    const brawl = predefined("fighting", "brawl");
    const sword = predefined("fighting", "sword");
    const handgun = predefined("firearms", "handgun");
    const rifle = predefined("firearms", "rifle-shotgun");
    expect(issueCodes("criminal-freelance-solo", "fighting-or-firearms", [brawl])).toEqual([]);
    expect(issueCodes("criminal-freelance-solo", "fighting-or-firearms", [brawl, sword])).toEqual([]);
    expect(issueCodes("criminal-freelance-solo", "fighting-or-firearms", [handgun])).toEqual([]);
    expect(issueCodes("criminal-freelance-solo", "fighting-or-firearms", [handgun, rifle])).toEqual([]);
    expect(issueCodes("criminal-freelance-solo", "fighting-or-firearms", [brawl, handgun]))
      .toContain("selector-mismatch");
  });

  it("Gun Moll 是 classic-only，并精确限定 Brawl 或 Handgun", () => {
    const brawl = predefined("fighting", "brawl");
    const sword = predefined("fighting", "sword");
    const handgun = predefined("firearms", "handgun");
    const rifle = predefined("firearms", "rifle-shotgun");
    expect(registry.list({ era: "classic-1920s" }).map(({ id }) => id)).toContain("criminal-gun-moll");
    expect(registry.list({ era: "modern" }).map(({ id }) => id)).not.toContain("criminal-gun-moll");
    expect(issueCodes("criminal-gun-moll", "brawl-or-handgun", [brawl])).toEqual([]);
    expect(issueCodes("criminal-gun-moll", "brawl-or-handgun", [handgun])).toEqual([]);
    expect(issueCodes("criminal-gun-moll", "brawl-or-handgun", [brawl, handgun]))
      .toContain("requirement-cardinality");
    expect(issueCodes("criminal-gun-moll", "brawl-or-handgun", [sword])).toContain("selector-mismatch");
    expect(issueCodes("criminal-gun-moll", "brawl-or-handgun", [rifle])).toContain("selector-mismatch");
  });

  it("Conman 精确限定 Acting，并将 Law / Other Language 作为二选一", () => {
    const acting = predefined("art-craft", "acting");
    const photography = predefined("art-craft", "photography");
    const law = standard("law");
    const french = custom("language-other", "00000000-0000-4000-8000-000000000001", "French");
    expect(issueCodes("criminal-conman", "acting", [acting])).toEqual([]);
    expect(issueCodes("criminal-conman", "acting", [photography])).toContain("selector-mismatch");
    expect(issueCodes("criminal-conman", "law-or-other-language", [law])).toEqual([]);
    expect(issueCodes("criminal-conman", "law-or-other-language", [french])).toEqual([]);
    expect(issueCodes("criminal-conman", "law-or-other-language", [law, french]))
      .toContain("requirement-cardinality");
  });

  it("Fence 与 Forger 都精确限定 Forgery，但保留不同 free-slot approval semantics", () => {
    const forgery = predefined("art-craft", "forgery");
    const photography = predefined("art-craft", "photography");
    for (const occupationId of ["criminal-fence", "criminal-forger-counterfeiter"]) {
      expect(issueCodes(occupationId, "forgery", [forgery])).toEqual([]);
      expect(issueCodes(occupationId, "forgery", [photography])).toContain("selector-mismatch");
    }
    expect(selectedRequirement("criminal-fence", "other-skill"))
      .toMatchObject({ selector: { type: "any-skill" }, cardinality: { min: 1, max: 1 } });
    expect(selectedRequirement("criminal-fence", "other-skill").keeperReview).not.toBe(true);
    expect(selectedRequirement("criminal-forger-counterfeiter", "personal-or-era-specialty"))
      .toMatchObject({ selector: { type: "any-skill" }, keeperReview: true });
  });

  it("Smuggler 的三项交通选项严格三选一，其他 Pilot 不匹配，Firearms 仍为 generic 1+", () => {
    const driveAuto = standard("drive-auto");
    const aircraft = predefined("pilot", "aircraft");
    const boat = predefined("pilot", "boat");
    const dirigible = predefined("pilot", "dirigible");
    for (const ref of [driveAuto, aircraft, boat]) {
      expect(issueCodes("criminal-smuggler", "transport", [ref])).toEqual([]);
    }
    expect(issueCodes("criminal-smuggler", "transport", [driveAuto, aircraft]))
      .toContain("requirement-cardinality");
    expect(issueCodes("criminal-smuggler", "transport", [dirigible])).toContain("selector-mismatch");
    expect(issueCodes("criminal-smuggler", "firearms", [
      predefined("firearms", "handgun"),
      predefined("firearms", "rifle-shotgun"),
    ])).toEqual([]);
  });
});
