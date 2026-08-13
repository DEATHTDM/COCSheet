import { describe, expect, it } from "vitest";

import { characterSchema } from "../../coc7/types/character";
import { occupationSchema } from "../../coc7/types/occupation";
import { settingPackSchema } from "../../coc7/types/settingPack";
import {
  attributeGenerationMethodSchema,
  creationPresetSchema,
  type AttributeGenerationMethod,
} from "../types/creationPreset";
import { creationSessionSchema } from "../types/creationSession";
import {
  approvalReasonIdSchema,
  creditRatingOverrideSchema,
  skillCreationStateSchema,
} from "../types/skillCreation";
import { characterRecordSchema, kpPresetRecordSchema } from "../../db/records";

describe("持久化 Zod Schema", () => {
  it("Credit Rating override 必须绑定职业身份", () => {
    expect(creditRatingOverrideSchema.safeParse({ approved: true }).success).toBe(false);
    expect(creditRatingOverrideSchema.safeParse({
      occupationId: "doctor",
      approved: true,
    }).success).toBe(true);
  });

  it("version 1 SkillCreationState 兼容旧草稿并可保存 replacement target", () => {
    const oldState = {
      requirementSelections: [],
      allocations: [],
      keeperApprovals: [],
    };
    expect(skillCreationStateSchema.parse(oldState)).not.toHaveProperty("occupationSkillReplacement");
    expect(skillCreationStateSchema.safeParse({
      ...oldState,
      occupationSkillReplacement: {
        policyId: "keeper-approved-hypnosis",
        targetRequirementId: "history",
      },
    }).success).toBe(true);
    expect(skillCreationStateSchema.safeParse({
      ...oldState,
      occupationSkillReplacement: { policyId: "", targetRequirementId: "Not Stable" },
    }).success).toBe(false);
    expect(approvalReasonIdSchema.parse("occupation-skill-replacement"))
      .toBe("occupation-skill-replacement");
    expect(skillCreationStateSchema.safeParse({
      ...oldState,
      keeperApprovals: [
        {
          reason: "occupation-skill-replacement",
          subjectId: "same",
          approved: true,
        },
        {
          reason: "occupation-skill-replacement",
          subjectId: "same",
          approved: true,
        },
      ],
    }).success).toBe(false);
  });

  it("拒绝非法 Character", () => {
    expect(
      characterSchema.safeParse({
        version: 1,
        id: "not-a-uuid",
        name: "测试",
        settingId: "standard",
      }).success,
    ).toBe(false);
  });

  it("拒绝混入建卡向导状态的 Character", () => {
    expect(
      characterSchema.safeParse({
        version: 1,
        id: crypto.randomUUID(),
        name: "测试",
        settingId: "standard",
        currentStep: "attributes",
      }).success,
    ).toBe(false);
  });

  it("兼容没有 resources 的 Phase 2 Character", () => {
    expect(characterSchema.safeParse({
      version: 1,
      id: crypto.randomUUID(),
      name: "旧调查员",
      settingId: "standard",
      age: 25,
      characteristics: { STR: 50, CON: 50, SIZ: 50, DEX: 50, APP: 50, INT: 50, POW: 50, EDU: 50 },
      luck: 55,
    }).success).toBe(true);
  });

  it("Character version 1 可选保存轻量职业身份，不复制职业规则", () => {
    const character = characterSchema.parse({
      version: 1,
      id: crypto.randomUUID(),
      name: "有职业的调查员",
      settingId: "standard",
      occupation: {
        kind: "catalog",
        id: "doctor",
        displayNameSnapshot: { zh: "医生", en: "Doctor" },
        sourceRefs: [{ sourceId: "handbook", title: "Investigator Handbook", page: 78 }],
      },
    });
    expect(character.version).toBe(1);
    expect(character.occupation?.kind).toBe("catalog");
    expect(character.occupation).not.toHaveProperty("pointFormula");
    expect(character.occupation).not.toHaveProperty("skillRequirements");
  });

  it("resources 一旦存在就要求完整、严格且 current 合法", () => {
    const base = {
      version: 1,
      id: crypto.randomUUID(),
      name: "新调查员",
      settingId: "standard",
    };
    expect(characterSchema.safeParse({
      ...base,
      resources: { hp: { current: 10 }, mp: { current: 12 }, san: { current: 65 } },
    }).success).toBe(true);
    expect(characterSchema.safeParse({
      ...base,
      resources: { hp: { current: 10 }, mp: { current: 12 } },
    }).success).toBe(false);
    expect(characterSchema.safeParse({
      ...base,
      resources: { hp: { current: -1 }, mp: { current: 12 }, san: { current: 65 } },
    }).success).toBe(false);
    expect(characterSchema.safeParse({
      ...base,
      resources: { hp: { current: 10, max: 10 }, mp: { current: 12 }, san: { current: 65 } },
    }).success).toBe(false);
    expect(characterSchema.safeParse({
      ...base,
      resources: { hp: { current: 10 }, mp: { current: 12 }, san: { current: 100 } },
    }).success).toBe(false);
  });

  it("拒绝非法 CreationSession", () => {
    expect(
      creationSessionSchema.safeParse({
        version: 1,
        characterId: crypto.randomUUID(),
        settingId: "pulp",
        currentStep: "basic-info",
      }).success,
    ).toBe(false);
  });

  it("拒绝只有中文公式字符串的 Occupation", () => {
    expect(
      occupationSchema.safeParse({
        version: 1,
        id: "journalist",
        name: "记者",
        category: "media-art",
        sources: [{ sourceId: "keeper-rulebook", title: "Keeper Rulebook" }],
        eras: ["modern"],
        creditRating: { min: 9, max: 30 },
        pointFormula: "教育×4",
        skillRequirements: [],
      }).success,
    ).toBe(false);
  });

  it("拒绝可执行字段进入 SettingPack", () => {
    expect(
      settingPackSchema.safeParse({
        version: 1,
        id: "regency",
        name: "Regency Cthulhu",
        occupations: [],
        execute: "console.log('not allowed')",
      }).success,
    ).toBe(false);
  });
});

