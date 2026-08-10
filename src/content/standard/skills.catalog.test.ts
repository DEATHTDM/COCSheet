import { describe, expect, it } from "vitest";

import type { CharacteristicValues } from "../../coc7/types/attribute";
import {
  calculateSkillBaseValue,
  getSkillBaseValueRule,
  resolveSkillValue,
} from "../../coc7/rules/skills";
import { getStandardSkillCatalog } from "../skillRegistry";

const expectedIds = [
  "accounting",
  "animal-handling",
  "anthropology",
  "appraise",
  "archaeology",
  "art-craft",
  "artillery",
  "charm",
  "climb",
  "computer-use",
  "credit-rating",
  "cthulhu-mythos",
  "demolitions",
  "disguise",
  "diving",
  "dodge",
  "drive-auto",
  "electrical-repair",
  "electronics",
  "fast-talk",
  "fighting",
  "firearms",
  "first-aid",
  "history",
  "hypnosis",
  "intimidate",
  "jump",
  "language-own",
  "language-other",
  "law",
  "library-use",
  "listen",
  "locksmith",
  "lore",
  "mechanical-repair",
  "medicine",
  "natural-world",
  "navigate",
  "occult",
  "operate-heavy-machinery",
  "persuade",
  "pilot",
  "psychoanalysis",
  "psychology",
  "read-lips",
  "ride",
  "science",
  "sleight-of-hand",
  "spot-hidden",
  "stealth",
  "survival",
  "swim",
  "throw",
  "track",
] as const;

const characteristics: CharacteristicValues = {
  STR: 50,
  CON: 50,
  SIZ: 50,
  DEX: 65,
  APP: 50,
  INT: 50,
  POW: 50,
  EDU: 75,
};

const expectedTopLevelBases: Readonly<Record<(typeof expectedIds)[number], number>> = {
  "accounting": 5,
  "animal-handling": 5,
  "anthropology": 1,
  "appraise": 5,
  "archaeology": 1,
  "art-craft": 5,
  "artillery": 1,
  "charm": 15,
  "climb": 20,
  "computer-use": 5,
  "credit-rating": 0,
  "cthulhu-mythos": 0,
  "demolitions": 1,
  "disguise": 5,
  "diving": 1,
  "dodge": 32,
  "drive-auto": 20,
  "electrical-repair": 10,
  "electronics": 1,
  "fast-talk": 5,
  "fighting": 0,
  "firearms": 0,
  "first-aid": 30,
  "history": 5,
  "hypnosis": 1,
  "intimidate": 15,
  "jump": 20,
  "language-own": 75,
  "language-other": 1,
  "law": 5,
  "library-use": 20,
  "listen": 20,
  "locksmith": 1,
  "lore": 1,
  "mechanical-repair": 10,
  "medicine": 1,
  "natural-world": 10,
  "navigate": 10,
  "occult": 5,
  "operate-heavy-machinery": 1,
  "persuade": 10,
  "pilot": 1,
  "psychoanalysis": 1,
  "psychology": 10,
  "read-lips": 1,
  "ride": 5,
  "science": 1,
  "sleight-of-hand": 10,
  "spot-hidden": 25,
  "stealth": 20,
  "survival": 10,
  "swim": 20,
  "throw": 20,
  "track": 10,
};

function requireDefinition(id: string) {
  const definition = getStandardSkillCatalog().find((candidate) => candidate.id === id);
  if (!definition) throw new Error(`测试技能不存在：${id}`);
  return definition;
}

