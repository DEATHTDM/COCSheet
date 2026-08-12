import type { OccupationDefinition } from "../../../coc7/types/occupation";

import {
  defineOccupation,
  edu2Plus,
  exact,
  investigatorHandbook,
  keeperRulebook,
  oneBranch,
  oneOf,
  requirement,
  socialSelector,
  specializationOf,
  standard,
} from "./shared";

const fightingOrFirearms = oneBranch(
  {
    selector: specializationOf("fighting"),
    cardinality: { min: 1 },
  },
  {
    selector: specializationOf("firearms"),
    cardinality: { min: 1 },
  },
);

export const batch2PressureOccupationDefinitions: readonly OccupationDefinition[] = [
  defineOccupation(
    "bounty-hunter",
    "赏金猎人",
    "Bounty Hunter",
    [investigatorHandbook(73)],
    { min: 9, max: 30 },
    edu2Plus("DEX", "STR"),
    [
      requirement("drive-auto", exact(standard("drive-auto"))),
      requirement("electronics-or-electrical-repair", oneOf(
        exact(standard("electronics")),
        exact(standard("electrical-repair")),
      )),
      requirement("fighting-or-firearms", fightingOrFirearms, 1, null),
      requirement("social", socialSelector),
      requirement("law", exact(standard("law"))),
      requirement("psychology", exact(standard("psychology"))),
      requirement("track", exact(standard("track"))),
      requirement("stealth", exact(standard("stealth"))),
    ],
    "investigation-security",
  ),
  defineOccupation(
    "cowboy",
    "牛仔",
    "Cowboy / Cowgirl",
    [investigatorHandbook(74)],
    { min: 9, max: 20 },
    edu2Plus("DEX", "STR"),
    [
      requirement("dodge", exact(standard("dodge"))),
      requirement("fighting-or-firearms", fightingOrFirearms, 1, null),
      requirement("first-aid-or-natural-world", oneOf(
        exact(standard("first-aid")),
        exact(standard("natural-world")),
      )),
      requirement("jump", exact(standard("jump"))),
      requirement("ride", exact(standard("ride"))),
      requirement("survival", specializationOf("survival")),
      requirement("throw", exact(standard("throw"))),
      requirement("track", exact(standard("track"))),
    ],
    "outdoor-adventure",
    { aliases: { en: ["Cowboy", "Cowgirl"] } },
  ),
  defineOccupation(
    "tribe-member",
    "部落成员",
    "Tribe Member",
    [keeperRulebook(41), investigatorHandbook(91)],
    { min: 0, max: 15 },
    edu2Plus("DEX", "STR"),
    [
      requirement("natural-world", exact(standard("natural-world"))),
      requirement("fighting-or-throw", oneBranch(
        {
          selector: specializationOf("fighting"),
          cardinality: { min: 1 },
        },
        {
          selector: exact(standard("throw")),
          cardinality: { min: 1, max: 1 },
        },
      ), 1, null),
      requirement("listen", exact(standard("listen"))),
      requirement("climb", exact(standard("climb"))),
      requirement("occult", exact(standard("occult"))),
      requirement("survival", specializationOf("survival")),
      requirement("swim", exact(standard("swim"))),
      requirement("spot-hidden", exact(standard("spot-hidden"))),
    ],
    "outdoor-adventure",
  ),
];
