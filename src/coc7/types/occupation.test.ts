import { describe, expect, it } from "vitest";

import {
  occupationDefinitionSchema,
  occupationRequirementSchema,
  skillSelectorSchema,
  type ComposableSkillSelector,
} from "./occupation";

const sourceRef = { sourceId: "test", title: "Test Source", page: 1 } as const;

describe("OccupationDefinition schema", () => {
  it("使用 localized name/aliases、sourceRefs 与强类型 requirement", () => {
    const result = occupationDefinitionSchema.safeParse({
      version: 1,
      id: "doctor",
      name: { zh: "医生", en: "Doctor" },
      aliases: { zh: ["医师"] },
      category: "medical",
      sourceRefs: [sourceRef],
      era: { type: "all" },
      creditRating: { min: 30, max: 80 },
      pointFormula: { type: "attribute", attribute: "EDU", multiplier: 4 },
      skillRequirements: [{
        id: "medicine",
        selector: { type: "exact", ref: { type: "standard", definitionId: "medicine" } },
        cardinality: { min: 1, max: 1 },
      }],
    });
    expect(result.success).toBe(true);
  });

  it("要求 requirement ID 为职业内唯一 kebab-case", () => {
    const requirement = {
      id: "fixed-skill",
      selector: { type: "exact", ref: { type: "standard", definitionId: "medicine" } },
      cardinality: { min: 1, max: 1 },
    } as const;
    const base = {
      version: 1,
      id: "doctor",
      name: { zh: "医生", en: "Doctor" },
      category: "medical",
      sourceRefs: [sourceRef],
      era: { type: "all" },
      creditRating: { min: 30, max: 80 },
      pointFormula: { type: "attribute", attribute: "EDU", multiplier: 4 },
    } as const;
    expect(occupationDefinitionSchema.safeParse({ ...base, skillRequirements: [requirement, requirement] }).success).toBe(false);
    expect(occupationRequirementSchema.safeParse({ ...requirement, id: "Not Kebab" }).success).toBe(false);
  });

  it("SkillSelector 闭合表达 exact、开放专业、固定名称 custom、候选、any 与组合", () => {
    const selectors = [
      { type: "exact", ref: { type: "standard", definitionId: "medicine" } },
      { type: "exact", ref: { type: "predefined", definitionId: "science", specializationId: "biology" } },
      { type: "specialization-of", definitionId: "science" },
      { type: "named-custom-specialization", definitionId: "language-other", name: { zh: "拉丁文", en: "Latin" } },
      { type: "one-branch", branches: [
        {
          selector: { type: "specialization-of", definitionId: "fighting" },
          cardinality: { min: 1 },
        },
        {
          selector: { type: "exact", ref: { type: "standard", definitionId: "throw" } },
          cardinality: { min: 1, max: 1 },
        },
      ] },
      { type: "choice-pool", branches: [
        {
          selector: { type: "specialization-of", definitionId: "fighting" },
          cardinality: { min: 1 },
        },
        {
          selector: { type: "exact", ref: { type: "standard", definitionId: "throw" } },
          cardinality: { min: 1, max: 1 },
        },
      ], selectedBranches: { min: 2, max: 2 } },
      { type: "one-of", selectors: [
        { type: "exact", ref: { type: "standard", definitionId: "charm" } },
        { type: "exact", ref: { type: "standard", definitionId: "persuade" } },
      ] },
      { type: "any-skill", exclude: [{ type: "exact", ref: { type: "standard", definitionId: "medicine" } }] },
      { type: "all-of", groups: [
        {
          selector: { type: "exact", ref: { type: "predefined", definitionId: "science", specializationId: "chemistry" } },
          cardinality: { min: 1, max: 1 },
        },
        {
          selector: { type: "specialization-of", definitionId: "science" },
          cardinality: { min: 2, max: 2 },
        },
      ] },
    ];
    selectors.forEach((selector) => expect(skillSelectorSchema.safeParse(selector).success).toBe(true));
    expect(skillSelectorSchema.safeParse({ type: "predicate", code: "return true" }).success).toBe(false);
  });

  it("one-branch 至少包含两个原子 branch，不接受组合 selector 嵌套", () => {
    const branch = {
      selector: { type: "specialization-of", definitionId: "fighting" },
      cardinality: { min: 1 },
    } as const;
    expect(skillSelectorSchema.safeParse({ type: "one-branch", branches: [branch] }).success).toBe(false);
    expect(skillSelectorSchema.safeParse({
      type: "one-branch",
      branches: [
        branch,
        {
          selector: {
            type: "one-of",
            selectors: [
              { type: "exact", ref: { type: "standard", definitionId: "charm" } },
              { type: "exact", ref: { type: "standard", definitionId: "persuade" } },
            ],
          },
          cardinality: { min: 1 },
        },
      ],
    }).success).toBe(false);
  });

  it("choice-pool 至少包含两个 atomic branch，且 selectedBranches 不超过 branch 数量", () => {
    const exactBranch = (definitionId: string) => ({
      selector: { type: "exact" as const, ref: { type: "standard" as const, definitionId } },
      cardinality: { min: 1, max: 1 },
    });
    const valid = {
      type: "choice-pool",
      branches: [
        exactBranch("appraise"),
        exactBranch("disguise"),
        exactBranch("locksmith"),
        exactBranch("mechanical-repair"),
      ],
      selectedBranches: { min: 4, max: 4 },
    } as const;
    expect(skillSelectorSchema.safeParse(valid).success).toBe(true);
    expect(skillSelectorSchema.safeParse({
      ...valid,
      selectedBranches: { min: 5, max: 5 },
    }).success).toBe(false);
    expect(skillSelectorSchema.safeParse({
      type: "choice-pool",
      branches: [exactBranch("appraise")],
      selectedBranches: { min: 1, max: 1 },
    }).success).toBe(false);
    expect(skillSelectorSchema.safeParse({
      type: "choice-pool",
      branches: [
        exactBranch("appraise"),
        {
          selector: {
            type: "one-of",
            selectors: [
              { type: "exact", ref: { type: "standard", definitionId: "charm" } },
              { type: "exact", ref: { type: "standard", definitionId: "persuade" } },
            ],
          },
          cardinality: { min: 1, max: 1 },
        },
      ],
      selectedBranches: { min: 1, max: 1 },
    }).success).toBe(false);
  });

  it("choice-pool 只允许顶层使用，不能嵌入 composable 或 one-branch", () => {
    const choicePool = {
      type: "choice-pool",
      branches: [
        {
          selector: { type: "exact", ref: { type: "standard", definitionId: "appraise" } },
          cardinality: { min: 1, max: 1 },
        },
        {
          selector: { type: "exact", ref: { type: "standard", definitionId: "disguise" } },
          cardinality: { min: 1, max: 1 },
        },
      ],
      selectedBranches: { min: 1, max: 1 },
    } as const;
    expect(skillSelectorSchema.safeParse({
      type: "one-of",
      selectors: [choicePool, { type: "exact", ref: { type: "standard", definitionId: "throw" } }],
    }).success).toBe(false);
    expect(skillSelectorSchema.safeParse({
      type: "all-of",
      groups: [
        { selector: choicePool, cardinality: { min: 1, max: 1 } },
        {
          selector: { type: "exact", ref: { type: "standard", definitionId: "throw" } },
          cardinality: { min: 1, max: 1 },
        },
      ],
    }).success).toBe(false);
    expect(skillSelectorSchema.safeParse({ type: "any-skill", exclude: [choicePool] }).success).toBe(false);
    expect(skillSelectorSchema.safeParse({
      type: "one-branch",
      branches: [
        { selector: choicePool, cardinality: { min: 1, max: 1 } },
        {
          selector: { type: "exact", ref: { type: "standard", definitionId: "throw" } },
          cardinality: { min: 1, max: 1 },
        },
      ],
    }).success).toBe(false);
  });

  it("顶层 one-branch 与不含 one-branch 的递归组合保持合法", () => {
    const topLevelOneBranch = {
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
    } as const;
    const composable = {
      type: "all-of",
      groups: [
        {
          selector: {
            type: "one-of",
            selectors: [
              { type: "exact", ref: { type: "standard", definitionId: "charm" } },
              { type: "exact", ref: { type: "standard", definitionId: "persuade" } },
            ],
          },
          cardinality: { min: 1, max: 1 },
        },
        {
          selector: { type: "specialization-of", definitionId: "science" },
          cardinality: { min: 1, max: 1 },
        },
      ],
    } as const satisfies ComposableSkillSelector;

    expect(skillSelectorSchema.safeParse(topLevelOneBranch).success).toBe(true);
    expect(skillSelectorSchema.safeParse(composable).success).toBe(true);
  });

  it("拒绝 one-of 直接或间接嵌套 one-branch", () => {
    const oneBranch = {
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
    } as const;
    expect(skillSelectorSchema.safeParse({
      type: "one-of",
      selectors: [
        oneBranch,
        { type: "exact", ref: { type: "standard", definitionId: "throw" } },
      ],
    }).success).toBe(false);
    expect(skillSelectorSchema.safeParse({
      type: "one-of",
      selectors: [
        {
          type: "all-of",
          groups: [
            { selector: oneBranch, cardinality: { min: 1, max: 1 } },
            {
              selector: { type: "exact", ref: { type: "standard", definitionId: "listen" } },
              cardinality: { min: 1, max: 1 },
            },
          ],
        },
        { type: "exact", ref: { type: "standard", definitionId: "throw" } },
      ],
    }).success).toBe(false);
  });

  it("拒绝 all-of group 嵌套 one-branch", () => {
    expect(skillSelectorSchema.safeParse({
      type: "all-of",
      groups: [
        {
          selector: {
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
          },
          cardinality: { min: 2, max: 2 },
        },
        {
          selector: { type: "exact", ref: { type: "standard", definitionId: "listen" } },
          cardinality: { min: 1, max: 1 },
        },
      ],
    }).success).toBe(false);
  });

  it("拒绝 any-skill.exclude 嵌套 one-branch", () => {
    expect(skillSelectorSchema.safeParse({
      type: "any-skill",
      exclude: [{
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
      }],
    }).success).toBe(false);
  });
});
