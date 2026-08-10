import { describe, expect, it } from "vitest";

import { createSkillRegistry, getStandardSkillCatalog } from "./skillRegistry";

describe("skill registry", () => {
  it("按 definition ID 获取代表性 Standard 技能并解析专业化", () => {
    const registry = createSkillRegistry(getStandardSkillCatalog());
    expect(registry.get("dodge")?.name.en).toBe("Dodge");
    expect(registry.resolvePredefined("firearms", "handgun")?.name.en).toBe("Handgun");
    expect(registry.definitions.map((definition) => definition.id)).toContain("cthulhu-mythos");
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
