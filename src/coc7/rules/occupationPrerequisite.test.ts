import { describe, expect, it } from "vitest";

import type { AttributeValues } from "../types/attribute";
import { evaluateOccupationPrerequisite } from "./occupationPrerequisite";

const attributes: AttributeValues = {
  STR: 75,
  CON: 50,
  SIZ: 85,
  DEX: 60,
  APP: 55,
  INT: 65,
  POW: 50,
  EDU: 60,
  LUCK: 45,
};

describe("evaluateOccupationPrerequisite", () => {
  it("判断 EDU <= 60", () => {
    expect(
      evaluateOccupationPrerequisite(
        { type: "attribute", attribute: "EDU", operator: "<=", value: 60 },
        attributes,
      ),
    ).toBe(true);
  });

  it("判断 STR > 70", () => {
    expect(
      evaluateOccupationPrerequisite(
        { type: "attribute", attribute: "STR", operator: ">", value: 70 },
        attributes,
      ),
    ).toBe(true);
  });
});
