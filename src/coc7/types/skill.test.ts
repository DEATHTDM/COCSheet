import { describe, expect, it } from "vitest";

import { characterSchema } from "./character";
import {
  characterSkillSchema,
  skillBaseValueRuleSchema,
  skillCreationPointPolicySchema,
  skillDefinitionSchema,
  skillRefSchema,
} from "./skill";

function makeDefinition() {
  return {
    version: 1,
    id: "science",
    name: { zh: "科学", en: "Science" },
    baseValueRule: { type: "fixed", value: 1 },
    specialization: { type: "required", allowMultiple: true, allowCustom: true },
    predefinedSpecializations: [
      {
        id: "chemistry",
        name: { zh: "化学", en: "Chemistry" },
        baseValueRule: { type: "fixed", value: 5 },
      },
    ],
    tags: ["knowledge"],
    creationPointPolicy: "allowed",
    improvementPolicy: "standard",
    sourceRefs: [{ sourceId: "core", title: "Keeper Rulebook" }],
  } as const;
}

describe("SkillDefinition schema", () => {
  it("严格解析完整技能定义并拒绝额外字段", () => {
    expect(skillDefinitionSchema.safeParse(makeDefinition()).success).toBe(true);
    expect(skillDefinitionSchema.safeParse({ ...makeDefinition(), flags: ["special"] }).success).toBe(false);
  });

  it.each([
    { type: "fixed", value: 25 },
    { type: "characteristic", characteristic: "EDU", fraction: "full" },
    { type: "characteristic", characteristic: "DEX", fraction: "half" },
    { type: "characteristic", characteristic: "POW", fraction: "fifth" },
  ])("接受闭合基础值规则 %#", (rule) => {
    expect(skillBaseValueRuleSchema.safeParse(rule).success).toBe(true);
  });

  it.each(["allowed", "forbidden", "keeper-approval"])(
    "创建期点数政策支持 %s",
    (policy) => {
      expect(skillCreationPointPolicySchema.safeParse(policy).success).toBe(true);
    },
  );

  it("允许预定义专业化覆盖基础值，并拒绝重复专业化 ID", () => {
    expect(skillDefinitionSchema.parse(makeDefinition()).predefinedSpecializations[0]?.baseValueRule).toEqual({
      type: "fixed",
      value: 5,
    });
    const duplicate = {
      ...makeDefinition(),
      predefinedSpecializations: [
        ...makeDefinition().predefinedSpecializations,
        { id: "chemistry", name: { zh: "另一化学", en: "Other Chemistry" } },
      ],
    };
    expect(skillDefinitionSchema.safeParse(duplicate).success).toBe(false);
  });

  it("自定义专业化要求 UUID 与可编辑名称", () => {
    const valid = {
      type: "custom",
      definitionId: "science",
      specializationId: crypto.randomUUID(),
      displayName: "天文学",
    };
    expect(skillRefSchema.safeParse(valid).success).toBe(true);
    expect(skillRefSchema.safeParse({ ...valid, specializationId: "science-astronomy" }).success).toBe(false);
  });
});

describe("CharacterSkill schema", () => {
  it("接受 100+，拒绝负值与小数", () => {
    const base = {
      ref: { type: "standard", definitionId: "library-use" },
      improvementChecked: false,
    } as const;
    expect(characterSkillSchema.safeParse({ ...base, currentValue: 135 }).success).toBe(true);
    expect(characterSkillSchema.safeParse({ ...base, currentValue: -1 }).success).toBe(false);
    expect(characterSkillSchema.safeParse({ ...base, currentValue: 1.5 }).success).toBe(false);
  });

  it("拒绝语义重复技能，但不同 UUID 的同名 custom 实例不重复", () => {
    const libraryUse = {
      ref: { type: "standard", definitionId: "library-use" },
      currentValue: 20,
      improvementChecked: false,
    } as const;
    expect(characterSchema.safeParse({
      version: 1,
      id: crypto.randomUUID(),
      name: "重复测试",
      settingId: "standard",
      skills: [libraryUse, libraryUse],
    }).success).toBe(false);

    const makeCustom = (specializationId: string) => ({
      ref: {
        type: "custom" as const,
        definitionId: "science",
        specializationId,
        displayName: "天文学",
      },
      currentValue: 10,
      improvementChecked: false,
    });
    expect(characterSchema.safeParse({
      version: 1,
      id: crypto.randomUUID(),
      name: "同名不同实例",
      settingId: "standard",
      skills: [makeCustom(crypto.randomUUID()), makeCustom(crypto.randomUUID())],
    }).success).toBe(true);
  });

  it("继续解析没有 skills 的 legacy Character，version 保持 1", () => {
    const parsed = characterSchema.parse({
      version: 1,
      id: crypto.randomUUID(),
      name: "Phase 1 调查员",
      settingId: "standard",
    });
    expect(parsed.version).toBe(1);
    expect(parsed.skills).toBeUndefined();
  });
});
