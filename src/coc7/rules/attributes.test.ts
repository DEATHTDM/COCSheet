import { describe, expect, it } from "vitest";

import type { AssignRollResult, CharacteristicId, StandardRollResult } from "../types/attribute";
import {
  applyLowRollBoost,
  getFifthValue,
  getHalfValue,
  rollAssignResults,
  rollLowRollBoost,
  rollMultipleCharacteristics,
  rollStandardCharacteristics,
  validateAssignRoll,
  validatePointBuy,
} from "./attributes";
import type { RandomSource } from "./random";

class QueueRandomSource implements RandomSource {
  constructor(private readonly values: number[]) {}
  nextInt(min: number, max: number): number {
    const value = this.values.shift();
    if (value === undefined || value < min || value > max) throw new Error(`测试随机值 ${value} 超出 ${min}～${max}`);
    return value;
  }
}

function makeStandardResult(rawValues: readonly number[]): StandardRollResult {
  const ids = ["STR", "CON", "SIZ", "DEX", "APP", "INT", "POW", "EDU"] as const;
  const rolls = ids.map((characteristic, index) => ({
    characteristic,
    dice: characteristic === "SIZ" || characteristic === "INT" || characteristic === "EDU" ? [1, 1] : [1, 1, 1],
    modifier: characteristic === "SIZ" || characteristic === "INT" || characteristic === "EDU" ? 6 : 0,
    raw: rawValues[index] ?? 10,
    value: (rawValues[index] ?? 10) * 5,
  }));
  return { rolls, values: Object.fromEntries(rolls.map((roll) => [roll.characteristic, roll.value])) as StandardRollResult["values"] };
}

describe("Standard 与 Low Roll Boost", () => {
  it("按五项 3D6 与三项 2D6+6 生成并乘 5", () => {
    const result = rollStandardCharacteristics(new QueueRandomSource(Array(21).fill(1)));
    expect(result.values).toEqual({ STR: 15, CON: 15, SIZ: 40, DEX: 15, APP: 15, INT: 40, POW: 15, EDU: 40 });
    expect(result.rolls.find((roll) => roll.characteristic === "STR")?.dice).toHaveLength(3);
    expect(result.rolls.find((roll) => roll.characteristic === "SIZ")?.modifier).toBe(6);
  });

  it("不足三项低于 10 时不允许额外分配", () => {
    const result = makeStandardResult([9, 9, 10, 10, 10, 10, 10, 10]);
    expect(rollLowRollBoost(result, new QueueRandomSource([]))).toBeUndefined();
    const applied = applyLowRollBoost(result, undefined, {});
    expect(applied.validation.valid).toBe(true);
    expect(applied.values?.STR).toBe(45);
  });

  it("三项低于 10 时只允许给符合项分配且总数必须一致", () => {
    const result = makeStandardResult([8, 9, 9, 10, 10, 10, 10, 10]);
    expect(rollLowRollBoost(result, new QueueRandomSource([4]))).toBe(4);
    expect(applyLowRollBoost(result, 4, { STR: 2, CON: 2 }).values?.STR).toBe(50);
    expect(applyLowRollBoost(result, 4, { STR: 1 }).validation.valid).toBe(false);
    expect(applyLowRollBoost(result, 4, { DEX: 4 }).validation.valid).toBe(false);
  });
});

describe("Assign Roll 与 Multi Roll", () => {
  const rolls: readonly AssignRollResult[] = [50, 55, 60, 65, 70, 75, 80, 85].map((value, index) => ({
    id: `r${index}`,
    formula: index < 5 ? "3d6" : "2d6+6",
    dice: index < 5 ? [3, 3, 4] : [2, 2],
    modifier: index < 5 ? 0 : 6,
    raw: value / 5,
    value,
  }));
  const ids = ["STR", "CON", "SIZ", "DEX", "APP", "INT", "POW", "EDU"] as const;
  const complete = Object.fromEntries(ids.map((id, index) => [id, `r${index}`])) as Readonly<Partial<Record<CharacteristicId, string>>>;

  it("生成五个 3D6 与三个 2D6+6", () => {
    const generated = rollAssignResults(new QueueRandomSource(Array(21).fill(2)));
    expect(generated.filter((roll) => roll.formula === "3d6")).toHaveLength(5);
    expect(generated.filter((roll) => roll.formula === "2d6+6")).toHaveLength(3);
  });

  it("允许八结果自由分配并拒绝重复、遗漏和 INT/SIZ 下限失败", () => {
    expect(validateAssignRoll(rolls, complete).validation.valid).toBe(true);
    expect(validateAssignRoll(rolls, { ...complete, EDU: "r0" }).validation.valid).toBe(false);
    const { EDU: _omitted, ...missing } = complete;
    expect(_omitted).toBeDefined();
    expect(validateAssignRoll(rolls, missing).validation.valid).toBe(false);
    expect(validateAssignRoll(rolls, { ...complete, INT: "r0", STR: "r5" }, 80, 40).validation.valid).toBe(false);
  });

  it("多组生成彼此独立并验证 2～10 边界", () => {
    const candidates = rollMultipleCharacteristics(2, new QueueRandomSource(Array(42).fill(1)));
    expect(candidates).toHaveLength(2);
    expect(candidates[0]).not.toBe(candidates[1]);
    expect(() => rollMultipleCharacteristics(1)).toThrow();
    expect(() => rollMultipleCharacteristics(11)).toThrow();
  });
});

describe("Point Buy 与派生值", () => {
  const standard = { STR: 50, CON: 50, SIZ: 60, DEX: 50, APP: 50, INT: 60, POW: 50, EDU: 90 };
  it("验证默认 460、15～90 与 INT/SIZ 40 下限", () => {
    expect(validatePointBuy(standard).valid).toBe(true);
    expect(validatePointBuy({ ...standard, STR: 49 }).valid).toBe(false);
    expect(validatePointBuy({ ...standard, INT: 35, STR: 75 }).valid).toBe(false);
  });
  it("支持自定义购点配置", () => {
    const values = { STR: 30, CON: 30, SIZ: 30, DEX: 30, APP: 30, INT: 30, POW: 30, EDU: 30 };
    expect(validatePointBuy(values, { total: 240, min: 20, max: 40, intMin: 20, sizMin: 20 }).valid).toBe(true);
  });
  it("Half 与 Fifth 向下取整", () => {
    expect(getHalfValue(55)).toBe(27);
    expect(getFifthValue(55)).toBe(11);
  });
});
