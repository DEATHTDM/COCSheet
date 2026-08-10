import { describe, expect, it } from "vitest";

import {
  calculateDamageBonusAndBuild,
  calculateInitialMagicPoints,
  calculateInitialSanity,
  calculateMaxHitPoints,
  calculateMovementRate,
  deriveStandardCharacterValues,
  formatDamageBonus,
  type DamageBonus,
} from "./derived";

describe("Maximum HP、起始 MP 与起始 SAN", () => {
  it("按 CON + SIZ 计算 Maximum HP 并向下取整", () => {
    expect(calculateMaxHitPoints(55, 70)).toBe(12);
    expect(calculateMaxHitPoints(51, 58)).toBe(10);
  });

  it("按 POW / 5 计算起始 MP 并向下取整", () => {
    expect(calculateInitialMagicPoints(65)).toBe(13);
    expect(calculateInitialMagicPoints(64)).toBe(12);
  });

  it("起始 SAN 等于 POW", () => {
    expect(calculateInitialSanity(65)).toBe(65);
  });
});

describe("MOV", () => {
  it.each([
    [50, 40, 60, 7],
    [70, 80, 60, 9],
    [70, 50, 60, 8],
    [60, 60, 60, 8],
  ])("STR %i、DEX %i、SIZ %i 的基础 MOV 为 %i", (str, dex, siz, expected) => {
    expect(calculateMovementRate(25, str, dex, siz)).toEqual({ status: "value", value: expected });
  });

  it.each([
    [14, "keeper-ruling", undefined],
    [15, "value", 9],
    [39, "value", 9],
    [40, "value", 8],
    [49, "value", 8],
    [50, "value", 7],
    [59, "value", 7],
    [60, "value", 6],
    [69, "value", 6],
    [70, "value", 5],
    [79, "value", 5],
    [80, "value", 4],
    [89, "value", 4],
    [90, "keeper-ruling", undefined],
    [91, "keeper-ruling", undefined],
  ] as const)("年龄 %i 返回正确结果", (age, status, value) => {
    const result = calculateMovementRate(age, 70, 80, 60);
    expect(result.status).toBe(status);
    if (result.status === "value") expect(result.value).toBe(value);
  });

  it("年龄减值应用下限 1", () => {
    const result = calculateMovementRate(89, 40, 40, 60);
    expect(result).toEqual({ status: "value", value: 2 });
    if (result.status === "value") expect(result.value).toBeGreaterThanOrEqual(1);
  });
});

describe("Damage Bonus 与 Build", () => {
  it.each([
    [2, { kind: "flat", value: -2 }, -2],
    [64, { kind: "flat", value: -2 }, -2],
    [65, { kind: "flat", value: -1 }, -1],
    [84, { kind: "flat", value: -1 }, -1],
    [85, { kind: "flat", value: 0 }, 0],
    [124, { kind: "flat", value: 0 }, 0],
    [125, { kind: "dice", count: 1, sides: 4 }, 1],
    [164, { kind: "dice", count: 1, sides: 4 }, 1],
    [165, { kind: "dice", count: 1, sides: 6 }, 2],
    [204, { kind: "dice", count: 1, sides: 6 }, 2],
    [205, { kind: "dice", count: 2, sides: 6 }, 3],
    [284, { kind: "dice", count: 2, sides: 6 }, 3],
    [285, { kind: "dice", count: 3, sides: 6 }, 4],
    [364, { kind: "dice", count: 3, sides: 6 }, 4],
    [365, { kind: "dice", count: 4, sides: 6 }, 5],
    [444, { kind: "dice", count: 4, sides: 6 }, 5],
    [445, { kind: "dice", count: 5, sides: 6 }, 6],
    [524, { kind: "dice", count: 5, sides: 6 }, 6],
    [525, { kind: "dice", count: 6, sides: 6 }, 7],
    [604, { kind: "dice", count: 6, sides: 6 }, 7],
    [605, { kind: "dice", count: 7, sides: 6 }, 8],
  ] as const)("STR + SIZ = %i", (total, damageBonus, build) => {
    expect(calculateDamageBonusAndBuild(total)).toEqual({ damageBonus, build });
  });

  it.each([
    [{ kind: "flat", value: -2 }, "-2"],
    [{ kind: "flat", value: -1 }, "-1"],
    [{ kind: "flat", value: 0 }, "无"],
    [{ kind: "dice", count: 1, sides: 4 }, "+1D4"],
    [{ kind: "dice", count: 2, sides: 6 }, "+2D6"],
  ] satisfies readonly (readonly [DamageBonus, string])[])("格式化 %#", (damageBonus, expected) => {
    expect(formatDamageBonus(damageBonus)).toBe(expected);
  });
});

describe("Standard 派生结果聚合", () => {
  it("从年龄与最终属性统一推导", () => {
    expect(deriveStandardCharacterValues(25, {
      STR: 65, CON: 55, SIZ: 70, DEX: 60, APP: 50, INT: 60, POW: 65, EDU: 70,
    })).toEqual({
      maxHp: 12,
      initialMp: 13,
      initialSan: 65,
      movement: { status: "value", value: 7 },
      damageBonus: { kind: "dice", count: 1, sides: 4 },
      build: 1,
    });
  });
});
