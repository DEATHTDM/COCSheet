import { describe, expect, it } from "vitest";

import type { Character } from "../../coc7/types/character";
import {
  isCreationWealthInitializationCurrent,
  validateCreationWealth,
} from "./creationWealth";

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    version: 1,
    id: crypto.randomUUID(),
    name: "财富测试调查员",
    settingId: "standard",
    eraId: "classic-1920s",
    skills: [{
      ref: { type: "standard", definitionId: "credit-rating" },
      currentValue: 20,
      improvementChecked: false,
    }],
    wealth: { cashMinorUnits: 4_000, assetsMinorUnits: 100_000, assetEntries: [] },
    ...overrides,
  };
}

describe("creation wealth provenance", () => {
  it("只有当前 era + finalized Credit Rating 与 snapshot 完全匹配才 current", () => {
    const snapshot = { eraId: "classic-1920s" as const, creditRating: 20 };
    expect(isCreationWealthInitializationCurrent("classic-1920s", 20, snapshot)).toBe(true);
    expect(isCreationWealthInitializationCurrent("modern", 20, snapshot)).toBe(false);
    expect(isCreationWealthInitializationCurrent("classic-1920s", 21, snapshot)).toBe(false);
    expect(isCreationWealthInitializationCurrent("classic-1920s", 20, undefined)).toBe(false);
  });

  it("未初始化与 stale 使用明确错误，且不会修改输入", () => {
    const withoutWealth = makeCharacter({ wealth: undefined });
    const before = structuredClone(withoutWealth);
    expect(validateCreationWealth(withoutWealth, undefined).errors.map(({ code }) => code))
      .toContain("wealth-not-initialized");
    expect(withoutWealth).toEqual(before);

    const stale = validateCreationWealth(makeCharacter(), {
      eraId: "classic-1920s",
      creditRating: 19,
    });
    expect(stale.errors).toContainEqual({
      code: "stale-wealth-initialization",
      message: "当前财富基于旧的时代或信用评级，请重新建立财富记录。",
    });
  });

  it("有资产时要求说明，无资产时不要求", () => {
    const snapshot = { eraId: "classic-1920s" as const, creditRating: 20 };
    expect(validateCreationWealth(makeCharacter(), snapshot).errors.map(({ code }) => code))
      .toContain("missing-asset-entry");
    expect(validateCreationWealth(makeCharacter({
      wealth: { cashMinorUnits: 50, assetsMinorUnits: 0, assetEntries: [] },
    }), snapshot).valid).toBe(true);
    expect(validateCreationWealth(makeCharacter({
      wealth: {
        cashMinorUnits: 4_000,
        assetsMinorUnits: 100_000,
        assetEntries: [{ id: crypto.randomUUID(), description: "公寓" }],
      },
    }), snapshot).valid).toBe(true);
  });
});
