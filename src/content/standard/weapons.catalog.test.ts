import { describe, expect, it } from "vitest";

import { createSkillRegistry } from "../skillRegistry";
import { createWeaponRegistry, getWeaponRegistry } from "../weaponRegistry";
import { standardSkillDefinitions } from "./skills";
import { standardWeaponDefinitions } from "./weapons";

describe("Standard weapon full catalog", () => {
  it("恰好包含 104 个 registry-valid production definitions", () => {
    expect(standardWeaponDefinitions).toHaveLength(104);
    expect(createWeaponRegistry(
      standardWeaponDefinitions,
      createSkillRegistry(standardSkillDefinitions),
    ).definitions).toHaveLength(104);
  });

  it("没有重复 ID 或 custom SkillRef", () => {
    const ids = standardWeaponDefinitions.map((definition) => definition.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(standardWeaponDefinitions.map((definition) => definition.skillRef.type))
      .not.toContain("custom");
  });

  it("保留 7C-1 pilots 的时代和异构 display text", () => {
    const registry = getWeaponRegistry("standard");
    expect(registry.get("fn-fal")?.availability).toEqual({
      classic1920s: "unavailable",
      modern: "available",
    });
    expect(registry.get("12-gauge-double-barrel-shotgun")?.damage).toBe("4D6/2D6/1D6");
    expect(registry.get("12-gauge-double-barrel-shotgun")?.baseRange).toBe("10/20/50m");
    expect(registry.get("thompson-submachine-gun")?.attacksPerRound).toBe("1或全自动");
    expect(registry.get("m1918-browning-automatic-rifle")?.attacksPerRound)
      .toBe("1(2)或全自动");
  });

  it("覆盖普通斗殴、格斗专业化和各枪械 category", () => {
    const registry = getWeaponRegistry("standard");
    expect(registry.get("brass-knuckles")?.skillRef).toEqual({
      type: "predefined",
      definitionId: "fighting",
      specializationId: "brawl",
    });
    expect(registry.get("bullwhip")?.skillRef).toEqual({
      type: "predefined",
      definitionId: "fighting",
      specializationId: "whip",
    });
    expect(registry.get("beretta-m9")?.category).toBe("handgun");
    expect(registry.get("303-lee-enfield-rifle")?.category).toBe("rifle");
    expect(registry.get("12-gauge-double-barrel-shotgun")?.baseRange)
      .toBe("10/20/50m");
    expect(registry.get("fn-fal")?.attacksPerRound).toBe("1(2)或3发点射");
    expect(registry.get("thompson-submachine-gun")?.category)
      .toBe("submachine-gun");
    expect(registry.get("m1918-browning-automatic-rifle")?.category)
      .toBe("machine-gun");
  });

  it("覆盖 Throw、Demolitions、Electrical Repair、Artillery 和特殊 Firearms refs", () => {
    const registry = getWeaponRegistry("standard");
    expect(registry.get("dynamite-stick")?.skillRef).toEqual({
      type: "standard",
      definitionId: "throw",
    });
    expect(registry.get("pipe-bomb")?.skillRef).toEqual({
      type: "standard",
      definitionId: "demolitions",
    });
    expect(registry.get("blasting-cap")?.skillRef).toEqual({
      type: "standard",
      definitionId: "electrical-repair",
    });
    expect(registry.get("75mm-field-gun")?.skillRef).toEqual({
      type: "standard",
      definitionId: "artillery",
    });
    expect(registry.get("m79-grenade-launcher")?.skillRef).toMatchObject({
      specializationId: "heavy-weapons",
    });
    expect(registry.get("flamethrower")?.skillRef).toMatchObject({
      specializationId: "flamethrower",
    });
  });

  it("锁定 rare/unavailable、缺失价格与异常 display cells", () => {
    const registry = getWeaponRegistry("standard");
    expect(registry.get("flintlock-pistol")?.availability).toEqual({
      classic1920s: "rare",
      modern: "rare",
    });
    expect(registry.get("bullwhip")?.availability.modern).toBe("unavailable");
    expect(registry.get("m79-grenade-launcher")?.price).toBeUndefined();
    expect(registry.get("tear-gas-spray")?.capacity).toBe("25次喷射");
    expect(registry.get("dynamite-stick")?.capacity).toBe("一次性");
    expect(registry.get("81mm-mortar")?.capacity).toBe("独立装弹");
    expect(registry.get("brass-knuckles")?.malfunction).toBeUndefined();
    expect(registry.get("12-gauge-double-barrel-shotgun")?.malfunction).toBe(100);
  });

  it("按 Keeper precedence 锁定已解析的 mechanics discrepancies", () => {
    const registry = getWeaponRegistry("standard");
    expect(registry.get("ak-74")?.damage).toBe("2D6+1");
    expect(registry.get("303-lee-enfield-rifle")?.capacity).toBe("10");
    expect(registry.get("lewis-mark-i-machine-gun")?.capacity).toBe("47/97");
    expect(registry.get("double-barrel-elephant-gun")?.price?.modern).toBe("$1800");
    expect(registry.get("5-inch-127mm-naval-gun")?.attacksPerRound).toBe("1");
  });
});
