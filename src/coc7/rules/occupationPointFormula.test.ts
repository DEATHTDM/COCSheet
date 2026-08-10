import { describe, expect, it } from "vitest";

import type { CharacteristicValues } from "../types/attribute";
import {
  occupationPointFormulaSchema,
  type OccupationPointFormula,
} from "../types/occupation";
import { evaluateOccupationPointFormula } from "./occupationPointFormula";

const attributes: CharacteristicValues = {
  STR: 65,
  CON: 50,
  SIZ: 55,
  DEX: 70,
  APP: 80,
  INT: 60,
  POW: 45,
  EDU: 75,
};

describe("evaluateOccupationPointFormula", () => {
  it("计算 EDU × 4", () => {
    const formula: OccupationPointFormula = {
      type: "attribute",
      attribute: "EDU",
      multiplier: 4,
    };

    expect(evaluateOccupationPointFormula(formula, attributes)).toBe(300);
  });

  it.each([
    ["EDU ×2 + DEX ×2", { type: "attribute", attribute: "DEX", multiplier: 2 }, 290],
    ["EDU ×2 + STR ×2", { type: "attribute", attribute: "STR", multiplier: 2 }, 280],
    ["EDU ×2 + best(DEX, STR) ×2", { type: "best-of", attributes: ["DEX", "STR"], multiplier: 2 }, 290],
    ["EDU ×2 + best(APP, POW) ×2", { type: "best-of", attributes: ["APP", "POW"], multiplier: 2 }, 310],
    ["EDU ×2 + best(APP, DEX) ×2", { type: "best-of", attributes: ["APP", "DEX"], multiplier: 2 }, 310],
    ["EDU ×2 + POW ×2", { type: "attribute", attribute: "POW", multiplier: 2 }, 240],
    ["EDU ×2 + best(APP, DEX, STR) ×2", { type: "best-of", attributes: ["APP", "DEX", "STR"], multiplier: 2 }, 310],
  ] satisfies [string, OccupationPointFormula, number][])("计算 %s", (_label, secondTerm, expected) => {
    const formula = {
      type: "sum",
      terms: [
        { type: "attribute", attribute: "EDU", multiplier: 2 },
        secondTerm,
      ],
    } satisfies OccupationPointFormula;
    expect(evaluateOccupationPointFormula(formula, attributes)).toBe(expected);
  });

  it("拒绝在职业技能点公式中引用 LUCK", () => {
    expect(
      occupationPointFormulaSchema.safeParse({
        type: "attribute",
        attribute: "LUCK",
        multiplier: 2,
      }).success,
    ).toBe(false);
  });

  it("拒绝 best-of 重复引用同一属性", () => {
    expect(occupationPointFormulaSchema.safeParse({
      type: "best-of",
      attributes: ["DEX", "DEX"],
      multiplier: 2,
    }).success).toBe(false);
  });
});
