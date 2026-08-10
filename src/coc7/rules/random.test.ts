import { describe, expect, it } from "vitest";

import { rollD10, rollD100, rollD6, rollDice, type RandomSource } from "./random";

class RecordingRandomSource implements RandomSource {
  readonly ranges: Array<readonly [number, number]> = [];
  nextInt(min: number, max: number): number {
    this.ranges.push([min, max]);
    return max;
  }
}

describe("可注入随机源", () => {
  it("D6、D10 与 D100 使用正确边界", () => {
    const source = new RecordingRandomSource();
    expect(rollD6(source)).toBe(6);
    expect(rollD10(source)).toBe(10);
    expect(rollD100(source)).toBe(100);
    expect(source.ranges).toEqual([[1, 6], [1, 10], [1, 100]]);
  });

  it("通用骰子按次数调用随机源并拒绝非法骰式", () => {
    const source = new RecordingRandomSource();
    expect(rollDice(3, 6, source)).toEqual([6, 6, 6]);
    expect(source.ranges).toEqual([[1, 6], [1, 6], [1, 6]]);
    expect(() => rollDice(0, 6, source)).toThrow();
    expect(() => rollDice(1, 1, source)).toThrow();
  });
});
