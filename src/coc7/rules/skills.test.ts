import { describe, expect, it } from "vitest";

import { getFifthValue, getHalfValue } from "./attributes";
import {
  calculateSkillBaseValue,
  getSkillRefKey,
  resolveSkillValue,
  validateCharacterSkill,
} from "./skills";
import type { CharacteristicValues } from "../types/attribute";
import { getSkillDefinition } from "../../content/skillRegistry";

const characteristics: CharacteristicValues = {
  STR: 50,
  CON: 50,
  SIZ: 50,
  DEX: 65,
  APP: 50,
  INT: 50,
  POW: 55,
  EDU: 70,
};

function requireDefinition(id: string) {
  const definition = getSkillDefinition(id);
  if (!definition) throw new Error(`测试技能不存在：${id}`);
  return definition;
}

describe("技能基础值规则", () => {
  it("Dodge 复用 Half helper，Language Own custom 使用 EDU full", () => {
    expect(resolveSkillValue(
      requireDefinition("dodge"),
      { type: "standard", definitionId: "dodge" },
      characteristics,
    ).baseValue).toBe(getHalfValue(characteristics.DEX));
    const edu80 = { ...characteristics, EDU: 80 };
    expect(resolveSkillValue(
      requireDefinition("language-own"),
      {
        type: "custom",
        definitionId: "language-own",
        specializationId: crypto.randomUUID(),
        displayName: "中文",
      },
      edu80,
    ).baseValue).toBe(80);
  });

  it("计算 fixed、characteristic half 与 fifth", () => {
    expect(calculateSkillBaseValue({ type: "fixed", value: 25 }, characteristics)).toBe(25);
    expect(calculateSkillBaseValue(
      { type: "characteristic", characteristic: "DEX", fraction: "half" },
      characteristics,
    )).toBe(getHalfValue(65));
    expect(calculateSkillBaseValue(
      { type: "characteristic", characteristic: "POW", fraction: "fifth" },
      characteristics,
    )).toBe(getFifthValue(55));
  });

  it("预定义专业化覆盖母技能基础值，custom 使用母技能默认值", () => {
    expect(resolveSkillValue(
      requireDefinition("fighting"),
      { type: "predefined", definitionId: "fighting", specializationId: "brawl" },
      characteristics,
    ).baseValue).toBe(25);
    expect(resolveSkillValue(
      requireDefinition("science"),
      {
        type: "custom",
        definitionId: "science",
        specializationId: crypto.randomUUID(),
        displayName: "天文学",
      },
      characteristics,
    ).baseValue).toBe(1);
  });

  it("100+ currentValue 正常计算 Half 与 Fifth", () => {
    const ref = { type: "standard", definitionId: "library-use" } as const;
    expect(resolveSkillValue(requireDefinition("library-use"), ref, characteristics, {
      ref,
      currentValue: 135,
      improvementChecked: false,
    })).toEqual({ baseValue: 20, currentValue: 135, halfValue: 67, fifthValue: 27 });
  });
});

describe("SkillRef 与成长政策", () => {
  it("key 确定生成且区分预定义专业化", () => {
    const handgun = { type: "predefined", definitionId: "firearms", specializationId: "handgun" } as const;
    const rifle = { type: "predefined", definitionId: "firearms", specializationId: "rifle-shotgun" } as const;
    expect(getSkillRefKey(handgun)).toBe(getSkillRefKey({ ...handgun }));
    expect(getSkillRefKey(handgun)).not.toBe(getSkillRefKey(rifle));
  });

  it("custom key 只由 UUID 身份决定，不受改名影响", () => {
    const idA = crypto.randomUUID();
    const idB = crypto.randomUUID();
    const first = { type: "custom", definitionId: "science", specializationId: idA, displayName: "天文学" } as const;
    expect(getSkillRefKey(first)).toBe(getSkillRefKey({ ...first, displayName: "宇宙学" }));
    expect(getSkillRefKey(first)).not.toBe(getSkillRefKey({ ...first, specializationId: idB }));
  });

  it("普通技能允许成长标记，Mythos 与 Credit Rating 拒绝", () => {
    const makeSkill = (definitionId: string) => ({
      ref: { type: "standard" as const, definitionId },
      currentValue: 10,
      improvementChecked: true,
    });
    expect(validateCharacterSkill(makeSkill("library-use"), requireDefinition("library-use")).valid).toBe(true);
    expect(validateCharacterSkill(makeSkill("cthulhu-mythos"), requireDefinition("cthulhu-mythos")).valid).toBe(false);
    expect(validateCharacterSkill(makeSkill("credit-rating"), requireDefinition("credit-rating")).valid).toBe(false);
  });
});
