import { describe, expect, it } from "vitest";

import { createSkillRegistry } from "../skillRegistry";
import { createWeaponRegistry, getWeaponRegistry } from "../weaponRegistry";
import { standardSkillDefinitions } from "./skills";
import { standardWeaponDefinitions } from "./weapons";

describe("Standard weapon pilot catalog", () => {
  it("恰好包含 8 个 registry-valid production definitions", () => {
    expect(standardWeaponDefinitions).toHaveLength(8);
    expect(createWeaponRegistry(
      standardWeaponDefinitions,
      createSkillRegistry(standardSkillDefinitions),
    ).definitions).toHaveLength(8);
  });

  it("没有重复 ID 或 custom SkillRef", () => {
    const ids = standardWeaponDefinitions.map((definition) => definition.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(standardWeaponDefinitions.map((definition) => definition.skillRef.type))
      .not.toContain("custom");
  });

  it("保留代表行的时代和异构 display text", () => {
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
});
