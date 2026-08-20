import { describe, expect, it } from "vitest";

import { characterSchema } from "./character";

function makeCharacter() {
  return {
    version: 1 as const,
    id: crypto.randomUUID(),
    name: "测试调查员",
    settingId: "standard" as const,
  };
}

describe("Character identity 与 backstory schema", () => {
  it("legacy Character 缺少 Phase 6 字段时仍按 version 1 解析", () => {
    const legacy = makeCharacter();
    expect(characterSchema.parse(legacy)).toEqual(legacy);
  });

  it("identity 是 optional additive 自由文本，并在 round-trip 时 trim", () => {
    const parsed = characterSchema.parse({
      ...makeCharacter(),
      sex: "  女性  ",
      residence: "  上海  ",
      birthplace: "  杭州  ",
    });
    expect(parsed).toMatchObject({ sex: "女性", residence: "上海", birthplace: "杭州" });
    expect(parsed.version).toBe(1);
    expect(characterSchema.safeParse({ ...makeCharacter(), sex: "   " }).success).toBe(false);
  });

  it("拒绝重复的背景 entry UUID", () => {
    const id = crypto.randomUUID();
    expect(characterSchema.safeParse({
      ...makeCharacter(),
      backstory: {
        entries: [
          { id, category: "traits", text: "谨慎" },
          { id, category: "personal-description", text: "戴眼镜" },
        ],
      },
    }).success).toBe(false);
  });

  it("keyConnectionEntryId 必须引用当前存在的条目", () => {
    expect(characterSchema.safeParse({
      ...makeCharacter(),
      backstory: {
        entries: [{ id: crypto.randomUUID(), category: "traits", text: "谨慎" }],
        keyConnectionEntryId: crypto.randomUUID(),
      },
    }).success).toBe(false);
  });

  it("Character 长期 schema 不强制 3～6 条或 key connection", () => {
    const parsed = characterSchema.parse({
      ...makeCharacter(),
      backstory: {
        entries: Array.from({ length: 7 }, (_, index) => ({
          id: crypto.randomUUID(),
          category: "encounters" as const,
          text: `遭遇 ${index + 1}`,
        })),
      },
    });
    expect(parsed.backstory?.entries).toHaveLength(7);
    expect(parsed.backstory?.keyConnectionEntryId).toBeUndefined();
  });
});

describe("Character wealth schema", () => {
  it("legacy Character 缺少 wealth 时仍正常解析", () => {
    const legacy = makeCharacter();
    expect(characterSchema.parse(legacy)).not.toHaveProperty("wealth");
  });

  it("wealth 是 version 1 optional additive 并可 round-trip", () => {
    const entryId = crypto.randomUUID();
    const parsed = characterSchema.parse({
      ...makeCharacter(),
      wealth: {
        cashMinorUnits: 13_900,
        assetsMinorUnits: 250_000,
        assetEntries: [{
          id: entryId,
          description: "  波士顿公寓  ",
          valueMinorUnits: 200_000,
        }],
      },
    });
    expect(parsed.version).toBe(1);
    expect(parsed.wealth).toEqual({
      cashMinorUnits: 13_900,
      assetsMinorUnits: 250_000,
      assetEntries: [{
        id: entryId,
        description: "波士顿公寓",
        valueMinorUnits: 200_000,
      }],
    });
    expect(characterSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
  });

  it("拒绝重复 asset UUID、空描述与非法金额", () => {
    const id = crypto.randomUUID();
    const base = {
      ...makeCharacter(),
      wealth: {
        cashMinorUnits: 0,
        assetsMinorUnits: 0,
        assetEntries: [
          { id, description: "公寓" },
          { id, description: "汽车" },
        ],
      },
    };
    expect(characterSchema.safeParse(base).success).toBe(false);
    expect(characterSchema.safeParse({
      ...base,
      wealth: { ...base.wealth, assetEntries: [{ id: crypto.randomUUID(), description: "   " }] },
    }).success).toBe(false);
    expect(characterSchema.safeParse({
      ...base,
      wealth: { cashMinorUnits: 1.5, assetsMinorUnits: -1, assetEntries: [] },
    }).success).toBe(false);
  });
});

describe("Character possessions schema", () => {
  it("legacy Character 缺少 possessions 时仍正常解析", () => {
    const legacy = makeCharacter();
    expect(characterSchema.parse(legacy)).not.toHaveProperty("possessions");
  });

  it("possessions 是 version 1 optional additive，并 trim 名称与备注", () => {
    const id = crypto.randomUUID();
    const parsed = characterSchema.parse({
      ...makeCharacter(),
      possessions: [{ id, name: "  莱卡相机  ", notes: "  随身携带  " }],
    });
    expect(parsed.version).toBe(1);
    expect(parsed.possessions).toEqual([{ id, name: "莱卡相机", notes: "随身携带" }]);
    expect(characterSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
  });

  it("拒绝空名称、raw blank notes 与重复 UUID", () => {
    const id = crypto.randomUUID();
    expect(characterSchema.safeParse({
      ...makeCharacter(),
      possessions: [{ id, name: "   " }],
    }).success).toBe(false);
    expect(characterSchema.safeParse({
      ...makeCharacter(),
      possessions: [{ id, name: "相机", notes: "   " }],
    }).success).toBe(false);
    expect(characterSchema.safeParse({
      ...makeCharacter(),
      possessions: [
        { id, name: "相机" },
        { id, name: "医药箱" },
      ],
    }).success).toBe(false);
  });

  it("允许同名物品并保留数组顺序", () => {
    const firstId = crypto.randomUUID();
    const secondId = crypto.randomUUID();
    const parsed = characterSchema.parse({
      ...makeCharacter(),
      possessions: [
        { id: firstId, name: "胶卷 ×3" },
        { id: secondId, name: "胶卷 ×3" },
      ],
    });
    expect(parsed.possessions?.map((entry) => entry.id)).toEqual([firstId, secondId]);
  });
});
