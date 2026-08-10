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

  it("计算 EDU × 2 + STR × 2", () => {
    const formula: OccupationPointFormula = {
      type: "sum",
      terms: [
        { type: "attribute", attribute: "EDU", multiplier: 2 },
        { type: "attribute", attribute: "STR", multiplier: 2 },
      ],
    };

    expect(evaluateOccupationPointFormula(formula, attributes)).toBe(280);
  });

  it("计算 EDU × 2 + max(STR, DEX) × 2", () => {
    const formula: OccupationPointFormula = {
      type: "sum",
      terms: [
        { type: "attribute", attribute: "EDU", multiplier: 2 },
        { type: "best-of", attributes: ["STR", "DEX"], multiplier: 2 },
      ],
    };

    expect(evaluateOccupationPointFormula(formula, attributes)).toBe(290);
  });

  it("计算 EDU × 2 + max(APP, DEX, STR) × 2", () => {
    const formula: OccupationPointFormula = {
      type: "sum",
      terms: [
        { type: "attribute", attribute: "EDU", multiplier: 2 },
        { type: "best-of", attributes: ["APP", "DEX", "STR"], multiplier: 2 },
      ],
    };

    expect(evaluateOccupationPointFormula(formula, attributes)).toBe(310);
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
});
