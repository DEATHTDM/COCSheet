import { describe, expect, it } from "vitest";

import { characterSchema } from "../../coc7/types/character";
import { occupationSchema } from "../../coc7/types/occupation";
import { settingPackSchema } from "../../coc7/types/settingPack";
import { creationPresetSchema } from "../types/creationPreset";
import { creationSessionSchema } from "../types/creationSession";

describe("持久化 Zod Schema", () => {
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
  it("合法预设可以序列化并再次校验", () => {
    const preset = {
      version: 1,
      id: crypto.randomUUID(),
      name: "1920 年代标准建卡",
      settingId: "standard",
      attributeMethods: ["manual"],
      skillCaps: { occupation: 80, overall: 90 },
      occupationPolicy: { bannedOccupationIds: ["assassin"] },
      allowCustomOccupation: "keeper-approval",
      age: { min: 18, max: 80 },
    };

    const parsed = creationPresetSchema.parse(JSON.parse(JSON.stringify(preset)));
    expect(parsed).toEqual(preset);
  });

  it("拒绝年龄范围倒置的预设", () => {
    expect(
      creationPresetSchema.safeParse({
        version: 1,
        id: crypto.randomUUID(),
        name: "错误预设",
        settingId: "standard",
        attributeMethods: ["manual"],
        allowCustomOccupation: false,
        age: { min: 80, max: 18 },
      }).success,
    ).toBe(false);
  });
});
