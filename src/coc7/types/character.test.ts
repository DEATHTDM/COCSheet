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
