import { describe, expect, it } from "vitest";

import type { WeaponDefinition } from "../coc7/types/weapon";
import { getSkillRegistry } from "./skillRegistry";
import { standardWeaponDefinitions } from "./standard/weapons";
import { formatWeaponSkillRef, isWeaponAvailableInEra } from "./weaponPresentation";

const skills = getSkillRegistry("standard");

function requireWeapon(id: string): WeaponDefinition {
  const weapon = standardWeaponDefinitions.find((definition) => definition.id === id);
  if (!weapon) throw new Error(`缺少测试武器：${id}`);
  return weapon;
}

describe("weapon presentation", () => {
  it("格式化 standard 与 predefined SkillRef", () => {
    expect(formatWeaponSkillRef(requireWeapon("large-knife"), skills)).toBe("格斗（斗殴）");
    expect(formatWeaponSkillRef(requireWeapon("chainsaw"), skills)).toBe("格斗（链锯）");
    expect(formatWeaponSkillRef(requireWeapon("12-gauge-double-barrel-shotgun"), skills))
      .toBe("射击（步枪／霰弹枪）");
    expect(formatWeaponSkillRef(requireWeapon("thompson-submachine-gun"), skills))
      .toBe("射击（冲锋枪）");
    expect(formatWeaponSkillRef(requireWeapon("thrown-rock"), skills)).toBe("投掷");
  });

  it("返回古典与现代时代状态，包括 unavailable 与 rare", () => {
    const bow = requireWeapon("bow");
    const fnFal = requireWeapon("fn-fal");
    expect(isWeaponAvailableInEra(bow, "classic-1920s")).toBe("available");
    expect(isWeaponAvailableInEra(bow, "modern")).toBe("available");
    expect(isWeaponAvailableInEra(fnFal, "classic-1920s")).toBe("unavailable");
    expect(isWeaponAvailableInEra({
      ...bow,
      availability: { classic1920s: "rare", modern: "unavailable" },
    }, "classic-1920s")).toBe("rare");
  });
});
