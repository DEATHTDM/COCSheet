import { describe, expect, it } from "vitest";

import type { WeaponDefinition } from "../coc7/types/weapon";
import { getAvailableSettings } from "./registry";
import { createSkillRegistry, getSkillRegistry } from "./skillRegistry";
import { standardSkillDefinitions } from "./standard/skills";
import { standardWeaponDefinitions } from "./standard/weapons";
import { createWeaponRegistry, getWeaponRegistry } from "./weaponRegistry";

const skills = createSkillRegistry(standardSkillDefinitions);

function requireWeapon(id: string): WeaponDefinition {
  const weapon = standardWeaponDefinitions.find((definition) => definition.id === id);
  if (!weapon) throw new Error(`缺少测试武器：${id}`);
  return weapon;
}

describe("weapon registry", () => {
  it("拒绝重复武器 ID", () => {
    const bow = requireWeapon("bow");
    expect(() => createWeaponRegistry([bow, bow], skills)).toThrow("重复的武器定义 ID");
  });

  it("拒绝缺失的 standard skill", () => {
    const thrownRock = requireWeapon("thrown-rock");
    expect(() => createWeaponRegistry([{
      ...thrownRock,
      skillRef: { type: "standard", definitionId: "missing-skill" },
    }], skills)).toThrow("引用了未知技能");
  });

  it("拒绝 standard ref 指向必须专业化的父技能", () => {
    const thrownRock = requireWeapon("thrown-rock");
    expect(() => createWeaponRegistry([{
      ...thrownRock,
      skillRef: { type: "standard", definitionId: "fighting" },
    }], skills)).toThrow("standard ref 必须引用非专业化技能");
  });

  it("拒绝不存在的 predefined specialization", () => {
    const chainsaw = requireWeapon("chainsaw");
    expect(() => createWeaponRegistry([{
      ...chainsaw,
      skillRef: {
        type: "predefined",
        definitionId: "fighting",
        specializationId: "missing-specialization",
      },
    }], skills)).toThrow("引用了未知预定义专业化");
  });

  it("解析合法 Fighting、Firearms 与 Throw refs", () => {
    const registry = createWeaponRegistry([
      requireWeapon("chainsaw"),
      requireWeapon("fn-fal"),
      requireWeapon("thrown-rock"),
    ], skills);
    expect(registry.get("chainsaw")?.skillRef).toEqual({
      type: "predefined",
      definitionId: "fighting",
      specializationId: "chainsaw",
    });
    expect(registry.get("fn-fal")?.skillRef).toEqual({
      type: "predefined",
      definitionId: "firearms",
      specializationId: "rifle-shotgun",
    });
    expect(registry.get("thrown-rock")?.skillRef).toEqual({
      type: "standard",
      definitionId: "throw",
    });
  });

  it("只从各 SettingPack 自身 weapons 构建并缓存", () => {
    for (const pack of getAvailableSettings()) {
      const registry = getWeaponRegistry(pack.id);
      expect(registry.definitions.map((definition) => definition.id)).toEqual(
        (pack.weapons ?? []).map((definition) => definition.id),
      );
      expect(getWeaponRegistry(pack.id)).toBe(registry);
      expect(getSkillRegistry(pack.id)).toBeDefined();
    }
    expect(getWeaponRegistry("standard").definitions).toHaveLength(8);
    expect(getWeaponRegistry("gaslight").definitions).toEqual([]);
    expect(getWeaponRegistry("down-darker-trails").definitions).toEqual([]);
    expect(getWeaponRegistry("dark-ages").definitions).toEqual([]);
    expect(getWeaponRegistry("regency").definitions).toEqual([]);
  });
});
