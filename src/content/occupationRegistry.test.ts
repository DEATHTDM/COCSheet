import { describe, expect, it } from "vitest";

import { occupationDefinitionSchema } from "../coc7/types/occupation";
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
});
