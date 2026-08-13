import { describe, expect, it } from "vitest";

import type {
  OccupationDefinition,
  OccupationRequirement,
  SkillSelector,
} from "../../coc7/types/occupation";
import { getOccupationRegistry } from "../../content/occupationRegistry";
import { getSkillRegistry } from "../../content/skillRegistry";
import type { CreationPreset } from "../types/creationPreset";
import {
  formatOccupationCategory,
  formatOccupationPointFormula,
  formatOccupationRequirement,
  formatSkillRefForOccupation,
  formatSkillSelectorForOccupation,
  getAvailableOccupationCategories,
  getAvailableOccupationTags,
  getOccupationPresetPolicyStatus,
  sortOccupationsForDisplay,
} from "./occupationPresentation";

const skills = getSkillRegistry("standard");

function requirement(
  selector: SkillSelector,
  min = 1,
  max: number | undefined = 1,
  extras: Partial<Pick<OccupationRequirement, "guidance" | "keeperReview">> = {},
): OccupationRequirement {
  return {
    id: "test-requirement",
    selector,
    cardinality: { min, ...(max === undefined ? {} : { max }) },
    ...extras,
  };
}

describe("occupation presentation", () => {
  it("递归显示 attribute、best-of 与 sum 点数公式", () => {
    expect(formatOccupationPointFormula({ type: "attribute", attribute: "EDU", multiplier: 4 }))
      .toBe("EDU × 4");
    expect(formatOccupationPointFormula({
      type: "best-of",
      attributes: ["DEX", "STR"],
      multiplier: 2,
    })).toBe("DEX / STR 取高 × 2");
    expect(formatOccupationPointFormula({
      type: "sum",
      terms: [
        { type: "attribute", attribute: "EDU", multiplier: 2 },
        {
          type: "sum",
          terms: [
            { type: "attribute", attribute: "APP", multiplier: 2 },
            { type: "attribute", attribute: "POW", multiplier: 1 },
          ],
        },
      ],
    })).toBe("EDU × 2 + APP × 2 + POW × 1");
  });

  it("显示普通技能和预定义专业化中文名", () => {
    expect(formatSkillRefForOccupation(
      { type: "standard", definitionId: "history" },
      skills,
    )).toBe("历史");
    expect(formatSkillRefForOccupation(
      { type: "predefined", definitionId: "fighting", specializationId: "brawl" },
      skills,
    )).toBe("格斗（斗殴）");
  });

  it("显示开放专业化、排除项、固定名称与 one-of", () => {
    expect(formatSkillSelectorForOccupation({
      type: "specialization-of",
      definitionId: "fighting",
      exclude: [{ type: "predefined", definitionId: "fighting", specializationId: "brawl" }],
    }, skills)).toBe("格斗（自选专业；不含 格斗（斗殴））");
    expect(formatSkillSelectorForOccupation({
      type: "specialization-of",
      definitionId: "firearms",
    }, skills)).toBe("射击（自选专业）");
    expect(formatSkillSelectorForOccupation({
      type: "named-custom-specialization",
      definitionId: "language-other",
      name: { zh: "拉丁语", en: "Latin" },
    }, skills)).toBe("其他语言（拉丁语）");
    expect(formatSkillSelectorForOccupation({
      type: "one-of",
      selectors: [
        { type: "exact", ref: { type: "standard", definitionId: "law" } },
        { type: "specialization-of", definitionId: "language-other" },
      ],
    }, skills)).toBe("法律 或 其他语言（自选具体语言）");
  });

  it("保留 one-branch 的类别与 branch 内 1+ 语义", () => {
    expect(formatSkillSelectorForOccupation({
      type: "one-branch",
      branches: [
        {
          selector: { type: "specialization-of", definitionId: "fighting" },
          cardinality: { min: 1 },
        },
        {
          selector: { type: "specialization-of", definitionId: "firearms" },
          cardinality: { min: 1 },
        },
      ],
    }, skills)).toBe(
      "选择一个类别：格斗（自选专业；至少 1 个专业）；或 射击（自选专业；至少 1 个专业）",
    );
  });

  it("choice-pool 显示 branch 类别数而非 SkillRef 数", () => {
    expect(formatSkillSelectorForOccupation({
      type: "choice-pool",
      selectedBranches: { min: 4, max: 4 },
      branches: [
        {
          selector: { type: "specialization-of", definitionId: "fighting" },
          cardinality: { min: 1 },
        },
        {
          selector: { type: "exact", ref: { type: "standard", definitionId: "appraise" } },
          cardinality: { min: 1, max: 1 },
        },
        {
          selector: { type: "exact", ref: { type: "standard", definitionId: "mechanical-repair" } },
          cardinality: { min: 1, max: 1 },
        },
        {
          selector: { type: "exact", ref: { type: "standard", definitionId: "sleight-of-hand" } },
          cardinality: { min: 1, max: 1 },
        },
        {
          selector: { type: "exact", ref: { type: "standard", definitionId: "disguise" } },
          cardinality: { min: 1, max: 1 },
        },
        {
          selector: { type: "specialization-of", definitionId: "firearms" },
          cardinality: { min: 1 },
        },
        {
          selector: { type: "exact", ref: { type: "standard", definitionId: "locksmith" } },
          cardinality: { min: 1, max: 1 },
        },
      ],
    }, skills)).toContain("从以下 7 类中选择 4 类");
  });

  it("显示 all-of group cardinality、any-skill guidance 与 KP 确认", () => {
    expect(formatSkillSelectorForOccupation({
      type: "all-of",
      groups: [
        {
          selector: { type: "exact", ref: { type: "standard", definitionId: "history" } },
          cardinality: { min: 1, max: 1 },
        },
        {
          selector: { type: "specialization-of", definitionId: "science" },
          cardinality: { min: 2, max: 2 },
        },
      ],
    }, skills)).toBe("同时选择：历史；科学（自选专业；选择 2 个专业）");
    expect(formatOccupationRequirement(
      requirement(
        { type: "any-skill" },
        2,
        2,
        { guidance: { zh: "个人或时代特长", en: "personal or era specialty" }, keeperReview: true },
      ),
      skills,
    )).toBe("任意 2 项技能（个人或时代特长；需 KP 确认）");
  });

  it("覆盖分类标签、动态 filters、稳定排序与 Preset 优先级", () => {
    expect(getOccupationRegistry("standard").definitions.length).toBe(119);
    expect(getAvailableOccupationCategories(getOccupationRegistry("standard").definitions))
      .toEqual([...getAvailableOccupationCategories(getOccupationRegistry("standard").definitions)]);
    expect(getAvailableOccupationCategories(getOccupationRegistry("standard").definitions))
      .toHaveLength(11);
    getAvailableOccupationCategories(getOccupationRegistry("standard").definitions)
      .forEach((category) => expect(formatOccupationCategory(category)).not.toBe(category));
    expect(getAvailableOccupationTags(getOccupationRegistry("standard").definitions)).toEqual([]);

    const registry = getOccupationRegistry("standard");
    const author = registry.get("author");
    const accountant = registry.get("accountant");
    if (!author || !accountant) throw new Error("测试职业不存在");
    const examples: readonly OccupationDefinition[] = [author, accountant];
    expect(sortOccupationsForDisplay(examples).map((occupation) => occupation.id))
      .toEqual(["accountant", "author"]);

    const preset = {
      version: 1,
      id: "22e6a8f6-0433-4adf-8acf-a2cbd6a7a4da",
      name: "测试预设",
      settingId: "standard",
      attributeGeneration: { allowedMethods: ["manual"] },
      allowCustomOccupation: true,
      occupationPolicy: {
        bannedOccupationIds: ["accountant"],
        approvalRequiredOccupationIds: ["accountant", "artist"],
      },
    } satisfies CreationPreset;
    expect(getOccupationPresetPolicyStatus("accountant", preset)).toBe("banned");
    expect(getOccupationPresetPolicyStatus("artist", preset)).toBe("keeper-approval-required");
    expect(getOccupationPresetPolicyStatus("author", preset)).toBe("allowed");
    expect(getOccupationPresetPolicyStatus("author")).toBe("allowed");
  });
});
