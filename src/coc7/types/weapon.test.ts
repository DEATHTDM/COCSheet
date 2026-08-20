import { describe, expect, it } from "vitest";

import { weaponDefinitionSchema } from "./weapon";

const validMeleeWeapon = {
  version: 1,
  id: "test-club",
  name: { zh: "测试棍棒" },
  category: "melee-other",
  skillRef: {
    type: "predefined",
    definitionId: "fighting",
    specializationId: "brawl",
  },
  damage: "1D6+DB",
  impales: false,
  baseRange: "接触",
  attacksPerRound: "1",
  availability: {
    classic1920s: "available",
    modern: "available",
  },
  sourceRefs: [{ sourceId: "test-source", title: "测试来源", page: 1 }],
} as const;

describe("weapon definition schema", () => {
  it("接受合法近战武器且 malfunction 可省略", () => {
    const parsed = weaponDefinitionSchema.parse(validMeleeWeapon);
    expect(parsed.id).toBe("test-club");
    expect(parsed.malfunction).toBeUndefined();
  });

  it("接受含枪械显示字段的合法武器", () => {
    expect(weaponDefinitionSchema.parse({
      ...validMeleeWeapon,
      id: "test-pistol",
      category: "handgun",
      skillRef: {
        type: "predefined",
        definitionId: "firearms",
        specializationId: "handgun",
      },
      capacity: "8",
      price: { classic1920s: "$20", modern: "$350" },
      malfunction: 99,
    }).malfunction).toBe(99);
  });

  it.each([0, 101])("拒绝越界 malfunction：%s", (malfunction) => {
    expect(weaponDefinitionSchema.safeParse({
      ...validMeleeWeapon,
      malfunction,
    }).success).toBe(false);
  });

  it("拒绝 custom SkillRef", () => {
    expect(weaponDefinitionSchema.safeParse({
      ...validMeleeWeapon,
      skillRef: {
        type: "custom",
        definitionId: "fighting",
        specializationId: "987b3c2f-6e87-4af4-b915-5545123c8c47",
        displayName: "自定义",
      },
    }).success).toBe(false);
  });

  it("trim 合法显示文本并拒绝纯空白字段", () => {
    const parsed = weaponDefinitionSchema.parse({
      ...validMeleeWeapon,
      name: { zh: "  测试棍棒  ", en: "  Test Club  " },
      damage: "  1D6+DB  ",
      baseRange: "  接触  ",
      attacksPerRound: "  1  ",
      capacity: "  6  ",
      price: { modern: "  $10  " },
      notes: ["  展示备注  "],
    });
    expect(parsed).toMatchObject({
      name: { zh: "测试棍棒", en: "Test Club" },
      damage: "1D6+DB",
      baseRange: "接触",
      attacksPerRound: "1",
      capacity: "6",
      price: { modern: "$10" },
      notes: ["展示备注"],
    });
    expect(weaponDefinitionSchema.safeParse({
      ...validMeleeWeapon,
      capacity: "   ",
    }).success).toBe(false);
  });

  it("拒绝缺少来源、空价格对象与 schema 外字段", () => {
    expect(weaponDefinitionSchema.safeParse({
      ...validMeleeWeapon,
      sourceRefs: [],
    }).success).toBe(false);
    expect(weaponDefinitionSchema.safeParse({
      ...validMeleeWeapon,
      price: {},
    }).success).toBe(false);
    expect(weaponDefinitionSchema.safeParse({
      ...validMeleeWeapon,
      damageDice: "1D6",
    }).success).toBe(false);
  });
});
