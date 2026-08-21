import { describe, expect, it } from "vitest";

import type { WeaponDefinition } from "../coc7/types/weapon";
import { getSkillRegistry } from "./skillRegistry";
import { standardWeaponDefinitions } from "./standard/weapons";
import { getWeaponRegistry } from "./weaponRegistry";
import {
  formatWeaponSkillRef,
  formatWeaponReferencePrice,
  filterWeaponDefinitions,
  isWeaponAvailableInEra,
  presentCharacterWeapon,
  weaponAvailabilityLabels,
  weaponCategoryLabels,
} from "./weaponPresentation";

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

  it("解析 Character weapon，并在缺少时代时不猜测 availability", () => {
    const instance = { id: crypto.randomUUID(), definitionId: "fn-fal", notes: "备用" };
    const withoutEra = presentCharacterWeapon(instance, getWeaponRegistry("standard"), skills);
    expect(withoutEra.eraAvailability).toBeUndefined();
    expect(withoutEra.skillLabel).toBe("射击（步枪／霰弹枪）");
    expect(withoutEra.definition?.damage).toBeTruthy();

    const classic = presentCharacterWeapon(
      instance,
      getWeaponRegistry("standard"),
      skills,
      "classic-1920s",
    );
    expect(classic.eraAvailability).toBe("unavailable");
    expect(weaponAvailabilityLabels[classic.eraAvailability!]).toBe("当前时代不可用");
    expect(weaponCategoryLabels[classic.definition!.category]).toBe("突击步枪");
  });

  it("为 orphan definition 返回可识别且不会抛错的 fallback", () => {
    const instance = { id: crypto.randomUUID(), definitionId: "retired-weapon" };
    expect(presentCharacterWeapon(instance, getWeaponRegistry("standard"), skills, "modern"))
      .toEqual({
        instance,
        name: "未知武器（retired-weapon）",
        orphaned: true,
      });
  });

  it("参考价格按明确时代显示，缺少时代时同时展示而不猜测", () => {
    const bow = requireWeapon("bow");
    expect(formatWeaponReferencePrice(bow, "classic-1920s")).toBe(bow.price?.classic1920s);
    expect(formatWeaponReferencePrice(bow, "modern")).toBe(bow.price?.modern);
    expect(formatWeaponReferencePrice(bow)).toContain("1920s：");
    expect(formatWeaponReferencePrice(bow)).toContain("现代：");
  });

  it("目录支持名称/技能搜索与 category 筛选", () => {
    const definitions = getWeaponRegistry("standard").definitions;
    expect(filterWeaponDefinitions(definitions, skills, "FN FAL").map(({ id }) => id))
      .toEqual(["fn-fal"]);
    expect(filterWeaponDefinitions(definitions, skills, "冲锋枪").length).toBeGreaterThan(0);
    const handguns = filterWeaponDefinitions(definitions, skills, "", "handgun");
    expect(handguns).toHaveLength(16);
    expect(handguns.every(({ category }) => category === "handgun")).toBe(true);
  });
});