describe("CreationPreset", () => {
  it("六种属性生成方式均合法", () => {
    const methods = [
      "standard-roll",
      "low-roll-boost",
      "assign-roll",
      "multi-roll",
      "point-buy",
      "manual",
    ] satisfies readonly AttributeGenerationMethod[];

    for (const method of methods) {
      expect(attributeGenerationMethodSchema.safeParse(method).success).toBe(true);
    }
    expect(attributeGenerationMethodSchema.safeParse("standard-random").success).toBe(false);
  });

  it("合法预设可以序列化并再次校验", () => {
    const preset = {
      version: 1,
      id: crypto.randomUUID(),
      name: "1920 年代标准建卡",
      settingId: "standard",
      attributeGeneration: {
        allowedMethods: ["manual"],
        multiRoll: { count: 3 },
        pointBuy: { total: 460, min: 15, max: 90, intMin: 40, sizMin: 40 },
      },
      skillCaps: { occupation: 80, overall: 90 },
      occupationPolicy: { bannedOccupationIds: ["assassin"] },
      allowCustomOccupation: "keeper-approval",
      age: { min: 18, max: 80 },
    };

    const parsed = creationPresetSchema.parse(JSON.parse(JSON.stringify(preset)));
    expect(parsed).toEqual(preset);
  });

  it("新 skillLimits 只表达最终值上限，legacy skillCaps 继续读取但不映射", () => {
    const parsed = creationPresetSchema.parse({
      version: 1,
      id: crypto.randomUUID(),
      name: "技能上限预设",
      settingId: "standard",
      attributeGeneration: { allowedMethods: ["manual"] },
      skillCaps: { occupation: 80, interest: 70, overall: 90 },
      skillLimits: {
        maxOccupationSkillFinalValue: 75,
        maxInterestOnlySkillFinalValue: 60,
        maxSkillFinalValue: 90,
      },
      allowCustomOccupation: true,
    });
    expect(parsed.skillCaps).toEqual({ occupation: 80, interest: 70, overall: 90 });
    expect(parsed.skillLimits).toEqual({
      maxOccupationSkillFinalValue: 75,
      maxInterestOnlySkillFinalValue: 60,
      maxSkillFinalValue: 90,
    });

    const legacy = creationPresetSchema.parse({
      version: 1,
      id: crypto.randomUUID(),
      name: "旧技能上限预设",
      settingId: "standard",
      attributeMethods: ["manual"],
      skillCaps: { occupation: 80 },
      allowCustomOccupation: true,
    });
    expect(legacy.skillCaps).toEqual({ occupation: 80 });
    expect(legacy.skillLimits).toBeUndefined();
  });

  it("兼容读取旧 attributeMethods 并规范化为新结构", () => {
    const parsed = creationPresetSchema.parse({
      version: 1,
      id: crypto.randomUUID(),
      name: "旧预设",
      settingId: "standard",
      attributeMethods: ["manual", "point-buy"],
      allowCustomOccupation: true,
    });
    expect(parsed.attributeGeneration.allowedMethods).toEqual(["manual", "point-buy"]);
    expect("attributeMethods" in parsed).toBe(false);
  });

  it("拒绝年龄范围倒置的预设", () => {
    expect(
      creationPresetSchema.safeParse({
        version: 1,
        id: crypto.randomUUID(),
        name: "错误预设",
        settingId: "standard",
        attributeGeneration: { allowedMethods: ["manual"] },
        allowCustomOccupation: false,
        age: { min: 80, max: 18 },
      }).success,
    ).toBe(false);
  });

  it("拒绝 Assign Roll 无法达到的 INT/SIZ 下限", () => {
    for (const assignRoll of [{ intMin: 91, sizMin: 40 }, { intMin: 40, sizMin: 91 }]) {
      expect(
        creationPresetSchema.safeParse({
          version: 1,
          id: crypto.randomUUID(),
          name: "无解 Assign",
          settingId: "standard",
          attributeGeneration: { allowedMethods: ["assign-roll"], assignRoll },
          allowCustomOccupation: false,
        }).success,
      ).toBe(false);
    }
  });

  it("拒绝 Point Buy 下限高于 max", () => {
    for (const pointBuy of [
      { total: 240, min: 15, max: 40, intMin: 41, sizMin: 40 },
      { total: 240, min: 15, max: 40, intMin: 40, sizMin: 41 },
    ]) {
      expect(
        creationPresetSchema.safeParse({
          version: 1,
          id: crypto.randomUUID(),
          name: "无解购点下限",
          settingId: "standard",
          attributeGeneration: { allowedMethods: ["point-buy"], pointBuy },
          allowCustomOccupation: false,
        }).success,
      ).toBe(false);
    }
  });

  it("拒绝 Point Buy 总点数低于最低值或高于最高值", () => {
    for (const total of [169, 721]) {
      expect(
        creationPresetSchema.safeParse({
          version: 1,
          id: crypto.randomUUID(),
          name: "无解购点总数",
          settingId: "standard",
          attributeGeneration: {
            allowedMethods: ["point-buy"],
            pointBuy: { total, min: 15, max: 90, intMin: 40, sizMin: 40 },
          },
          allowCustomOccupation: false,
        }).success,
      ).toBe(false);
    }
  });

  it("接受 Point Buy 数学可行范围边界并保持 Standard 默认", () => {
    for (const total of [170, 460, 720]) {
      const result = creationPresetSchema.safeParse({
        version: 1,
        id: crypto.randomUUID(),
        name: "可行购点",
        settingId: "standard",
        attributeGeneration: {
          allowedMethods: ["point-buy"],
          pointBuy: { total, min: 15, max: 90, intMin: 40, sizMin: 40 },
        },
        allowCustomOccupation: false,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe("CreationSession 领域一致性", () => {
  const baseValues = { STR: 50, CON: 50, SIZ: 50, DEX: 50, APP: 50, INT: 50, POW: 50, EDU: 50 };

  it("要求 draftAge 与 ageAdjustment.age 一致", () => {
    const session = {
      version: 1,
      characterId: crypto.randomUUID(),
      settingId: "standard",
      currentStep: "attributes",
      draftAge: 25,
      attributes: {
        generationMethod: "manual",
        generation: { method: "manual", values: baseValues, baseCharacteristics: baseValues },
        ageAdjustment: { age: 26, reductionAllocation: {}, eduImprovements: [] },
      },
    };
    expect(creationSessionSchema.safeParse(session).success).toBe(false);
    expect(creationSessionSchema.safeParse({
      ...session,
      attributes: { ...session.attributes, ageAdjustment: { ...session.attributes.ageAdjustment, age: 25 } },
    }).success).toBe(true);
  });

  it("version 1 增加 skills step、职业 mechanics snapshot 与 SkillRef allocation rows", () => {
    const characterId = crypto.randomUUID();
    const parsed = creationSessionSchema.parse({
      version: 1,
      characterId,
      settingId: "standard",
      currentStep: "skills",
      occupation: {
        kind: "catalog",
        selectedOccupationId: "doctor",
        definitionSnapshot: {
          version: 1,
          id: "doctor",
          name: { zh: "医生", en: "Doctor" },
          category: "medical",
          sourceRefs: [{ sourceId: "handbook", title: "Investigator Handbook", page: 78 }],
          era: { type: "all" },
          creditRating: { min: 30, max: 80 },
          pointFormula: { type: "attribute", attribute: "EDU", multiplier: 4 },
          skillRequirements: [],
        },
      },
      skills: {
        requirementSelections: [],
        allocations: [{
          ref: { type: "standard", definitionId: "medicine" },
          occupationPoints: 20,
          interestPoints: 5,
        }],
        keeperApprovals: [],
      },
    });
    expect(parsed.version).toBe(1);
    expect(parsed.currentStep).toBe("skills");
    expect(parsed.skills?.allocations[0]?.ref).toEqual({ type: "standard", definitionId: "medicine" });
    expect(parsed.skills?.allocations[0]).not.toHaveProperty("skillRefKey");
    expect(parsed.skills?.allocations[0]).not.toHaveProperty("baseValue");
    expect(parsed.skills?.allocations[0]).not.toHaveProperty("finalValue");
  });

  it("旧 CreationSession 仍正常解析且不生成 occupation/skills 字段", () => {
    const parsed = creationSessionSchema.parse({
      version: 1,
      characterId: crypto.randomUUID(),
      settingId: "standard",
      currentStep: "occupation",
    });
    expect(parsed.occupation).toBeUndefined();
    expect(parsed.skills).toBeUndefined();
  });
});

describe("Record 冗余元数据一致性", () => {
  it("拒绝 name 与 data.name 不一致的 CharacterRecord", () => {
    const id = crypto.randomUUID();
    expect(
      characterRecordSchema.safeParse({
        id,
        version: 1,
        name: "陈旧姓名",
        settingId: "standard",
        createdAt: 1,
        updatedAt: 1,
        data: {
          version: 1,
          id,
          name: "最新姓名",
          settingId: "standard",
        },
      }).success,
    ).toBe(false);
  });

  it("拒绝 settingId 与 data.settingId 不一致的 CharacterRecord", () => {
    const id = crypto.randomUUID();
    expect(
      characterRecordSchema.safeParse({
        id,
        version: 1,
        name: "调查员",
        settingId: "standard",
        createdAt: 1,
        updatedAt: 1,
        data: {
          version: 1,
          id,
          name: "调查员",
          settingId: "gaslight",
        },
      }).success,
    ).toBe(false);
  });

  it("拒绝 name 与 data.name 不一致的 KPPresetRecord", () => {
    const id = crypto.randomUUID();
    expect(
      kpPresetRecordSchema.safeParse({
        id,
        version: 1,
        name: "陈旧预设名",
        updatedAt: 1,
        data: {
          version: 1,
          id,
          name: "最新预设名",
          settingId: "standard",
          attributeGeneration: { allowedMethods: ["manual"] },
          allowCustomOccupation: "keeper-approval",
        },
      }).success,
    ).toBe(false);
  });

  it("拒绝已移除的 occupationName 字段", () => {
    const id = crypto.randomUUID();
    expect(
      characterRecordSchema.safeParse({
        id,
        version: 1,
        name: "调查员",
        settingId: "standard",
        occupationName: "记者",
        createdAt: 1,
        updatedAt: 1,
        data: {
          version: 1,
          id,
          name: "调查员",
          settingId: "standard",
        },
      }).success,
    ).toBe(false);
  });
});
