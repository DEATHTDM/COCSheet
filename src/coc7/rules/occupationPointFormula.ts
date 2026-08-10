import type { AttributeValues } from "../types/attribute";
import type { OccupationPointFormula } from "../types/occupation";

function assertNever(value: never): never {
  throw new Error(`未知的职业技能点公式：${JSON.stringify(value)}`);
}

export function evaluateOccupationPointFormula(
  formula: OccupationPointFormula,
  attributes: AttributeValues,
): number {
  switch (formula.type) {
    case "attribute":
      return attributes[formula.attribute] * formula.multiplier;
    case "best-of":
      return Math.max(...formula.attributes.map((attribute) => attributes[attribute])) * formula.multiplier;
    case "sum":
      return formula.terms.reduce(
        (total, term) => total + evaluateOccupationPointFormula(term, attributes),
        0,
      );
    default:
      return assertNever(formula);
  }
}
