import { describe, expect, it } from "vitest";

import type { RandomSource } from "./random";
import { rollLuck, validateRolledLuck } from "./luck";

class QueueRandomSource implements RandomSource {
  constructor(private readonly values: number[]) {}
  nextInt(): number {
    const value = this.values.shift();
    if (value === undefined) throw new Error("测试随机值不足");
    return value;
  }
}

describe("Luck", () => {
  it("普通年龄掷一次 3D6×5", () => {
    expect(rollLuck(1, new QueueRandomSource([1, 2, 3]))).toEqual({ rolls: [{ dice: [1, 2, 3], modifier: 0, total: 30 }], value: 30 });
  });
  it("15～19 岁掷两次并取高", () => {
    const result = rollLuck(2, new QueueRandomSource([1, 1, 1, 6, 6, 6]));
    expect(result.rolls).toHaveLength(2);
    expect(result.value).toBe(90);
  });

  it("接受符合年龄次数与 3D6×5 语义的 Luck", () => {
    const oneRoll = rollLuck(1, new QueueRandomSource([1, 2, 3]));
    const twoRolls = rollLuck(2, new QueueRandomSource([1, 1, 1, 6, 6, 6]));
    expect(validateRolledLuck(1, oneRoll.rolls, oneRoll.value).valid).toBe(true);
    expect(validateRolledLuck(2, twoRolls.rolls, twoRolls.value).valid).toBe(true);
  });

  it("拒绝错误次数、骰式、计算结果和非最高值", () => {
    expect(validateRolledLuck(2, [{ dice: [1, 2, 3], modifier: 0, total: 30 }], 30).valid).toBe(false);
    expect(validateRolledLuck(1, [{ dice: [1, 2], modifier: 0, total: 15 }], 15).valid).toBe(false);
    expect(validateRolledLuck(1, [{ dice: [1, 2, 3], modifier: 0, total: 35 }], 35).valid).toBe(false);
    expect(validateRolledLuck(2, [
      { dice: [1, 1, 1], modifier: 0, total: 15 },
      { dice: [6, 6, 6], modifier: 0, total: 90 },
    ], 15).valid).toBe(false);
  });
});
