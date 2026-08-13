import { describe, expect, it } from "vitest";

import {
  occupationDefinitionSchema,
  type OneBranchSkillSelector,
  type SelectorCardinality,
} from "../coc7/types/occupation";
import { phase5aOccupationFixtures } from "../coc7/testing/occupationFixtures";
import { createOccupationRegistry } from "./occupationRegistry";
import { createSkillRegistry, getStandardSkillCatalog } from "./skillRegistry";

const skills = createSkillRegistry(getStandardSkillCatalog());

describe("OccupationRegistry", () => {
  it("仅从 SettingPack occupations 建立查询、搜索与过滤入口", () => {
    const registry = createOccupationRegistry({
      eras: ["classic-1920s", "modern"],
      occupations: [...phase5aOccupationFixtures],
    }, skills);
    expect(registry.definitions).toHaveLength(11);
    expect(registry.get("doctor")?.name.zh).toBe("医生");
    expect(registry.search("Doctor").map((occupation) => occupation.id)).toContain("doctor");
    expect(registry.list({ category: "medical" }).map((occupation) => occupation.id)).toContain("doctor");
    expect(registry.list({ tag: "phase-5a-fixture" })).toHaveLength(11);
    expect(registry.list({ era: "modern" })).toHaveLength(11);
  });

  it("固定拉丁文使用 named custom selector，不扩张 canonical Skill catalog", () => {
    expect(skills.resolvePredefined("language-other", "latin")).toBeUndefined();
    const registry = createOccupationRegistry({
      eras: ["classic-1920s", "modern"],
      occupations: [...phase5aOccupationFixtures],
    }, skills);
    const latin = registry.get("doctor")?.skillRequirements.find((requirement) => requirement.id === "latin");
    expect(latin?.selector.type).toBe("named-custom-specialization");
  });

  it("搜索 localized aliases，并按 Setting 声明的 specific era 过滤", () => {
    const doctor = phase5aOccupationFixtures.find((occupation) => occupation.id === "doctor");
    if (!doctor) throw new Error("缺少 doctor fixture");
    const registry = createOccupationRegistry({
      eras: ["classic-1920s", "modern"],
      occupations: [{
        ...doctor,
        aliases: { zh: ["医师"], en: ["Physician"] },
        era: { type: "specific", eraIds: ["modern"] },
      }],
    }, skills);
    expect(registry.search("医师").map((occupation) => occupation.id)).toEqual(["doctor"]);
    expect(registry.search("physician").map((occupation) => occupation.id)).toEqual(["doctor"]);
    expect(registry.list({ era: "modern" })).toHaveLength(1);
    expect(registry.list({ era: "classic-1920s" })).toHaveLength(0);
  });

  it("真实 fixture 保留机械变体，并将仅 guidance 差异合并为多 sourceRefs", () => {
    const registry = createOccupationRegistry({
      eras: ["classic-1920s", "modern"],
      occupations: [...phase5aOccupationFixtures],
    }, skills);
    const missionaries = registry.definitions.filter((occupation) => occupation.variantOf === "missionary");
    expect(missionaries).toHaveLength(2);
    expect(missionaries.map((occupation) => occupation.id)).toEqual([
      "missionary-keeper-rulebook",
      "missionary-investigator-handbook",
    ]);
    expect(registry.get("antiquarian")?.sourceRefs).toHaveLength(2);
    expect(registry.definitions.filter((occupation) => occupation.id === "antiquarian")).toHaveLength(1);
  });

  it("注册时拒绝重复 ID、未知技能、非法时代与重复 requirement ID", () => {
    const doctor = phase5aOccupationFixtures.find((occupation) => occupation.id === "doctor");
    if (!doctor) throw new Error("缺少 doctor fixture");
    expect(() => createOccupationRegistry({ eras: ["modern"], occupations: [doctor, doctor] }, skills)).toThrow("重复的职业 ID");
    expect(() => createOccupationRegistry({
      eras: ["modern"],
      occupations: [{
        ...doctor,
        id: "broken-skill",
        skillRequirements: [{
          id: "unknown",
          selector: { type: "exact", ref: { type: "standard", definitionId: "not-real" } },
          cardinality: { min: 1, max: 1 },
        }],
      }],
    }, skills)).toThrow("未知技能");
    expect(() => createOccupationRegistry({
      eras: ["modern"],
      occupations: [{ ...doctor, id: "wrong-era", era: { type: "specific", eraIds: ["classic-1920s"] } }],
    }, skills)).toThrow("未声明时代");
    expect(occupationDefinitionSchema.safeParse({
      ...doctor,
      skillRequirements: [doctor.skillRequirements[0], doctor.skillRequirements[0]],
    }).success).toBe(false);
  });

  it("specialization-of exclude 只能引用同一 SkillDefinition", () => {
    const doctor = phase5aOccupationFixtures.find((occupation) => occupation.id === "doctor");
    if (!doctor) throw new Error("缺少 doctor fixture");
    expect(() => createOccupationRegistry({
      eras: ["modern"],
      occupations: [{
        ...doctor,
        id: "broken-specialization-exclude",
        skillRequirements: [{
          id: "science-with-wrong-exclude",
          selector: {
            type: "specialization-of",
            definitionId: "science",
            exclude: [{
              type: "predefined",
              definitionId: "firearms",
              specializationId: "handgun",
            }],
          },
          cardinality: { min: 1, max: 1 },
        }],
      }],
    }, skills)).toThrow("exclude 必须引用同一技能定义");
  });

  it("注册时拒绝 one-of 声明超过子 selector 数量的 cardinality", () => {
    const doctor = phase5aOccupationFixtures.find((occupation) => occupation.id === "doctor");
    if (!doctor) throw new Error("缺少 doctor fixture");
    const selector = {
      type: "one-of" as const,
      selectors: [
        { type: "exact" as const, ref: { type: "standard" as const, definitionId: "listen" } },
        { type: "exact" as const, ref: { type: "standard" as const, definitionId: "spot-hidden" } },
      ],
    };
    expect(() => createOccupationRegistry({
      eras: ["modern"],
      occupations: [{
        ...doctor,
        id: "broken-one-of-min",
        skillRequirements: [{
          id: "too-many",
          selector,
          cardinality: { min: 3, max: 3 },
        }],
      }],
    }, skills)).toThrow("min 3 超过 one-of 的 2 个子 selector");
    expect(() => createOccupationRegistry({
      eras: ["modern"],
      occupations: [{
        ...doctor,
        id: "broken-one-of-max",
        skillRequirements: [{
          id: "too-many",
          selector,
          cardinality: { min: 1, max: 3 },
        }],
      }],
    }, skills)).toThrow("max 3 超过 one-of 的 2 个子 selector");
  });

  it("注册时拒绝 all-of 内外 cardinality 的确定性矛盾", () => {
    const doctor = phase5aOccupationFixtures.find((occupation) => occupation.id === "doctor");
    if (!doctor) throw new Error("缺少 doctor fixture");
    const groups = [
      {
        selector: { type: "specialization-of" as const, definitionId: "science" },
        cardinality: { min: 2, max: 2 },
      },
      {
        selector: { type: "specialization-of" as const, definitionId: "art-craft" },
        cardinality: { min: 2, max: 2 },
      },
    ];
    expect(() => createOccupationRegistry({
      eras: ["modern"],
      occupations: [{
        ...doctor,
        id: "broken-all-of-max",
        skillRequirements: [{
          id: "contradiction",
          selector: { type: "all-of", groups },
          cardinality: { min: 1, max: 3 },
        }],
      }],
    }, skills)).toThrow("内部 minimum 4 超过外层 max 3");
    expect(() => createOccupationRegistry({
      eras: ["modern"],
      occupations: [{
        ...doctor,
        id: "broken-all-of-min",
        skillRequirements: [{
          id: "contradiction",
          selector: { type: "all-of", groups },
          cardinality: { min: 5, max: 5 },
        }],
      }],
    }, skills)).toThrow("外层 min 5 超过 all-of 内部 maximum 4");
  });

  it("注册 one-branch 并拒绝未知引用、impossible exact 与内外 cardinality 矛盾", () => {
    const doctor = phase5aOccupationFixtures.find((occupation) => occupation.id === "doctor");
    if (!doctor) throw new Error("缺少 doctor fixture");
    const fightingBranch = {
      selector: { type: "specialization-of" as const, definitionId: "fighting" },
      cardinality: { min: 1 },
    };
    const firearmsBranch = {
      selector: { type: "specialization-of" as const, definitionId: "firearms" },
      cardinality: { min: 1 },
    };
    const throwBranch = {
      selector: {
        type: "exact" as const,
        ref: { type: "standard" as const, definitionId: "throw" },
      },
      cardinality: { min: 1, max: 1 },
    };
    const withRequirement = (
      id: string,
      branches: OneBranchSkillSelector["branches"],
      cardinality: SelectorCardinality = { min: 1 },
    ) => ({
      ...doctor,
      id,
      skillRequirements: [{
        id: "exclusive-branch",
        selector: { type: "one-branch" as const, branches },
        cardinality,
      }],
    });

    expect(() => createOccupationRegistry({
      eras: ["modern"],
      occupations: [withRequirement("valid-fighting-firearms", [fightingBranch, firearmsBranch])],
    }, skills)).not.toThrow();
    expect(() => createOccupationRegistry({
      eras: ["modern"],
      occupations: [withRequirement("valid-fighting-throw", [fightingBranch, throwBranch])],
    }, skills)).not.toThrow();

    expect(() => createOccupationRegistry({
      eras: ["modern"],
      occupations: [withRequirement("unknown-branch-skill", [fightingBranch, {
        selector: {
          type: "exact",
          ref: { type: "standard", definitionId: "not-real" },
        },
        cardinality: { min: 1, max: 1 },
      }])],
    }, skills)).toThrow("未知技能");
    expect(() => createOccupationRegistry({
      eras: ["modern"],
      occupations: [withRequirement("impossible-exact-branch", [fightingBranch, {
        ...throwBranch,
        cardinality: { min: 1, max: 2 },
      }])],
    }, skills)).toThrow("exact selector 最多只能选择一项技能");
    expect(() => createOccupationRegistry({
      eras: ["modern"],
      occupations: [withRequirement(
        "incompatible-branch-cardinality",
        [{ ...fightingBranch, cardinality: { min: 2 } }, throwBranch],
        { min: 1, max: 1 },
      )],
    }, skills)).toThrow("与外层 requirement 不相容");

    expect(occupationDefinitionSchema.safeParse({
      ...doctor,
      id: "too-few-branches",
      skillRequirements: [{
        id: "exclusive-branch",
        selector: { type: "one-branch", branches: [fightingBranch] },
        cardinality: { min: 1 },
      }],
    }).success).toBe(false);
  });

  it("注册 choice-pool 并拒绝 minimum possible refs 超过外层 max", () => {
    const doctor = phase5aOccupationFixtures.find((occupation) => occupation.id === "doctor");
    if (!doctor) throw new Error("缺少 doctor fixture");
    const branch = (definitionId: string, min = 1, max: number | undefined = 1) => ({
      selector: { type: "specialization-of" as const, definitionId },
      cardinality: { min, ...(max === undefined ? {} : { max }) },
    });
    const valid = {
      ...doctor,
      id: "valid-choice-pool",
      skillRequirements: [{
        id: "choice-pool",
        selector: {
          type: "choice-pool" as const,
          branches: [branch("fighting", 1, undefined), branch("firearms", 1, undefined)],
          selectedBranches: { min: 1, max: 2 },
        },
        cardinality: { min: 1 },
      }],
    };
    expect(() => createOccupationRegistry({ eras: ["modern"], occupations: [valid] }, skills))
      .not.toThrow();

    const impossible = {
      ...doctor,
      id: "impossible-choice-pool",
      skillRequirements: [{
        id: "choice-pool",
        selector: {
          type: "choice-pool" as const,
          branches: [branch("science", 2, 2), branch("art-craft", 2, 2), branch("language-other", 2, 2)],
          selectedBranches: { min: 3, max: 3 },
        },
        cardinality: { min: 3, max: 5 },
      }],
    };
    expect(() => createOccupationRegistry({ eras: ["modern"], occupations: [impossible] }, skills))
      .toThrow("minimum possible refs 6");
  });
});
