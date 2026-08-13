import type { OccupationDefinition } from "../../../coc7/types/occupation";

import {
  defineOccupation,
  edu4,
  exact,
  investigatorHandbook,
  oneBranch,
  predefined,
  requirement,
  socialSelector,
  specializationOf,
  standard,
} from "./shared";

const brawl = exact(predefined("fighting", "brawl"));
const genericFirearms = specializationOf("firearms");

export const batch3fDeprogrammerOccupationDefinitions: readonly OccupationDefinition[] = [
  defineOccupation(
    "deprogrammer",
    "除魅师",
    "Deprogrammer",
    [investigatorHandbook(77)],
    { min: 20, max: 50 },
    edu4,
    [
      requirement("social-1", socialSelector),
      requirement("social-2", socialSelector),
      requirement("drive-auto", exact(standard("drive-auto"))),
      requirement("brawl-or-firearms", oneBranch(
        { selector: brawl, cardinality: { min: 1, max: 1 } },
        { selector: genericFirearms, cardinality: { min: 1 } },
      ), 1, null),
      requirement("history", exact(standard("history"))),
      requirement("occult", exact(standard("occult"))),
      requirement("psychology", exact(standard("psychology"))),
      requirement("stealth", exact(standard("stealth"))),
    ],
    "religion-occult",
    {
      aliases: { zh: ["除魅师（现代）"] },
      era: { type: "specific", eraIds: ["modern"] },
      skillReplacement: {
        id: "keeper-approved-hypnosis",
        replacement: exact(standard("hypnosis")),
        targetRequirementIds: [
          "social-1",
          "social-2",
          "drive-auto",
          "brawl-or-firearms",
          "history",
          "occult",
          "psychology",
          "stealth",
        ],
        approval: "keeper-required",
      },
    },
  ),
];