describe("Standard 技能目录完整性", () => {
  it("恰好包含预期的 54 个唯一顶层 definition ID", () => {
    const ids = getStandardSkillCatalog().map((definition) => definition.id);
    expect(ids).toEqual(expectedIds);
    expect(new Set(ids).size).toBe(54);
  });

  it("每项定义都有闭合政策、availability 与来源，专业化 ID 在母定义内唯一", () => {
    for (const definition of getStandardSkillCatalog()) {
      expect(definition.sourceRefs.length).toBeGreaterThan(0);
      expect(["standard", "uncommon"]).toContain(definition.availability.sheet);
      expect(["all", "modern-only"]).toContain(definition.availability.era);
      expect(["allowed", "forbidden", "keeper-approval"]).toContain(definition.creationPointPolicy);
      expect(["standard", "not-eligible"]).toContain(definition.improvementPolicy);
      expect(new Set(definition.predefinedSpecializations.map((item) => item.id)).size)
        .toBe(definition.predefinedSpecializations.length);
      expect(() => calculateSkillBaseValue(definition.baseValueRule, characteristics)).not.toThrow();
      for (const specialization of definition.predefinedSpecializations) {
        expect(() => calculateSkillBaseValue(
          specialization.baseValueRule ?? definition.baseValueRule,
          characteristics,
        )).not.toThrow();
      }
    }
  });

  it("锁定全部顶层基础值规则，包括 Dodge 与 Language Own 的属性派生", () => {
    for (const id of expectedIds) {
      expect(calculateSkillBaseValue(requireDefinition(id).baseValueRule, characteristics), id)
        .toBe(expectedTopLevelBases[id]);
    }
  });

  it("锁定 uncommon 与 modern-only 集合", () => {
    const catalog = getStandardSkillCatalog();
    expect(catalog.filter((definition) => definition.availability.sheet === "uncommon").map((definition) => definition.id))
      .toEqual(["animal-handling", "artillery", "demolitions", "diving", "hypnosis", "lore", "read-lips"]);
    expect(catalog.filter((definition) => definition.availability.era === "modern-only").map((definition) => definition.id))
      .toEqual(["computer-use", "electronics"]);
  });

  it("关键中文别名保持可搜索元数据且不改变 definition identity", () => {
    expect(requireDefinition("charm").aliases?.zh).toContain("魅惑");
    expect(requireDefinition("art-craft").aliases?.zh).toEqual(expect.arrayContaining(["艺术和手艺", "艺术／工艺"]));
    expect(requireDefinition("spot-hidden").aliases?.zh).toContain("侦察");
    expect(requireDefinition("language-other").aliases?.zh).toContain("外语");
    expect(requireDefinition("credit-rating").aliases?.zh).toContain("信用");
  });
});

describe("Standard 专业化目录", () => {
  it.each([
    ["fighting", "brawl", 25],
    ["fighting", "axe", 15],
    ["fighting", "chainsaw", 10],
    ["fighting", "flail", 10],
    ["fighting", "garrote", 15],
    ["fighting", "spear", 20],
    ["fighting", "sword", 20],
    ["fighting", "whip", 5],
    ["firearms", "handgun", 20],
    ["firearms", "rifle-shotgun", 25],
    ["firearms", "bow", 15],
    ["firearms", "submachine-gun", 15],
    ["firearms", "machine-gun", 10],
    ["firearms", "heavy-weapons", 10],
    ["firearms", "flamethrower", 10],
    ["science", "mathematics", 10],
  ] as const)("%s / %s 基础值为 %i", (definitionId, specializationId, expected) => {
    expect(resolveSkillValue(
      requireDefinition(definitionId),
      { type: "predefined", definitionId, specializationId },
      characteristics,
    ).baseValue).toBe(expected);
  });

  it("其余核心 Science 专业化基础值均为 1", () => {
    const science = requireDefinition("science");
    for (const specialization of science.predefinedSpecializations) {
      if (specialization.id === "mathematics") continue;
      expect(resolveSkillValue(
        science,
        { type: "predefined", definitionId: "science", specializationId: specialization.id },
        characteristics,
      ).baseValue, specialization.id).toBe(1);
    }
  });

  it.each(["fighting", "firearms", "science", "art-craft", "pilot", "survival", "lore"])(
    "%s 母定义不能作为 standard SkillRef",
    (definitionId) => {
      expect(() => getSkillBaseValueRule(
        requireDefinition(definitionId),
        { type: "standard", definitionId },
      )).toThrow("必须指定专业化");
    },
  );

  it("开放专业化允许 custom，Fighting 与 Firearms 拒绝未知专业化", () => {
    for (const definitionId of ["science", "art-craft", "pilot", "survival", "lore"] as const) {
      expect(() => getSkillBaseValueRule(
        requireDefinition(definitionId),
        {
          type: "custom",
          definitionId,
          specializationId: crypto.randomUUID(),
          displayName: "自定义",
        },
      )).not.toThrow();
    }
    for (const definitionId of ["fighting", "firearms"] as const) {
      expect(() => getSkillBaseValueRule(
        requireDefinition(definitionId),
        { type: "predefined", definitionId, specializationId: "unknown" },
      )).toThrow("不存在专业化");
    }
  });
});
