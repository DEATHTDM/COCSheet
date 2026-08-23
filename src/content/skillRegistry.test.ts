import { describe, expect, it } from "vitest";

import { getAvailableSettings } from "./registry";
import { createSkillRegistry, getSkillRegistry, getStandardSkillCatalog } from "./skillRegistry";

describe("skill registry", () => {
  it("按 definition ID 获取完整 Standard 技能并解析专业化", () => {
    const registry = createSkillRegistry(getStandardSkillCatalog());
    expect(registry.get("dodge")?.name.en).toBe("Dodge");
    expect(registry.resolvePredefined("firearms", "handgun")?.name.en).toBe("Handgun");
    expect(registry.definitions.map((definition) => definition.id)).toContain("cthulhu-mythos");
    expect(registry.definitions).toHaveLength(54);
  });

  it("supported registry 从 SettingPack.skills 构建，历史 Setting 保持同 Setting 空目录", () => {
    for (const pack of getAvailableSettings()) {
      const registry = getSkillRegistry(pack.id);
      expect(registry.definitions.map((definition) => definition.id)).toEqual(
        (pack.skills ?? []).map((definition) => definition.id),
      );
      expect(getSkillRegistry(pack.id)).toBe(registry);
    }
    expect(getSkillRegistry("standard").definitions.length).toBeGreaterThan(0);
    expect(getSkillRegistry("gaslight").definitions).toEqual([]);
    expect(getSkillRegistry("down-darker-trails").definitions).toEqual([]);
    expect(getSkillRegistry("dark-ages").definitions).toEqual([]);
    expect(getSkillRegistry("regency").definitions).toEqual([]);
  });

  it("拒绝重复 definition ID", () => {
    const definition = getStandardSkillCatalog()[0];
    if (!definition) throw new Error("代表技能目录为空");
    expect(() => createSkillRegistry([definition, definition])).toThrow("重复的技能定义 ID");
  });

  it("拒绝同一 definition 内重复 specialization ID", () => {
    const fighting = getStandardSkillCatalog().find((definition) => definition.id === "fighting");
    const brawl = fighting?.predefinedSpecializations[0];
    if (!fighting || !brawl) throw new Error("Fighting 代表数据不完整");
    expect(() => createSkillRegistry([{
      ...fighting,
      predefinedSpecializations: [...fighting.predefinedSpecializations, brawl],
    }])).toThrow("重复的专业化 ID");
  });
});
