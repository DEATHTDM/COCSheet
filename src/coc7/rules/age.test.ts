import { describe, expect, it } from "vitest";

import { deriveFinalCharacteristics, getAgeAdjustmentRule, runEduImprovements, validateEduImprovementHistory, validateReductionAllocation } from "./age";
import type { RandomSource } from "./random";

class QueueRandomSource implements RandomSource {
  constructor(private readonly values: number[]) {}
  nextInt(): number {
    const value = this.values.shift();
    if (value === undefined) throw new Error("测试随机值不足");
    return value;
  }
}

const base = { STR: 60, CON: 60, SIZ: 60, DEX: 60, APP: 60, INT: 60, POW: 60, EDU: 60 };

describe("年龄段边界", () => {
  it.each([
    [14, true, 0, 0], [15, false, 0, 5], [19, false, 0, 5],
    [20, false, 1, 0], [39, false, 1, 0], [40, false, 2, 5],
    [49, false, 2, 5], [50, false, 3, 10], [59, false, 3, 10],
    [60, false, 4, 20], [69, false, 4, 20], [70, false, 4, 40],
    [79, false, 4, 40], [80, false, 4, 80], [89, false, 4, 80],
    [90, true, 0, 0], [91, true, 0, 0],
  ])("年龄 %i 返回正确规则", (age, keeper, eduCount, reduction) => {
    const rule = getAgeAdjustmentRule(age);
    expect(rule.requiresKeeperRuling).toBe(keeper);
    expect(rule.eduImprovementCount).toBe(eduCount);
    expect(rule.reduction.total).toBe(reduction);
  });
});

describe("年龄减值与 EDU 成长", () => {
  it("只接受允许属性、非负且总数准确的玩家分配", () => {
    const rule = getAgeAdjustmentRule(52);
    expect(validateReductionAllocation(base, rule, { STR: 4, CON: 3, DEX: 3 }).valid).toBe(true);
    expect(validateReductionAllocation(base, rule, { STR: 4, CON: 3 }).valid).toBe(false);
    expect(validateReductionAllocation(base, rule, { SIZ: 10 }).valid).toBe(false);
    expect(validateReductionAllocation(base, rule, { STR: -1, CON: 11 }).valid).toBe(false);
  });

  it("EDU 成功、失败和连续成长均使用更新后的 EDU", () => {
    const results = runEduImprovements(60, 3, new QueueRandomSource([70, 7, 50, 80, 4]));
    expect(results).toEqual([
      { checkRoll: 70, eduBefore: 60, success: true, improvementRoll: 7, eduAfter: 67 },
      { checkRoll: 50, eduBefore: 67, success: false, eduAfter: 67 },
      { checkRoll: 80, eduBefore: 67, success: true, improvementRoll: 4, eduAfter: 71 },
    ]);
  });

  it("EDU 上限为 99", () => {
    expect(runEduImprovements(98, 1, new QueueRandomSource([100, 10]))[0]?.eduAfter).toBe(99);
  });

  it("验证合法 EDU 历史的数量、成功语义和连续链条", () => {
    const history = runEduImprovements(60, 3, new QueueRandomSource([70, 7, 50, 80, 4]));
    expect(validateEduImprovementHistory(60, 3, history)).toEqual({ valid: true, errors: [] });
  });

  it("拒绝被篡改的 EDU 成功、成长骰和结果", () => {
    expect(validateEduImprovementHistory(60, 1, [
      { checkRoll: 70, eduBefore: 60, success: false, improvementRoll: 7, eduAfter: 67 },
    ]).valid).toBe(false);
    expect(validateEduImprovementHistory(60, 1, [
      { checkRoll: 70, eduBefore: 60, success: true, eduAfter: 67 },
    ]).valid).toBe(false);
    expect(validateEduImprovementHistory(60, 1, [
      { checkRoll: 70, eduBefore: 60, success: true, improvementRoll: 7, eduAfter: 68 },
    ]).valid).toBe(false);
  });

  it("拒绝中断的 EDU 历史链条并阻止最终值推导", () => {
    const broken = [
      { checkRoll: 70, eduBefore: 60, success: true, improvementRoll: 7, eduAfter: 67 },
      { checkRoll: 80, eduBefore: 60, success: true, improvementRoll: 4, eduAfter: 64 },
    ];
    expect(validateEduImprovementHistory(60, 2, broken).valid).toBe(false);
    expect(() => deriveFinalCharacteristics(base, getAgeAdjustmentRule(45), { STR: 5 }, broken)).toThrow();
  });

  it("从 Base 推导最终值，不叠加旧 Final", () => {
    const age45 = getAgeAdjustmentRule(45);
    const final45 = deriveFinalCharacteristics(base, age45, { STR: 5 }, [
      { checkRoll: 50, eduBefore: 60, success: false, eduAfter: 60 },
      { checkRoll: 50, eduBefore: 60, success: false, eduAfter: 60 },
    ]);
    expect(final45.STR).toBe(55);
    expect(final45.APP).toBe(55);
    const age25 = getAgeAdjustmentRule(25);
    const final25 = deriveFinalCharacteristics(base, age25, {}, [
      { checkRoll: 50, eduBefore: 60, success: false, eduAfter: 60 },
    ]);
    expect(final25.STR).toBe(60);
  });
});
