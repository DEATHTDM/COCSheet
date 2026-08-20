import { describe, expect, it } from "vitest";

import {
  deriveStandardInitialWealth,
  type StandardWealthEraId,
} from "./wealth";
import {
  formatStandardMoney,
  parseStandardMoneyInput,
} from "../../creation/presentation/wealthPresentation";

interface WealthCase {
  readonly eraId: StandardWealthEraId;
  readonly creditRating: number;
  readonly lifestyle: string;
  readonly cashMinorUnits: number;
  readonly assetsType: "exact" | "minimum";
  readonly assetsMinorUnits: number;
  readonly spendingLevelMinorUnits: number;
}

const cases: readonly WealthCase[] = [
  { eraId: "classic-1920s", creditRating: 0, lifestyle: "penniless", cashMinorUnits: 50, assetsType: "exact", assetsMinorUnits: 0, spendingLevelMinorUnits: 50 },
  { eraId: "classic-1920s", creditRating: 1, lifestyle: "poor", cashMinorUnits: 100, assetsType: "exact", assetsMinorUnits: 1_000, spendingLevelMinorUnits: 200 },
  { eraId: "classic-1920s", creditRating: 9, lifestyle: "poor", cashMinorUnits: 900, assetsType: "exact", assetsMinorUnits: 9_000, spendingLevelMinorUnits: 200 },
  { eraId: "classic-1920s", creditRating: 10, lifestyle: "average", cashMinorUnits: 2_000, assetsType: "exact", assetsMinorUnits: 50_000, spendingLevelMinorUnits: 1_000 },
  { eraId: "classic-1920s", creditRating: 49, lifestyle: "average", cashMinorUnits: 9_800, assetsType: "exact", assetsMinorUnits: 245_000, spendingLevelMinorUnits: 1_000 },
  { eraId: "classic-1920s", creditRating: 50, lifestyle: "wealthy", cashMinorUnits: 25_000, assetsType: "exact", assetsMinorUnits: 2_500_000, spendingLevelMinorUnits: 5_000 },
  { eraId: "classic-1920s", creditRating: 89, lifestyle: "wealthy", cashMinorUnits: 44_500, assetsType: "exact", assetsMinorUnits: 4_450_000, spendingLevelMinorUnits: 5_000 },
  { eraId: "classic-1920s", creditRating: 90, lifestyle: "rich", cashMinorUnits: 180_000, assetsType: "exact", assetsMinorUnits: 18_000_000, spendingLevelMinorUnits: 25_000 },
  { eraId: "classic-1920s", creditRating: 98, lifestyle: "rich", cashMinorUnits: 196_000, assetsType: "exact", assetsMinorUnits: 19_600_000, spendingLevelMinorUnits: 25_000 },
  { eraId: "classic-1920s", creditRating: 99, lifestyle: "super-rich", cashMinorUnits: 5_000_000, assetsType: "minimum", assetsMinorUnits: 500_000_000, spendingLevelMinorUnits: 500_000 },
  { eraId: "modern", creditRating: 0, lifestyle: "penniless", cashMinorUnits: 1_000, assetsType: "exact", assetsMinorUnits: 0, spendingLevelMinorUnits: 1_000 },
  { eraId: "modern", creditRating: 1, lifestyle: "poor", cashMinorUnits: 2_000, assetsType: "exact", assetsMinorUnits: 20_000, spendingLevelMinorUnits: 4_000 },
  { eraId: "modern", creditRating: 9, lifestyle: "poor", cashMinorUnits: 18_000, assetsType: "exact", assetsMinorUnits: 180_000, spendingLevelMinorUnits: 4_000 },
  { eraId: "modern", creditRating: 10, lifestyle: "average", cashMinorUnits: 40_000, assetsType: "exact", assetsMinorUnits: 1_000_000, spendingLevelMinorUnits: 20_000 },
  { eraId: "modern", creditRating: 49, lifestyle: "average", cashMinorUnits: 196_000, assetsType: "exact", assetsMinorUnits: 4_900_000, spendingLevelMinorUnits: 20_000 },
  { eraId: "modern", creditRating: 50, lifestyle: "wealthy", cashMinorUnits: 500_000, assetsType: "exact", assetsMinorUnits: 50_000_000, spendingLevelMinorUnits: 100_000 },
  { eraId: "modern", creditRating: 89, lifestyle: "wealthy", cashMinorUnits: 890_000, assetsType: "exact", assetsMinorUnits: 89_000_000, spendingLevelMinorUnits: 100_000 },
  { eraId: "modern", creditRating: 90, lifestyle: "rich", cashMinorUnits: 3_600_000, assetsType: "exact", assetsMinorUnits: 360_000_000, spendingLevelMinorUnits: 500_000 },
  { eraId: "modern", creditRating: 98, lifestyle: "rich", cashMinorUnits: 3_920_000, assetsType: "exact", assetsMinorUnits: 392_000_000, spendingLevelMinorUnits: 500_000 },
  { eraId: "modern", creditRating: 99, lifestyle: "super-rich", cashMinorUnits: 100_000_000, assetsType: "minimum", assetsMinorUnits: 10_000_000_000, spendingLevelMinorUnits: 10_000_000 },
];

describe("Standard 初始财富规则", () => {
  it.each(cases)("$eraId CR $creditRating", (testCase) => {
    const result = deriveStandardInitialWealth(testCase.eraId, testCase.creditRating);
    expect(result).toEqual({
      lifestyle: testCase.lifestyle,
      cashMinorUnits: testCase.cashMinorUnits,
      assets: {
        type: testCase.assetsType,
        amountMinorUnits: testCase.assetsMinorUnits,
      },
      spendingLevelMinorUnits: testCase.spendingLevelMinorUnits,
    });
  });

  it.each([-1, 100, 1.5])("拒绝非法 Credit Rating：%s", (creditRating) => {
    expect(() => deriveStandardInitialWealth("classic-1920s", creditRating))
      .toThrow("Credit Rating 必须为 0～99 的整数");
  });
});

describe("Standard 金额 presentation", () => {
  it("正确格式化 cents、整数与千位分隔", () => {
    expect(formatStandardMoney(50)).toBe("$0.50");
    expect(formatStandardMoney(139)).toBe("$1.39");
    expect(formatStandardMoney(200)).toBe("$2");
    expect(formatStandardMoney(5_000_000)).toBe("$50,000");
  });

  it("美元输入只在 presentation 边界转换为 integer minor units", () => {
    expect(parseStandardMoneyInput("0.50")).toBe(50);
    expect(parseStandardMoneyInput("50000")).toBe(5_000_000);
    expect(() => parseStandardMoneyInput("1.234")).toThrow("最多两位小数");
  });
});
