import type { AttributeValues } from "../types/attribute";
import type { OccupationPrerequisite } from "../types/occupation";

export function evaluateOccupationPrerequisite(
  prerequisite: OccupationPrerequisite,
  attributes: AttributeValues,
): boolean {
  const actual = attributes[prerequisite.attribute];

  switch (prerequisite.operator) {
    case ">":
      return actual > prerequisite.value;
    case ">=":
      return actual >= prerequisite.value;
    case "<":
      return actual < prerequisite.value;
    case "<=":
      return actual <= prerequisite.value;
    case "==":
      return actual === prerequisite.value;
  }
}
