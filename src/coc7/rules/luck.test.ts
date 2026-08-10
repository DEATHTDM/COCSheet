import { describe, expect, it } from "vitest";

import type { RandomSource } from "./random";
import { rollLuck } from "./luck";

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
});
